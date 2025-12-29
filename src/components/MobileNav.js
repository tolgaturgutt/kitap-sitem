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
      duration: 3000,
      position: 'top-center',
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
            // 👇 BURASI KRAL: Menüyü de güvenli alan kadar yukarı ittik (calc ile hesaplattık)
            // Normalde 72px yukarıdaydı, şimdi "72px + Siyah Çizgi Boşluğu" kadar yukarıda.
            className="absolute left-1/2 -translate-x-1/2 w-[160px] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-red-600/20 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
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

      {/* MOBİL ALT ÇUBUK */}
      {/* 👇 BURAYA DİKKAT: pb-[env(...)] ekledik. Telefonun altındaki çizgi kadar dolgu (padding) veriyor. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)] transition-all duration-300">
        
        {/* İçerik yine 16 birim (64px) yüksekliğinde ama padding sayesinde yukarıda duruyor */}
        <div className="flex items-center justify-around h-16 px-2">
          
         {/* ✅ KATEGORİLER */}
          <Link 
            href="/kategori" 
            className={`flex flex-col items-center justify-center gap-0.5 w-[68px] h-16 rounded-xl transition-all ${
              isActive('/kategori') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl leading-none flex items-center justify-center w-8 h-8">⭐</div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">Kategori</span>
          </Link>

          {/* ✅ KİTAPLARIM */}
          <Link 
            href="/kitaplarim" 
            className={`flex flex-col items-center justify-center gap-0.5 w-[68px] h-16 rounded-xl transition-all ${
              isActive('/kitaplarim') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl leading-none flex items-center justify-center w-8 h-8">📖</div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">Kitaplarım</span>
          </Link>

          {/* ✅ ARTIYA TIKLA (ORTADA) */}
          <button 
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`flex flex-col items-center justify-center gap-0.5 w-[68px] h-16 rounded-xl transition-all ${
              showPlusMenu 
                ? 'text-red-600 scale-110' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className={`text-3xl leading-none flex items-center justify-center w-8 h-8 transition-transform ${showPlusMenu ? 'rotate-45' : ''}`}>➕</div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">Oluştur</span>
          </button>

          {/* ✅ ETKİNLİKLER */}
          <button 
            onClick={handleComingSoon}
            className="flex flex-col items-center justify-center gap-0.5 w-[68px] h-16 rounded-xl transition-all text-gray-400 hover:text-red-600 relative"
          >
            <div className="text-2xl leading-none flex items-center justify-center w-8 h-8">🎉</div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">Etkinlik</span>
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </button>

          {/* ✅ SIRALAMA */}
          <Link 
            href="/siralama" 
            className={`flex flex-col items-center justify-center gap-0.5 w-[68px] h-16 rounded-xl transition-all ${
              isActive('/siralama') 
                ? 'text-red-600' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <div className="text-2xl leading-none flex items-center justify-center w-8 h-8">🏆</div>
            <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">Sıralama</span>
          </Link>

        </div>
      </nav>
    </>
  );
}