'use client';

import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import BanKontrol from '@/components/BanKontrol';
import WarningSystem from '@/components/WarningSystem';
import { Toaster, toast } from 'react-hot-toast'; // Toast aktif
import { App } from '@capacitor/app';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 🔥 GÜNCELLENMİŞ GERİ TUŞU AYARI (DEBUG MODU)
  useEffect(() => {
    let backButtonListener;

    const setupListener = async () => {
      try {
        backButtonListener = await App.addListener('backButton', (data) => {
          // 1. Doğrudan tarayıcının o anki adresini al (En Garantisi)
          const currentPath = window.location.pathname;

          // 🔍 DEBUG: Bu satır sayesinde hangi adreste olduğunu göreceksin
          // Sorun çözülünce bu satırı silebilirsin.
          // toast(`Konum: ${currentPath}`, { icon: '📍', duration: 2000 });

          // 2. Kontrolü yap (Hem '/' hem de boş string kontrolü ekledim)
          if (currentPath === '/' || currentPath === '' || currentPath === '/giris') {
            // Ana sayfadaysak çık
            App.exitApp(); 
          } else {
            // Değilsek geri git
            router.back();
          }
        });
      } catch (error) {
        console.log("Web ortamında geri tuşu çalışmaz.");
      }
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []); // Sadece ilk açılışta 1 kere kurulur

  // --- BAŞLIK AYARLARI (AYNEN DEVAM) ---
  useEffect(() => {
    setMounted(true);
    let baslik = "KitapLab - Kendi Hikayeni Yaz";

    if (pathname === '/giris') baslik = "Giriş Yap | KitapLab";
    else if (pathname === '/kayit') baslik = "Kayıt Ol | KitapLab";
    // ... diğer başlıklar aynen kalsın
    
    document.title = baslik;
  }, [pathname]);

  const hideNavbar = pathname === '/giris' || pathname === '/kayit' || pathname === '/yakinda';

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>KitapLab - Kendi Hikayeni Yaz, Oku ve Paylaş</title>
        <meta name="description" content="KitapLab ile hayal gücünü serbest bırak." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/logo.png" sizes="any" /> 
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>

      <body className={`${inter.className} bg-[#fafafa] dark:bg-black text-black dark:text-white transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-center" /> 
          <BanKontrol /> 
          <WarningSystem />

          {mounted ? (
            <>
              {!hideNavbar && <Navbar />}
              <DesktopSidebar />
              <main className={!hideNavbar ? "pt-20 min-h-[100dvh] pb-16 md:pb-0" : "min-h-[100dvh]"}>
                {children}
              </main>
              {!hideNavbar && <Footer />}
              {!hideNavbar && <MobileNav />}
            </>
          ) : (
            <main className={!hideNavbar ? "pt-20" : ""}>
              {children}
            </main>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}