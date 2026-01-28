'use client';

import { Inter } from "next/font/google";
import "./globals.css";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import BanKontrol from "@/components/BanKontrol";
import WarningSystem from "@/components/WarningSystem";

import { ThemeProvider } from "next-themes";
import { Toaster, toast } from "react-hot-toast";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // ✅ anlık path'i ref'te tut
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

// ✅ Back handler (Android exit, iOS toast)
useEffect(() => {
  const lastBackPressRef = { current: 0 };

  const onBack = () => {
    const currentPath = pathnameRef.current || "/";

    // ✅ Ana sayfa: 1 uyarı, 2. basışta (Android) çık
    if (currentPath === "/") {
      const now = Date.now();

      if (Capacitor.getPlatform() !== "android") {
        toast("Çıkmak için tekrar basın", {
          icon: "🚪",
          duration: 2000,
        });
        return;
      }

      if (now - lastBackPressRef.current < 2000) {
        App.exitApp();
        return;
      }

      lastBackPressRef.current = now;
      toast("Çıkmak için tekrar basın", {
        icon: "🚪",
        duration: 2000,
        style: { background: "#333", color: "#fff" },
      });
      return;
    }

    router.back();
  };

  // 🔥 Önce tüm listenerleri temizle
  App.removeAllListeners();
  
  // 🔥 Sonra yenisini ekle
  const handle = App.addListener("backButton", onBack);

  return () => {
    handle.then(h => h?.remove()).catch(() => {});
  };
}, [router]);

  // --- BAŞLIK (senin mevcut mantık) ---
  useEffect(() => {
    setMounted(true);

    let baslik = "KitapLab - Kendi Hikayeni Yaz";

    if (pathname === "/giris") baslik = "Giriş Yap | KitapLab";
    else if (pathname === "/kayit") baslik = "Kayıt Ol | KitapLab";
    else if (pathname === "/profil") baslik = "Profilim | KitapLab";
    else if (pathname === "/arama") baslik = "Kitap Ara & Keşfet | KitapLab";
    else if (pathname === "/admin") baslik = "Yönetici Paneli | KitapLab";
    else if (pathname === "/kitap-ekle") baslik = "Yeni Kitap Yaz | KitapLab";
    else if (pathname.startsWith("/kitap-duzenle/")) baslik = "Kitap Düzenle | KitapLab";
    else if (pathname.startsWith("/yazar/")) baslik = "Yazar Profili | KitapLab";
    else if (pathname.startsWith("/kategori/")) baslik = "Kategori İncele | KitapLab";
    else if (pathname.startsWith("/kitap/")) {
      if (pathname.includes("/bolum/")) baslik = "Keyifli Okumalar | KitapLab";
      else if (pathname.includes("/bolum-ekle")) baslik = "Yeni Bölüm Ekle | KitapLab";
      else baslik = "Kitap Detayı | KitapLab";
    }

    document.title = baslik;
  }, [pathname]);

  const hideNavbar = pathname === "/giris" || pathname === "/kayit" || pathname === "/yakinda";

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
            <main className={!hideNavbar ? "pt-20" : ""}>{children}</main>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}