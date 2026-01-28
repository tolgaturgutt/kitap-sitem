'use client';

import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";
// 👇 useRef eklendi
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import BanKontrol from '@/components/BanKontrol';
import WarningSystem from '@/components/WarningSystem';
import { Toaster, toast } from 'react-hot-toast'; // 👈 toast eklendi
import { App } from '@capacitor/app';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 🔥 Canlı Takip İçin Ref
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 🔥 MOBİL GERİ TUŞU AYARI (Capacitor)
  useEffect(() => {
    let backButtonListener;

    const setupListener = async () => {
      try {
        backButtonListener = await App.addListener('backButton', (data) => {
          const currentPath = pathnameRef.current;
          
          // Test Amaçlı Bildirim (Çalışınca Silebilirsin)
          // toast('Geri tuşu algılandı', { icon: '🔙', duration: 1000 });

          if (currentPath === '/' || currentPath === '/giris') {
            // Ana sayfadaysak çık
            App.exitApp(); 
          } else {
            // Değilsek bir geri git
            router.back();
          }
        });
      } catch (error) {
        console.log("Web ortamında geri tuşu dinleyicisi aktif değil.");
      }
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []);

  // --- BAŞLIK AYARLARI ---
  useEffect(() => {
    setMounted(true);
    let baslik = "KitapLab - Kendi Hikayeni Yaz";

    if (pathname === '/giris') baslik = "Giriş Yap | KitapLab";
    else if (pathname === '/kayit') baslik = "Kayıt Ol | KitapLab";
    else if (pathname === '/profil') baslik = "Profilim | KitapLab";
    else if (pathname === '/arama') baslik = "Kitap Ara & Keşfet | KitapLab";
    else if (pathname === '/admin') baslik = "Yönetici Paneli | KitapLab";
    else if (pathname === '/kitap-ekle') baslik = "Yeni Kitap Yaz | KitapLab";
    else if (pathname.startsWith('/kitap-duzenle/')) baslik = "Kitap Düzenle | KitapLab";
    else if (pathname.startsWith('/yazar/')) baslik = "Yazar Profili | KitapLab";
    else if (pathname.startsWith('/kategori/')) baslik = "Kategori İncele | KitapLab";
    else if (pathname.startsWith('/kitap/')) {
      if (pathname.includes('/bolum/')) baslik = "Keyifli Okumalar | KitapLab";
      else if (pathname.includes('/bolum-ekle')) baslik = "Yeni Bölüm Ekle | KitapLab";
      else baslik = "Kitap Detayı | KitapLab";
    }
    document.title = baslik;
  }, [pathname]);

  const hideNavbar = pathname === '/giris' || pathname === '/kayit' || pathname === '/yakinda';

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>KitapLab - Kendi Hikayeni Yaz, Oku ve Paylaş</title>
        <meta name="description" content="KitapLab ile hayal gücünü serbest bırak. Kendi hikayeni yaz, binlerce ücretsiz kitabı oku ve yazarlarla etkileşime geç." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        <link rel="icon" href="/logo.png" sizes="any" /> 
        <link rel="icon" href="/icon.png" type="image/png" sizes="48x48" />
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