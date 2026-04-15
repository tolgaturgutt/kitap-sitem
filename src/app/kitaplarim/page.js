'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';

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
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('eserlerim');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  useEffect(() => {
    async function getData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return (window.location.href = '/giris');
      setUser(activeUser);

      // Admin listesi
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      // --- 1. KİTAPLARI VE İSTATİSTİKLERİ ÇEK (total_votes EKLENDİ) ---
      // 👇 ARTIK 'total_votes' SÜTUNUNU DİREKT İSTİYORUZ
     const { data: written } = await supabase
        .from('books')
        .select('*, total_comment_count, total_votes, chapters(id, views)') 
        .or(`user_id.eq.${activeUser.id},and(co_author_id.eq.${activeUser.id},co_author_status.eq.accepted)`)
        .order('created_at', { ascending: false });

      // --- 2. KÜTÜPHANE KİTAPLARINI ÇEK (total_votes EKLENDİ) ---
     const { data: follows } = await supabase
        .from('follows')
        .select(`
          *, 
          books!inner(
            *, 
            total_comment_count,
            total_votes, 
            chapters(id, views),
            profiles:user_id(username, role, email),
            co_author:profiles!co_author_id(username, email, role)
          )
        `)
        .eq('user_email', activeUser.email)
        .eq('books.is_draft', false)
        .order('created_at', { ascending: false });

      // ❌ SİLİNDİ: const { data: votesData }... (SİTEYİ YAVAŞLATAN KOD GİTTİ)

      // Verileri birleştirme fonksiyonu
      const mergeStats = (list) => {
        return list.map(book => {
          const totalBookViews = book.chapters?.reduce((acc, c) => acc + (c.views || 0), 0) || 0;
          
          // ✅ Veritabanından gelen hazır sayıları kullanıyoruz
          const totalComments = book.total_comment_count || 0;
          const totalVotes = book.total_votes || 0; // 👈 ARTIK HAZIR GELİYOR

          return { ...book, totalViews: totalBookViews, totalComments, totalVotes };
        });
      };

      // YAZDIĞIM KİTAPLARI AYARLA
      if (written) {
        const enrichedWritten = mergeStats(written);
        setMyBooks(enrichedWritten.filter(b => !b.is_draft));
        setMyDrafts(enrichedWritten.filter(b => b.is_draft === true));
      }

      // KÜTÜPHANE KİTAPLARINI AYARLA
      if (follows) {
       const booksWithStats = follows.map(follow => {
          const book = follow.books;
          if (!book) return null;

          const profile = book.profiles;
          const displayUsername = profile?.username || book.username;
          const ownerEmail = profile?.email || book.user_email;

          // YENİ: Ortak yazar verilerini hazırla
          const hasAcceptedCoAuthor = book.co_author_id && book.co_author_status === 'accepted' && book.co_author;
          const coAuthorEmail = book.co_author?.email;

          const totalViews = book.chapters?.reduce((sum, c) => sum + (c.views || 0), 0) || 0;
          const totalVotes = book.total_votes || 0;
          const totalComments = book.total_comment_count || 0;

          return {
            ...book,
            username: displayUsername,
            role: profile?.role,
            is_admin: emails.includes(ownerEmail),
            // ORTAK YAZAR BİLGİLERİ EKLENİYOR
            co_author_name: hasAcceptedCoAuthor ? book.co_author.username : null,
            co_author_role: hasAcceptedCoAuthor ? book.co_author.role : null,
            co_author_is_admin: coAuthorEmail ? emails.includes(coAuthorEmail) : false,
            totalViews,
            totalVotes,
            totalComments
          };
        }).filter(Boolean);

        setLibraryBooks(booksWithStats);
      }

      setLoading(false);
    }
    getData();
  }, []);

  async function handleRemoveFromLibrary(bookId) {
    if (!user) return;
    
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('book_id', bookId)
      .eq('user_email', user.email);

    if (!error) {
      setLibraryBooks(prev => prev.filter(b => b.id !== bookId));
      toast.success('Kitap kütüphaneden kaldırıldı');
    } else {
      toast.error('Bir hata oluştu');
    }
  }

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-3xl md:text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  const getCurrentBooks = () => {
    if (activeTab === 'eserlerim') return myBooks;
    if (activeTab === 'taslaklar') return myDrafts;
    if (activeTab === 'kutuphane') return libraryBooks;
    return [];
  };

  const currentBooks = getCurrentBooks();

  return (
    <div className="min-h-screen py-6 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black uppercase dark:text-white mb-2 md:mb-4">
            📚 Kitaplarım
          </h1>
          <p className="text-xs md:text-base text-gray-500 dark:text-gray-400">
            Yazdığın eserler ve takip ettiğin kitaplar
          </p>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 md:flex gap-2 md:gap-8 mb-6 md:mb-8 border-b dark:border-white/5 pb-2 md:pb-4">
          <button 
            onClick={() => setActiveTab('eserlerim')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors px-2 md:px-0 py-2 ${
              activeTab === 'eserlerim' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400'
            }`}
          >
            ✏️ Eserlerim ({myBooks.length})
          </button>
          <button 
            onClick={() => setActiveTab('taslaklar')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors px-2 md:px-0 py-2 ${
              activeTab === 'taslaklar' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400'
            }`}
          >
            📝 Taslaklar ({myDrafts.length})
          </button>
          <button 
            onClick={() => setActiveTab('kutuphane')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors px-2 md:px-0 py-2 ${
              activeTab === 'kutuphane' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400'
            }`}
          >
            📖 Kütüphane ({libraryBooks.length})
          </button>
          <button 
            onClick={() => setActiveTab('ozel')} 
            className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors px-2 md:px-0 py-2 ${
              activeTab === 'ozel' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400'
            }`}
          >
            ⭐ Özel Kütüphane
          </button>
        </div>

        {/* CONTENT */}
        {activeTab === 'ozel' ? (
          // Özel Kütüphane - Yakında
          <div className="text-center py-16 md:py-32">
            <div className="text-6xl md:text-8xl mb-4 md:mb-6">⭐</div>
            <h2 className="text-xl md:text-3xl font-black dark:text-white mb-2 md:mb-4">
              Özel Kütüphane
            </h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-4 md:mb-6">
              Bu özellik çok yakında kullanıma açılacak!
            </p>
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-black text-xs md:text-sm px-6 md:px-8 py-3 md:py-4 rounded-2xl uppercase tracking-wider">
              🚀 Yakında
            </div>
          </div>
        ) : currentBooks.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-6xl md:text-8xl mb-4">📖</div>
            <p className="text-base md:text-xl font-bold text-gray-400 dark:text-gray-500 mb-2">
              {activeTab === 'eserlerim' && 'Henüz yayınlanmış kitabın yok'}
              {activeTab === 'taslaklar' && 'Henüz taslak oluşturmamışsın'}
              {activeTab === 'kutuphane' && 'Kütüphanen Boş'}
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              {activeTab === 'eserlerim' && 'Hemen yazmaya başla!'}
              {activeTab === 'taslaklar' && 'Fikirlerini taslak olarak sakla'}
              {activeTab === 'kutuphane' && 'Henüz hiç kitap eklemedin. Keşfetmeye başla!'}
            </p>
            {activeTab === 'kutuphane' && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs md:text-sm px-6 md:px-8 py-3 md:py-4 rounded-2xl uppercase tracking-wider transition-all mt-6"
              >
                Kitap Keşfet →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {currentBooks.map(k => (
              <div key={k.id} className="group relative">
                <Link href={`/kitap/${k.id}`} className="block">
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
                  
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase dark:text-white group-hover:text-red-600 transition-colors line-clamp-2 leading-tight mb-1">
                    {k.title}
                  </h3>
                  
                {/* Kütüphane için yazar adı */}
                  {activeTab === 'kutuphane' && (
                    <div className="flex flex-col mt-0.5 gap-0.5 text-[8px] md:text-[9px] font-bold uppercase tracking-widest mb-1 opacity-90">
                      <Username 
                        username={k.username} 
                        isAdmin={k.is_admin} 
                        isPremium={k.role === 'premium'} 
                      />
                      {k.co_author_name && (
                        <Username 
                          username={k.co_author_name} 
                          isAdmin={k.co_author_is_admin} 
                          isPremium={k.co_author_role === 'premium'} 
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Tamamlandı Rozeti */}
                  {k.is_completed && (
                    <div className="mb-1">
                      <span className="text-[7px] md:text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-wide inline-block">
                        ✅ Tamamlandı
                      </span>
                    </div>
                  )}
                  
                  {/* İstatistik Şeridi */}
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-1 md:mt-1.5 text-[7px] md:text-[8px] font-black text-gray-400">
                    <span className="flex items-center gap-0.5">👁️ {formatNumber(k.totalViews)}</span>
                    <span className="flex items-center gap-0.5">❤️ {formatNumber(k.totalVotes)}</span>
                    <span className="flex items-center gap-0.5">💬 {formatNumber(k.totalComments)}</span>
                  </div>
                </Link>

                {/* Kaldır butonu - sadece kütüphane için */}
                {activeTab === 'kutuphane' && (
                  <button
                    onClick={() => handleRemoveFromLibrary(k.id)}
                    className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 bg-white/90 dark:bg-black/90 backdrop-blur-sm border dark:border-white/10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white text-xs md:text-sm"
                    title="Kütüphaneden Kaldır"
                  >
                    ✕
                  </button>
                )}
              </div>
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
                ✏️
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