'use client';

import { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

function NavIcon({ name, className = 'h-5 w-5' }) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'category') {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="14" width="6.5" height="6.5" rx="1.5" />
      </svg>
    );
  }

  if (name === 'books') {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h3M8 17h7" />
      </svg>
    );
  }

  if (name === 'ranking') {
    return (
      <svg {...commonProps}>
        <path d="M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9M3 20h18" />
      </svg>
    );
  }

  if (name === 'pin') {
    return (
      <svg {...commonProps}>
        <path d="m8 4 8 8M14.5 3.5l6 6-3 1.5-5 5-1.5 3-6-6 3-1.5 5-5zM5 19l-2 2" />
      </svg>
    );
  }

  if (name === 'write') {
    return (
      <svg {...commonProps}>
        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4M4 20l1-4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
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
