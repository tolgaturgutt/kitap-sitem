'use client';

import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import MobileNav from "@/components/MobileNav";

// --- YENİ EKLENEN IMPORTLAR ---
import BanKontrol from '@/components/BanKontrol';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // useEffect: Sayfa değişimlerini dinler ve başlığı günceller
  useEffect(() => {
    setMounted(true);

    let baslik = "KitapLab - Kendi Hikayeni Yaz"; // Ana Sayfa Varsayılanı

    // --- KLASÖRLERİNE GÖRE BAŞLIK AYARLARI ---
    
    // 1. Temel Sayfalar
    if (pathname === '/giris') {
      baslik = "Giriş Yap | KitapLab";
    } 
    else if (pathname === '/kayit') {
      baslik = "Kayıt Ol | KitapLab";
    }
    else if (pathname === '/profil') {
      baslik = "Profilim | KitapLab";
    }
    else if (pathname === '/arama') {
      baslik = "Kitap Ara & Keşfet | KitapLab";
    }
    else if (pathname === '/admin') {
      baslik = "Yönetici Paneli | KitapLab";
    }

    // 2. Kitap İşlemleri (kitap-ekle, kitap-duzenle)
    else if (pathname === '/kitap-ekle') {
      baslik = "Yeni Kitap Yaz | KitapLab";
    }
    else if (pathname.startsWith('/kitap-duzenle/')) {
      baslik = "Kitap Düzenle | KitapLab";
    }

    // 3. Yazar ve Kategori
    else if (pathname.startsWith('/yazar/')) {
      baslik = "Yazar Profili | KitapLab";
    }
    else if (pathname.startsWith('/kategori/')) {
      baslik = "Kategori İncele | KitapLab";
    }

    // 4. Kitap Detay ve Okuma (En Karmaşık Kısım)
    else if (pathname.startsWith('/kitap/')) {
      // URL içinde 'bolum' geçiyorsa okuma ekranıdır
      if (pathname.includes('/bolum/')) {
        baslik = "Keyifli Okumalar | KitapLab";
      } 
      // 'bolum-ekle' geçiyorsa
      else if (pathname.includes('/bolum-ekle')) {
        baslik = "Yeni Bölüm Ekle | KitapLab";
      }
      // Hiçbiri yoksa sadece kitap detayıdır
      else {
        baslik = "Kitap Detayı | KitapLab";
      }
    }

    // Başlığı tarayıcıya bas
    document.title = baslik;
    
  }, [pathname]);

  // Navbar ve Footer'ı gizlenecek sayfalar
  const hideNavbar = pathname === '/giris' || pathname === '/kayit' || pathname === '/yakinda';

  return (
    <html lang="tr" suppressHydrationWarning>
      
      <head>
        <title>KitapLab - Kendi Hikayeni Yaz</title>
        <meta name="description" content="KitapLab ile kendi hikayeni yaz, okurlarla buluş." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={`${inter.className} bg-[#fafafa] dark:bg-black text-black dark:text-white transition-colors duration-300`}>
        
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          <Toaster position="top-center" /> 
          <BanKontrol /> 

          {mounted ? (
            <>
              {!hideNavbar && <Navbar />}
              
              {/* ANA İÇERİK */}
              <main className={!hideNavbar ? "pt-20 min-h-screen" : "min-h-screen"}>
                {children}
              </main>

              {/* FOOTER: Sadece giriş/kayıt/yakında sayfasında değilse göster */}
              {!hideNavbar && <Footer />}
              
              {/* MOBİL ALT MENÜ: Sadece giriş/kayıt/yakında sayfasında değilse göster */}
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