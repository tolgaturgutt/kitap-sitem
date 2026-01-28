'use client';

import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation"; // 👈 useRouter eklendi
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import BanKontrol from '@/components/BanKontrol';
import WarningSystem from '@/components/WarningSystem';
import { Toaster } from 'react-hot-toast';
import { App } from '@capacitor/app'; // 👈 Capacitor App eklendi

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter(); // 👈 Router tanımlandı
  const [mounted, setMounted] = useState(false);

  // 🔥 MOBİL GERİ TUŞU AYARI (Capacitor & Android İçin)
  useEffect(() => {
    let backButtonListener;

    const setupListener = async () => {
      try {
        // Capacitor'ün geri tuşunu dinliyoruz
        backButtonListener = await App.addListener('backButton', (data) => {
          // Eğer ana sayfada veya giriş sayfasındaysak uygulamadan çık
          if (pathname === '/' || pathname === '/giris') {
            App.exitApp(); 
          } else {
            // Diğer sayfalardaysak bir geri git (Tarayıcı geçmişi gibi)
            router.back();
          }
        });
      } catch (error) {
        // Web ortamında çalışıyorsa hata vermesin diye sessizce geçiyoruz
        console.log("Web ortamında geri tuşu dinleyicisi aktif değil.");
      }
    };

    setupListener();

    // Temizlik: Sayfa değişirse dinleyiciyi kaldır ki çakışma olmasın
    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [pathname, router]); // Adres değişince güncel konumu bilsin

  useEffect(() => {
    setMounted(true);
    let baslik = "KitapLab - Kendi Hikayeni Yaz";

    // --- BAŞLIK AYARLARI ---
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
        
        {/* 👇 Google'ın o dünya ikonunu silmesi için gereken satırlar */}
        <link rel="icon" href="/logo.png" sizes="any" /> 
        <link rel="icon" href="/icon.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>

      {/* 👇 DÜZELTİLEN YER: Style içindeki paddingBottom'u kaldırdık. Artık siteyi yukarı itmeyecek. */}
      <body className={`${inter.className} bg-[#fafafa] dark:bg-black text-black dark:text-white transition-colors duration-300`}>
        
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-center" /> 
          <BanKontrol /> 
          <WarningSystem /> {/* Hayalet Katman */}

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