'use client';

import { Inter } from "next/font/google";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import BanKontrol from "@/components/BanKontrol";
import WarningSystem from "@/components/WarningSystem";
import PushSetup from "@/components/PushSetup";
import RefreshWrapper from "@/components/RefreshWrapper";
import {
  initializeInterstitialSchedule,
  isInterstitialCooldownComplete,
  showInterstitialIfReady,
} from "@/lib/admobHelper";

import { ThemeProvider } from "next-themes";
import { Toaster, toast } from "react-hot-toast";

import { Capacitor } from "@capacitor/core";

const inter = Inter({ subsets: ["latin"] });

const AD_EXCLUDED_PATHS = [
  "/giris",
  "/kayit",
  "/sifre-yenile",
  "/auth",
  "/bakim",
  "/yakinda",
  "/premium",
];

function isAdExcludedPath(pathname) {
  return AD_EXCLUDED_PATHS.some(
    (excludedPath) =>
      pathname === excludedPath || pathname.startsWith(`${excludedPath}/`)
  );
}

export default function ClientRootLayout({
  children,
  isMaintenanceMode = false,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pendingInterstitialPathRef = useRef(null);

  // ✅ anlık path'i ref'te tut
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    initializeInterstitialSchedule();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const handleNavigationClick = (event) => {
      if (
        !event.isTrusted ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        cancelled
      ) {
        return;
      }

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.dataset.noInterstitial === "true"
      ) {
        return;
      }

      const destinationUrl = new URL(anchor.href, window.location.href);
      if (
        destinationUrl.origin !== window.location.origin ||
        destinationUrl.pathname === window.location.pathname ||
        isAdExcludedPath(pathnameRef.current || "/") ||
        isAdExcludedPath(destinationUrl.pathname)
      ) {
        return;
      }

      if (
        cancelled ||
        pendingInterstitialPathRef.current ||
        !isInterstitialCooldownComplete()
      ) {
        return;
      }

      // Linkin normal şekilde açılmasına izin ver. Reklam hedef rota
      // ekrana yerleştirildikten sonra pathname effect'i tarafından gösterilir.
      pendingInterstitialPathRef.current = destinationUrl.pathname;
    };

    document.addEventListener("click", handleNavigationClick, true);

    return () => {
      cancelled = true;
      document.removeEventListener("click", handleNavigationClick, true);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (pendingInterstitialPathRef.current !== pathname) return;

    pendingInterstitialPathRef.current = null;
    let cancelled = false;
    let secondFrame = null;

    // Yeni rotanın en az bir kez boyanmasına fırsat ver; reklam hazırlanırken
    // kullanıcı eski ve donmuş sayfada beklemesin.
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        showInterstitialIfReady().catch((error) => {
          console.error("[ClientRootLayout] interstitial hatası:", error);
        });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  // ✅ Back handler (Android exit, iOS toast)
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  const lastBackPressRef = { current: 0 };
  let cancelled = false;
  let listenerHandle = null;

  const setupBackHandler = async () => {
    const { App } = await import("@capacitor/app");

    if (cancelled) return;

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

    await App.removeAllListeners();

    if (cancelled) return;
    listenerHandle = await App.addListener("backButton", onBack);
  };

  setupBackHandler().catch(() => {});

  return () => {
    cancelled = true;
    listenerHandle?.remove().catch(() => {});
  };
}, [router]);

  // --- BAŞLIK (senin mevcut mantık) ---
  useEffect(() => {
    let baslik = "KitapLab - Kendi Hikayeni Yaz";

    if (pathname === "/giris") baslik = "Giriş Yap | KitapLab";
    else if (pathname === "/kayit") baslik = "Kayıt Ol | KitapLab";
    else if (pathname === "/profil") baslik = "Profilim | KitapLab";
    else if (pathname === "/premium") baslik = "Premium & LabCoin | KitapLab";
    else if (pathname === "/arama") baslik = "Kitap Ara & Keşfet | KitapLab";
    else if (pathname === "/admin") baslik = "Yönetici Paneli | KitapLab";
    else if (pathname === "/bakim") baslik = "Kısa Bir Bakım Molası | KitapLab";
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

  const isMaintenancePage = isMaintenanceMode || pathname === "/bakim";
  const hideNavbar =
    pathname === "/giris" ||
    pathname === "/kayit" ||
    pathname === "/yakinda" ||
    isMaintenancePage;

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>KitapLab - Kendi Hikayeni Yaz, Oku ve Paylaş</title>
        <meta name="description" content="KitapLab ile hayal gücünü serbest bırak." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>

      <body className={`${inter.className} bg-[#fafafa] dark:bg-black text-black dark:text-white transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster
            position="top-center"
            gutter={8}
            containerStyle={{ zIndex: 99999 }}
            toastOptions={{
              duration: 3500,
              success: { duration: 2200 },
              error: { duration: 5000 },
              loading: { duration: 15000 },
              style: {
                maxWidth: 'min(92vw, 420px)',
                wordBreak: 'break-word',
              },
            }}
          />
          {!isMaintenancePage && <PushSetup />}
          {!isMaintenancePage && <BanKontrol />}
          {!isMaintenancePage && <WarningSystem />}

         {!hideNavbar && <Navbar />}
          {!isMaintenancePage && <DesktopSidebar />}
          <main className={!hideNavbar ? "pt-20 min-h-[100dvh] pb-16 md:pb-0" : "min-h-[100dvh]"}>
            {isMaintenancePage ? (
              children
            ) : (
              <RefreshWrapper>
                {children}
              </RefreshWrapper>
            )}
          </main>
          {!hideNavbar && <Footer />}
          {!hideNavbar && <MobileNav />}
        </ThemeProvider>
      </body>
    </html>
  );
}
