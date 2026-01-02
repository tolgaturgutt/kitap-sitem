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
                   `${formatNumber(book.totalViews || book.view_count || 0)} okuma (toplam)`}
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
// --- GÜNCELLENMİŞ PODYUM TASARIMI (COMPACT / MİNYATÜR MOD) ---
function LeaderboardSection({ title, icon, colorClass, data, type, adminEmails }) {
  if (!data || data.length === 0) return <p className="text-gray-500 italic text-center py-10">Veri yok.</p>;

  const top3 = data.slice(0, 3);
  const others = data.slice(3);

  let podiumData = [];
  if (top3.length === 1) podiumData = [null, top3[0], null];
  else if (top3.length === 2) podiumData = [top3[1], top3[0], null];
  else podiumData = [top3[1], top3[0], top3[2]];

  const rankStyles = {
    0: { // 1. SIRA (ALTIN)
      gradient: "from-yellow-500/20 to-yellow-500/5", 
      border: "border-yellow-500", 
      text: "text-yellow-600 dark:text-yellow-400", 
      crown: "👑",
      scale: "scale-100 md:scale-110 z-10", 
      // Avatar küçüldü (w-16 idi, w-14 oldu)
      avatarSize: "w-14 h-14 md:w-24 md:h-24",
      marginBottom: "mb-0" 
    },
    1: { // 2. SIRA (GÜMÜŞ)
      gradient: "from-gray-400/20 to-gray-400/5", 
      border: "border-gray-400", 
      text: "text-gray-500 dark:text-gray-300", 
      crown: "🥈",
      scale: "scale-100 z-0",
      // Avatar küçüldü (w-12 idi, w-10 oldu)
      avatarSize: "w-10 h-10 md:w-16 md:h-16",
      marginBottom: "mb-4 md:mb-8"
    },
    2: { // 3. SIRA (BRONZ)
      gradient: "from-amber-700/20 to-amber-700/5", 
      border: "border-amber-700", 
      text: "text-amber-700 dark:text-amber-500", 
      crown: "🥉",
      scale: "scale-100 z-0",
      avatarSize: "w-10 h-10 md:w-16 md:h-16",
      marginBottom: "mb-8 md:mb-12"
    }
  };

  return (
    <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-4 md:p-6 border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden flex flex-col h-full">
       <div className={`absolute top-0 right-0 p-32 ${colorClass} rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-20`}></div>
       
       <h2 className="text-lg md:text-xl font-black uppercase tracking-tight mb-4 md:mb-8 flex items-center gap-2 relative z-10">
          <span className="text-2xl md:text-3xl">{icon}</span>
          <div className="leading-tight">{title}</div>
       </h2>

       {/* --- PODYUM ALANI --- */}
       <div className="flex items-end justify-center gap-1.5 md:gap-4 mb-4 md:mb-8 min-h-[160px] md:min-h-[200px]">
          {podiumData.map((item, visualIndex) => {
             if (!item && visualIndex !== 1) return <div key={visualIndex} className="flex-1 opacity-0"></div>; 
             if (!item) return null;

             const realIndex = visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2;
             const style = rankStyles[realIndex];
             const isUserAdmin = adminEmails.includes(item.email);

             return (
                <div key={item.userId} className={`flex-1 flex flex-col items-center text-center transition-all duration-300 min-w-0 ${style.scale}`}>
                   
                   {/* Avatar */}
                   <div className="relative mb-1.5 md:mb-3">
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white dark:bg-black border border-gray-100 dark:border-white/10 px-1 py-0 rounded-full shadow-md text-[10px] z-20 whitespace-nowrap">
                         {style.crown}
                      </div>
                      <div className={`rounded-full overflow-hidden border-2 bg-gray-200 dark:bg-gray-800 shadow-lg ${style.border} ${style.avatarSize}`}>
                         {item.avatar && <img src={item.avatar} className="w-full h-full object-cover" alt={item.username} />}
                      </div>
                   </div>

                   {/* İsim Kutusu - DAHA KISA SABİT BOY (h-70px) */}
                   <div className={`w-full h-[75px] md:h-[110px] rounded-t-xl md:rounded-t-2xl bg-gradient-to-b ${style.gradient} border-t-2 ${style.border} flex flex-col justify-center items-center shadow-lg backdrop-blur-sm px-0.5`}>
                      
                      <div className="w-full flex items-center justify-center flex-1 overflow-hidden px-1">
                        <Link href={`/yazar/${item.username}`} className="block w-full">
                           <Username 
                              username={item.username} 
                              isAdmin={isUserAdmin} 
                              // Fontlar: Mobilde 10px (Gold) ve 9px (Diğerleri)
                              className={`
                                flex justify-center items-center mx-auto w-full text-center break-words font-black hover:underline leading-none
                                ${realIndex === 0 ? 'text-[10px] md:text-base' : 'text-[9px] md:text-xs'} 
                              `} 
                           />
                        </Link>
                      </div>

                      <div className={`font-bold text-[8px] md:text-[10px] mb-1.5 leading-none ${style.text}`}>
                         {type === 'writer' ? formatNumber(item.totalWords) : item.count} {type === 'writer' ? 'kelime' : 'yorum'}
                      </div>
                   </div>
                </div>
             );
          })}
       </div>

       {/* --- LİSTE ALANI --- */}
       <div className="space-y-2 relative z-10 w-full">
          {others.map((item, idx) => {
             const realRank = idx + 4;
             const isUserAdmin = adminEmails.includes(item.email);
             return (
                <Link href={`/yazar/${item.username}`} key={item.userId} className="flex items-center gap-2 md:gap-3 group p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10">
                   <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold text-gray-400 bg-gray-100 dark:bg-white/5 rounded-md text-[10px] md:text-xs">#{realRank}</div>
                   <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
                      {item.avatar && <img src={item.avatar} className="w-full h-full object-cover" alt="" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <Username username={item.username} isAdmin={isUserAdmin} className="font-bold text-[10px] md:text-sm block truncate" />
                   </div>
                   <div className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                      {type === 'writer' ? formatNumber(item.totalWords) : item.count}
                   </div>
                </Link>
             );
          })}
       </div>
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
// --- YENİ SİSTEM: HAFTALIK EN ÇOK OKUNANLAR (SQL RPC) ---
      // Veritabanındaki fonksiyonu çağırıyoruz. Hızlı ve net.
      const { data: rpcData, error } = await supabase
        .rpc('get_weekly_most_read_books', { 
          start_date: birHaftaOnce.toISOString() 
        });

      if (error) console.error('Haftalık veri hatası:', JSON.stringify(error, null, 2));

      // Gelen veriyi senin kullandığın yapıya uyduruyoruz (Formatlama)
      const weeklyBooks = rpcData?.map(item => ({
        id: item.id,
        title: item.title,
        cover_url: item.cover_url,
        weekly_reads: item.weekly_reads,
        profiles: { // Profil yapısını senin koduna uydurdum
          username: item.username,
          email: item.user_email,
          avatar_url: item.user_avatar
        }
      })) || [];

      
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
// ✅ 1. TÜM ZAMANLAR (GARANTİ YÖNTEM: Top100 Mantığı)
      // Kitapları ve bölümlerin izlenme sayılarını çekiyoruz
      const { data: allBooksRaw } = await supabase
        .from('books')
        .select(`
          id, 
          title, 
          cover_url, 
          is_completed, 
          user_id, 
          username,
          is_draft,
          chapters (views), 
          profiles:user_id (username, email)
        `)
        .eq('is_draft', false); // Taslakları gizle

      if (allBooksRaw) {
        // Javascript ile bölümleri toplayıp 'totalViews' hesaplıyoruz
        const calculatedBooks = allBooksRaw.map(book => {
           // Bölüm izlenmelerini topla
           const totalViews = book.chapters 
              ? book.chapters.reduce((sum, c) => sum + (c.views || 0), 0) 
              : 0;
           
           // Profil eşleştirmesi (Yazar adı düzgün görünsün)
           const displayUsername = book.profiles?.username || book.username;
           
           return { 
             ...book, 
             totalViews,
             username: displayUsername 
           };
        });

        // En çok okunana göre sırala (Büyükten küçüğe)
        calculatedBooks.sort((a, b) => b.totalViews - a.totalViews);

        // İlk 10 tanesini al ve state'e at
        setAllTimeTopBooks(calculatedBooks.slice(0, 10));
      }

      // Haftalık yazarlar
 // --- HAFTALIK EN ÇOK YAZANLAR (SQL - LİMİTSİZ) ---
      const { data: rpcWriters, error: writerError } = await supabase
        .rpc('get_weekly_top_writers', { 
          start_date: birHaftaOnce.toISOString() 
        });

      if (writerError) console.error('Yazar verisi hatası:', writerError);

      const formattedWriters = rpcWriters?.map(writer => ({
        userId: writer.username, // Key niyetine username
        username: writer.username,
        email: writer.email,
        avatar: writer.avatar_url,
        totalWords: writer.total_words
      })) || [];

      setTopWriters(formattedWriters);

      // Haftalık yorumcular
     // --- EN ÇOK KONUŞANLAR (YENİ SİSTEM - LİMİTSİZ) ---
      const { data: topCommentersData, error: commentError } = await supabase
        .rpc('get_top_commenters');

      if (commentError) console.error('Yorum verisi hatası:', commentError);

      const formattedCommenters = topCommentersData?.map(user => ({
        userId: user.username, 
        username: user.username,
        email: user.email,
        avatar: user.avatar_url,
        count: user.comment_count
      })) || [];
      
      setTopCommenters(formattedCommenters);
// --- GEÇEN HAFTANIN ŞAMPİYONLARI (SQL - LİMİTSİZ SİSTEM) ---
      
      // 1. En Çok Yazan (Geçen Hafta)
      const { data: rpcChampionWriter } = await supabase.rpc('get_period_top_writer', {
         start_date: ikiHaftaOnce.toISOString(),
         end_date: birHaftaOnce.toISOString()
      });

      // 2. En Çok Yorum Yapan (Geçen Hafta)
      const { data: rpcChampionCommenter } = await supabase.rpc('get_period_top_commenter', {
         start_date: ikiHaftaOnce.toISOString(),
         end_date: birHaftaOnce.toISOString()
      });

      // 3. En Çok Okunan Kitap (Geçen Hafta)
      const { data: rpcChampionBook } = await supabase.rpc('get_period_top_book', {
         start_date: ikiHaftaOnce.toISOString(),
         end_date: birHaftaOnce.toISOString()
      });

      setLastWeekChampions({
        writer: rpcChampionWriter?.[0] ? {
           username: rpcChampionWriter[0].username,
           email: rpcChampionWriter[0].email,
           avatar: rpcChampionWriter[0].avatar_url,
           totalWords: rpcChampionWriter[0].total_words
        } : null,
        
        commenter: rpcChampionCommenter?.[0] ? {
           username: rpcChampionCommenter[0].username,
           email: rpcChampionCommenter[0].email,
           avatar: rpcChampionCommenter[0].avatar_url,
           count: rpcChampionCommenter[0].count
        } : null,
        
        book: rpcChampionBook?.[0] ? {
           id: rpcChampionBook[0].id,
           title: rpcChampionBook[0].title,
           cover_url: rpcChampionBook[0].cover_url,
           weekly_reads: rpcChampionBook[0].weekly_reads
        } : null
      });
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
          
          {/* 1. KUTU: EN ÇOK YAZANLAR */}
          <LeaderboardSection 
            title={<><span className="block text-[10px] md:text-xs text-red-600 tracking-widest mb-1 font-bold">HAFTANIN</span>EN ÇOK YAZANLARI</>}
            icon="✍️"
            colorClass="bg-red-600/10"
            data={topWriters}
            type="writer"
            adminEmails={adminEmails}
          />

          {/* 2. KUTU: EN ÇOK KONUŞANLAR */}
          <LeaderboardSection 
            title={<><span className="block text-[10px] md:text-xs text-blue-500 tracking-widest mb-1 font-bold">HAFTANIN</span>EN ÇOK KONUŞANLARI</>}
            icon="💬"
            colorClass="bg-blue-600/10"
            data={topCommenters}
            type="commenter"
            adminEmails={adminEmails}
          />

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