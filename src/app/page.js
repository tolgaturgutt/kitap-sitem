'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const KATEGORILER = ["Macera", "Bilim Kurgu", "Korku", "Romantik", "Dram", "Fantastik", "Polisiye"];

// DUYURU CAROUSEL BİLEŞENİ (SADECE BAŞLIK RENGİ ÖZEL)
function DuyuruPaneli() {
  const [duyurular, setDuyurular] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Hook: Veri Çekme
  useEffect(() => {
    async function getDuyurular() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      
      setDuyurular(data || []);
      setLoading(false);
    }
    getDuyurular();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % duyurular.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + duyurular.length) % duyurular.length);
  };

  // 2. Hook: Otomatik Kaydırma
  useEffect(() => {
    if (duyurular.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [duyurular.length]);

  if (loading) return (
    <div className="mb-12 h-[400px] w-full rounded-[2.5rem] bg-gray-100 dark:bg-white/5 animate-pulse flex items-center justify-center">
      <span className="font-black opacity-10 text-xl tracking-widest uppercase">Yükleniyor...</span>
    </div>
  );

  if (duyurular.length === 0) return null;

  const currentDuyuru = duyurular[currentIndex];

  return (
    <div className="mb-16 relative group select-none">
      
      {/* KART YAPISI (Arka plan TEMA UYUMLU: Beyaz/Siyah) */}
      <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl transition-all duration-500 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10">
        
        {/* Dekoratif Arka Plan (Hafif) */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gray-50 dark:bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center p-8 md:p-12 gap-8 md:gap-12 min-h-[400px]">
          
          {/* SOL TARAFTA: GÖRSEL (Varsa) */}
          {currentDuyuru.image_url && (
            <div className="shrink-0 relative group-hover:scale-[1.02] transition-transform duration-700 z-10">
              <div className="relative w-[180px] md:w-[240px] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800">
                <img 
                  src={currentDuyuru.image_url} 
                  alt={currentDuyuru.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* SAĞ TARAFTA: İÇERİK */}
          <div className={`flex-1 z-10 text-center md:text-left ${!currentDuyuru.image_url ? 'md:px-12' : ''}`}>
            
            {/* ETİKETLER */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                currentDuyuru.type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                currentDuyuru.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                currentDuyuru.type === 'feature' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {currentDuyuru.type === 'warning' ? '⚠️ DİKKAT' :
                 currentDuyuru.type === 'success' ? '🎉 YENİLİK' :
                 currentDuyuru.type === 'feature' ? '✨ ÖZELLİK' :
                 '📢 DUYURU'}
              </span>
              
              {currentDuyuru.priority === 3 && (
                <span className="px-3 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-red-600/30">
                  🔥 ACİL
                </span>
              )}
            </div>

            {/* --- BAŞLIK (ÖZEL RENK) --- */}
            {/* Burada Admin Panelinden seçtiğin 'title_color' kullanılır. */}
            <h2 
              className="text-3xl md:text-5xl font-black mb-6 tracking-tight leading-[1.1] transition-colors drop-shadow-sm"
              style={{ color: currentDuyuru.title_color || 'inherit' }} 
            >
              {currentDuyuru.title}
            </h2>

            {/* --- İÇERİK (TEMA RENGİ) --- */}
            {/* Burası her zaman okunabilir Gri/Beyaz olur */}
            <p className="text-lg md:text-xl leading-relaxed font-medium max-w-2xl text-gray-600 dark:text-gray-300 transition-colors">
              {currentDuyuru.content}
            </p>

            <div className="mt-8 flex items-center justify-center md:justify-start gap-2 opacity-40">
              <span className="w-8 h-[2px] bg-black dark:bg-white rounded-full" />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
                {new Date(currentDuyuru.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NAVİGASYON OKLARI */}
      {duyurular.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center shadow-xl text-black dark:text-white transition-all hover:scale-110 active:scale-95 group-hover:opacity-100 opacity-0"
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center shadow-xl text-black dark:text-white transition-all hover:scale-110 active:scale-95 group-hover:opacity-100 opacity-0"
          >
            →
          </button>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {duyurular.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 shadow-lg ${
                  idx === currentIndex 
                    ? 'w-8 bg-red-600 opacity-100' 
                    : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
      <Toaster />
      <div className="max-w-7xl mx-auto">
        
        {/* DUYURU PANELİ */}
        <DuyuruPaneli />

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