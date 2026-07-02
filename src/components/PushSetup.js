'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'react-hot-toast';

export default function PushSetup() {
  useEffect(() => {
    // Sadece mobil uygulamada (Android/iOS) çalışsın, web tarayıcılarında hata patlatmasın
    if (Capacitor.isNativePlatform()) {
      initializePush();
    }
  }, []);

  const initializePush = async () => {
    try {
      // 1. Kullanıcıdan Bildirim İzni İste
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      // Kullanıcı reddettiyse zorlamıyoruz, işlemi kesiyoruz
      if (permStatus.receive !== 'granted') {
        return;
      }

      // 2. İzin verildiyse cihazı Firebase sistemine kaydet
      await PushNotifications.register();

      // 3. Firebase'den Bize Özel Token (Kimlik) Geldiğinde
      PushNotifications.addListener('registration', (token) => {
        console.log('🔥 Firebase FCM Token Geldi:', token.value);
        
        // NOT: Bir sonraki aşamada bu token.value değerini alıp 
        // Supabase'deki giriş yapmış kullanıcının veritabanı satırına kaydedeceğiz!
      });

      // Kayıt sırasında hata olursa
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Kayıt Hatası:', error);
      });

      // 4. Uygulama AÇIKKEN (ekrandayken) bildirim gelirse üstten Toast mesajı olarak düşür
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.success(`${notification.title}\n${notification.body}`, {
          duration: 4000,
          icon: '🔔',
        });
      });

      // 5. Kullanıcı telefonun üst menüsünden bildirime TIKLADIĞINDA
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Bildirime tıklandı, yönlendirme yapılabilir:', notification);
      });

    } catch (error) {
      console.error('Push Notification başlatılırken hata oluştu:', error);
    }
  };

  return null; // Bu bileşen ekranda hiçbir şey göstermeyecek, sadece beyni çalıştıracak
}