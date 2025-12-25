'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import { useRouter } from 'next/navigation';
import PanoModal from '@/components/PanoModal'; 

// --- YARDIMCI: SAYI FORMATLAMA ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function YazarProfili() {
  const router = useRouter();
  const { username } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [panos, setPanos] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [selectedPano, setSelectedPano] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  const [adminEmails, setAdminEmails] = useState([]);

  // YENİ PANO STATE'LERİ
  const [showAddPano, setShowAddPano] = useState(false);
  const [newPanoTitle, setNewPanoTitle] = useState('');
  const [newPanoContent, setNewPanoContent] = useState('');
  const [selectedBookForPano, setSelectedBookForPano] = useState(null);
  const [selectedChapterForPano, setSelectedChapterForPano] = useState(null);
  const [panoChapters, setPanoChapters] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      if (user) {
        const { data: adminData } = await supabase
          .from('announcement_admins')
          .select('*')
          .eq('user_email', user.email)
          .single();
        if (adminData) setIsAdmin(true);
      }

      const { data: adminList } = await supabase.from('announcement_admins').select('user_email');
      const emails = adminList?.map(a => a.user_email) || [];
      setAdminEmails(emails);

      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single();

      if (p) {
        if (user && user.id === p.id) {
          router.replace('/profil');
          return;
        }

        setIsOwner(user && (user.id === p.id || user.email === p.email));
        setAuthor(p);

        // KİTAPLARI ÇEK (Chapters içinden views bilgisini de alıyoruz)
        let { data: b } = await supabase
          .from('books')
          .select('*, chapters(id, views)')
          .eq('user_email', p.email || p.id)
          .order('created_at', { ascending: false });

        if (b) {
          b = b.filter(book =>
            book.chapters &&
            book.chapters.length > 0 &&
            !book.is_draft
          );

          // --- İSTATİSTİKLERİ HESAPLA ---
          const bookIds = b.map(book => book.id);
          const allChapterIds = b.flatMap(book => book.chapters.map(c => c.id));
          
          // Yorum ve Oy sayılarını çek
          const { data: commentsData } = await supabase.from('comments').select('book_id').in('book_id', bookIds);
          const { data: votesData } = await supabase.from('chapter_votes').select('chapter_id').in('chapter_id', allChapterIds);

          b = b.map(book => {
            const totalComments = commentsData?.filter(c => c.book_id === book.id).length || 0;
            const chapterIds = book.chapters.map(c => c.id);
            const totalVotes = votesData?.filter(v => chapterIds.includes(v.chapter_id)).length || 0;
            const totalViews = book.chapters.reduce((sum, c) => sum + (c.views || 0), 0);
            
            return { ...book, totalComments, totalVotes, totalViews };
          });
        }

        // PANOLARI ÇEK
        const { data: authorPanos } = await supabase
          .from('panolar')
          .select('*, books(title, cover_url), chapters(id, title)')
          .eq('user_email', p.email || p.id)
          .order('created_at', { ascending: false });

        // Panolara profil bilgisini ekle
        const panosWithProfile = authorPanos?.map(pano => ({
          ...pano,
          profiles: p
        })) || [];

        setPanos(panosWithProfile);

        // TAKİPÇİLER
        const { data: f } = await supabase.from('author_follows').select('*').eq('followed_username', username);
        const { data: fing } = await supabase.from('author_follows').select('*').eq('follower_username', username);

        setBooks(b || []);
        setFollowers(f || []);
        setFollowing(fing || []);

        if (user) {
          const isFollowingThisUser = f?.some(item => item.follower_email === user.email);
          setIsFollowing(isFollowingThisUser);
        }
      }
      setLoading(false);
    }
    load();
  }, [username, router]);

  // BÖLÜMLERİ GETİR (Pano Ekleme)
  useEffect(() => {
    if (!selectedBookForPano) return;
    async function fetchChaps() {
      const { data } = await supabase.from('chapters').select('id, title, order_no').eq('book_id', selectedBookForPano.id).order('order_no', { ascending: true });
      setPanoChapters(data || []);
    }
    fetchChaps();
  }, [selectedBookForPano]);

  // PANO EKLE
  async function handleAddPano(e) {
    e.preventDefault();
    if (!newPanoTitle.trim() || !newPanoContent.trim() || !selectedBookForPano) return toast.error("Eksik alan bırakma!");

    setIsSubmitting(true);
    const { data, error } = await supabase.from('panolar').insert({
      title: newPanoTitle.trim(),
      content: newPanoContent.trim(),
      book_id: selectedBookForPano.id,
      chapter_id: selectedChapterForPano?.id || null,
      user_email: currentUser.email,
      username: author.username
    }).select('*, books(title, cover_url), chapters(id, title)').single();

    if (!error) {
      const newPanoWithProfile = { ...data, profiles: author };
      setPanos([newPanoWithProfile, ...panos]);
      
      setNewPanoTitle(''); setNewPanoContent(''); setSelectedBookForPano(null); setSelectedChapterForPano(null);
      setShowAddPano(false);
      toast.success("Pano paylaşıldı! 🚀");
    } else {
      toast.error("Hata: " + error.message);
    }
    setIsSubmitting(false);
  }

  // Takip İşlemleri
  async function handleFollow() {
    if (!currentUser) return toast.error("Önce giriş yapmalısın.");
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();
    const followerUsername = profile?.username || currentUser.user_metadata?.username || currentUser.email.split('@')[0];

    const { error } = await supabase.from('author_follows').insert({
      follower_email: currentUser.email,
      follower_username: followerUsername,
      followed_username: author.username
    });

    if (!error) {
      setIsFollowing(true);
      setFollowers([...followers, { follower_username: followerUsername }]);
      toast.success("Takip edildi 🎉");
      await supabase.from('notifications').insert({
        recipient_email: author.email,
        actor_username: followerUsername,
        type: 'follow',
        book_title: null,
        is_read: false,
        created_at: new Date()
      });
    }
  }

  async function handleUnfollow() {
    const { error } = await supabase.from('author_follows').delete()
      .eq('follower_email', currentUser.email)
      .eq('followed_username', author.username);

    if (!error) {
      setIsFollowing(false);
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();
      const followerUsername = profile?.username || currentUser.user_metadata?.username || currentUser.email.split('@')[0];
      setFollowers(followers.filter(f => f.follower_username !== followerUsername));
      toast.success("Takip bırakıldı");
    }
  }

  async function handleBan() {
    const action = author.is_banned ? "Yasağı KALDIRMAK" : "Kullanıcıyı BANLAMAK";
    if (!confirm(`Dikkat Admin: ${action} üzeresin. Onaylıyor musun?`)) return;

    const { error } = await supabase.from('profiles').update({ is_banned: !author.is_banned }).eq('id', author.id);
    if (!error) {
      setAuthor(prev => ({ ...prev, is_banned: !prev.is_banned }));
      toast.success(author.is_banned ? "Yasak kaldırıldı" : "Kullanıcı BANLANDI");
    }
  }

  // Listeden Silme
  const removePanoFromList = (panoId) => {
    setPanos(prev => prev.filter(p => p.id !== panoId));
  };

  // Karttan Silme (Admin/Sahip)
  async function handleDeletePanoManual(panoId, e) {
    if (e) e.stopPropagation();
    if (!confirm("Bu panoyu silmek istediğine emin misin?")) return;

    const { error } = await supabase.from('panolar').delete().eq('id', panoId);
    if (error) {
      toast.error("Hata oluştu.");
    } else {
      removePanoFromList(panoId);
      toast.success("Pano silindi.");
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

  if (!author) return <div className="py-40 text-center font-black">Yazar bulunamadı.</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      {/* ✅ PANO MODAL */}
      <PanoModal 
        selectedPano={selectedPano} 
        onClose={() => setSelectedPano(null)} 
        user={currentUser}
        adminEmails={adminEmails}
        isAdmin={isAdmin}
        isOwner={isOwner || (selectedPano && currentUser && selectedPano.user_email === currentUser.email)}
        onDelete={removePanoFromList}
      />

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5 shadow-sm">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl shrink-0">
            {author.avatar_url ? <img src={author.avatar_url} className="w-full h-full object-cover" alt="" /> : author.username[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-black uppercase dark:text-white tracking-tighter">{author.full_name || author.username}</h1>
                <div className="flex justify-center md:justify-start mt-1">
                  <Username username={author.username} isAdmin={author.role === 'admin'} className="text-xs text-gray-400 uppercase italic" />
                </div>
              </div>
              
              {currentUser && currentUser.id !== author.id && (
                <button 
                  onClick={isFollowing ? handleUnfollow : handleFollow}
                  className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    isFollowing 
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-600' 
                    : 'bg-red-600 text-white shadow-lg shadow-red-600/20 active:scale-95'
                  }`}
                >
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et ➕'}
                </button>
              )}

              {isAdmin && (
                <button 
                  onClick={handleBan}
                  className={`ml-4 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                    author.is_banned 
                    ? 'bg-green-600 text-white' 
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 hover:text-white'
                  }`}
                >
                  {author.is_banned ? 'Yasağı Kaldır' : 'Kullanıcıyı Banla 🔨'}
                </button>
              )}
            </div>

            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8 mt-6">
              <div className="text-center"><p className="text-2xl font-black">{books.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest">Eser</p></div>
              <div className="text-center"><p className="text-2xl font-black">{panos.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest">Pano</p></div>
              <button onClick={() => setModalType('followers')} className="text-center outline-none"><p className="text-2xl font-black">{followers.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center outline-none"><p className="text-2xl font-black">{following.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b dark:border-white/5 pb-4">
          {['eserler', 'panolar', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>
              {t}
              {activeTab === t && <div className="absolute -bottom-4 left-0 right-0 h-[2px] bg-red-600" />}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 italic text-gray-500 leading-relaxed whitespace-pre-line">{author.bio || "Biyografi henüz eklenmemiş."}</div>
          ) : activeTab === 'panolar' ? (
            <div className="space-y-6">
              
              {/* PANO EKLEME (Sadece Sahibi) */}
              {isOwner && (
                <div className="mb-10">
                  {!showAddPano ? (
                    <button 
                      onClick={() => setShowAddPano(true)}
                      className="w-full p-8 bg-red-600/5 dark:bg-red-600/10 border-2 border-dashed border-red-600/20 rounded-[2.5rem] flex items-center justify-center gap-4 hover:bg-red-600/10 transition-all group"
                    >
                      <span className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform">+</span>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Yeni Pano Paylaş</span>
                    </button>
                  ) : (
                    <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border-2 border-red-600 shadow-2xl animate-in zoom-in-95">
                      <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-6 pl-2">Yeni Pano Oluştur</h3>
                      <form onSubmit={handleAddPano} className="space-y-4">
                        <input value={newPanoTitle} onChange={e => setNewPanoTitle(e.target.value)} placeholder="Pano Başlığı..." className="w-full p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl outline-none focus:border-red-600" />
                        <textarea value={newPanoContent} onChange={e => setNewPanoContent(e.target.value)} placeholder="Ne hakkında yazmak istersin..." className="w-full p-4 h-40 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl outline-none focus:border-red-600 resize-none" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <select onChange={e => setSelectedBookForPano(books.find(b => b.id === parseInt(e.target.value)))} className="p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-xs font-black uppercase outline-none focus:border-red-600">
                            <option value="">Kitap Seç *</option>
                            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                          </select>
                          
                          {selectedBookForPano && panoChapters.length > 0 && (
                            <select onChange={e => setSelectedChapterForPano(panoChapters.find(c => c.id === parseInt(e.target.value)))} className="p-4 bg-gray-50 dark:bg-black border dark:border-white/10 rounded-2xl text-xs font-black uppercase outline-none focus:border-red-600">
                              <option value="">Tüm Kitap İçin (Opsiyonel)</option>
                              {panoChapters.map(c => <option key={c.id} value={c.id}>Bölüm {c.order_no}: {c.title}</option>)}
                            </select>
                          )}
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setShowAddPano(false)} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 rounded-2xl text-xs font-black uppercase">İptal</button>
                          <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-red-600/30">{isSubmitting ? 'Paylaşılıyor...' : 'Paylaş 🚀'}</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {panos.length === 0 ? <p className="text-center py-20 text-gray-500 italic uppercase text-[10px] tracking-widest">Henüz pano yok.</p> : panos.map(pano => (
                <div 
                  key={pano.id} 
                  onClick={() => setSelectedPano(pano)} 
                  className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/10 flex gap-6 relative group hover:border-red-600/30 transition-all cursor-pointer"
                >
                  <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10">
                    {pano.books?.cover_url && <img src={pano.books.cover_url} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black dark:text-white mb-2 line-clamp-1 uppercase tracking-tighter">{pano.title}</h3>
                    <p className="text-[10px] text-red-600 font-bold uppercase mb-2 tracking-widest">
                      📖 {pano.books?.title} {pano.chapter_id && '• ' + (pano.chapters?.title || 'Bölüm')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{pano.content}</p>
                  </div>

                  {/* Sil Butonu (Admin veya Sahip) */}
                  {(isAdmin || isOwner) && (
                    <button 
                      onClick={(e) => handleDeletePanoManual(pano.id, e)} 
                      className="absolute top-6 right-6 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      SİL
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {books.map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group flex flex-col">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3 shadow-md group-hover:-translate-y-1 transition-all duration-500 relative">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black opacity-20 text-[8px]">KAPAK YOK</div>}
                    
                    {/* ✅ FİNAL YERİNE AŞAĞIYA TAMAMLANDI GELDİ */}
                  </div>
                  
                  <h3 className="text-[10px] font-black text-center uppercase truncate italic">{k.title}</h3>
                  
                  {/* ✅ YENİ: TAMAMLANDI ROZETİ */}
                  {k.is_completed && (
                    <div className="flex justify-center mt-1">
                      <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        ✅ TAMAMLANDI
                      </span>
                    </div>
                  )}

                  {/* ✅ YENİ: İSTATİSTİK ŞERİDİ */}
                  <div className="flex items-center justify-center gap-2 mt-1.5 text-[8px] font-black text-gray-400">
                    <span className="flex items-center gap-0.5">👁️ {formatNumber(k.totalViews)}</span>
                    <span className="flex items-center gap-0.5">❤️ {formatNumber(k.totalVotes)}</span>
                    <span className="flex items-center gap-0.5">💬 {formatNumber(k.totalComments)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TAKİPÇİ MODALI */}
      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalType(null)}>
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</span>
              <button onClick={() => setModalType(null)} className="text-[10px] font-black text-red-600 uppercase">Kapat</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {(modalType === 'followers' ? followers : following).length === 0 ? (
                <p className="text-center py-10 text-[10px] text-gray-500 italic uppercase">Henüz kimse yok.</p>
              ) : (
                (modalType === 'followers' ? followers : following).map((p, i) => {
                  const pName = modalType === 'followers' ? p.follower_username : p.followed_username;
                  return (
                    <Link key={i} href={`/yazar/${pName}`} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 transition-all hover:border-red-600/30">
                      <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-xs">{pName?.[0]?.toUpperCase()}</div>
                      <span className="text-xs font-bold">@{pName}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}