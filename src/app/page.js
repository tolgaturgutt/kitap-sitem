'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const KATEGORILER = ["Macera", "Bilim Kurgu", "Korku", "Romantik", "Dram", "Fantastik", "Polisiye"];

// OKUMAYA DEVAM ET KOMPONENTİ (KAYDIRMALI)
function ContinueReadingCarousel({ books }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!books || books.length === 0) return null;

  return (
    <div className="mb-20">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic flex items-center gap-2">
        📖 Okumaya Devam Et
      </h2>
      
      <div className="relative">
        {/* KARTLAR */}
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {books.map((item, idx) => (
              <div key={idx} className="w-full flex-shrink-0">
                <Link 
                  href={`/kitap/${item.book_id}/bolum/${item.chapter_id}`}
                  className="group block bg-white dark:bg-white/5 border dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 hover:border-red-600 transition-all shadow-xl shadow-black/5"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-28 md:w-24 md:h-36 rounded-2xl overflow-hidden shrink-0 border dark:border-white/5 shadow-lg">
                      <img 
                        src={item.books?.cover_url} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        alt="" 
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-black dark:text-white mb-2 group-hover:text-red-600 transition-colors uppercase tracking-tight">
                        {item.books?.title}
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                        Kaldığın Bölüm: {item.chapters?.title}
                      </p>
                      <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter">
                        Hemen Devam Et →
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* NOKTALAR */}
        <div className="flex justify-center gap-2 mt-6">
          {books.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex 
                  ? 'w-8 bg-red-600' 
                  : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// KATEGORİ SATIRI KOMPONENTİ
function CategoryRow({ title, books, isFeatured = false }) {
  const scrollRef = useRef(null);
  
  const scroll = (dir) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      scrollRef.current.scrollTo({ 
        left: scrollLeft + (dir === 'left' ? -(clientWidth * 0.8) : (clientWidth * 0.8)), 
        behavior: 'smooth' 
      });
    }
  };

  if (books.length === 0) return null;

  return (
    <div className="mb-14 group relative px-1">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-xl font-black tracking-tighter uppercase dark:text-white flex items-center gap-2">
          {isFeatured && '🔥 '}{title} 
          <span className={`w-1.5 h-1.5 rounded-full ${isFeatured ? 'bg-orange-500' : 'bg-red-600'}`}></span>
        </h2>
        {!isFeatured && (
          <Link 
            href={`/kategori/${title.toLowerCase()}`} 
            className="text-[10px] font-black uppercase text-gray-400 hover:text-red-600 tracking-widest transition-all"
          >
            Tümünü Gör
          </Link>
        )}
      </div>

      {/* SCROLL BUTONLARI */}
      <button 
        onClick={() => scroll('left')} 
        className="absolute left-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
      >
        ←
      </button>
      <button 
        onClick={() => scroll('right')} 
        className="absolute right-[-20px] top-[40%] z-20 bg-white dark:bg-gray-900 border dark:border-gray-800 w-10 h-10 items-center justify-center rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hidden md:flex"
      >
        →
      </button>

      {/* KİTAPLAR */}
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide snap-x py-2">
        {books.map(kitap => (
          <Link 
            key={kitap.id} 
            href={`/kitap/${kitap.id}`} 
            className="flex-none w-36 md:w-44 snap-start group/card"
          >
            <div className={`relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover/card:shadow-2xl group-hover/card:-translate-y-2 ${isFeatured ? 'border-orange-500/30' : ''}`}>
              {kitap.cover_url ? (
                <img 
                  src={kitap.cover_url} 
                  className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" 
                  alt={kitap.title} 
                />
              ) : (
                <div className="w-full h-full bg-gray-50 dark:bg-gray-900" />
              )}
              {isFeatured && (
                <div className="absolute top-2 right-2 bg-orange-600 text-[8px] font-black text-white px-2 py-1 rounded-full uppercase">
                  Trend
                </div>
              )}
              {/* ETKİLEŞİM SKORU */}
              {kitap.interactionScore > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[9px] font-black px-2 py-1 rounded-full">
                  🔥 {kitap.interactionScore}
                </div>
              )}
            </div>
            <h3 className="font-bold text-[13px] dark:text-white line-clamp-1 mb-0.5 group-hover/card:text-red-600 transition-colors">
              {kitap.title}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-80">
              @{kitap.username}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ANA SAYFA
export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [booksByCategory, setBooksByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();

      // OKUMAYA DEVAM ET (SON 5 KİTAP)
      if (user) {
        const { data: history } = await supabase
          .from('reading_history')
          .select('*, books(*), chapters(*)')
          .eq('user_email', user.email)
          .order('updated_at', { ascending: false })
          .limit(5);
        
        setContinueReading(history || []);
      }

      // SON 10 GÜN ETKİLEŞİM HESAPLAMA
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const { data: allBooks } = await supabase.from('books').select('*');
      const { data: votes } = await supabase.from('book_votes').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: comments } = await supabase.from('comments').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: follows } = await supabase.from('follows').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: chapters } = await supabase.from('chapters').select('book_id, views').gte('created_at', tenDaysAgo.toISOString());

      if (allBooks) {
        // HER KİTAP İÇİN SKOR HESAPLA
        const scored = allBooks.map(b => {
          const recentViews = chapters?.filter(c => c.book_id === b.id).reduce((s, c) => s + (c.views || 0), 0) || 0;
          const recentVotes = votes?.filter(v => v.book_id === b.id).length || 0;
          const recentComments = comments?.filter(c => c.book_id === b.id).length || 0;
          const recentFollows = follows?.filter(f => f.book_id === b.id).length || 0;
          
          const score = (recentViews * 1) + (recentVotes * 5) + (recentComments * 10) + (recentFollows * 20);
          return { ...b, interactionScore: score };
        });

        // ÖNE ÇIKANLAR (EN YÜKSEK SKORLAR)
        setFeaturedBooks(scored.sort((a, b) => b.interactionScore - a.interactionScore).slice(0, 15));

        // KATEGORİLERE GÖRE AYIR (HER KATEGORİDE EN POPÜLER 20)
        const grouped = {};
        KATEGORILER.forEach(cat => {
          const categoryBooks = scored.filter(b => b.category === cat);
          grouped[cat] = categoryBooks
            .sort((a, b) => b.interactionScore - a.interactionScore)
            .slice(0, 20);
        });
        setBooksByCategory(grouped);
      }
      
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center font-black tracking-widest opacity-20 animate-pulse text-5xl italic">
        YAZIO
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-6 md:px-16 bg-[#fafafa] dark:bg-black">
      <div className="max-w-7xl mx-auto">
        
        {/* OKUMAYA DEVAM ET CAROUSEL */}
        <ContinueReadingCarousel books={continueReading} />

        {/* ÖNE ÇIKANLAR */}
        <CategoryRow title="Öne Çıkanlar" books={featuredBooks} isFeatured={true} />

        {/* KATEGORİLER */}
        {Object.entries(booksByCategory).map(([cat, books]) => (
          <CategoryRow key={cat} title={cat} books={books} />
        ))}

      </div>
    </div>
  );
}