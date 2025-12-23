import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black transition-colors duration-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* ÜST KISIM: 4 KOLONLU YAPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
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
          </div>

          {/* KOLON 2: KEŞFET */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white mb-6">
              Popüler Türler
            </h3>
            <ul className="space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              <li><Link href="/kategori/macera" className="hover:text-red-600 transition-colors">Macera</Link></li>
              <li><Link href="/kategori/bilim-kurgu" className="hover:text-red-600 transition-colors">Bilim Kurgu</Link></li>
              <li><Link href="/kategori/korku" className="hover:text-red-600 transition-colors">Korku</Link></li>
              <li><Link href="/kategori/romantik" className="hover:text-red-600 transition-colors">Romantik</Link></li>
              <li><Link href="/kategori/fantastik" className="hover:text-red-600 transition-colors">Fantastik</Link></li>
            </ul>
          </div>

          {/* KOLON 3: HIZLI MENÜ */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white mb-6">
              Platform
            </h3>
            <ul className="space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              <li><Link href="/arama" className="hover:text-red-600 transition-colors">Kitap Ara & Keşfet</Link></li>
              <li><Link href="/kitap-ekle" className="hover:text-red-600 transition-colors">Kitap Yaz</Link></li>
              <li><Link href="/profil" className="hover:text-red-600 transition-colors">Profilim</Link></li>
              <li><Link href="/giris" className="hover:text-red-600 transition-colors">Giriş Yap</Link></li>
            </ul>
          </div>

          {/* KOLON 4: İLETİŞİM (SADECE MAIL) */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white mb-6">
              İletişim
            </h3>
            <ul className="space-y-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              <li className="flex items-center gap-3">
                <span className="text-red-600">📧</span>
                <span>iletisim@kitaplab.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* ALT ÇİZGİ */}
        <div className="pt-8 border-t border-gray-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            © {currentYear} KitapLab. Tüm Hakları Saklıdır.
          </p>
        </div>

      </div>
    </footer>
  );
}