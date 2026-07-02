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
      // 1. İzin durumunu kontrol et
      let permStatus = await PushNotifications.checkPermissions();

      // İzin 'granted' değilse (yani daha önce verilmediyse), zorla iste
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }

      // Kullanıcı izni kesin olarak reddettiyse (denied), işlemi burada bitir
      if (permStatus.receive !== 'granted') {
        console.log('Kullanıcı bildirimleri reddetti.');
        return;
      }

      // 2. İzin alındıysa, kurye şirketine (Firebase) kaydı yap
      await PushNotifications.register();

      // 3. Firebase'den bize özel "Cihaz Kimlik Kartı" (Token) geldiğinde
      PushNotifications.addListener('registration', (token) => {
        console.log('🔥 Firebase FCM Token başarıyla alındı:', token.value);
        // İLERİDE: token.value değerini Supabase'e kaydedeceğiz.
      });

      // Kayıt sırasında hata olursa (internet yoksa vb.)
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push Kayıt Hatası:', error);
      });

      // 4. Uygulama AÇIKKEN bildirim gelirse
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.success(`${notification.title}\n${notification.body}`, {
          duration: 4000,
          icon: '🔔',
        });
      });

      // 5. Bildirime TIKLANDIĞINDA
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Bildirime tıklandı:', notification);
      });

    } catch (error) {
      console.error('Push kurulumunda kritik hata:', error);
    }
  };

  return null; // Bu bileşen ekranda hiçbir şey göstermeyecek, sadece beyni çalıştıracak
}