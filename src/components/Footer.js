'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [quickLinksOpen, setQuickLinksOpen] = useState(false);
  const [corporateOpen, setCorporateOpen] = useState(false);

  // ✅ SADECE GERÇEK APK KONTROLÜ
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    setIsApp(Capacitor.isNativePlatform());
  }, []);

  // ✅ APK’DA FOOTER YOK
  if (isApp) return null;

  return (
    <footer className="w-full border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black transition-colors duration-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* ÜST KISIM */}
        <div className="grid-cols-1 md:grid md:grid-cols-3 gap-12 mb-16">

          {/* LOGO */}
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

            <a
              href="mailto:iletisim@kitaplab.com"
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <span>✉️</span> iletisim@kitaplab.com
            </a>
          </div>

          {/* HIZLI ERİŞİM */}
          <div>
            <button
              onClick={() => setQuickLinksOpen(!quickLinksOpen)}
              className="md:hidden w-full flex items-center justify-between mb-4 py-2"
            >
              <h3 className="text-sm font-black uppercase tracking-widest">
                Hızlı Erişim
              </h3>
              <span className={`text-xl ${quickLinksOpen ? 'rotate-45' : ''}`}>+</span>
            </button>

            <h3 className="hidden md:block text-sm font-black uppercase tracking-widest mb-6">
              Hızlı Erişim
            </h3>

            <ul className={`space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400 ${quickLinksOpen ? 'block' : 'hidden md:block'}`}>
              <li><Link href="/profil">› Profilim</Link></li>
              <li><Link href="/kategoriler">› Kategoriler</Link></li>
              <li><Link href="/kitap-ekle">› Kitap Yaz</Link></li>
              <li><Link href="/siralama">› Liderlik Tablosu</Link></li>
            </ul>
          </div>

          {/* KURUMSAL */}
          <div>
            <button
              onClick={() => setCorporateOpen(!corporateOpen)}
              className="md:hidden w-full flex items-center justify-between mb-4 py-2"
            >
              <h3 className="text-sm font-black uppercase tracking-widest">
                Kurumsal
              </h3>
              <span className={`text-xl ${corporateOpen ? 'rotate-45' : ''}`}>+</span>
            </button>

            <h3 className="hidden md:block text-sm font-black uppercase tracking-widest mb-6">
              Kurumsal
            </h3>

            <ul className={`space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400 ${corporateOpen ? 'block' : 'hidden md:block'}`}>
              <li><Link href="/iletisim">› İletişim</Link></li>
              <li><Link href="/kurallar">🛡️ Topluluk Kuralları</Link></li>
              <li><Link href="/kvkk">🔒 KVKK Aydınlatma Metni</Link></li>
            </ul>
          </div>

        </div>

        {/* ALT */}
        <div className="pt-8 border-t border-gray-200 dark:border-white/10 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            © {currentYear} KitapLab. Tüm Hakları Saklıdır.
          </p>
        </div>

      </div>
    </footer>
  );
}
