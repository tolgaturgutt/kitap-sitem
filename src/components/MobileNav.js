'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

export default function MobileNav() {
  const pathname = usePathname();
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [platform, setPlatform] = useState('web'); // web | android | ios
  const [androidInset, setAndroidInset] = useState(0);

  /* ---------------- PLATFORM TESPİT ---------------- */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setPlatform('web');
      return;
    }

    const p = Capacitor.getPlatform();
    setPlatform(p);

    // 🔥 ANDROID TUŞ BAR GERÇEK ÖLÇÜM
    if (p === 'android' && window.visualViewport) {
      const updateInset = () => {
        const diff = window.innerHeight - window.visualViewport.height;
        setAndroidInset(diff > 0 ? diff : 0);
      };

      updateInset();
      window.visualViewport.addEventListener('resize', updateInset);

      return () => {
        window.visualViewport.removeEventListener('resize', updateInset);
      };
    }
  }, []);

  const isActive = (path) => pathname === path;

  const handleComingSoon = () => {
    toast.dismiss('coming-soon');
    toast('Yakında kullanımda! 🚀', {
      id: 'coming-soon',
      icon: '⏳',
      duration: 2000,
      position: 'top-center',
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
    });
  };

  /* ---------------- INSET HESAPLARI ---------------- */
  const bottomInset =
    platform === 'ios'
      ? 'env(safe-area-inset-bottom)'
      : platform === 'android'
      ? `${androidInset}px`
      : '0px';

  const plusMenuBottom =
    platform === 'ios'
      ? 'calc(72px + env(safe-area-inset-bottom))'
      : platform === 'android'
      ? `calc(72px + ${androidInset}px)`
      : '72px';

  return (
    <>
      {/* PLUS MENÜ */}
      {showPlusMenu && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          onClick={() => setShowPlusMenu(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[160px] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-red-600/20 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            style={{ bottom: plusMenuBottom }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1.5">
              <Link
                href="/pano-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <div className="text-lg">📌</div>
                <p className="font-black text-xs text-red-600">Pano Oluştur</p>
              </Link>

              <Link
                href="/kitap-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <div className="text-lg">✏️</div>
                <p className="font-black text-xs text-red-600">Kitap Yaz</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: bottomInset }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          <Link
            href="/kategori"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/kategori')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">⭐</div>
            <span className="text-[8px] font-black uppercase">Kategori</span>
          </Link>

          <Link
            href="/kitaplarim"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/kitaplarim')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">📖</div>
            <span className="text-[8px] font-black uppercase">Kitaplarım</span>
          </Link>

          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`flex flex-col items-center justify-center w-[68px] h-16 transition-all ${
              showPlusMenu
                ? 'text-red-600 scale-110'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div
              className={`text-3xl transition-transform ${
                showPlusMenu ? 'rotate-45' : ''
              }`}
            >
              ➕
            </div>
            <span className="text-[8px] font-black uppercase">Oluştur</span>
          </button>

          <button
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center w-[68px] h-16 text-gray-400 hover:text-red-600 relative"
          >
            <div className="text-2xl">🎉</div>
            <span className="text-[8px] font-black uppercase">Etkinlik</span>
            <span className="absolute top-1 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          </button>

          <Link
            href="/siralama"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/siralama')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">🏆</div>
            <span className="text-[8px] font-black uppercase">Sıralama</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
