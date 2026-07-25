'use client';

import { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import NavIcon from '@/components/NavIcon';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

export default function MobileNav() {
  const pathname = usePathname();
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const viewportBaselineRef = useRef(0);

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
            className="absolute left-1/2 -translate-x-1/2 w-[176px] bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            style={{ bottom: plusMenuBottom, WebkitTextSizeAdjust: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1.5">
              <Link
                href="/pano-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50">
                  <NavIcon name="pin" className="h-[17px] w-[17px]" />
                </span>
                <p className="font-black text-[11px] whitespace-nowrap text-gray-800 dark:text-white">Pano Oluştur</p>
              </Link>

              <Link
                href="/kitap-ekle"
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50">
                  <NavIcon name="write" className="h-[17px] w-[17px]" />
                </span>
                <p className="font-black text-[11px] whitespace-nowrap text-gray-800 dark:text-white">Kitap Yaz</p>
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
        <div className="flex h-[68px] items-center gap-1 px-2 pt-1">
          <Link
            href="/kategori"
            className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95 ${
              isActive('/kategori')
                ? 'bg-red-50 text-red-600 dark:bg-red-950/25'
                : 'text-gray-400 hover:bg-gray-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-white/5'
            }`}
          >
            <NavIcon name="category" />
            <span className="text-[7px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Kategori</span>
          </Link>

          <Link
            href="/kitaplarim"
            className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95 ${
              isActive('/kitaplarim')
                ? 'bg-red-50 text-red-600 dark:bg-red-950/25'
                : 'text-gray-400 hover:bg-gray-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-white/5'
            }`}
          >
            <NavIcon name="books" />
            <span className="text-[7px] font-black uppercase tracking-[0.06em] whitespace-nowrap">Kitaplarım</span>
          </Link>

          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`flex h-[60px] flex-1 flex-col items-center justify-center transition-all active:scale-95 ${
              showPlusMenu
                ? 'text-red-600'
                : 'text-gray-500 hover:text-red-600'
            }`}
            aria-label="Oluştur menüsünü aç"
          >
            <span
              className={`flex h-9 w-9 -translate-y-1 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/25 transition-transform ${
                showPlusMenu ? 'rotate-45' : ''
              }`}
            >
              <NavIcon name="plus" className="h-5 w-5" />
            </span>
            <span className="text-[7px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Oluştur</span>
          </button>

          <Link
            href="/etkinlikler"
            className={`relative flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95 ${
              isActive('/etkinlikler')
                ? 'bg-red-50 text-red-600 dark:bg-red-950/25'
                : 'text-gray-400 hover:bg-gray-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-white/5'
            }`}
          >
            <NavIcon name="calendar" />
            <span className="text-[7px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Etkinlik</span>
          </Link>

          <Link
            href="/siralama"
            className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95 ${
              isActive('/siralama')
                ? 'bg-red-50 text-red-600 dark:bg-red-950/25'
                : 'text-gray-400 hover:bg-gray-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-white/5'
            }`}
          >
            <NavIcon name="ranking" />
            <span className="text-[7px] font-black uppercase tracking-[0.06em] whitespace-nowrap">Sıralama</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
