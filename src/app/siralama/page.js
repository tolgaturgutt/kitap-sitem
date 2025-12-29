'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Username from '@/components/Username';

function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

function getRankStyle(index) {
  if (index === 0) return { color: 'text-yellow-500', icon: '🥇', border: 'border-yellow-500', bg: 'bg-yellow-500/10' };
  if (index === 1) return { color: 'text-gray-400', icon: '🥈', border: 'border-gray-400', bg: 'bg-gray-400/10' };
  if (index === 2) return { color: 'text-amber-700', icon: '🥉', border: 'border-amber-700', bg: 'bg-amber-700/10' };
  return { color: 'text-gray-500', icon: `#${index + 1}`, border: 'border-transparent', bg: 'bg-gray-100 dark:bg-white/5' };
}

function BookCarousel({ books, adminEmails, color = 'red' }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [books]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const colorMap = {
    red: { hover: 'hover:text-red-600', ring: 'ring-red-600' },
    yellow: { hover: 'hover:text-yellow-500', ring: 'ring-yellow-500' },
    purple: { hover: 'hover:text-purple-500', ring: 'ring-purple-500' }
  };

  const colors = colorMap[color] || colorMap.red;

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white dark:bg-black border-2 border-gray-200 dark:border-white/20 rounded-full shadow-xl hover:scale-110 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div ref={scrollRef} className="overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {books.map((book, idx) => {
            const style = getRankStyle(idx);
            const isUserAdmin = adminEmails.includes(book.profiles?.email);
            return (
              <div key={book.id} className="group relative w-[140px] md:w-[180px]" style={{ flexShrink: 0 }}>
                <Link href={`/kitap/${book.id}`}>
                  <div className={`absolute top-0 left-0 z-10 font-black text-xs px-2.5 py-1.5 rounded-br-xl rounded-tl-xl shadow-lg flex items-center gap-1 ${idx < 3 ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-800 text-white'}`}>
                    <span>{idx < 3 ? style.icon : `#${idx+1}`}</span>
                  </div>
                  <div className={`aspect-[2/3] rounded-2xl overflow-hidden border shadow-lg mb-3 transition-all duration-300 ${style.border} ${idx < 3 ? 'ring-2 ring-offset-2 ring-offset-[#fafafa] dark:ring-offset-black ' + colors.ring : 'dark:border-white/10'}`}>
                    {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={book.title} /> : <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />}
                  </div>
                  <h3 className={`font-bold text-sm truncate ${colors.hover} transition-colors`}>{book.title}</h3>
                </Link>
                <div className="mt-1"><Username username={book.profiles?.username} isAdmin={isUserAdmin} className="text-xs text-gray-400 font-bold uppercase tracking-wider" /></div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {book.weekly_reads ? `${formatNumber(book.weekly_reads)} okuma (bu hafta)` : 
                   book.monthly_reads ? `${formatNumber(book.monthly_reads)} okuma (bu ay)` : 
                   `${formatNumber(book.view_count)} okuma (toplam)`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white dark:bg-black border-2 border-gray-200 dark:border-white/20 rounded-full shadow-xl hover:scale-110 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [topWriters, setTopWriters] = useState([]);
  const [topCommenters, setTopCommenters] = useState([]);
  const [weeklyTopBooks, setWeeklyTopBooks] = useState([]);
  const [monthlyTopBooks, setMonthlyTopBooks] = useState([]);
  const [allTimeTopBooks, setAllTimeTopBooks] = useState([]);
  const [lastWeekChampions, setLastWeekChampions] = useState({ writer: null, commenter: null, book: null }); 
  const [adminEmails, setAdminEmails] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: adminData } = await supabase.from('announcement_admins').select('user_email');
      const admins = adminData?.map(a => a.user_email) || [];
      setAdminEmails(admins);

      // ✅ TARIH HESAPLAMA FONKSİYONLARI
function getThisWeekMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Pazar, 1=Pazartesi
  const diff = day === 0 ? -6 : 1 - day; // Pazar ise 6 gün geriye git
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(14, 0, 0, 0); // Saat 14:00
  
  // Eğer henüz bu haftanın Pazartesi 14:00'u gelmediyse, geçen haftayı al
  if (now < monday) {
    monday.setDate(monday.getDate() - 7);
  }
  
  return monday;
}

function getLastWeekMonday() {
  const thisMonday = getThisWeekMonday();
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  return lastMonday;
}

function getThisMonthFirst() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  
  // Eğer henüz ayın 1'i gelmediyse, geçen ayı al
  if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
    first.setMonth(first.getMonth() - 1);
  }
  
  return first;
}

// ✅ TARİHLERİ HESAPLA
const birHaftaOnce = getThisWeekMonday();
const birAyOnce = getThisMonthFirst();
const ikiHaftaOnce = getLastWeekMonday();
      // Haftalık en çok okunan kitaplar (chapter_views'dan - AYLIK GİBİ)
const { data: weeklyChapterViews } = await supabase
  .from('chapter_views')
  .select(`chapter_id, created_at, chapters!inner (book_id, books!inner (id, title, cover_url, view_count, user_id, is_draft, profiles:user_id (username, email)))`)
  .gte('created_at', birHaftaOnce.toISOString());

const weeklyBookViewCounts = {};
weeklyChapterViews?.forEach(item => {
  if (!item.chapters?.books || item.chapters.books.is_draft) return; // Taslak kitapları atla
  const book = item.chapters.books;
  const bId = book.id;
  if (!weeklyBookViewCounts[bId]) {
    weeklyBookViewCounts[bId] = { ...book, weekly_reads: 0 };
  }
  weeklyBookViewCounts[bId].weekly_reads += 1;
});

const weeklyBooks = Object.values(weeklyBookViewCounts)
  .sort((a, b) => b.weekly_reads - a.weekly_reads)
  .slice(0, 10);

console.log('📚 HAFTALIK TOP KİTAPLAR:', weeklyBooks);
setWeeklyTopBooks(weeklyBooks);

      // Aylık en çok okunan kitaplar (chapter_views'dan)
      const { data: monthlyChapterViews, error: monthlyViewsError } = await supabase
        .from('chapter_views')
        .select(`chapter_id, created_at, chapters!inner (book_id, books!inner (id, title, cover_url, view_count, user_id, profiles:user_id (username, email)))`)
        .gte('created_at', birAyOnce.toISOString());

      const monthlyBookViewCounts = {};
      monthlyChapterViews?.forEach(item => {
        if (!item.chapters?.books) return;
        const book = item.chapters.books;
        const bId = book.id;
        if (!monthlyBookViewCounts[bId]) {
          monthlyBookViewCounts[bId] = { ...book, monthly_reads: 0 };
        }
        monthlyBookViewCounts[bId].monthly_reads += 1;
      });
      
      const monthlyBooks = Object.values(monthlyBookViewCounts)
        .sort((a, b) => b.monthly_reads - a.monthly_reads)
        .slice(0, 10);
      setMonthlyTopBooks(monthlyBooks);
// Tüm zamanların en çok okunan kitapları (chapter_views'dan)
const { data: allTimeChapterViews } = await supabase
  .from('chapter_views')
  .select(`chapter_id, chapters!inner (book_id, books!inner (id, title, cover_url, view_count, user_id, is_draft, profiles:user_id (username, email)))`);

const allTimeBookViewCounts = {};
allTimeChapterViews?.forEach(item => {
  if (!item.chapters?.books || item.chapters.books.is_draft) return; // Taslak kitapları atla
  const book = item.chapters.books;
  const bId = book.id;
  if (!allTimeBookViewCounts[bId]) {
    allTimeBookViewCounts[bId] = { ...book, view_count: 0 };
  }
  allTimeBookViewCounts[bId].view_count += 1;
});

const allTimeBooks = Object.values(allTimeBookViewCounts)
  .sort((a, b) => b.view_count - a.view_count)
  .slice(0, 10);

setAllTimeTopBooks(allTimeBooks);

      // Haftalık yazarlar
     const { data: chapterData } = await supabase
  .from('chapters')
  .select(`word_count, is_draft, books!inner (user_id, is_draft, profiles:user_id (username, avatar_url, email))`)
  .gte('created_at', birHaftaOnce.toISOString())
  .eq('is_draft', false)
  .eq('books.is_draft', false);

      const writerMap = {};
      chapterData?.forEach(item => {
        if (!item.books || !item.books.profiles) return;
        const userId = item.books.user_id;
        const profile = item.books.profiles;
        if (!writerMap[userId]) writerMap[userId] = { userId, username: profile.username, email: profile.email, avatar: profile.avatar_url, totalWords: 0 };
        writerMap[userId].totalWords += (item.word_count || 0);
      });
      setTopWriters(Object.values(writerMap).sort((a, b) => b.totalWords - a.totalWords).slice(0, 10));

      // Haftalık yorumcular
      const { data: commentData } = await supabase
        .from('comments')
        .select(`user_id, profiles:user_id (username, avatar_url, email)`)
        .gte('created_at', birHaftaOnce.toISOString());

      const commentMap = {};
      commentData?.forEach(item => {
        if (!item.profiles) return;
        const userId = item.user_id;
        if (!commentMap[userId]) commentMap[userId] = { userId, username: item.profiles.username, email: item.profiles.email, avatar: item.profiles.avatar_url, count: 0 };
        commentMap[userId].count += 1;
      });
      setTopCommenters(Object.values(commentMap).sort((a, b) => b.count - a.count).slice(0, 10));

      // Geçen haftanın şampiyonları
     const { data: lastWeekChapters } = await supabase
  .from('chapters')
  .select(`word_count, is_draft, books!inner (user_id, is_draft, profiles:user_id (username, avatar_url, email))`)
  .gte('created_at', ikiHaftaOnce.toISOString())
  .lt('created_at', birHaftaOnce.toISOString())
  .eq('is_draft', false)
  .eq('books.is_draft', false);

      const lastWeekWriterMap = {};
      lastWeekChapters?.forEach(item => {
        if (!item.books || !item.books.profiles) return;
        const userId = item.books.user_id;
        const profile = item.books.profiles;
        if (!lastWeekWriterMap[userId]) lastWeekWriterMap[userId] = { userId, username: profile.username, email: profile.email, avatar: profile.avatar_url, totalWords: 0 };
        lastWeekWriterMap[userId].totalWords += (item.word_count || 0);
      });
      const lastWeekTopWriter = Object.values(lastWeekWriterMap).sort((a, b) => b.totalWords - a.totalWords)[0];

      const { data: lastWeekComments } = await supabase
        .from('comments')
        .select(`user_id, profiles:user_id (username, avatar_url, email)`)
        .gte('created_at', ikiHaftaOnce.toISOString())
        .lt('created_at', birHaftaOnce.toISOString());

      const lastWeekCommentMap = {};
      lastWeekComments?.forEach(item => {
        if (!item.profiles) return;
        const userId = item.user_id;
        if (!lastWeekCommentMap[userId]) lastWeekCommentMap[userId] = { userId, username: item.profiles.username, email: item.profiles.email, avatar: item.profiles.avatar_url, count: 0 };
        lastWeekCommentMap[userId].count += 1;
      });
      const lastWeekTopCommenter = Object.values(lastWeekCommentMap).sort((a, b) => b.count - a.count)[0];

      // Geçen haftanın en çok okunan kitabı (chapter_views'dan)
      const { data: lastWeekChapterViews } = await supabase
        .from('chapter_views')
        .select(`chapter_id, created_at, chapters!inner (book_id, books!inner (id, title, cover_url, view_count, user_id, profiles:user_id (username, email)))`)
        .gte('created_at', ikiHaftaOnce.toISOString())
        .lt('created_at', birHaftaOnce.toISOString());

      const lastWeekBookViewCounts = {};
      lastWeekChapterViews?.forEach(item => {
        if (!item.chapters?.books) return;
        const book = item.chapters.books;
        const bId = book.id;
        if (!lastWeekBookViewCounts[bId]) {
          lastWeekBookViewCounts[bId] = { ...book, weekly_reads: 0 };
        }
        lastWeekBookViewCounts[bId].weekly_reads += 1;
      });
      
      const lastWeekTopBook = Object.values(lastWeekBookViewCounts)
        .sort((a, b) => (b.weekly_reads || 0) - (a.weekly_reads || 0))[0];

      setLastWeekChampions({ writer: lastWeekTopWriter, commenter: lastWeekTopCommenter, book: lastWeekTopBook });
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return (
    <div className="py-40 flex justify-center items-center min-h-screen bg-[#fafafa] dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="text-3xl font-black tracking-tighter animate-pulse"><span className="text-black dark:text-white">LİDERLİK</span><span className="text-red-600">TABLOSU</span></div>
        <p className="text-xs text-gray-500">Yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 lg:px-16 bg-[#fafafa] dark:bg-black text-black dark:text-white">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto mb-8 md:mb-16 text-center">
        <h1 className="text-3xl md:text-7xl font-black tracking-tighter mb-2 md:mb-4">LİDERLİK <span className="text-red-600">TABLOSU</span></h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-lg max-w-2xl mx-auto">Haftalık ve aylık en iyiler. İstatistikler her Pazartesi sıfırlanır.</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-20">
        {(lastWeekChampions.writer || lastWeekChampions.commenter || lastWeekChampions.book) && (
          <div className="bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/5 rounded-2xl md:rounded-[2rem] p-4 md:p-8 border border-yellow-500/20 relative overflow-hidden mb-12 md:mb-20">
            <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-500 blur-3xl opacity-20"></div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-3 md:mb-6 text-center text-yellow-600 dark:text-yellow-400">👑 GEÇEN HAFTANIN KRALLARI</h2>
            <p className="text-[10px] md:text-sm font-bold opacity-70 uppercase tracking-widest text-center mb-4 md:mb-8">Zirvenin sahipleri</p>
            
            <div className="flex flex-col md:flex-row gap-3 md:gap-6 justify-center items-stretch">
              {lastWeekChampions.writer && (
                <div className="flex-1 bg-white dark:bg-[#0a0a0a] rounded-xl md:rounded-2xl p-4 md:p-6 border border-yellow-500/30 hover:border-yellow-500 transition-all">
                  <div className="text-center mb-3 md:mb-4">
                    <div className="text-2xl md:text-4xl mb-1 md:mb-2">✍️</div>
                    <h3 className="font-black text-sm md:text-lg uppercase tracking-tight">En Çok Yazan</h3>
                  </div>
                  <Link href={`/yazar/${lastWeekChampions.writer.username}`} className="flex flex-col items-center gap-2 md:gap-3 group">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-yellow-500 group-hover:scale-110 transition-transform bg-gray-200 dark:bg-gray-800">
                      {lastWeekChampions.writer.avatar && <img src={lastWeekChampions.writer.avatar} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <Username username={lastWeekChampions.writer.username} isAdmin={adminEmails.includes(lastWeekChampions.writer.email)} className="font-bold text-xs md:text-base group-hover:text-yellow-500 transition-colors" />
                    <p className="text-[10px] md:text-xs text-gray-400 font-medium">{formatNumber(lastWeekChampions.writer.totalWords)} kelime</p>
                  </Link>
                </div>
              )}

              {lastWeekChampions.book && (
                <div className="flex-1 bg-white dark:bg-[#0a0a0a] rounded-xl md:rounded-2xl p-4 md:p-6 border border-yellow-500/30 hover:border-yellow-500 transition-all">
                  <div className="text-center mb-3 md:mb-4">
                    <div className="text-2xl md:text-4xl mb-1 md:mb-2">📚</div>
                    <h3 className="font-black text-sm md:text-lg uppercase tracking-tight">En Çok Okunan</h3>
                  </div>
                  <Link href={`/kitap/${lastWeekChampions.book.id}`} className="flex flex-col items-center gap-2 md:gap-3 group">
                    <div className="w-16 md:w-24 aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden border-2 md:border-4 border-yellow-500 group-hover:scale-110 transition-transform">
                      {lastWeekChampions.book.cover_url ? <img src={lastWeekChampions.book.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />}
                    </div>
                    <p className="font-bold text-xs md:text-sm text-center group-hover:text-yellow-500 transition-colors line-clamp-2">{lastWeekChampions.book.title}</p>
                    <p className="text-[10px] md:text-xs text-gray-400 font-medium">{formatNumber(lastWeekChampions.book.weekly_reads)} okuma</p>
                  </Link>
                </div>
              )}

              {lastWeekChampions.commenter && (
                <div className="flex-1 bg-white dark:bg-[#0a0a0a] rounded-xl md:rounded-2xl p-4 md:p-6 border border-yellow-500/30 hover:border-yellow-500 transition-all">
                  <div className="text-center mb-3 md:mb-4">
                    <div className="text-2xl md:text-4xl mb-1 md:mb-2">💬</div>
                    <h3 className="font-black text-sm md:text-lg uppercase tracking-tight">En Çok Konuşan</h3>
                  </div>
                  <Link href={`/yazar/${lastWeekChampions.commenter.username}`} className="flex flex-col items-center gap-2 md:gap-3 group">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-yellow-500 group-hover:scale-110 transition-transform bg-gray-200 dark:bg-gray-800">
                      {lastWeekChampions.commenter.avatar && <img src={lastWeekChampions.commenter.avatar} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <Username username={lastWeekChampions.commenter.username} isAdmin={adminEmails.includes(lastWeekChampions.commenter.email)} className="font-bold text-xs md:text-base group-hover:text-yellow-500 transition-colors" />
                    <p className="text-[10px] md:text-xs text-gray-400 font-medium">{lastWeekChampions.commenter.count} yorum</p>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-12 md:mb-20">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-red-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight mb-6 md:mb-8 flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-4xl">✍️</span>
              <div><span className="block text-[10px] md:text-xs text-red-600 tracking-widest mb-1 font-bold">HAFTANIN</span>EN ÇOK YAZANLARI</div>
            </h2>
            <div className="space-y-4">
              {topWriters.length === 0 ? <p className="text-gray-500 italic text-center py-10">Veri yok.</p> : (
                topWriters.map((writer, idx) => {
                  const style = getRankStyle(idx);
                  const isUserAdmin = adminEmails.includes(writer.email);
                  return (
                    <Link href={`/yazar/${writer.username}`} key={writer.userId} className="flex items-center gap-4 group p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                      <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl font-black text-lg ${style.bg} ${style.color}`}>{style.icon}</div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all bg-gray-200 dark:bg-gray-800">
                        {writer.avatar && <img src={writer.avatar} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><Username username={writer.username} isAdmin={isUserAdmin} className="font-bold text-sm md:text-base" /></div>
                        <p className="text-xs text-gray-400 font-medium">{formatNumber(writer.totalWords)} kelime yazdı</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] p-6 md:p-10 border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-8 flex items-center gap-3">
              <span className="text-4xl">💬</span>
              <div><span className="block text-xs text-blue-500 tracking-widest mb-1 font-bold">HAFTANIN</span>EN ÇOK KONUŞANLARI</div>
            </h2>
            <div className="space-y-4">
              {topCommenters.length === 0 ? <p className="text-gray-500 italic text-center py-10">Veri yok.</p> : (
                topCommenters.map((user, idx) => {
                  const style = getRankStyle(idx);
                  const isUserAdmin = adminEmails.includes(user.email);
                  return (
                    <Link href={`/yazar/${user.username}`} key={user.userId} className="flex items-center gap-4 group p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                      <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl font-black text-lg ${style.bg} ${style.color}`}>{style.icon}</div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all bg-gray-200 dark:bg-gray-800">
                        {user.avatar && <img src={user.avatar} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><Username username={user.username} isAdmin={isUserAdmin} className="font-bold text-sm md:text-base" /></div>
                        <p className="text-xs text-gray-400 font-medium">{user.count} yorum yaptı</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-end gap-3 mb-8">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter dark:text-white">🔥 HAFTANIN EN ÇOK <span className="text-red-600">OKUNANLARI</span></h2>
            <span className="hidden md:inline-block h-px flex-1 bg-gray-200 dark:bg-white/10 mb-4"></span>
          </div>
          {weeklyTopBooks.length === 0 ? (
            <div className="text-gray-500 text-center py-10 border border-dashed border-gray-700 rounded-xl">Bu hafta okuma verisi bulunamadı.</div>
          ) : (
            <BookCarousel books={weeklyTopBooks} adminEmails={adminEmails} color="red" />
          )}
        </div>

        <div>
          <div className="flex items-end gap-3 mb-8">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter dark:text-white">📅 BU AYIN EN ÇOK <span className="text-yellow-500">OKUNANLARI</span></h2>
            <span className="hidden md:inline-block h-px flex-1 bg-gray-200 dark:bg-white/10 mb-4"></span>
          </div>
          {monthlyTopBooks.length === 0 ? (
            <div className="text-gray-500 text-center py-10 border border-dashed border-gray-700 rounded-xl">Veri yükleniyor veya bulunamadı.</div>
          ) : (
            <BookCarousel books={monthlyTopBooks} adminEmails={adminEmails} color="yellow" />
          )}
        </div>

        <div className="pb-20">
          <div className="flex items-end gap-3 mb-8">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter dark:text-white">🏆 EN ÇOK OKUNAN <span className="text-purple-500">KİTAPLAR</span></h2>
            <span className="hidden md:inline-block h-px flex-1 bg-gray-200 dark:bg-white/10 mb-4"></span>
          </div>
          {allTimeTopBooks.length === 0 ? (
            <div className="text-gray-500 text-center py-10 border border-dashed border-gray-700 rounded-xl">Veri yükleniyor veya bulunamadı.</div>
          ) : (
            <BookCarousel books={allTimeTopBooks} adminEmails={adminEmails} color="purple" />
          )}
        </div>
      </div>
    </div>
  );
}