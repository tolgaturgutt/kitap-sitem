'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Username from '@/components/Username';

const BOOKS_PER_PAGE = 24; 

// --- YARDIMCI: SAYI FORMATLAMA (1200 -> 1.2K) ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function KategoriSayfasi() {
  const { slug } = useParams();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('popular'); 

  const category = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      // 1. KİTAPLARI VE BÖLÜMLERİNİ ÇEK (Okunma sayısı için views eklendi)
      let { data: categoryBooks } = await supabase
        .from('books')
        .select('*, chapters(id, views)')
        .ilike('category', category);

      // 2. TÜM YORUMLARI VE OYLARI ÇEK (Güvenli Hesaplama İçin)
      const { data: allComments } = await supabase.from('comments').select('book_id');
      const { data: allVotes } = await supabase.from('chapter_votes').select('chapter_id');

      // 3. TREND SKORLAMASI İÇİN SON 10 GÜNLÜK VERİLER
      const { data: recentVotes } = await supabase.from('chapter_votes').select('chapter_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: recentComments } = await supabase.from('comments').select('book_id').gte('created_at', tenDaysAgo.toISOString());
      const { data: recentFollows } = await supabase.from('follows').select('book_id').gte('created_at', tenDaysAgo.toISOString());

      if (categoryBooks && categoryBooks.length > 0) {
        
        // FİLTRELEME: Boş veya taslak kitapları gizle
        categoryBooks = categoryBooks.filter(book => {
          const hasChapters = book.chapters && book.chapters.length > 0;
          const isOwner = user && user.email === book.user_email; 
          return (hasChapters && !book.is_draft) || isOwner;
        });

        // YAZAR ROLLERİNİ ÇEK
        const authorNames = [...new Set(categoryBooks.map(b => b.username))];
        const { data: roles } = await supabase
          .from('profiles')
          .select('username, role')
          .in('username', authorNames);

        // VERİLERİ BİRLEŞTİR VE HESAPLA
        const scored = categoryBooks.map(book => {
          const author = roles?.find(r => r.username === book.username);
          
          // A. GENEL TOPLAMLAR (Kartın altında görünecek)
          const totalViews = book.chapters.reduce((sum, c) => sum + (c.views || 0), 0);
          
          const chapterIds = book.chapters.map(c => c.id);
          const totalVotes = allVotes?.filter(v => chapterIds.includes(v.chapter_id)).length || 0;
          
          const totalComments = allComments?.filter(c => c.book_id === book.id).length || 0;

          // B. TREND SKORU (Sıralama için)
          const rVotes = recentVotes?.filter(v => chapterIds.includes(v.chapter_id)).length || 0;
          const rComments = recentComments?.filter(c => c.book_id === book.id).length || 0;
          const rFollows = recentFollows?.filter(f => f.book_id === book.id).length || 0;
          
          // Okunma da skora etki etsin (Hafif ağırlıklı)
          const score = (totalViews * 0.1) + (rVotes * 5) + (rComments * 10) + (rFollows * 20);

          return { 
            ...book, 
            author_role: author?.role,
            interactionScore: score,
            totalViews,
            totalVotes,
            totalComments
          };
        });

        setBooks(scored);
        setFilteredBooks(scored);
      } else {
        setBooks([]);
        setFilteredBooks([]);
      }
      
      setLoading(false);
    }
    fetchBooks();
  }, [slug, category]);

  useEffect(() => {
    let result = [...books];
    if (searchQuery.trim()) {
      result = result.filter(b => 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === 'popular') {
      result.sort((a, b) => b.interactionScore - a.interactionScore);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    setFilteredBooks(result);
    setCurrentPage(1); 
  }, [searchQuery, sortBy, books]);

  const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
  const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
  const endIndex = startIndex + BOOKS_PER_PAGE;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-16 px-6 md:px-16 bg-[#fafafa] dark:bg-black transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* BAŞLIK */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black dark:text-white mb-8 tracking-tighter uppercase">
            {category} <span className="text-red-600">({filteredBooks.length})</span>
          </h1>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kitap veya yazar ara..."
                className="w-full h-12 bg-white dark:bg-white/5 border dark:border-white/10 rounded-full pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-red-600/20 transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-12 px-6 bg-white dark:bg-white/5 border dark:border-white/10 rounded-full text-sm font-bold outline-none focus:ring-2 focus:ring-red-600/20 cursor-pointer"
            >
              <option value="popular">🔥 En Popüler</option>
              <option value="newest">🆕 En Yeni</option>
              <option value="oldest">📅 En Eski</option>
            </select>
          </div>
        </div>

        {/* KİTAPLAR GRİD */}
        {currentBooks.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">📚</span>
            <p className="text-xl font-black text-gray-400">Sonuç bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
              {currentBooks.map(kitap => (
                <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="group">
                  
                  {/* KAPAK */}
                  <div className="relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                    {kitap.cover_url ? (
                      <img 
                        src={kitap.cover_url} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        alt={kitap.title}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-900" />
                    )}
                    
                    {kitap.is_completed && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10">
                        FİNAL
                      </div>
                    )}
                  </div>

                  {/* BAŞLIK */}
                  <h3 className="text-[13px] font-bold dark:text-white truncate mb-1 group-hover:text-red-600 transition-colors">
                    {kitap.title}
                  </h3>
                  
                  {/* YAZAR */}
                  <div>
                    <Username 
                      username={kitap.username} 
                      isAdmin={kitap.author_role === 'admin'} 
                      className="text-[10px] text-gray-400 font-bold uppercase tracking-widest" 
                    />
                  </div>

                  {/* ✅ İSTATİSTİKLER (Ana Sayfa ile aynı) */}
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-gray-400">
                    <span className="flex items-center gap-1">👁️ {formatNumber(kitap.totalViews)}</span>
                    <span className="flex items-center gap-1">❤️ {formatNumber(kitap.totalVotes)}</span>
                    <span className="flex items-center gap-1">💬 {formatNumber(kitap.totalComments)}</span>
                  </div>

                </Link>
              ))}
            </div>

            {/* SAYFALAMA */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border dark:border-white/10 font-black disabled:opacity-30 hover:bg-red-600 hover:text-white transition-all"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-black transition-all ${
                      currentPage === page
                        ? 'bg-red-600 text-white shadow-lg scale-110'
                        : 'bg-white dark:bg-white/5 border dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border dark:border-white/10 font-black disabled:opacity-30 hover:bg-red-600 hover:text-white transition-all"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}