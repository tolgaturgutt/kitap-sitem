'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import NavIcon from '@/components/NavIcon';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);
  const closeMenu = () => {
    setIsOpen(false);
    setShowCreateMenu(false);
  };

  const itemClass = (path) =>
    `group flex items-center gap-4 rounded-2xl border p-4 transition-all ${
      isActive(path)
        ? 'border-red-100 bg-red-50 text-red-600 shadow-sm dark:border-red-950/50 dark:bg-red-950/25'
        : 'border-transparent bg-gray-50 text-gray-700 hover:border-red-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-gray-300 dark:hover:border-red-950/50 dark:hover:bg-red-950/20'
    }`;

  const iconClass = (path) =>
    `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
      isActive(path)
        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
        : 'bg-white text-gray-500 shadow-sm group-hover:text-red-600 dark:bg-white/10 dark:text-gray-400'
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="group fixed left-6 top-6 z-[100] hidden h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-lg transition-all hover:border-red-200 hover:text-red-600 md:flex dark:border-gray-800 dark:bg-black"
        aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-1.5">
          <span className={`h-0.5 w-6 bg-current transition-all ${isOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`h-0.5 w-6 bg-current transition-all ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`h-0.5 w-6 bg-current transition-all ${isOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 z-[90] hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 md:block"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[95] hidden h-full w-80 flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out md:flex dark:border-gray-800 dark:bg-[#0a0a0a] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-gray-100 p-8 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-xl font-black text-white shadow-lg shadow-red-600/20">
              K
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter">
                <span className="text-black dark:text-white">Kitap</span>
                <span className="text-red-600">Lab</span>
              </h2>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">Menü</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-6">
          <Link href="/kategori" onClick={closeMenu} className={itemClass('/kategori')}>
            <span className={iconClass('/kategori')}>
              <NavIcon name="category" className="h-[22px] w-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black uppercase tracking-wide">Kategoriler</span>
              <span className="block text-[9px] font-medium opacity-65">Türlere göre keşfet</span>
            </span>
          </Link>

          <Link href="/kitaplarim" onClick={closeMenu} className={itemClass('/kitaplarim')}>
            <span className={iconClass('/kitaplarim')}>
              <NavIcon name="books" className="h-[22px] w-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black uppercase tracking-wide">Kitaplarım</span>
              <span className="block text-[9px] font-medium opacity-65">Eserlerim ve taslaklar</span>
            </span>
          </Link>

          <div>
            <button
              type="button"
              onClick={() => setShowCreateMenu((open) => !open)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-transparent bg-gray-50 p-4 text-gray-700 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-gray-300 dark:hover:border-red-950/50 dark:hover:bg-red-950/20"
              aria-expanded={showCreateMenu}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                <NavIcon name="plus" className={`h-[22px] w-[22px] transition-transform ${showCreateMenu ? 'rotate-45' : ''}`} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-black uppercase tracking-wide">Oluştur</span>
                <span className="block text-[9px] font-medium opacity-65">Pano veya kitap yaz</span>
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-4 w-4 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showCreateMenu && (
              <div className="ml-6 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Link
                  href="/pano-ekle"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 transition-all hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/20"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50">
                    <NavIcon name="pin" className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block text-xs font-black uppercase text-gray-800 dark:text-white">Pano Oluştur</span>
                    <span className="block text-[8px] text-gray-500">Düşüncelerini paylaş</span>
                  </span>
                </Link>

                <Link
                  href="/kitap-ekle"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 transition-all hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-950/20"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50">
                    <NavIcon name="write" className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block text-xs font-black uppercase text-gray-800 dark:text-white">Kitap Yaz</span>
                    <span className="block text-[8px] text-gray-500">Hikayeni anlat</span>
                  </span>
                </Link>

                <Link
                  href="/kitap-ekle?tur=sesli"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 transition-all hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-black">
                    🎙️
                  </span>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="block text-xs font-black uppercase text-gray-800 dark:text-white">Sesli Kitap Ekle</span>
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[7px] font-black uppercase text-black">Premium</span>
                    </span>
                    <span className="block text-[8px] text-gray-500">Podcast tarzı eser oluştur</span>
                  </span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/etkinlikler" onClick={closeMenu} className={itemClass('/etkinlikler')}>
            <span className={iconClass('/etkinlikler')}>
              <NavIcon name="calendar" className="h-[22px] w-[22px]" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-black uppercase tracking-wide">Etkinlikler</span>
              <span className="block text-[9px] font-medium opacity-65">Yarışmalar ve duyurular</span>
            </span>
          </Link>

          <Link href="/siralama" onClick={closeMenu} className={itemClass('/siralama')}>
            <span className={iconClass('/siralama')}>
              <NavIcon name="ranking" className="h-[22px] w-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black uppercase tracking-wide">Sıralama</span>
              <span className="block text-[9px] font-medium opacity-65">En popüler yazarlar</span>
            </span>
          </Link>
        </nav>

        <div className="border-t border-gray-100 p-6 dark:border-gray-800">
          <p className="text-center text-[9px] font-black uppercase tracking-widest text-gray-400">
            KitapLab © 2026
          </p>
        </div>
      </aside>
    </>
  );
}
