'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const TOKEN_STORAGE_KEY = 'kitaplab_fcm_token';
const AUTH_EVENTS = ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'];
const ANDROID_NOTIFICATION_CHANNEL_ID = 'kitaplab_push_v3';

export default function PushSetup() {
  const router = useRouter();
  const initializedRef = useRef(false);
  const listenersReadyRef = useRef(false);
  const registrationRunningRef = useRef(false);
  const permissionRequestRunningRef = useRef(false);
  const latestTokenRef = useRef(null);
  const lastSavedTokenRef = useRef(null);

  const saveTokenToServer = useCallback(async (tokenValue, sessionOverride = null) => {
    if (!tokenValue) return false;

    try {
      let session = sessionOverride;

      if (!session) {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[PushSetup] session error:', error);
          return false;
        }

        session = data.session;
      }

      if (!session?.access_token || !session?.user?.email) {
        return false;
      }

      const saveKey = session.user.email + ':' + tokenValue;

      if (lastSavedTokenRef.current === saveKey) {
        return true;
      }

      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({
          token: tokenValue,
          platform: Capacitor.getPlatform(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('[PushSetup] token register api error:', result);
        return false;
      }

      lastSavedTokenRef.current = saveKey;
      console.log('[PushSetup] token kaydedildi:', result);
      return true;
    } catch (error) {
      console.error('[PushSetup] token kayıt hatası:', error);
      return false;
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (
      permissionRequestRunningRef.current ||
      !Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable('PushNotifications')
    ) {
      return false;
    }

    permissionRequestRunningRef.current = true;

    try {
      let permission = await PushNotifications.checkPermissions();

      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive !== 'granted') {
        console.log('[PushSetup] bildirim izni verilmedi.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PushSetup] bildirim izin hatası:', error);
      return false;
    } finally {
      permissionRequestRunningRef.current = false;
    }
  }, []);

  const requestPushRegistration = useCallback(async () => {
    if (
      registrationRunningRef.current ||
      !listenersReadyRef.current ||
      !Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable('PushNotifications')
    ) {
      return false;
    }

    registrationRunningRef.current = true;

    try {
      // Android'da FCM tokeni POST_NOTIFICATIONS izninden bağımsızdır.
      // Tokeni önce isteyerek izin penceresi gösterilemese bile cihaz kaydını koru.
      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error('[PushSetup] FCM register hatası:', error);
      return false;
    } finally {
      registrationRunningRef.current = false;
    }
  }, []);

  const initializePush = useCallback(async () => {
    try {
      try {
        await PushNotifications.createChannel({
          id: ANDROID_NOTIFICATION_CHANNEL_ID,
          name: 'KitapLab Bildirimleri',
          description: 'KitapLab mobil bildirimleri',
          importance: 5,
          visibility: 1,
        });
      } catch (channelError) {
        console.log('[PushSetup] kanal oluşturma atlandı:', channelError);
      }

      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (token) => {
        if (!token?.value) return;

        latestTokenRef.current = token.value;
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token.value);

        console.log('[PushSetup] FCM token alındı.');
        await saveTokenToServer(token.value);
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushSetup] registrationError:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushSetup] foreground notification:', notification);

        const notificationData = notification?.data || {};

        toast.success(
          (notification.title || notificationData.title || 'KitapLab') +
            '\n' +
            (notification.body || notificationData.body || 'Yeni bildirimin var.'),
          {
            duration: 6000,
            icon: '🔔',
          }
        );
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        const data = event?.notification?.data || {};
        const url = data?.url;

        if (!url || typeof url !== 'string') return;

        if (url.startsWith('/')) {
          router.push(url);
          return;
        }

        if (
          url.startsWith('https://www.kitaplab.com') ||
          url.startsWith('https://kitaplab.com')
        ) {
          window.location.href = url;
        }
      });

      listenersReadyRef.current = true;

      if (Capacitor.getPlatform() === 'android') {
        await requestPushRegistration();
        await requestPushPermission();
      } else {
        const permissionGranted = await requestPushPermission();

        if (permissionGranted) {
          await requestPushRegistration();
        }
      }
    } catch (error) {
      console.error('[PushSetup] başlatma hatası:', error);
    }
  }, [requestPushPermission, requestPushRegistration, router, saveTokenToServer]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;
    const retryTimers = [];

    const syncPushToken = async (sessionOverride = null) => {
      if (cancelled) return;

      const tokenValue = latestTokenRef.current;

      if (tokenValue) {
        await saveTokenToServer(tokenValue, sessionOverride);
      }

      // Android yedeğinden dönebilecek eski localStorage tokenine güvenme.
      // Her senkronizasyonda Firebase'deki güncel tokeni tekrar doğrula.
      await requestPushRegistration();
    };

    const startPush = async () => {
      const firstPlatform = Capacitor.getPlatform();
      const isLikelyNativeDevice = /Android|iPhone|iPad|iPod/i.test(
        window.navigator.userAgent
      );

      if (firstPlatform === 'web' && !isLikelyNativeDevice) {
        return;
      }

      // Temiz kurulumda Capacitor köprüsü React'ten sonra hazır olabiliyor.
      // Kırılgan "; wv)" kontrolüne güvenmek yerine köprüyü bekle.
      for (let attempt = 1; attempt <= 40 && !cancelled; attempt += 1) {
        if (
          Capacitor.isNativePlatform() &&
          Capacitor.isPluginAvailable('PushNotifications')
        ) {
          await initializePush();
          await syncPushToken();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      console.error('[PushSetup] native push eklentisi bulunamadı.');
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!AUTH_EVENTS.includes(event) || !session) return;

      window.setTimeout(() => {
        syncPushToken(session);
      }, 0);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPushToken();
        requestPushPermission();
      }
    };

    const handleOnline = () => {
      syncPushToken();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    [1500, 4000, 10000, 20000].forEach((delay) => {
      retryTimers.push(
        window.setTimeout(() => {
          syncPushToken();
        }, delay)
      );
    });

    startPush();

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      authListener?.subscription?.unsubscribe();
    };
  }, [
    initializePush,
    requestPushPermission,
    requestPushRegistration,
    saveTokenToServer,
  ]);

  return null;
}
