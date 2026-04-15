'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Username from '@/components/Username';
import Image from 'next/image';
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug;
  
  const [category, setCategory] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popular'); // popular, newest, mostRead
  const [adminEmails, setAdminEmails] = useState([]);
  const [displayCount, setDisplayCount] = useState(24); // İlk 24 kitap göster

  useEffect(() => {
    async function fetchData() {
      // 1️⃣ Kategoriyi bul
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!categoryData) {
        setLoading(false);
        return;
      }
      setCategory(categoryData);

      // 2️⃣ Admin emaillerini çek
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      // 3️⃣ Bu kategorideki kitapları çek
     let { data: allBooks } = await supabase
        .from('books')
        .select('*, total_comment_count, total_votes, profiles:user_id(username, avatar_url, email, role), co_author:profiles!co_author_id(username, email, role), chapters(id, views)')
        .eq('category', categoryData.name)
        .eq('is_draft', false);
      if (!allBooks) {
        setLoading(false);
        return;
      }

      // Sadece bölümü olan kitapları filtrele
      allBooks = allBooks.filter(book => book.chapters && book.chapters.length > 0);

      // 4️⃣ İstatistikleri hesapla
      
      // ❌ SİLİNDİ: const { data: allVotes }... (Artık siteyi yavaşlatmıyoruz)

      const booksWithStats = allBooks.map(book => {
        const totalViews = book.chapters.reduce((sum, c) => sum + (c.views || 0), 0);
        
        // 👇 ARTIK HESAPLAMA YOK, DİREKT ALIYORUZ
        const totalVotes = book.total_votes || 0;
        
        // 👇 ARTIK DOĞRUDAN VERİTABANINDAN GELEN SAYIYI ALIYORUZ
        const totalComments = book.total_comment_count || 0;
        
       const bookOwnerEmail = book.profiles?.email || book.user_email;
        
        // YENİ: Ortak yazar onaylıysa bilgilerini hazırla
        const hasAcceptedCoAuthor = book.co_author_id && book.co_author_status === 'accepted' && book.co_author;
        const coAuthorEmail = book.co_author?.email;

        return {
          ...book,
          username: book.profiles?.username || book.username,
          role: book.profiles?.role,
          is_admin: emails.includes(bookOwnerEmail),
          // --- ORTAK YAZAR VERİLERİ ---
          co_author_name: hasAcceptedCoAuthor ? book.co_author.username : null,
          co_author_role: hasAcceptedCoAuthor ? book.co_author.role : null,
          co_author_is_admin: coAuthorEmail ? emails.includes(coAuthorEmail) : false,
          totalViews,
          totalVotes,
          totalComments
        };
      });

      setBooks(booksWithStats);
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  // 🔴 SIRALAMA
  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'mostRead') return b.totalViews - a.totalViews;
    // popular: totalVotes + totalComments + totalViews
    const scoreA = a.totalVotes * 5 + a.totalComments * 2 + a.totalViews;
    const scoreB = b.totalVotes * 5 + b.totalComments * 2 + b.totalViews;
    return scoreB - scoreA;
  });

  // 🔴 GÖSTERILECEK KITAPLAR
  const displayedBooks = sortedBooks.slice(0, displayCount);
  const hasMore = sortedBooks.length > displayCount;

  // 🔴 DAHA FAZLA YÜKLE
  function loadMore() {
    setDisplayCount(prev => prev + 24);
  }

  if (loading) {
    return (
      <div className="min-h-screen py-40 flex justify-center items-center animate-pulse bg-[#fafafa] dark:bg-black">
        <div className="text-5xl font-black tracking-tighter">
          <span className="text-black dark:text-white">Kitap</span>
          <span className="text-red-600">Lab</span>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen py-40 flex flex-col items-center justify-center bg-[#fafafa] dark:bg-black">
        <div className="text-6xl mb-4">😕</div>
        <p className="text-xl font-bold text-gray-400 mb-6">Kategori bulunamadı</p>
        <Link href="/" className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 md:px-6 lg:px-16 bg-[#fafafa] dark:bg-black">
      <div className="max-w-7xl mx-auto">
        
        {/* 🔴 KATEGORİ BAŞLIĞI */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black dark:text-white uppercase tracking-tighter mb-3">
            {category.name}
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
            {books.length} kitap
          </p>
        </div>

        {/* 🔴 SIRALAMA FİLTRELERİ */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setSortBy('popular')}
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              sortBy === 'popular' 
                ? 'bg-red-600 text-white' 
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            🔥 Popüler
          </button>
          <button 
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              sortBy === 'newest' 
                ? 'bg-red-600 text-white' 
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            🆕 En Yeni
          </button>
          <button 
            onClick={() => setSortBy('mostRead')}
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              sortBy === 'mostRead' 
                ? 'bg-red-600 text-white' 
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            👁️ En Çok Okunan
          </button>
        </div>

        {/* 🔴 KİTAP LİSTESİ */}
        {sortedBooks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl font-bold text-gray-400">
              Bu kategoride henüz kitap yok
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
              {displayedBooks.map(kitap => (
                <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="group">
                  <div className="relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                    {kitap.cover_url ? (
  <Image 
    src={kitap.cover_url} 
    alt={kitap.title}
    fill
    unoptimized
    sizes="(max-width: 768px) 150px, 200px"
    className="object-cover group-hover:scale-110 transition-transform duration-700"
  />
) : (
                      <div className="w-full h-full bg-gray-50 dark:bg-gray-900" />
                    )}
                  </div>
                  
                  <h3 className="flex items-center gap-1.5 font-bold text-[11px] md:text-[13px] dark:text-white mb-0.5 group-hover:text-red-600 transition-colors">
                    {kitap.is_editors_choice && (
                      <div className="shrink-0" title="Editörün Seçimi">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500 drop-shadow-sm">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )}
                    <span className="truncate line-clamp-1">{kitap.title}</span>
                  </h3>

                  {kitap.is_completed && (
                    <div className="mb-1">
                      <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        ✅ Tamamlandı
                      </span>
                    </div>
                  )}
                  
               <div className="flex flex-col mt-0.5 gap-0.5 text-[7px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 truncate">
                    <Username 
                      username={kitap.username} 
                      isAdmin={kitap.is_admin}
                      isPremium={kitap.role === 'premium'} 
                    />
                    {kitap.co_author_name && (
                      <Username 
                        username={kitap.co_author_name} 
                        isAdmin={kitap.co_author_is_admin}
                        isPremium={kitap.co_author_role === 'premium'} 
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-3 mt-2 text-[8px] md:text-[9px] font-bold text-gray-400">
                    <span className="flex items-center gap-0.5">👁️ {formatNumber(kitap.totalViews)}</span>
                    <span className="flex items-center gap-0.5">❤️ {formatNumber(kitap.totalVotes)}</span>
                    <span className="flex items-center gap-0.5">💬 {formatNumber(kitap.totalComments)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* 🔴 DAHA FAZLA GÖSTER BUTONU */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMore}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  📚 Daha Fazla Göster ({sortedBooks.length - displayCount} kitap kaldı)
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}