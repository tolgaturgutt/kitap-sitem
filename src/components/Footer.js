'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [quickLinksOpen, setQuickLinksOpen] = useState(false);
  const [corporateOpen, setCorporateOpen] = useState(false);

  return (
    <footer className="w-full border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black transition-colors duration-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* ÜST KISIM: 3 KOLONLU YAPI */}
        <div className="grid-cols-1 md:grid md:grid-cols-3 gap-12 mb-16">
          
          {/* KOLON 1: LOGO & HAKKINDA */}
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="text-3xl font-black tracking-tighter leading-none">
                <span className="text-black dark:text-white">Kitap</span>
                <span className="text-red-600">Lab</span>
              </div>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              KitapLab, yazarların hayal dünyasını okurlarla buluşturduğu yeni nesil dijital yayıncılık platformudur.
            </p>
            
            {/* E-POSTA */}
            <a 
              href="mailto:iletisim@kitaplab.com"
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <span>✉️</span> iletisim@kitaplab.com
            </a>

            {/* SOSYAL MEDYA BUTONLARI */}
            {/* SOSYAL MEDYA BUTONLARI */}
            <div className="flex gap-3">
              <a 
                href="https://instagram.com/kitaplabtr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center gap-3 px-6 py-3 rounded-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(217,46,129,0.5)]"
              >
                {/* Arka Plan Gradient (Animasyonlu) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* İçerik (Z-Index ile öne çıkarma) */}
                <div className="relative flex items-center gap-2 text-white">
                  {/* Modern SVG Instagram İkonu */}
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="text-sm font-bold tracking-wide">kitaplabtr</span>
                </div>
              </a>
            </div>
          </div>

          {/* KOLON 2: HIZLI ERİŞİM */}
          <div>
            <button
              onClick={() => setQuickLinksOpen(!quickLinksOpen)}
              className="md:hidden w-full flex items-center justify-between mb-4 py-2"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
                Hızlı Erişim
              </h3>
              <span className={`text-xl transition-transform duration-300 ${quickLinksOpen ? 'rotate-45' : ''} text-black dark:text-white`}>
                +
              </span>
            </button>
            
            <h3 className="hidden md:block text-sm font-black uppercase tracking-widest mb-6 text-black dark:text-white">
              Hızlı Erişim
            </h3>
            
            <ul className={`space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400 ${quickLinksOpen ? 'block' : 'hidden md:block'}`}>
              <li>
                <Link href="/profil" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>›</span> Profilim
                </Link>
              </li>
              <li>
                <Link href="/kategoriler" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>›</span> Kategoriler
                </Link>
              </li>
              <li>
                <Link href="/kitap-ekle" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>›</span> Kitap Yaz
                </Link>
              </li>
              <li>
                <Link href="/siralama" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>›</span> Liderlik Tablosu
                </Link>
              </li>
            </ul>
          </div>

          {/* KOLON 3: KURUMSAL & YASAL */}
          <div>
            <button
              onClick={() => setCorporateOpen(!corporateOpen)}
              className="md:hidden w-full flex items-center justify-between mb-4 py-2"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
                Kurumsal
              </h3>
              <span className={`text-xl transition-transform duration-300 ${corporateOpen ? 'rotate-45' : ''} text-black dark:text-white`}>
                +
              </span>
            </button>
            
            <h3 className="hidden md:block text-sm font-black uppercase tracking-widest mb-6 text-black dark:text-white">
              Kurumsal
            </h3>
            
            <ul className={`space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400 ${corporateOpen ? 'block' : 'hidden md:block'}`}>
              <li>
                <Link href="/iletisim" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>›</span> İletişim
                </Link>
              </li>
              <li>
                <Link href="/kurallar" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>🛡️</span> Topluluk Kuralları
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="hover:text-red-600 transition-colors flex items-center gap-2">
                  <span>🔒</span> KVKK Aydınlatma Metni
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* ALT ÇİZGİ - COPYRIGHT */}
        <div className="pt-8 border-t border-gray-200 dark:border-white/10 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            © {currentYear} KitapLab. Tüm Hakları Saklıdır.
          </p>
        </div>

      </div>
    </footer>
  );
}