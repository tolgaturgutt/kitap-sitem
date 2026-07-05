'use client';

import { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { getAdminEmails } from '@/lib/admins';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

export default function MobileNav() {
  const pathname = usePathname();
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const viewportBaselineRef = useRef(0);

  /* ---------------- ADMIN KONTROLÜ ---------------- */
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const adminEmails = (await getAdminEmails()).map(email => email.toLowerCase());
      setIsAdmin(adminEmails.includes(user.email.toLowerCase()));
    }
    checkAdmin();
  }, []);

  /* ---------------- PLATFORM TESPİT ---------------- */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let orientationTimer;

    const updateViewport = () => {
      const viewportHeight = viewport.height;

      if (
        viewportBaselineRef.current === 0 ||
        viewportHeight > viewportBaselineRef.current
      ) {
        viewportBaselineRef.current = viewportHeight;
      }

      const keyboardHeight = viewportBaselineRef.current - viewportHeight;
      const keyboardOpen = keyboardHeight > 150;

      setIsKeyboardOpen(keyboardOpen);
      document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        `${viewportHeight}px`
      );

      if (keyboardOpen) setShowPlusMenu(false);
    };

    const resetViewportBaseline = () => {
      viewportBaselineRef.current = 0;
      window.clearTimeout(orientationTimer);
      orientationTimer = window.setTimeout(updateViewport, 300);
    };

    updateViewport();
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    window.addEventListener('orientationchange', resetViewportBaseline);

    return () => {
      window.clearTimeout(orientationTimer);
      viewport.removeEventListener('resize', updateViewport);
      viewport.removeEventListener('scroll', updateViewport);
      window.removeEventListener('orientationchange', resetViewportBaseline);
      document.documentElement.classList.remove('keyboard-open');
      document.documentElement.style.removeProperty('--visual-viewport-height');
    };
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
  const bottomInset = 'env(safe-area-inset-bottom)';


  const plusMenuBottom = 'calc(72px + env(safe-area-inset-bottom))';

return (
    <>
      {/* PLUS MENÜ */}
      {showPlusMenu && !isKeyboardOpen && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          onClick={() => setShowPlusMenu(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[160px] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-red-600/20 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            style={{ bottom: plusMenuBottom, WebkitTextSizeAdjust: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1.5">
              <Link
                href="/pano-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <div className="text-[18px]">📌</div>
                <p className="font-black text-[12px] whitespace-nowrap text-red-600">Pano Oluştur</p>
              </Link>

              <Link
                href="/kitap-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <div className="text-[18px]">✏️</div>
                <p className="font-black text-[12px] whitespace-nowrap text-red-600">Kitap Yaz</p>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav
        className={`${isKeyboardOpen ? 'hidden' : 'md:hidden'} fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]`}
        style={{ paddingBottom: bottomInset, WebkitTextSizeAdjust: '100%' }}
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
            <div className="text-[24px]">⭐</div>
            <span className="text-[8px] font-black uppercase whitespace-nowrap">Kategori</span>
          </Link>

          <Link
            href="/kitaplarim"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/kitaplarim')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-[24px]">📖</div>
            <span className="text-[8px] font-black uppercase whitespace-nowrap">Kitaplarım</span>
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
              className={`text-[30px] transition-transform ${
                showPlusMenu ? 'rotate-45' : ''
              }`}
            >
              ➕
            </div>
            <span className="text-[8px] font-black uppercase whitespace-nowrap">Oluştur</span>
          </button>

      <Link
            href="/etkinlikler"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/etkinlikler')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            } relative`}
          >
            <div className="text-[24px]">🎉</div>
            <span className="text-[8px] font-black uppercase whitespace-nowrap">Etkinlik</span>
           
          </Link>

          <Link
            href="/siralama"
            className={`flex flex-col items-center justify-center w-[68px] h-16 ${
              isActive('/siralama')
                ? 'text-red-600'
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-[24px]">🏆</div>
            <span className="text-[8px] font-black uppercase whitespace-nowrap">Sıralama</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
//hbrthryg
//deneme
