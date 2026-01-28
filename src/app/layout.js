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
import { Toaster } from 'react-hot-toast';
import { App } from '@capacitor/app';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 🔥 ÖNEMLİ: Hangi sayfada olduğumuzu anlık takip etmek için Ref kullanıyoruz
  const pathnameRef = useRef(pathname);

  // 1. Sayfa her değiştiğinde bu Ref'i güncelle (Canlı Takip)
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 2. Geri Tuşu Dinleyicisini SADECE BİR KERE KUR (Ömürlük)
  useEffect(() => {
    let backButtonListener;

    const setupListener = async () => {
      try {
        backButtonListener = await App.addListener('backButton', (data) => {
          // Dinleyicinin içindeyken en güncel sayfayı Ref'ten okuyoruz
          // (Eski yöntemde burası karışıyordu, şimdi garanti)
          const currentPath = pathnameRef.current;
          
          if (currentPath === '/' || currentPath === '/giris') {
            // Ana sayfa veya girişteysek -> Uygulamadan Çık
            App.exitApp(); 
          } else {
            // Diğer sayfalardaysak -> Bir geri git
            router.back();
          }
        });
      } catch (error) {
        console.log("Web ortamında geri tuşu dinleyicisi aktif değil.");
      }
    };

    setupListener();

    // Temizlik: Sadece uygulama tamamen kapanırsa silinsin
    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []); // 👈 BOŞ DİZİ: Bu kod sadece uygulama ilk açıldığında 1 kere çalışır, bir daha bozulmaz.

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
//.deneme