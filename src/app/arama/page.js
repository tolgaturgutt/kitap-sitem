'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Username from '@/components/Username';
import Image from 'next/image'; // 👈 BU SATIRI EKLE
function AramaIcerik() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState({ books: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'books', 'users'

 useEffect(() => {
    async function performDeepSearch() {
      if (!query) return;
      setLoading(true);

     // 1. KİTAPLARI (Bölüm Bilgisiyle) VE KULLANICILARI ÇEK
     const [booksRes, usersRes] = await Promise.all([
        supabase
          .from('books')
          .select('id, title, summary, cover_url, username, category, chapters(id)') 
          .ilike('title', `%${query}%`)
          .limit(50), // 👈 GÜVENLİK SİGORTASI: En fazla 50 kitap getir
          
        supabase
          .from('profiles')
          .select('username, full_name, avatar_url, bio, role')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(20) // 👈 Yazar araması için de 20 limit koyduk
      ]);

      let booksData = booksRes.data || [];

      // ✅ HAYALET FİLTRESİ: Bölümü olmayan kitapları listeden at
      if (booksData.length > 0) {
        booksData = booksData.filter(b => b.chapters && b.chapters.length > 0);
      }
      const usersData = usersRes.data || [];

      // 2. KİTAPLAR GELDİYSE, YAZARLARININ ROLLERİNİ ARKADAN ÇEKİP BİRLEŞTİRELİM
      if (booksData.length > 0) {
        // Kitapların yazarlarının isim listesini çıkar
        const authorNames = [...new Set(booksData.map(b => b.username))];
        
        // Bu isimlerin rollerini sor
        const { data: roles } = await supabase
          .from('profiles')
          .select('username, role')
          .in('username', authorNames);

        // Kitap verisine bu rolü yapıştır (Sanki join yapmışız gibi)
        booksData = booksData.map(book => {
            const yazarProfili = roles?.find(r => r.username === book.username);
            return { 
                ...book, 
                profiles: { role: yazarProfili?.role } // Username bileşeni bu formatı bekliyor
            };
        });
      }

      setResults({ 
        books: booksData, 
        users: usersData 
      });
      setLoading(false);
    }
    performDeepSearch();
  }, [query]);

  const totalCount = results.books.length + results.users.length;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#080808] pt-12 pb-24 px-6">
      <div className="max-w-5xl mx-auto">

        {/* BAŞLIK VE İSTATİSTİK */}
        <header className="mb-16">
          <h1 className="text-4xl font-black tracking-tighter dark:text-white mb-2">
            "{query}" <span className="text-gray-400 font-light">için sonuçlar</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
            {totalCount} Eşleşme Bulundu
          </p>
        </header>

        {/* KATEGORİ SEKMELERİ (OVAL) */}
        <div className="flex gap-3 mb-12">
          {['all', 'books', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                ${activeTab === tab
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl'
                  : 'bg-white dark:bg-white/5 text-gray-400 hover:text-red-600 border dark:border-white/5'}`}
            >
              {tab === 'all' ? 'Hepsi' : tab === 'books' ? 'Eserler' : 'Yazarlar'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center font-black opacity-10 text-6xl italic animate-pulse">ARANIYOR...</div>
        ) : (
          <div className="space-y-20">

            {/* KİTAP SONUÇLARI */}
            {(activeTab === 'all' || activeTab === 'books') && results.books.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-700 mb-8 italic">Eser Koleksiyonu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {results.books.map(book => (
                    <Link key={book.id} href={`/kitap/${book.id}`} className="flex gap-6 p-4 bg-white dark:bg-white/5 border dark:border-white/5 rounded-[2.5rem] hover:scale-[1.02] transition-transform group shadow-sm">
                      <div className="relative w-28 h-40 rounded-2xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-red-600/20 transition-all">
  {book.cover_url ? (
    <Image 
      src={book.cover_url} 
      alt={book.title}
      fill
      sizes="112px"
      className="object-cover"
    />
  ) : (
    <div className="w-full h-full bg-gray-100 dark:bg-black/40 flex items-center justify-center text-[10px] font-black uppercase text-gray-400">Kapak Yok</div>
  )}
</div>
                      <div className="flex flex-col justify-center py-2">
                        <span className="text-[9px] font-black uppercase text-red-600 mb-1">{book.category}</span>
                        <h3 className="text-xl font-bold dark:text-white mb-2 group-hover:text-red-600 transition-colors">{book.title}</h3>
                        <div className="mb-4">
                          <Username
                            username={book.username}
                            isAdmin={book.profiles?.role === 'admin'}
                            className="text-xs text-gray-500 dark:text-gray-400 italic"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">{book.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* YAZAR SONUÇLARI */}
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-700 mb-8 italic">Kalem Sahipleri</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {results.users.map(u => (
                    <Link key={u.username} href={`/yazar/${u.username}`} className="flex flex-col items-center p-8 bg-white dark:bg-white/5 border dark:border-white/5 rounded-[3rem] text-center hover:border-red-600 transition-all group">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all mb-4">
  {u.avatar_url ? (
    <Image 
      src={u.avatar_url} 
      alt={u.username}
      fill
      sizes="80px"
      className="object-cover"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 dark:bg-black/50 flex items-center justify-center font-black">?</div>
  )}
</div>
                      <div className="mb-1">
                        <Username
                          username={u.username}
                          isAdmin={u.role === 'admin'}
                          className="font-bold dark:text-white group-hover:text-red-600 transition-colors"
                        />
                      </div>
                      {/* Gerçek ismi varsa gösterelim, yoksa 'Yazar' yazsın */}
                      <p className="text-[10px] text-gray-400 uppercase font-black mt-2 tracking-widest">
                        {u.full_name || 'Yazar'}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {totalCount === 0 && (
              <div className="py-40 text-center">
                <p className="text-2xl font-serif italic text-gray-400 mb-6">"Aradığın hikaye henüz yazılmamış olabilir..."</p>
                <Link href="/" className="px-10 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Anasayfaya Dön</Link>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// Next.js 15 Suspense zorunluluğu için sarmalıyoruz
export default function AramaSayfasi() {
  return (
    <Suspense fallback={<div className="py-40 text-center font-black opacity-10 text-6xl">YÜKLENİYOR</div>}>
      <AramaIcerik />
    </Suspense>
  );
}