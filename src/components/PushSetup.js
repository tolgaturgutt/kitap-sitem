'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function PushSetup() {
  const latestTokenRef = useRef(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializePush();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && latestTokenRef.current) {
        saveTokenToSupabase(latestTokenRef.current);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const saveTokenToSupabase = async (tokenValue) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        toast.error(`getUser hatası: ${userError.message}`, { duration: 8000 });
        return;
      }

      if (!user?.email) {
        toast.error('Kullanıcı bulunamadı (giriş yapılmamış görünüyor)', { duration: 8000 });
        return;
      }

      toast(`Kaydediliyor: ${user.email}`, { duration: 5000 });

      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_email: user.email,
            token: tokenValue,
            platform: Capacitor.getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );

      if (error) {
        toast.error(`Kayıt hatası: ${error.message}`, { duration: 10000 });
        console.error('Token kaydetme hatası:', error);
      } else {
        toast.success('Token Supabase\'e kaydedildi ✅', { duration: 6000 });
      }
    } catch (err) {
      toast.error(`Genel hata: ${err.message}`, { duration: 8000 });
      console.error('Token kaydetme genel hata:', err);
    }
  };

  const initializePush = async () => {
    try {
      toast('initializePush başladı', { duration: 3000 });

      let permStatus = await PushNotifications.checkPermissions();
      toast(`checkPermissions: ${permStatus.receive}`, { duration: 5000 });

      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
        toast(`requestPermissions: ${permStatus.receive}`, { duration: 5000 });
      }

      if (permStatus.receive !== 'granted') {
        toast.error('İzin verilmedi, register çağrılmıyor', { duration: 6000 });
        return;
      }

      await PushNotifications.register();
      toast('register() çağrıldı', { duration: 3000 });

      PushNotifications.addListener('registration', (token) => {
        toast.success('Token alındı, kaydediliyor...', { duration: 4000 });
        latestTokenRef.current = token.value;
        saveTokenToSupabase(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        toast.error(`Registration hatası: ${JSON.stringify(error)}`, { duration: 8000 });
        console.error('Push Kayıt Hatası:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.success(`${notification.title}\n${notification.body}`, {
          duration: 4000,
          icon: '🔔',
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Bildirime tıklandı:', notification);
      });

    } catch (error) {
      toast.error(`Kritik hata: ${error?.message || JSON.stringify(error)}`, { duration: 8000 });
      console.error('Push kurulumunda kritik hata:', error);
    }
  };

  return null;
}