'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';

function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function KutuphanePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kutuphane'); // 'kutuphane' veya 'ozel'
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [adminEmails, setAdminEmails] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push('/giris');
        return;
      }

      setUser(currentUser);

      // Admin listesi
      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      // Kütüphane kitaplarını çek
      // ✅ GÜNCELLEME: Kitabın yazarını (profiles:user_id) ile bağlıyoruz.
      // Böylece yazar adını değiştirdiğinde kütüphanede de güncel görünür.
      const { data: follows } = await supabase
        .from('follows')
        .select(`
          *, 
          books!inner(
            *, 
            chapters(id, views, chapter_votes(chapter_id)),
            profiles:user_id(username, role, email)
          )
        `)
        .eq('user_email', currentUser.email)
        .eq('books.is_draft', false)
        .order('created_at', { ascending: false });

      // Yorumları çek
      const { data: allComments } = await supabase.from('comments').select('book_id');

      if (follows) {
        const booksWithStats = follows.map(follow => {
          const book = follow.books;
          if (!book) return null;

          // Güncel Profil Verileri (Hibrit Sistem)
          const profile = book.profiles;
          const displayUsername = profile?.username || book.username;
          const ownerEmail = profile?.email || book.user_email;

          const totalViews = book.chapters?.reduce((sum, c) => sum + (c.views || 0), 0) || 0;
          const chapterIds = book.chapters?.map(c => c.id) || [];
          const totalVotes = book.chapters?.reduce((sum, c) => sum + (c.chapter_votes?.length || 0), 0) || 0;
          const totalComments = allComments?.filter(c => c.book_id === book.id).length || 0;

          return {
            ...book,
            username: displayUsername, // Güncel isim
            role: profile?.role,
            is_admin: emails.includes(ownerEmail), // Güncel admin kontrolü
            totalViews,
            totalVotes,
            totalComments
          };
        }).filter(Boolean);

        setLibraryBooks(booksWithStats);
      }

      setLoading(false);
    }

    fetchData();
  }, [router]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-3xl md:text-5xl font-black tracking-tighter animate-pulse">
          <span className="text-black dark:text-white">Kitap</span>
          <span className="text-red-600">Lab</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-16 px-4 md:px-6 lg:px-16 bg-[#fafafa] dark:bg-black">
      <Toaster />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter dark:text-white mb-2 md:mb-3">
            📚 Kütüphanem
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
            Takip ettiğin kitaplar burada
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 md:gap-4 mb-8 md:mb-12 border-b dark:border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('kutuphane')}
            className={`px-4 md:px-6 py-3 md:py-4 font-black text-xs md:text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'kutuphane'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            📖 Kütüphane ({libraryBooks.length})
          </button>
          <button
            onClick={() => setActiveTab('ozel')}
            className={`px-4 md:px-6 py-3 md:py-4 font-black text-xs md:text-sm uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'ozel'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            ⭐ Özel Kütüphane
          </button>
        </div>

        {/* Content */}
        {activeTab === 'kutuphane' ? (
          libraryBooks.length === 0 ? (
            <div className="text-center py-16 md:py-32">
              <div className="text-6xl md:text-8xl mb-4 md:mb-6">📚</div>
              <h2 className="text-xl md:text-3xl font-black dark:text-white mb-2 md:mb-4">
                Kütüphanen Boş
              </h2>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6 md:mb-8">
                Henüz hiç kitap eklemedin. Keşfetmeye başla!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs md:text-sm px-6 md:px-8 py-3 md:py-4 rounded-2xl uppercase tracking-wider transition-all"
              >
                Kitap Keşfet →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
              {libraryBooks.map(kitap => (
                <div key={kitap.id} className="group relative">
                  <Link href={`/kitap/${kitap.id}`} className="block">
                    <div className="relative aspect-[2/3] w-full mb-3 overflow-hidden rounded-xl md:rounded-2xl border dark:border-gray-800 shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                      {kitap.cover_url ? (
                        <img
                          src={kitap.cover_url}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          alt={kitap.title}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-900" />
                      )}
                    </div>

                    <h3 className="flex items-center gap-1.5 font-bold text-xs md:text-sm dark:text-white mb-1 group-hover:text-red-600 transition-colors line-clamp-2">
                      {kitap.is_editors_choice && (
                        <div className="shrink-0" title="Editörün Seçimi">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500 drop-shadow-sm">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      )}
                      <span className="line-clamp-2">{kitap.title}</span>
                    </h3>

                    {kitap.is_completed && (
                      <div className="mb-1">
                        <span className="text-[7px] md:text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-wide">
                          ✅ Tamamlandı
                        </span>
                      </div>
                    )}

                    <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 mb-2">
                     <Username 
    username={kitap.username} 
    isAdmin={kitap.is_admin} 
    isPremium={kitap.role === 'premium'} // 👈 YENİ EKLENEN
  />
                    </p>

                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[9px] font-bold text-gray-400">
                      <span className="flex items-center gap-0.5 md:gap-1">👁️ {formatNumber(kitap.totalViews)}</span>
                      <span className="flex items-center gap-0.5 md:gap-1">❤️ {formatNumber(kitap.totalVotes)}</span>
                      <span className="flex items-center gap-0.5 md:gap-1">💬 {formatNumber(kitap.totalComments)}</span>
                    </div>
                  </Link>

                  {/* Kaldır butonu */}
                  <button
                    onClick={() => handleRemoveFromLibrary(kitap.id)}
                    className="absolute top-2 right-2 w-7 h-7 md:w-8 md:h-8 bg-white/90 dark:bg-black/90 backdrop-blur-sm border dark:border-white/10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white text-xs md:text-sm"
                    title="Kütüphaneden Kaldır"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
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
        )}
      </div>
    </div>
  );
}