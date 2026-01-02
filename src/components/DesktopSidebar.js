'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const isActive = (path) => pathname === path;

  const handleComingSoon = () => {
    toast('Yakında kullanımda! 🚀', {
      icon: '⏳',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
    setIsOpen(false);
  };

  return (
    <>
      {/* HAMBURGER BUTONU - Sadece masaüstünde görünür */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex fixed top-6 left-6 z-[100] w-12 h-12 bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 rounded-2xl items-center justify-center hover:border-red-600 transition-all shadow-lg group"
      >
        <div className="flex flex-col gap-1.5">
          <span className={`w-6 h-0.5 bg-gray-600 dark:bg-gray-400 group-hover:bg-red-600 transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`w-6 h-0.5 bg-gray-600 dark:bg-gray-400 group-hover:bg-red-600 transition-all ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`w-6 h-0.5 bg-gray-600 dark:bg-gray-400 group-hover:bg-red-600 transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </div>
      </button>

      {/* OVERLAY - Tıklayınca kapatır */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="hidden md:block fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
        />
      )}

      {/* SIDEBAR MENÜ */}
      <div
        className={`hidden md:flex fixed top-0 left-0 h-full w-80 bg-white dark:bg-[#0a0a0a] border-r-2 border-gray-200 dark:border-gray-800 z-[95] flex-col transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER */}
        <div className="p-8 border-b dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xl">K</span>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter">
                <span className="text-black dark:text-white">Kitap</span>
                <span className="text-red-600">Lab</span>
              </h2>
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Menü</p>
            </div>
          </div>
        </div>

        {/* MENÜ ÖĞELERİ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          
         {/* 1. KATEGORİLER */}
          <Link
            href="/kategori"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
              isActive('/kategori')
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
            }`}
          >
            <div className="text-3xl">⭐</div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-wide">Kategoriler</p>
              <p className="text-[9px] opacity-70 font-medium">Türlere göre keşfet</p>
            </div>
          </Link>

          {/* 2. KİTAPLARIM */}
          <Link
            href="/kitaplarim"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
              isActive('/kitaplarim')
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
            }`}
          >
            <div className="text-3xl">📖</div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-wide">Kitaplarım</p>
              <p className="text-[9px] opacity-70 font-medium">Eserlerim ve taslaklar</p>
            </div>
          </Link>

          {/* 3. OLUŞTUR (Alt menü ile) */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
            >
              <div className="text-3xl">➕</div>
              <div className="flex-1 text-left">
                <p className="font-black text-sm uppercase tracking-wide">Oluştur</p>
                <p className="text-[9px] opacity-70 font-medium">Pano veya kitap yaz</p>
              </div>
              <div className={`transition-transform ${showCreateMenu ? 'rotate-180' : ''}`}>▼</div>
            </button>

            {/* ALT MENÜ */}
            {showCreateMenu && (
              <div className="mt-2 ml-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Link
                  href="/pano-ekle"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group/item"
                >
                  <div className="text-xl">📌</div>
                  <div>
                    <p className="font-black text-xs text-red-600 uppercase">Pano Oluştur</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400">Düşüncelerini paylaş</p>
                  </div>
                </Link>

                <Link
                  href="/kitap-ekle"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-100 dark:hover:bg-red-900/30 transition-all group/item"
                >
                  <div className="text-xl">✏️</div>
                  <div>
                    <p className="font-black text-xs text-red-600 uppercase">Kitap Yaz</p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400">Hikayeni anlat</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 4. ETKİNLİKLER (Yakında) */}
          <button
            onClick={handleComingSoon}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 relative"
          >
            <div className="text-3xl">🎉</div>
            <div className="flex-1 text-left">
              <p className="font-black text-sm uppercase tracking-wide">Etkinlikler</p>
              <p className="text-[9px] opacity-70 font-medium">Yarışmalar & duyurular</p>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-lg"></div>
          </button>

          {/* 5. SIRALAMA */}
          <Link
            href="/siralama"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
              isActive('/siralama')
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
            }`}
          >
            <div className="text-3xl">🏆</div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-wide">Sıralama</p>
              <p className="text-[9px] opacity-70 font-medium">En popüler yazarlar</p>
            </div>
          </Link>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t dark:border-gray-800">
          <p className="text-[9px] text-gray-400 text-center font-black uppercase tracking-widest">
            KitapLab © 2026
          </p>
        </div>
      </div>
    </>
  );
}