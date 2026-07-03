'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const DEBUG_PUSH = true;

export default function PushSetup() {
  const router = useRouter();
  const initializedRef = useRef(false);
  const latestTokenRef = useRef(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const platform = Capacitor.getPlatform();

    console.log('[PushSetup] platform:', platform);

    if (!Capacitor.isNativePlatform()) {
      console.log('[PushSetup] Native platform değil, push başlatılmadı.');
      return;
    }

    initializePush();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      console.log('[PushSetup] auth event:', event);

      if (event === 'SIGNED_IN' && latestTokenRef.current) {
        saveTokenToServer(latestTokenRef.current);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const debugToast = (message) => {
    if (!DEBUG_PUSH) return;

    toast(message, {
      duration: 6000,
      style: {
        background: '#111',
        color: '#fff',
        fontSize: '13px',
      },
    });

    console.log('[PushSetup]', message);
  };

  const saveTokenToServer = async (tokenValue) => {
    try {
      debugToast('Token servera kaydediliyor...');

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        toast.error(`Session hatası: ${sessionError.message}`, { duration: 8000 });
        return;
      }

      if (!session?.access_token) {
        toast.error('Giriş yapılmamış görünüyor. Token kaydedilemedi.', { duration: 8000 });
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
          duration: 10000,
        });
        return;
      }

      toast.success('Push token Supabase’e kaydedildi ✅', { duration: 7000 });
      console.log('[PushSetup] token kayıt başarılı:', result);
    } catch (error) {
      console.error('[PushSetup] token kayıt kritik hata:', error);
      toast.error(`Token kayıt kritik hata: ${error?.message || error}`, {
        duration: 10000,
      });
    }
  };

  const initializePush = async () => {
    try {
      debugToast('Push başlatılıyor...');

      let permission = await PushNotifications.checkPermissions();
      debugToast(`checkPermissions: ${permission.receive}`);

      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions();
        debugToast(`requestPermissions: ${permission.receive}`);
      }

      if (permission.receive !== 'granted') {
        toast.error('Bildirim izni verilmedi.', { duration: 8000 });
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

      PushNotifications.addListener('registration', async (token) => {
        console.log('[PushSetup] FCM token:', token.value);

        latestTokenRef.current = token.value;

        toast.success('FCM token alındı ✅', { duration: 6000 });

        await saveTokenToServer(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushSetup] registrationError:', error);

        toast.error(`FCM kayıt hatası: ${JSON.stringify(error)}`, {
          duration: 12000,
        });
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushSetup] foreground notification:', notification);

        toast.success(
          `${notification.title || 'KitapLab'}\n${notification.body || 'Yeni bildirimin var.'}`,
          {
            duration: 6000,
            icon: '🔔',
          }
        );
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
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
        duration: 12000,
      });
    }
  };

  return null;
}