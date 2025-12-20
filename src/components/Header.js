'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Sayfa açılınca "Kim bu?" diye kontrol et
  useEffect(() => {
    // 1. Mevcut durumu al
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // 2. Giriş/Çıkış yaparsa anında algıla
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.refresh(); // Çıkış yapınca sayfayı yenile
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function cikisYap() {
    await supabase.auth.signOut();
    router.push('/giris');
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="text-2xl font-black tracking-tighter">
          <span className="text-black dark:text-white">Yazio</span>
          <span className="text-red-600">.</span>
        </Link>

        {/* SAĞ TARAF (MENÜ) */}
        <nav className="flex items-center gap-4 text-sm font-medium">
          
          {user ? (
            // --- GİRİŞ YAPMIŞSA BUNLAR GÖRÜNSÜN ---
            <>
              <Link href="/kitap-ekle" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition">
                + Kitap Yaz
              </Link>
              
              <Link href="/profil" className="px-4 py-2 bg-trabzon text-white rounded-full hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">
                👤 Profilim
              </Link>

              <button 
                onClick={cikisYap} 
                className="text-gray-400 hover:text-red-500 transition"
              >
                Çıkış
              </button>
            </>
          ) : (
            // --- GİRİŞ YAPMAMIŞSA SADECE BU GÖRÜNSÜN ---
            <Link href="/giris" className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition">
              Giriş Yap
            </Link>
          )}

        </nav>
      </div>
    </header>
  );
}