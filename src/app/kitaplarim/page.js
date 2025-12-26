'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// --- YARDIMCI: SAYI FORMATLAMA ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function KitaplarimSayfasi() {
  const [user, setUser] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [myDrafts, setMyDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('yayinlanan');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    async function getData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return (window.location.href = '/giris');
      setUser(activeUser);

      // --- KİTAPLARI VE İSTATİSTİK VERİLERİNİ ÇEK ---
      const { data: written } = await supabase
        .from('books')
        .select('*, chapters(id, views)')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      // --- EKSTRA İSTATİSTİKLER (Yorumlar ve Beğeniler) ---
      const allBooksList = written || [];
      const allBookIds = allBooksList.map(b => b.id);
      const allChapterIds = allBooksList.flatMap(b => b.chapters?.map(c => c.id) || []);

      const { data: commentsData } = await supabase.from('comments').select('book_id').in('book_id', allBookIds);
      const { data: votesData } = await supabase.from('chapter_votes').select('chapter_id').in('chapter_id', allChapterIds);

      // Verileri birleştirme fonksiyonu
      const mergeStats = (list) => {
        return list.map(book => {
          const totalBookViews = book.chapters?.reduce((acc, c) => acc + (c.views || 0), 0) || 0;
          const totalComments = commentsData?.filter(c => c.book_id === book.id).length || 0;
          const chIds = book.chapters?.map(c => c.id) || [];
          const totalVotes = votesData?.filter(v => chIds.includes(v.chapter_id)).length || 0;

          return { ...book, totalViews: totalBookViews, totalComments, totalVotes };
        });
      };

      // YAZDIĞIM KİTAPLARI AYARLA
      if (written) {
        const enrichedWritten = mergeStats(written);
        setMyBooks(enrichedWritten.filter(b => !b.is_draft));
        setMyDrafts(enrichedWritten.filter(b => b.is_draft === true));
      }

      setLoading(false);
    }
    getData();
  }, []);

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-3xl md:text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  const currentBooks = activeTab === 'yayinlanan' ? myBooks : myDrafts;

  return (
    <div className="min-h-screen py-6 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black uppercase dark:text-white mb-4">
            📚 Kitaplarım
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
            Yazdığın tüm eserler ve taslaklar burada
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-4 md:gap-8 mb-6 md:mb-8 border-b dark:border-white/5 pb-4 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('yayinlanan')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeTab === 'yayinlanan' ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            Yayınlanan ({myBooks.length})
          </button>
          <button 
            onClick={() => setActiveTab('taslaklar')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeTab === 'taslaklar' ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            Taslaklar ({myDrafts.length})
          </button>
        </div>

        {/* KİTAP LİSTESİ */}
        {currentBooks.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-6xl md:text-8xl mb-4">📖</div>
            <p className="text-lg md:text-xl font-bold text-gray-400 dark:text-gray-500 mb-2">
              {activeTab === 'yayinlanan' ? 'Henüz yayınlanmış kitabın yok' : 'Henüz taslak oluşturmamışsın'}
            </p>
            <p className="text-sm text-gray-400">
              {activeTab === 'yayinlanan' ? 'Hemen yazmaya başla!' : 'Fikirlerini taslak olarak sakla'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {currentBooks.map(k => (
              <Link key={k.id} href={`/kitap/${k.id}`} className="group relative">
                <div className="aspect-[2/3] rounded-xl md:rounded-[2rem] overflow-hidden border dark:border-white/5 mb-2 md:mb-3 shadow-md group-hover:-translate-y-1 transition-all relative">
                  {k.cover_url ? (
                    <img 
                      src={k.cover_url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      alt={k.title}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center">
                      <span className="text-4xl md:text-5xl opacity-20">📖</span>
                    </div>
                  )}
                  
                  {/* Taslak Rozeti */}
                  {k.is_draft && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-lg z-10 uppercase tracking-wider">
                      TASLAK
                    </div>
                  )}
                </div>
                
                <h3 className="text-[9px] md:text-[10px] font-black text-center uppercase truncate italic dark:text-white group-hover:text-red-600 transition-colors">
                  {k.title}
                </h3>
                
                {/* ✅ TAMAMLANDI ROZETİ */}
                {k.is_completed && (
                  <div className="flex justify-center mt-1">
                    <span className="text-[7px] md:text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-wide">
                      ✅ TAMAMLANDI
                    </span>
                  </div>
                )}
                
                {/* ✅ İSTATİSTİK ŞERİDİ */}
                <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-1 md:mt-1.5 text-[7px] md:text-[8px] font-black text-gray-400">
                  <span className="flex items-center gap-0.5">👁️ {formatNumber(k.totalViews)}</span>
                  <span className="flex items-center gap-0.5">❤️ {formatNumber(k.totalVotes)}</span>
                  <span className="flex items-center gap-0.5">💬 {formatNumber(k.totalComments)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🎨 SAĞ ALTTA FLOATING ACTION BUTTON (Sadece PC'de) */}
      <div className="hidden md:block fixed bottom-8 right-8 z-50">
        {/* Menü */}
        {showCreateMenu && (
          <div className="absolute bottom-20 right-0 bg-white dark:bg-black border dark:border-white/10 rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-200 min-w-[200px]">
            <Link
              href="/kitap-ekle"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                ✍️
              </div>
              <div>
                <p className="text-xs font-black uppercase dark:text-white">Yeni Kitap</p>
                <p className="text-[9px] text-gray-400">Hikayeni yaz</p>
              </div>
            </Link>

            <Link
              href="/pano-ekle"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                📌
              </div>
              <div>
                <p className="text-xs font-black uppercase dark:text-white">Yeni Pano</p>
                <p className="text-[9px] text-gray-400">Düşünceni paylaş</p>
              </div>
            </Link>
          </div>
        )}

        {/* Ana Buton */}
        <button
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          className={`w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl shadow-red-600/40 flex items-center justify-center text-3xl transition-all hover:scale-110 ${
            showCreateMenu ? 'rotate-45' : ''
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}