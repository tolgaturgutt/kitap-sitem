'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function KategoriSayfasi({ params }) {
  // URL'deki kategori ismini alıyoruz (Örn: /kategori/macera -> slug: macera)
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Kategori ismini görsel olarak düzeltme (macera -> Macera)
  const categoryTitle = slug.charAt(0).toUpperCase() + slug.slice(1);

  useEffect(() => {
    async function getCategoryBooks() {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .ilike('category', slug) // Büyük/küçük harf duyarsız arama
        .order('created_at', { ascending: false });

      if (data) setBooks(data);
      setLoading(false);
    }
    getCategoryBooks();
  }, [slug]);

  return (
    <div className="min-h-screen py-20 px-4 md:px-8 bg-[#fafafa] dark:bg-black transition-colors">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Navigasyon ve Başlık */}
        <div className="mb-16">
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-red-600 transition-colors mb-4 block"
          >
            ← Ana Sayfaya Dön
          </Link>
          <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
            {categoryTitle}<span className="text-red-600">.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Bu kategoride toplam {books.length} eser bulundu.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 animate-pulse font-bold tracking-widest">
            KATEGORİ TARANIYOR...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {books.length === 0 ? (
              <div className="col-span-full text-center py-20 border border-dashed dark:border-gray-800 rounded-3xl">
                <p className="text-gray-400 italic">Bu kategoride henüz bir eser yayınlanmamış.</p>
              </div>
            ) : (
              books.map((kitap) => (
                <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="group flex flex-col">
                  <div className="relative aspect-[2/3] w-full mb-4 overflow-hidden rounded-2xl shadow-sm border dark:border-gray-800 transition-all duration-500 group-hover:shadow-2xl">
                    {kitap.cover_url ? (
                      <img 
                        src={kitap.cover_url} 
                        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-4xl opacity-20">📖</div>
                    )}
                  </div>
                  <div className="px-1 text-center">
                    <h3 className="font-bold text-xs text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover:text-red-600 transition-colors uppercase tracking-tighter">
                      {kitap.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {kitap.username}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}