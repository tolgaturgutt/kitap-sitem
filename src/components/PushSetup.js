'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast as hotToast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const DEBUG_PUSH = false;
const silentToast = Object.assign(() => undefined, {
  success: () => undefined,
  error: () => undefined,
});
const toast = DEBUG_PUSH ? hotToast : silentToast;

export default function PushSetup() {
  const router = useRouter();
  const initializedRef = useRef(false);
  const latestTokenRef = useRef(null);

  const debugToast = useCallback((message) => {
    if (!DEBUG_PUSH) return;

    toast(message, {
      duration: 15000,
      id: 'kitaplab-push-debug',
      style: {
        background: '#111',
        color: '#fff',
        fontSize: '13px',
      },
    });

    console.log('[PushSetup]', message);
  }, []);

  const saveTokenToServer = useCallback(async (tokenValue, sessionOverride = null) => {
    try {
      debugToast('Token servera kaydediliyor...');

      let session = sessionOverride;
      let sessionError = null;

      if (!session) {
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session;
        sessionError = sessionResult.error;
      }

      if (sessionError) {
        toast.error(`Session hatası: ${sessionError.message}`, { duration: 30000 });
        return;
      }

      if (!session?.access_token) {
        toast.error('Giriş yapılmamış görünüyor. Token kaydedilemedi.', { duration: 30000 });
        return;
      }

      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token: tokenValue,
          platform: Capacitor.getPlatform(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('[PushSetup] register api error:', result);
        toast.error(`Token kayıt hatası: ${result?.error || response.status}`, {
          duration: 30000,
        });
        return;
      }

      toast.success('Push token Supabase’e kaydedildi ✅', { duration: 7000 });
      console.log('[PushSetup] token kayıt başarılı:', result);
    } catch (error) {
      console.error('[PushSetup] token kayıt kritik hata:', error);
      toast.error(`Token kayıt kritik hata: ${error?.message || error}`, {
        duration: 30000,
      });
    }
  }, [debugToast]);

  const initializePush = useCallback(async () => {
    try {
      debugToast('Push başlatılıyor...');

      let permission = await PushNotifications.checkPermissions();
      debugToast(`checkPermissions: ${permission.receive}`);

      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions();
        debugToast(`requestPermissions: ${permission.receive}`);
      }

      if (permission.receive !== 'granted') {
        toast.error('Bildirim izni verilmedi.', { duration: 30000 });
        return;
      }

      try {
        await PushNotifications.createChannel({
          id: 'default',
          name: 'KitapLab Bildirimleri',
          description: 'KitapLab mobil bildirimleri',
          importance: 5,
          visibility: 1,
          sound: 'default',
        });

        debugToast('Android notification channel hazır.');
      } catch (channelError) {
        console.log('[PushSetup] channel oluşturma atlandı:', channelError);
      }

      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (token) => {
        console.log('[PushSetup] FCM token:', token.value);

        latestTokenRef.current = token.value;
        window.localStorage.setItem('kitaplab_fcm_token', token.value);

        toast.success('FCM token alındı ✅', { duration: 6000 });

        await saveTokenToServer(token.value);
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushSetup] registrationError:', error);

        toast.error(`FCM kayıt hatası: ${JSON.stringify(error)}`, {
          duration: 30000,
        });
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushSetup] foreground notification:', notification);

        hotToast.success(
          `${notification.title || 'KitapLab'}\n${notification.body || 'Yeni bildirimin var.'}`,
          {
            duration: 6000,
            icon: '🔔',
          }
        );
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        console.log('[PushSetup] notification clicked:', event);

        const data = event?.notification?.data || {};
        const url = data?.url;

        if (url && typeof url === 'string') {
          if (url.startsWith('/')) {
            router.push(url);
          } else if (url.startsWith('https://kitaplab.com')) {
            window.location.href = url;
          }
        }
      });

      debugToast('Listenerlar kuruldu, register çağrılıyor...');

      await PushNotifications.register();

      debugToast('register() çağrıldı.');
    } catch (error) {
      console.error('[PushSetup] kritik hata:', error);

      toast.error(`Push kritik hata: ${error?.message || JSON.stringify(error)}`, {
        duration: 30000,
      });
    }
  }, [debugToast, router, saveTokenToServer]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;
    const isAndroidWebView = window.navigator.userAgent.includes('; wv)');
    const firstPlatform = Capacitor.getPlatform();
    const firstBridgePresent = Boolean(window.androidBridge);

    if (!isAndroidWebView && !firstBridgePresent && firstPlatform === 'web') {
      console.log('[PushSetup] Native platform değil, push başlatılmadı.');
      return;
    }

    const startPush = async () => {
      let lastPlatform = firstPlatform;
      let lastBridgePresent = firstBridgePresent;
      let lastPluginAvailable = false;

      for (let attempt = 1; attempt <= 10 && !cancelled; attempt += 1) {
        lastPlatform = Capacitor.getPlatform();
        lastBridgePresent = Boolean(window.androidBridge);
        lastPluginAvailable = Capacitor.isPluginAvailable('PushNotifications');

        debugToast(
          `Push tanı ${attempt}/10: platform=${lastPlatform}, bridge=${lastBridgePresent}, plugin=${lastPluginAvailable}`
        );

        if (Capacitor.isNativePlatform() && lastPluginAvailable) {
          await initializePush();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!cancelled) {
        toast.error(
          `Push başlatılamadı: platform=${lastPlatform}, bridge=${lastBridgePresent}, plugin=${lastPluginAvailable}`,
          {
            id: 'kitaplab-push-start-error',
            duration: 30000,
          }
        );
      }
    };

    startPush();

    const storedToken = window.localStorage.getItem('kitaplab_fcm_token');
    if (storedToken) {
      latestTokenRef.current = storedToken;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[PushSetup] auth event:', event);

      if (
        ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event) &&
        latestTokenRef.current &&
        session
      ) {
        saveTokenToServer(latestTokenRef.current, session);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [debugToast, initializePush, saveTokenToServer]);

  return null;
}
