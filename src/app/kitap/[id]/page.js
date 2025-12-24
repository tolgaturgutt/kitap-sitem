'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import YorumAlani from '@/components/YorumAlani';
import { useRouter } from 'next/navigation';
import Username from '@/components/Username';

export default function KitapDetay({ params }) {
  const { id } = use(params);
  const router = useRouter(); 
  
  const [data, setData] = useState({ 
    book: null, 
    authorProfile: null, 
    chapters: [], 
    stats: { 
      views: 0, 
      votes: 0, 
      follows: 0, 
      comments: 0,
      chapters: 0 
    }, 
    isFollowing: false, 
    hasVoted: false, 
    user: null,
    isAdmin: false,
    authorIsAdmin: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
      
      const { data: chapters } = await supabase.from('chapters')
        .select('*')
        .eq('book_id', id)
        .order('order_no', { ascending: true });
      
     let authorProfile = null;
     let authorIsAdmin = false;
     if (book) {
       const { data: profile } = await supabase.from('profiles').select('*').eq('username', book.username).single();
       authorProfile = profile;
       
       const { data: authorAdminCheck } = await supabase
         .from('announcement_admins')
         .select('*')
         .eq('user_email', book.user_email)
         .single();
       
       authorIsAdmin = !!authorAdminCheck;
     }

      let adminStatus = false;
      if (user) {
        const { data: admin } = await supabase
          .from('announcement_admins')
          .select('*')
          .eq('user_email', user.email)
          .single();
        if (admin) adminStatus = true;
      }
      
      const totalViews = chapters?.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0) || 0;
      const { count: votes } = await supabase.from('book_votes').select('*', { count: 'exact', head: true }).eq('book_id', id);
      const { count: follows } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('book_id', id);
      const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('book_id', id);
      
      let following = false, voted = false;
      if (user) {
        const { data: f } = await supabase.from('follows').select('*').eq('book_id', id).eq('user_email', user.email).single();
        following = !!f;
        const { data: v } = await supabase.from('book_votes').select('*').eq('book_id', id).eq('user_email', user.email).single();
        voted = !!v;
      }

      setData({ 
        book, 
        authorProfile, 
        chapters: chapters || [], 
        stats: { 
          views: totalViews, 
          votes: votes || 0, 
          follows: follows || 0,
          comments: comments || 0,
          chapters: chapters?.length || 0
        }, 
        isFollowing: following, 
        hasVoted: voted, 
        user,
        isAdmin: adminStatus,
        authorIsAdmin: authorIsAdmin
      });
      setLoading(false);
    }
    fetchAll();
  }, [id]);

  // KİTAP DURUMU DEĞİŞTİR
  async function handleToggleCompleted() {
    const isAuthor = data.user && data.book.user_email === data.user.email;
    if (!isAuthor && !data.isAdmin) return;

    const newStatus = !data.book.is_completed;
    const { error } = await supabase.from('books').update({ is_completed: newStatus }).eq('id', id);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      setData(prev => ({ ...prev, book: { ...prev.book, is_completed: newStatus } }));
      if (newStatus) toast.success("Tebrikler! Kitap 'TAMAMLANDI' olarak işaretlendi. 🎉");
      else toast.success("Kitap tekrar 'DEVAM EDİYOR' durumuna alındı.");
    }
  }

  async function handleBookVote() {
     if (!data.user) return toast.error("Giriş yapmalısın.");
     if (data.hasVoted) {
       await supabase.from('book_votes').delete().eq('book_id', id).eq('user_email', data.user.email);
       setData(prev => ({ ...prev, hasVoted: false, stats: { ...prev.stats, votes: prev.stats.votes - 1 } }));
       toast.success("Oy geri alındı");
     } else {
       await supabase.from('book_votes').insert([{ book_id: id, user_email: data.user.email }]);
       setData(prev => ({ ...prev, hasVoted: true, stats: { ...prev.stats, votes: prev.stats.votes + 1 } }));
       toast.success("Oy verildi");
       
       if (data.book.user_email !== data.user.email) {
         const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).single();
         const username = profile?.username || data.user.user_metadata?.username || data.user.email.split('@')[0];
         await supabase.from('notifications').insert({
           recipient_email: data.book.user_email,
           actor_username: username,
           type: 'vote',
           book_title: data.book.title,
           book_id: parseInt(id),
           chapter_id: null,
           is_read: false,
           created_at: new Date()
         });
       }
     }
  }

  async function handleToggleEditorsChoice() {
    if (!data.isAdmin) return;
    const newStatus = !data.book.is_editors_choice;
    const { error } = await supabase.from('books').update({ is_editors_choice: newStatus }).eq('id', id);
    if (error) {
      toast.error("İşlem başarısız: " + error.message);
    } else {
      setData(prev => ({ ...prev, book: { ...prev.book, is_editors_choice: newStatus } }));
      if (newStatus) toast.success("👑 Kitap 'Editörün Seçimi' listesine eklendi!");
      else toast.success("Kitap listeden çıkarıldı.");
    }
  }

  async function handleLibrary() {
     if (!data.user) return toast.error("Giriş yapmalısın.");
     if (data.isFollowing) {
       await supabase.from('follows').delete().eq('book_id', id).eq('user_email', data.user.email);
       setData(prev => ({ ...prev, isFollowing: false, stats: { ...prev.stats, follows: prev.stats.follows - 1 } }));
       toast.success("Kütüphaneden çıkarıldı");
     } else {
       await supabase.from('follows').insert([{ book_id: id, user_email: data.user.email }]);
       setData(prev => ({ ...prev, isFollowing: true, stats: { ...prev.stats, follows: prev.stats.follows + 1 } }));
       toast.success("Kütüphaneye eklendi");
     }
  }

  async function handleDeleteBook() {
    if (!window.confirm('ADMIN DİKKATİ: Bu kitabı ve bağlı her şeyi silmek üzeresin. Emin misin?')) return;
    const toastId = toast.loading('Silme işlemi başlatıldı...');
    try {
      await supabase.from('chapters').delete().eq('book_id', id);
      await supabase.from('comments').delete().eq('book_id', id);
      await supabase.from('book_votes').delete().eq('book_id', id);
      await supabase.from('follows').delete().eq('book_id', id);
      await supabase.from('notifications').delete().eq('book_id', id);
      await supabase.from('books').delete().eq('id', id);
      toast.dismiss(toastId);
      toast.success('KİTAP VE TÜM VERİLER SİLİNDİ ✅');
      router.push('/profil'); 
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error.message, { duration: 6000 });
    }
  }

  async function handleDeleteChapter(chapterId) {
    if (!window.confirm('Bu bölümü silmek istediğinden emin misin?')) return;
    try {
      await supabase.from('comments').delete().eq('chapter_id', chapterId);
      await supabase.from('chapters').delete().eq('id', chapterId);
      setData(prev => ({
        ...prev,
        chapters: prev.chapters.filter(c => c.id !== chapterId),
        stats: { ...prev.stats, chapters: prev.stats.chapters - 1 }
      }));
      toast.success('Bölüm silindi');
    } catch (error) {
      toast.error('Hata: ' + error.message);
    }
  }

  if (loading) return (
    <div className="py-40 flex justify-center items-center animate-pulse">
      <div className="text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );
  if (!data.book) return <div className="py-20 text-center font-black">ESER BULUNAMADI</div>;

  // YETKİ KONTROLLERİ
  const isAuthor = data.user && data.book.user_email === data.user.email;
  const canEdit = isAuthor || data.isAdmin;

  // ✅ 🚧 GÜVENLİK KİLİDİ: BÖLÜM YOKSA VE YETKİLİ DEĞİLSE GÖSTERME
  // Yazar kendi boş kitabını görebilir (bölüm eklemek için), ama başkası göremez.
  if (data.chapters.length === 0 && !canEdit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#080808] px-4">
        <div className="text-center">
          <span className="text-6xl block mb-6 animate-bounce">🚧</span>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-3">
            Henüz Yayında Değil
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">
            Yazar bu esere henüz bölüm eklemedi.
          </p>
          <Link 
            href="/" 
            className="inline-block px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-6 bg-[#fafafa] dark:bg-[#080808] transition-colors duration-1000">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        
        {/* ÜST BÖLÜM */}
        <div className="flex flex-col lg:flex-row gap-12 mb-20 items-start">
          
          {/* KAPAK */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="aspect-[2/3] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border dark:border-white/5 bg-white dark:bg-black/20 sticky top-24">
              {data.book.cover_url ? (
                <img src={data.book.cover_url} className="w-full h-full object-cover" alt={data.book.title} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-gray-300 italic text-sm">Kapak Yok</div>
              )}
              {data.book?.is_editors_choice && (
                <div className="absolute top-0 right-0 m-4 z-20">
                  <span className="bg-yellow-500 text-black text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl shadow-yellow-500/40 animate-pulse">
                    👑 Editörün Seçimi
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* BİLGİLER */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-block text-[10px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-1.5 rounded-full tracking-[0.2em]">
                {data.book.category}
              </span>
              
              {data.book.is_completed && (
                <span className="inline-block text-[10px] font-black uppercase text-green-600 bg-green-50 dark:bg-green-950/20 px-4 py-1.5 rounded-full tracking-[0.2em] border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse">
                  ✅ TAMAMLANDI
                </span>
              )}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter dark:text-white leading-tight uppercase">
              {data.book.title}
            </h1>
            
            <Link href={`/yazar/${data.book.username}`} className="flex items-center gap-4 mb-10 group w-fit">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all flex items-center justify-center font-black text-sm uppercase">
                {data.authorProfile?.avatar_url && data.authorProfile.avatar_url.includes('http') ? (
                  <img src={data.authorProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  data.book.username[0]
                )}
              </div>
              <div>
                <p className="text-sm font-black group-hover:text-red-600 transition-colors">
                  <Username username={data.book.username} isAdmin={data.authorIsAdmin} />
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Eser Sahibi</p>
              </div>
            </Link>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10 bg-white dark:bg-white/5 p-8 rounded-[2rem] border dark:border-white/5">
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{data.stats.views}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">👁️ Okunma</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{data.stats.votes}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">⭐ Oy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{data.stats.follows}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">📚 Kitaplık</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{data.stats.comments}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">💬 Yorum</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{data.stats.chapters}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">📖 Bölüm</p>
              </div>
            </div>

            <div className="mb-10 p-8 bg-white dark:bg-white/5 rounded-[2rem] border dark:border-white/5">
              <p className="text-lg text-gray-600 dark:text-gray-400 font-serif italic leading-relaxed">
                {data.book.summary}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
               <button 
                 onClick={handleBookVote} 
                 className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                   data.hasVoted 
                     ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                     : 'bg-white dark:bg-black border-2 border-gray-200 dark:border-white/10 dark:text-white hover:border-red-600'
                 }`}
               >
                 {data.hasVoted ? '⭐ OYLANDI' : 'OY VER'}
               </button>
               
               <button 
                 onClick={handleLibrary} 
                 className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                   data.isFollowing 
                     ? 'bg-gray-100 dark:bg-white/5 text-gray-400 border-2 border-gray-200 dark:border-white/10' 
                     : 'bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white border-2 border-black dark:border-white'
                 }`}
               >
                 {data.isFollowing ? '📚 KÜTÜPHANEDE' : 'KÜTÜPHANEYE EKLE'}
               </button>
               
               {data.isAdmin && (
                 <button 
                   onClick={handleToggleEditorsChoice}
                   className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                     data.book.is_editors_choice 
                       ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-500/50' 
                       : 'bg-gray-800 text-yellow-500 border border-yellow-500/30 hover:bg-gray-700 hover:text-yellow-400'
                   }`}
                 >
                   {data.book.is_editors_choice ? '👑 SEÇİLDİ (Kaldır)' : '👑 EDİTÖRÜN SEÇİMİ YAP'}
                 </button>
               )}
               
               {canEdit && (
                 <>
                   <button
                     onClick={handleToggleCompleted}
                     className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                       data.book.is_completed
                         ? 'bg-gray-500 text-white hover:bg-gray-600'
                         : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
                     }`}
                   >
                     {data.book.is_completed ? '✍️ DEVAM EDİYOR YAP' : '🏁 FİNAL YAP (TAMAMLA)'}
                   </button>

                   <Link 
                     href={`/kitap/${id}/bolum-ekle`} 
                     className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all"
                   >
                     + BÖLÜM EKLE
                   </Link>
                   <Link 
                     href={`/kitap-duzenle/${id}`} 
                     className="px-10 py-4 bg-gray-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-700 transition-all"
                   >
                     ⚙️ DÜZENLE
                   </Link>
                   <button
                     onClick={handleDeleteBook}
                     className="px-10 py-4 bg-red-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all"
                   >
                     🗑️ KİTABI SİL
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* BÖLÜMLER LİSTESİ */}
        <div className="mb-32">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
              📖 Eserin Bölümleri
              <span className="text-sm text-gray-400 font-normal">({data.stats.chapters})</span>
            </h2>
          </div>
          
          <div className="space-y-4">
            {data.chapters.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[2rem] border dark:border-white/5">
                <span className="text-5xl block mb-4">📝</span>
                <p className="text-xl font-black text-gray-400">Henüz bölüm eklenmemiş</p>
              </div>
            ) : (
              data.chapters.map((c, idx) => (
                <div key={c.id} className="group">
                  <Link 
                    href={`/kitap/${id}/bolum/${c.id}`} 
                    className="flex items-center justify-between p-6 bg-white dark:bg-white/5 border dark:border-white/5 rounded-[2rem] hover:border-red-600 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                        <span className="text-sm font-black text-red-600">{String(c.order_no).padStart(2, '0')}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg dark:text-white mb-1 group-hover:text-red-600 transition-colors">
                          {c.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          👁️ {c.views || 0} okuma
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      OKU →
                    </span>
                  </Link>
                  {canEdit && (
                    <div className="flex gap-2 mt-2 ml-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link 
                        href={`/kitap/${id}/bolum-duzenle/${c.id}`}
                        className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors px-3 py-1 bg-blue-50 dark:bg-blue-950/20 rounded-full"
                      >
                        ✏️ Düzenle
                      </Link>
                      <button
                        onClick={() => handleDeleteChapter(c.id)}
                        className="text-[9px] font-black uppercase text-red-600 hover:text-red-700 transition-colors px-3 py-1 bg-red-50 dark:bg-red-950/20 rounded-full"
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* YORUMLAR */}
        <div className="pt-20 border-t dark:border-white/5">
           <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter italic mb-10 flex items-center gap-3">
             💬 Eser Hakkında Yorumlar
             <span className="text-sm text-gray-400 font-normal">({data.stats.comments})</span>
           </h2>
           <YorumAlani type="book" targetId={id} bookId={id} />
        </div>
      </div>
    </div>
  );
}