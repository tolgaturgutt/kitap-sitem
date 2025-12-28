'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Username from '@/components/Username';

// --- YARDIMCI: SAYI FORMATLAMA (1200 -> 1.2K) ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function Top100Page() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Sabit ayar: Her seferinde kaç kitap gelsin?
  const LIMIT_PER_PAGE = 20; 
  // Maksimum kaç kitap listelensin?
  const MAX_BOOKS = 100;

  useEffect(() => {
    fetchBooks(0);
  }, []);

  async function fetchBooks(currentOffset) {
    try {
      // 1. Kitapları Okunma Sayısına (views) göre çek
      // ✅ GÜNCELLEME: profiles:user_id ile yazarın güncel adını ve rolünü direkt alıyoruz.
     // ✅ Tüm kitapları çek (sıralama sonra yapılacak)
      let { data: newBooks } = await supabase
        .from('books')
        .select('*, chapters(id, views), profiles:user_id(username, role)');

      // ✅ HAYALET FİLTRESİ: Taslakları ve Bölümsüzleri listeden at
      if (newBooks) {
        newBooks = newBooks.filter(book => 
          book.chapters && 
          book.chapters.length > 0 && 
          !book.is_draft
        );
      }

      if (!newBooks || newBooks.length === 0) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // --- EKSTRA İSTATİSTİKLERİ ÇEK (Canlı Hesaplama) ---
      
      // A. Bu sayfadaki kitapların ID'lerini ve Bölüm ID'lerini topla
      const bookIds = newBooks.map(b => b.id);
      const allChapterIds = newBooks.flatMap(b => b.chapters.map(c => c.id));

      // B. Toplu Yorum Sayılarını Çek (Sadece bu kitaplar için)
      const { data: commentsData } = await supabase
        .from('comments')
        .select('book_id')
        .in('book_id', bookIds);

      // C. Toplu Beğeni (Oy) Sayılarını Çek (Sadece bu bölümler için)
      const { data: votesData } = await supabase
        .from('chapter_votes')
        .select('chapter_id')
        .in('chapter_id', allChapterIds);

      // (NOT: Artık ayrı bir profiles sorgusuna gerek yok, veri yukarıda geldi)

      // --- VERİLERİ BİRLEŞTİR ---
      newBooks = newBooks.map(book => {
        // İlişkisel veriden gelen güncel profil (Yoksa eski veriyi kullan - Hibrit)
        const profile = book.profiles;
        const displayUsername = profile?.username || book.username;
        const displayRole = profile?.role;
        
        // 1. Toplam Yorum
        const totalComments = commentsData?.filter(c => c.book_id === book.id).length || 0;

        // 2. Toplam Beğeni
        const chapterIds = book.chapters.map(c => c.id);
        const totalVotes = votesData?.filter(v => chapterIds.includes(v.chapter_id)).length || 0;

       // 3. Toplam Okunma (Sadece mevcut bölümler)
        const totalViews = book.chapters
          .filter(c => c.id) // Silinen bölümleri atla
          .reduce((sum, c) => sum + (c.views || 0), 0);

        return { 
          ...book, 
          username: displayUsername, // Güncel isim
          author_role: displayRole,  // Güncel rol
          totalComments,
          totalVotes,
          totalViews
        };
      });
      // ✅ Hesaplanan totalViews'e göre sırala
      newBooks.sort((a, b) => b.totalViews - a.totalViews);

      // ✅ Sayfalama uygula
      newBooks = newBooks.slice(currentOffset, currentOffset + LIMIT_PER_PAGE);

      // 3. Listeyi Güncelle (Çift Kayıt Korumalı)
      setBooks(prev => {
        if (currentOffset === 0) return newBooks;

        const existingIds = new Set(prev.map(b => b.id));
        const uniqueNewBooks = newBooks.filter(b => !existingIds.has(b.id));
        
        const combined = [...prev, ...uniqueNewBooks];

        if (combined.length >= MAX_BOOKS) {
          setHasMore(false);
          return combined.slice(0, MAX_BOOKS);
        }
        return combined;
      });

      if (newBooks.length < LIMIT_PER_PAGE) {
        setHasMore(false);
      }

    } catch (error) {
      console.error('Hata:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const loadMore = () => {
    setLoadingMore(true);
    const newOffset = offset + LIMIT_PER_PAGE;
    setOffset(newOffset);
    fetchBooks(newOffset);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-24 pb-20 px-4 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* BAŞLIK */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
            <span className="text-black dark:text-white">TOP</span>
            <span className="text-red-600 ml-2">100</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-[0.2em] font-bold">
            Platformun En Çok Okunan Eserleri
          </p>
        </div>

        {/* KİTAP LİSTESİ (GRID) */}
        {loading && books.length === 0 ? (
          <div className="flex justify-center pt-20">
            <div className="text-red-600 font-black text-xl animate-pulse">YÜKLENİYOR...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book, index) => (
              <Link 
                key={book.id} 
                href={`/kitap/${book.id}`}
                className="group relative flex flex-col gap-3 p-3 rounded-3xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300"
              >
                {/* Sıralama Rozeti */}
                <div className="absolute top-0 left-0 z-10 w-8 h-8 bg-red-600 text-white font-black text-sm flex items-center justify-center rounded-tl-2xl rounded-br-2xl shadow-lg">
                  #{index + 1}
                </div>

                {/* Kapak Resmi */}
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all relative">
                   {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        alt={book.title} 
                      />
                   ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                        <span className="text-4xl">📕</span>
                      </div>
                   )}
                   
                   {/* ✅ TAMAMLANDI ROZETİ */}
                   {book.is_completed && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10 uppercase tracking-wider">
                        FİNAL
                      </div>
                   )}

                   {/* Overlay */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Hemen Oku</p>
                   </div>
                </div>

                {/* Bilgiler */}
                <div className="flex-1">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-red-600 transition-colors">
                    {book.title}
                  </h3>
                  <div className="mt-1">
                    <Username 
                      username={book.username} 
                      isAdmin={book.author_role === 'admin'} 
                      className="text-[10px] text-gray-500 font-bold uppercase tracking-wider" 
                    />
                  </div>
                  
                  {/* ✅ İSTATİSTİKLER (Okunma, Beğeni, Yorum) */}
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-gray-400">
                    <span className="flex items-center gap-1">👁️ {formatNumber(book.totalViews)}</span>
                    <span className="flex items-center gap-1">❤️ {formatNumber(book.totalVotes)}</span>
                    <span className="flex items-center gap-1">💬 {formatNumber(book.totalComments)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* DAHA FAZLA YÜKLE BUTONU */}
        {hasMore && !loading && (
          <div className="mt-16 text-center">
            <button 
              onClick={loadMore}
              disabled={loadingMore}
              className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          </div>
        )}

        {/* LİSTE BİTTİ UYARISI */}
        {!hasMore && books.length > 0 && (
          <div className="mt-16 text-center">
             <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-50">
               — Listenin Sonu —
             </p>
          </div>
        )}

      </div>
    </div>
  );
}