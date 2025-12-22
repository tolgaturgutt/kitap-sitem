'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export default function BanKontrol() {
  const router = useRouter();
  const pathname = usePathname(); // Sayfa değişimini takip etmek için

  useEffect(() => {
    const kontrolEt = async () => {
      // 1. Şu anki oturumu al
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return; // Giriş yapmamışsa zaten sorun yok

      // 2. Veritabanından ban durumuna bak
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', session.user.id)
        .single();

      // 3. Eğer BANLANMIŞSA
      if (profile && profile.is_banned) {
        await supabase.auth.signOut(); // Oturumu kapat
        toast.error('HESABINIZ YASAKLANDI! Sistemden atılıyorsunuz...');
        
        // 4. Giriş sayfasına fırlat
        router.replace('/giris'); 
        window.location.reload(); // Garanti olsun diye sayfayı yenile
      }
    };

    kontrolEt();
  }, [pathname]); // Her sayfa değiştirdiğinde (pathname değişince) çalışır

  return null; // Bu bileşen ekranda bir şey göstermez, gizli çalışır.
}