'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export default function MobileNav() {
  const pathname = usePathname();
  const [showPlusMenu, setShowPlusMenu] = useState(false);

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
  };

  return (
    <>
      {/* ARTIYA BASILINCA AÇILAN MENÜ */}
      {showPlusMenu && (
        <div 
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setShowPlusMenu(false)}
        >
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-2">
              <Link 
                href="/pano-ekle" 
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-xl">
                  📌
                </div>
                <div>
                  <p className="font-black text-sm dark:text-white group-hover:text-red-600 transition-colors">Pano Oluştur</p>
                  <p className="text-xs text-gray-500">Düşüncelerini paylaş</p>
                </div>
              </Link>

              <Link 
                href="/kitap-ekle" 
                onClick={() => setShowPlusMenu(false)}
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-xl">
                  ✍️
                </div>
                <div>
                  <p className="font-black text-sm dark:text-white group-hover:text-red-600 transition-colors">Kitap Yaz</p>
                  <p className="text-xs text-gray-500">Yeni hikaye başlat</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MOBİL ALT ÇUBUK */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around h-16 px-2">
          
          {/* 1. KÜTÜPHANE */}
          <Link 
            href="/kutuphane" 
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
              isActive('/kutuphane') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">📚</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Kütüphane</span>
          </Link>

          {/* 2. ARTIYA TIKLA */}
          <button 
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
              showPlusMenu 
                ? 'text-red-600 scale-110' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className={`text-3xl transition-transform ${showPlusMenu ? 'rotate-45' : ''}`}>➕</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Oluştur</span>
          </button>

          {/* 3. ETKİNLİKLER (YAKINDA) */}
          <button 
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all text-gray-400 hover:text-red-600 relative"
          >
            <div className="text-2xl">🎉</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Etkinlik</span>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </button>

          {/* 4. SIRALAMA (YAKINDA) */}
          <button 
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all text-gray-400 hover:text-red-600 relative"
          >
            <div className="text-2xl">🏆</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Sıralama</span>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </button>

        </div>
      </nav>
    </>
  );
}