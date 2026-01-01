'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import YorumAlani from '@/components/YorumAlani';
import { useRouter } from 'next/navigation';
import Username from '@/components/Username';

// --- YARDIMCI: SAYI FORMATLAMA ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

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
      chapters: 0,
      words: 0
    }, 
    isFollowing: false, 
    user: null,
    isAdmin: false,
    authorIsAdmin: false
  });
  const [loading, setLoading] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. KİTABI ÇEK (Temel veriyi al)
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();
      
      if (bookError || !book) {
        setLoading(false);
        return;
      }

      // 2. PROFİLİ BUL (GARANTİ YÖNTEM - Hibrit Sistem)
      let authorProfile = null;

      if (book.user_id) {
        const { data: pId } = await supabase.from('profiles').select('*').eq('id', book.user_id).single();
        if (pId) authorProfile = pId;
      }

      if (!authorProfile && book.username) {
        const { data: pUser } = await supabase.from('profiles').select('*').eq('username', book.username).single();
        if (pUser) authorProfile = pUser;
      }

      if (!authorProfile && book.user_email) {
        const { data: pEmail } = await supabase.from('profiles').select('*').eq('email', book.user_email).single();
        if (pEmail) authorProfile = pEmail;
      }

      // 3. YAZAR ADMİN Mİ?
      let authorIsAdmin = false;
      const targetEmail = authorProfile?.email || book.user_email;
      if (targetEmail) {
         const { data: authorAdminCheck } = await supabase
           .from('announcement_admins')
           .select('*')
           .eq('user_email', targetEmail)
           .single();
         authorIsAdmin = !!authorAdminCheck;
      }

      // 4. BEN ADMİN MİYİM?
      let adminStatus = false;
      if (user) {
        const { data: admin } = await supabase
          .from('announcement_admins')
          .select('*')
          .eq('user_email', user.email)
          .single();
        if (admin) adminStatus = true;
      }
      
      // 5. BÖLÜMLERİ ÇEK
      const { data: chapters } = await supabase.from('chapters')
        .select('*')
        .eq('book_id', id)
        .order('order_no', { ascending: true });
      
      // Kullanıcı yazar veya admin değilse, sadece yayındaki bölümleri göster
      let filteredChapters = chapters || [];
      const willBeAuthor = user && book.user_email === user.email;
      const willBeAdmin = adminStatus;
      
      if (!willBeAuthor && !willBeAdmin) {
        filteredChapters = filteredChapters.filter(c => !c.is_draft);
      }
      
      // --- İSTATİSTİKLER (Sadece yayında olan bölümler) ---
      const publishedChapters = filteredChapters.filter(c => !c.is_draft);
      
      const totalViews = publishedChapters.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0) || 0;
      
      const totalWords = publishedChapters.reduce((acc, curr) => {
        return acc + (curr.word_count || 0);
      }, 0) || 0;

      let totalChapterVotes = 0;
      const publishedChapterIds = publishedChapters.map(c => c.id);
      if (publishedChapterIds.length > 0) {
        const { count } = await supabase
          .from('chapter_votes')
          .select('*', { count: 'exact', head: true })
          .in('chapter_id', publishedChapterIds);
        totalChapterVotes = count || 0;
      }

      const { count: follows } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('book_id', id);
     
      
      let following = false;
      if (user) {
        const { data: f } = await supabase.from('follows').select('*').eq('book_id', id).eq('user_email', user.email).single();
        following = !!f;
      }

      setData({ 
        book, 
        authorProfile,
        chapters: filteredChapters, 
        stats: { 
          views: totalViews, 
          votes: totalChapterVotes, 
          follows: follows || 0,
          // ✅ Doğrudan books tablosundaki 'total_comment_count' verisini alıyoruz:
          comments: book.total_comment_count || 0, 
          chapters: publishedChapters.length,
          words: totalWords
        },
        isFollowing: following, 
        user,
        isAdmin: adminStatus,
        authorIsAdmin: authorIsAdmin
      });
      setLoading(false);
    }
    fetchAll();
  }, [id]);

  // --- BÖLÜM TASLAĞA ATMA ---
  async function handleToggleChapterDraft(chapterId) {
    const chapter = data.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const newDraftStatus = !chapter.is_draft;
    const { error } = await supabase
      .from('chapters')
      .update({ is_draft: newDraftStatus })
      .eq('id', chapterId);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      setData(prev => ({
        ...prev,
        chapters: prev.chapters.map(c => 
          c.id === chapterId ? { ...c, is_draft: newDraftStatus } : c
        )
      }));
      
      if (newDraftStatus) {
        toast.success("📝 Bölüm taslağa alındı");
      } else {
        toast.success("🌍 Bölüm yayına alındı");
      }
    }
  }

  // --- BÖLÜM SIRALAMA FONKSİYONLARI ---
  async function moveChapter(index, direction) {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= data.chapters.length) return;

    const newChapters = [...data.chapters];
    [newChapters[index], newChapters[newIndex]] = [newChapters[newIndex], newChapters[index]];

    // Yeni sıra numaralarını ata
    const updatedChapters = newChapters.map((chapter, idx) => ({
      ...chapter,
      order_no: idx + 1
    }));

    setData(prev => ({ ...prev, chapters: updatedChapters }));

    const toastId = toast.loading('Sıralama kaydediliyor...');
    try {
      const updates = updatedChapters.map(chapter => 
        supabase
          .from('chapters')
          .update({ order_no: chapter.order_no })
          .eq('id', chapter.id)
      );

      await Promise.all(updates);
      toast.dismiss(toastId);
      toast.success('✅ Sıralama kaydedildi');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Hata: ' + error.message);
    }
  }

  async function handleToggleDraft() {
    const isAuthor = data.user && data.book.user_email === data.user.email;
    if (!isAuthor && !data.isAdmin) return;

    const newStatus = !data.book.is_draft; 
    const { error } = await supabase.from('books').update({ is_draft: newStatus }).eq('id', id);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      setData(prev => ({ ...prev, book: { ...prev.book, is_draft: newStatus } }));
      if (newStatus) toast.success("Kitap TASLAĞA alındı. Artık sadece sen görebilirsin. 🔒");
      else toast.success("Kitap YAYINA alındı. Herkes görebilir. 🌍");
    }
  }

  async function handleToggleCompleted() {
    const isAuthor = data.user && data.book.user_email === data.user.email;
    if (!isAuthor && !data.isAdmin) return;

    const newStatus = !data.book.is_completed;
    const { error } = await supabase.from('books').update({ is_completed: newStatus }).eq('id', id);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      setData(prev => ({ ...prev, book: { ...prev.book, is_completed: newStatus } }));
      if (newStatus) toast.success("Kitap 'TAMAMLANDI' olarak işaretlendi. 🎉");
      else toast.success("Kitap tekrar 'DEVAM EDİYOR' moduna geçti.");
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
      if (newStatus) toast.success("👑 Editörün Seçimi listesine eklendi!");
      else toast.success("Listeden çıkarıldı.");
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

  const isAuthor = data.user && data.book.user_email === data.user.email;
  const canEdit = isAuthor || data.isAdmin;

  const visibleChapters = canEdit 
    ? data.chapters 
    : data.chapters.filter(c => !c.is_draft);

  const isHidden = (visibleChapters.length === 0 || data.book.is_draft) && !canEdit;

  if (isHidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#080808] px-4">
        <div className="text-center">
          <span className="text-6xl block mb-6 animate-bounce">🚧</span>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter mb-3">
            {data.book.is_draft ? 'Yazar Düzenlemesinde' : 'Henüz Yayında Değil'}
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">
            {data.book.is_draft 
              ? 'Bu eser şu an taslak aşamasında. Yazar yayına aldığında görebilirsin.' 
              : 'Yazar bu esere henüz bölüm eklemedi.'}
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

  const displayAuthorName = data.authorProfile?.username || data.book.username;
  const displayAuthorAvatar = data.authorProfile?.avatar_url;

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

              {data.book.is_draft && (
                <span className="inline-block text-[10px] font-black uppercase text-gray-600 bg-gray-100 dark:bg-white/10 px-4 py-1.5 rounded-full tracking-[0.2em] border border-gray-400/20">
                  🔒 TASLAK MODU
                </span>
              )}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter dark:text-white leading-tight uppercase">
              {data.book.title}
            </h1>
            
            <Link href={`/yazar/${displayAuthorName}`} className="flex items-center gap-4 mb-10 group w-fit">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all flex items-center justify-center font-black text-sm uppercase">
                {displayAuthorAvatar && displayAuthorAvatar.includes('http') ? (
                  <img src={displayAuthorAvatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  (displayAuthorName || 'U')[0]
                )}
              </div>
              <div>
                <p className="text-sm font-black group-hover:text-red-600 transition-colors">
                  <Username username={displayAuthorName} isAdmin={data.authorIsAdmin} />
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Eser Sahibi</p>
              </div>
            </Link>
            
            {/* İSTATİSTİKLER */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10 bg-white dark:bg-white/5 p-8 rounded-[2rem] border dark:border-white/5">
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.views)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">👁️ Okunma</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.votes)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">❤️ Beğeni</p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.follows)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">📚 Kitaplık</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.comments)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">💬 Yorum</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.chapters)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">📖 Bölüm</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-black dark:text-white mb-1">{formatNumber(data.stats.words)}</p>
                <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest flex items-center justify-center gap-1">✍️ Kelime</p>
              </div>
            </div>

            <div className="mb-10 p-8 bg-white dark:bg-white/5 rounded-[2rem] border dark:border-white/5">
  <p 
    className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap transition-all duration-300"
    style={{ 
      fontFamily: 'Aptos, system-ui, -apple-system, sans-serif',
      maxHeight: summaryExpanded ? 'none' : '120px',
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    {data.book.summary}
  </p>
  
  {data.book.summary && data.book.summary.length > 300 && (
    <button
      onClick={() => setSummaryExpanded(!summaryExpanded)}
      className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
    >
      {summaryExpanded ? '↑ DAHA AZ GÖR' : '↓ DEVAMINI GÖR'}
    </button>
  )}
</div>
            <div className="flex flex-wrap gap-4">
               
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
                     onClick={handleToggleDraft}
                     className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                       data.book.is_draft
                         ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30 animate-pulse'
                         : 'bg-gray-800 text-gray-400 border border-white/10 hover:bg-gray-700 hover:text-white'
                     }`}
                   >
                     {data.book.is_draft ? '🌍 YAYINLA (CANLIYA AL)' : '🔒 TASLAĞA ÇEK (GİZLE)'}
                   </button>

                   <button
                     onClick={handleToggleCompleted}
                     className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                       data.book.is_completed
                         ? 'bg-gray-500 text-white hover:bg-gray-600'
                         : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/30'
                     }`}
                   >
                     {data.book.is_completed ? '✍️ DEVAM EDİYOR YAP' : '🏁 FİNAL YAP'}
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
              <span className="text-sm text-gray-400 font-normal">({visibleChapters.length})</span>
            </h2>
            
            {canEdit && visibleChapters.length > 1 && (
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                  reorderMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20'
                }`}
              >
                {reorderMode ? '✅ SIRALAMA TAMAMLA' : '🔄 SIRAYI DEĞİŞTİR'}
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {visibleChapters.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[2rem] border dark:border-white/5">
                <span className="text-5xl block mb-4">📝</span>
                <p className="text-xl font-black text-gray-400">Henüz bölüm eklenmemiş</p>
              </div>
            ) : (
              visibleChapters.map((c, idx) => (
                <div key={c.id} className="group">
                  
                  {/* SIRALAMA MODU */}
                  {reorderMode ? (
                    <div className="flex items-center gap-4 p-6 bg-white dark:bg-white/5 border-2 border-blue-500 dark:border-blue-400 rounded-[2rem]">
                      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-red-600">{String(c.order_no).padStart(2, '0')}</span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-lg dark:text-white">{c.title}</h3>
                        {c.is_draft && (
                          <span className="text-[8px] font-black uppercase text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full mt-1 inline-block">
                            📝 Taslak
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveChapter(idx, 'up')}
                          disabled={idx === 0}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl transition-all ${
                            idx === 0
                              ? 'bg-gray-100 dark:bg-white/5 text-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveChapter(idx, 'down')}
                          disabled={idx === visibleChapters.length - 1}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl transition-all ${
                            idx === visibleChapters.length - 1
                              ? 'bg-gray-100 dark:bg-white/5 text-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                          }`}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL MOD */
                    <>
                      <Link 
                        href={`/kitap/${id}/bolum/${c.id}`} 
                        className={`flex items-center justify-between p-6 bg-white dark:bg-white/5 border dark:border-white/5 rounded-[2rem] transition-all duration-300 hover:border-red-600 hover:shadow-xl ${
                          c.is_draft ? 'opacity-60 border-dashed' : ''
                        }`}
                      >
                        <div className="flex items-center gap-6 flex-1">
                          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-black text-red-600">{String(c.order_no).padStart(2, '0')}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-lg dark:text-white group-hover:text-red-600 transition-colors">
                                {c.title}
                              </h3>
                              {c.is_draft && (
                                <span className="text-[8px] font-black uppercase text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                  📝 Taslak
                                </span>
                              )}
                            </div>
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
                          <button
                            onClick={() => handleToggleChapterDraft(c.id)}
                            className={`text-[9px] font-black uppercase transition-colors px-3 py-1 rounded-full ${
                              c.is_draft
                                ? 'text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/20'
                                : 'text-gray-600 hover:text-gray-700 bg-gray-100 dark:bg-white/5'
                            }`}
                          >
                            {c.is_draft ? '🌍 Yayınla' : '📝 Taslağa Al'}
                          </button>
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
                    </>
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