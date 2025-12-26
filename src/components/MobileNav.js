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
          className="fixed inset-0 z-[90] md:hidden"
          onClick={() => setShowPlusMenu(false)}
        >
          <div 
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2 w-[160px] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-red-600/20 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
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
                <div className="text-lg">✍️</div>
                <p className="font-black text-xs text-red-600">Kitap Yaz</p>
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
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
              isActive('/kutuphane') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">📚</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Kütüphane</span>
          </Link>

          {/* 2. KİTAPLARIM */}
          <Link 
            href="/kitaplarim" 
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
              isActive('/kitaplarim') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl">📖</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Kitaplarım</span>
          </Link>

          {/* 3. ARTIYA TIKLA (ORTADA) */}
          <button 
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
              showPlusMenu 
                ? 'text-red-600 scale-110' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className={`text-3xl transition-transform ${showPlusMenu ? 'rotate-45' : ''}`}>➕</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Oluştur</span>
          </button>

          {/* 4. ETKİNLİKLER (YAKINDA) */}
          <button 
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-gray-400 hover:text-red-600 relative"
          >
            <div className="text-2xl">🎉</div>
            <span className="text-[9px] font-black uppercase tracking-tight">Etkinlik</span>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </button>

          {/* 5. SIRALAMA (YAKINDA) */}
          <button 
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-gray-400 hover:text-red-600 relative"
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