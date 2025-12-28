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
            <div className="flex gap-3">
              <a 
                href="https://instagram.com/kitaplabtr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-sm font-bold transition-all text-white"
              >
                <span className="text-lg">📷</span>
                <span>@kitaplabtr</span>
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