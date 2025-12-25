'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';

export default function ProfilSayfasi() {
  const [user, setUser] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [myDrafts, setMyDrafts] = useState([]);
  const [myPanos, setMyPanos] = useState([]);
  const [followedBooks, setFollowedBooks] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [myFollowers, setMyFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [totalViews, setTotalViews] = useState(0);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [selectedPano, setSelectedPano] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '', username: '', bio: '', avatar_url: '', instagram: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);
  
  // ✅ PANO MODAL STATE'LERİ
  const [panoLikes, setPanoLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [panoComments, setPanoComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  // ✅ PANO VERİLERİNİ YÜKLE
  useEffect(() => {
    if (!selectedPano) return;
    async function loadPanoData() {
      const { count } = await supabase.from('pano_votes').select('*', { count: 'exact', head: true }).eq('pano_id', selectedPano.id);
      setPanoLikes(count || 0);
      if (user) {
        const { data } = await supabase.from('pano_votes').select('*').eq('pano_id', selectedPano.id).eq('user_email', user.email).single();
        setHasLiked(!!data);
      }
      
      // Yorumları çek
      const { data: comments } = await supabase
        .from('pano_comments')
        .select('*')
        .eq('pano_id', selectedPano.id)
        .order('created_at', { ascending: true });

      // Her yorum için profil bilgisini çek
      if (comments) {
        const commentsWithProfiles = await Promise.all(
          comments.map(async (comment) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('email', comment.user_email)
              .single();
            
            return {
              ...comment,
              profiles: profile
            };
          })
        );
        setPanoComments(commentsWithProfiles);
      } else {
        setPanoComments([]);
      }
    }
    loadPanoData();
  }, [selectedPano, user]);

  // ✅ PANO BEĞENİ
  async function handleLike() {
    if (!user) return toast.error('Giriş yapmalısın!');
    if (hasLiked) {
      await supabase.from('pano_votes').delete().eq('pano_id', selectedPano.id).eq('user_email', user.email);
      setHasLiked(false);
      setPanoLikes(prev => prev - 1);
    } else {
      await supabase.from('pano_votes').insert({ pano_id: selectedPano.id, user_email: user.email });
      setHasLiked(true);
      setPanoLikes(prev => prev + 1);
    }
  }

  // ✅ PANO YORUM
  async function handleComment() {
    if (!user) return toast.error('Giriş yapmalısın!');
    if (!newComment.trim()) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();
    
    const username = profile?.username || user.user_metadata?.username || user.email.split('@')[0];
    
    const { error } = await supabase.from('pano_comments').insert({
      pano_id: selectedPano.id,
      parent_id: replyTo,
      user_email: user.email,
      username: username,
      content: newComment
    });

    if (error) {
      console.error('Yorum hatası:', error);
      toast.error('Yorum eklenemedi!');
      return;
    }
    
    setNewComment('');
    setReplyTo(null);
    
    // Yorumları tekrar çek
    const { data: comments } = await supabase
      .from('pano_comments')
      .select('*')
      .eq('pano_id', selectedPano.id)
      .order('created_at', { ascending: true });

    if (comments) {
      const commentsWithProfiles = await Promise.all(
        comments.map(async (comment) => {
          const { data: commentProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('email', comment.user_email)
            .single();
          
          return {
            ...comment,
            profiles: commentProfile
          };
        })
      );
      setPanoComments(commentsWithProfiles);
    }
    
    toast.success('Yorum eklendi!');
  }

  useEffect(() => {
    async function getData() {
      const { data: admins } = await supabase
        .from('announcement_admins')
        .select('user_email');

      setAdminEmails(admins?.map(a => a.user_email) || []);

      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return (window.location.href = '/giris');
      setUser(activeUser);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      const currentUsername = activeUser.user_metadata?.username || activeUser.email.split('@')[0];

      setProfileData({
        full_name: profile?.full_name || activeUser.user_metadata?.full_name || '',
        username: profile?.username || currentUsername,
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || '',
        instagram: profile?.instagram || ''
      });

      const { data: adminData } = await supabase
        .from('announcement_admins')
        .select('*')
        .eq('user_email', activeUser.email)
        .single();

      if (adminData) setIsAdmin(true);

      const { data: written } = await supabase
        .from('books')
        .select('*')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      if (written) {
        const publishedBooks = written.filter(b => !b.is_draft);
        const draftBooks = written.filter(b => b.is_draft === true);
        
        setMyBooks(publishedBooks);
        setMyDrafts(draftBooks);
      }

      if (written && written.length > 0) {
        const bookIds = written.map(b => b.id);
        const { data: chapters } = await supabase.from('chapters').select('views').in('book_id', bookIds);
        const total = chapters?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;
        setTotalViews(total);
      }

      const { data: followsList } = await supabase
        .from('follows')
        .select('book_id')
        .eq('user_email', activeUser.email);

      const followBookIds = followsList?.map(f => f.book_id).filter(Boolean) || [];

      if (followBookIds.length > 0) {
        const { data: rawLibrary } = await supabase
          .from('books')
          .select('*')
          .in('id', followBookIds)
          .eq('is_draft', false);

        setFollowedBooks(rawLibrary || []);
      } else {
        setFollowedBooks([]);
      }

      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_email', activeUser.email);
      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', currentUsername);
      setFollowedAuthors(following || []);
      setMyFollowers(followers || []);

      const { data: panos } = await supabase
        .from('panolar')
        .select('*, books(title, cover_url), chapters(id, title)')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      setMyPanos(panos || []);
      setLoading(false);
    }
    getData();
  }, []);

  async function handleSaveProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, 
      email: user.email,
      full_name: profileData.full_name, 
      username: profileData.username,
      instagram: profileData.instagram,
      avatar_url: profileData.avatar_url,
      bio: profileData.bio, 
      updated_at: new Date()
    });
    if (!error) { 
      toast.success("Güncellendi"); 
      setIsEditing(false); 
    }
  }

  async function handleRemovePhoto() {
    if (!confirm("Profil fotoğrafını kaldırmak istediğine emin misin?")) return;

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (!error) {
      setProfileData(prev => ({ ...prev, avatar_url: '' }));
      toast.success("Profil fotoğrafı kaldırıldı");
    } else {
      toast.error("Hata oluştu");
    }
  }

  async function handleUnfollow(target) {
    const { error } = await supabase
      .from('author_follows')
      .delete()
      .eq('follower_email', user.email)
      .eq('followed_username', target);
    
    if (!error) { 
      setFollowedAuthors(followedAuthors.filter(a => a.followed_username !== target)); 
      toast.success("Bırakıldı"); 
    }
  }

  async function handleDeletePano(panoId, e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Bu panoyu silmek istediğine emin misin?')) return;

    const { error } = await supabase.from('panolar').delete().eq('id', panoId);

    if (error) {
      toast.error('Silinirken hata oluştu!');
    } else {
      toast.success('Pano silindi! 🗑️');
      setMyPanos(prev => prev.filter(p => p.id !== panoId));
      if (selectedPano?.id === panoId) setSelectedPano(null);
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

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      {/* ✅ PANO MODALI */}
      {selectedPano && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setSelectedPano(null)}>
          <div 
            className="bg-white dark:bg-[#080808] w-full max-w-5xl h-fit max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            
            <button 
              onClick={() => setSelectedPano(null)} 
              className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md"
            >
              ✕
            </button>

            {selectedPano.books?.cover_url && (
              <div className="shrink-0 flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2">
                <img 
                  src={selectedPano.books.cover_url} 
                  className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-[600px] w-auto" 
                  alt="" 
                />
              </div>
            )}

            <div className="p-10 md:p-16 overflow-y-auto flex-1 flex flex-col justify-center">
              <span className="text-xs font-black text-red-600 tracking-[0.3em] uppercase mb-4 block">
                📖 {selectedPano.books?.title} {selectedPano.chapter_id && '• ' + (selectedPano.chapters?.title || 'Bölüm')}
              </span>

              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter dark:text-white">
                {selectedPano.title}
              </h2>

              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-wrap mb-8">
                {selectedPano.content}
              </p>

              <div className="flex items-center gap-4 mb-8 pb-8 border-b dark:border-white/5">
                <button onClick={handleLike} className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all ${hasLiked ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  ❤️ {panoLikes}
                </button>
                <span className="text-sm text-gray-400">💬 {panoComments.length} yorum</span>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
                {panoComments.filter(c => !c.parent_id).map(comment => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-3">
                      <img
                        src={comment.profiles?.avatar_url || '/avatar-placeholder.png'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <Link 
                          href={comment.user_email === user?.email ? '/profil' : `/yazar/${comment.profiles?.username || comment.username}`}
                          className="hover:text-red-600 transition-colors"
                        >
                          <Username
                            username={comment.profiles?.username || comment.username}
                            isAdmin={adminEmails.includes(comment.user_email)}
                          />
                        </Link>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
                        <button onClick={() => setReplyTo(comment.id)} className="text-[10px] text-gray-400 hover:text-red-600 font-bold mt-1">Yanıtla</button>
                      </div>
                    </div>
                    {panoComments.filter(r => r.parent_id === comment.id).map(reply => (
                      <div key={reply.id} className="ml-11 flex gap-3">
                        <img
                          src={reply.profiles?.avatar_url || '/avatar-placeholder.png'}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <Link 
                            href={reply.user_email === user?.email ? '/profil' : `/yazar/${reply.profiles?.username || reply.username}`}
                            className="text-[10px] font-black hover:text-red-600"
                          >
                            @{reply.profiles?.username || reply.username}
                          </Link>
                          <p className="text-xs text-gray-500">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {user && (
                <div className="mb-8">
                  {replyTo && <p className="text-xs text-gray-400 mb-2">Yanıt yazıyorsun • <button onClick={() => setReplyTo(null)} className="text-red-600">İptal</button></p>}
                  <div className="flex gap-2">
                    <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Yorumunu yaz..." className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-sm outline-none" />
                    <button onClick={handleComment} className="px-6 py-2 bg-red-600 text-white rounded-full text-sm font-black">Gönder</button>
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-8 border-t dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={profileData.avatar_url || '/avatar-placeholder.png'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      <Username username={profileData.username} isAdmin={isAdmin} />
                    </p>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                      {new Date(selectedPano.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedPano.chapter_id && selectedPano.chapters?.id ? (
                    <Link 
                      href={`/kitap/${selectedPano.book_id}/bolum/${selectedPano.chapter_id}`}
                      className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                    >
                      {selectedPano.chapters?.title || 'Bölüme Git'} →
                    </Link>
                  ) : (
                    <Link 
                      href={`/kitap/${selectedPano.book_id}`}
                      className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                    >
                      Kitaba Git →
                    </Link>
                  )}

                  <Link 
                    href={`/pano-duzenle/${selectedPano.id}`}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black uppercase transition-all shadow-lg"
                  >
                    DÜZENLE
                  </Link>

                  <button 
                    onClick={(e) => handleDeletePano(selectedPano.id, e)}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-lg"
                  >
                    SİL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl shrink-0">
            {profileData.avatar_url && profileData.avatar_url.includes('http') ? (
              <img src={profileData.avatar_url} className="w-full h-full object-cover" />
            ) : (
              user.email[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 text-center md:text-left w-full">
            {!isEditing ? (
              <>
                <div className="flex flex-col md:flex-row md:items-end gap-4 mb-2 justify-center md:justify-start">
                  <h1 className="text-3xl font-black uppercase dark:text-white leading-none">
                    {profileData.full_name || "İsim Soyisim"}
                  </h1>
                </div>

                <div className="flex justify-center md:justify-start mb-4">
                  <Username
                    username={profileData.username}
                    isAdmin={isAdmin}
                    className="text-xs text-gray-400 uppercase font-bold tracking-wide"
                  />
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase text-gray-500 hover:text-red-600 transition-all"
                  >
                    Profili Düzenle
                  </button>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase hover:opacity-80 transition-all flex items-center gap-2"
                    >
                      🛡️ Admin Paneli
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="md:col-span-2 mb-2 p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const toastId = toast.loading('Fotoğraf yükleniyor...');

                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);

                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                        setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
                        toast.success("Fotoğraf yüklendi! Kaydetmeyi unutma.", { id: toastId });
                      } else {
                        toast.error("Yükleme hatası!", { id: toastId });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <span className="text-2xl mb-1 block">📸</span>
                  <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-red-600">Profil Fotoğrafını Değiştir</p>
                </div>

                {profileData.avatar_url && (
                  <div className="md:col-span-2 flex justify-center -mt-2 mb-2">
                    <button
                      onClick={handleRemovePhoto}
                      className="text-[10px] text-red-600 font-black uppercase hover:underline"
                    >
                      Mevcut Fotoğrafı Kaldır
                    </button>
                  </div>
                )}

                <input
                  value={profileData.full_name}
                  onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="p-4 bg-white dark:bg-black border dark:border-white/10 rounded-2xl text-xs outline-none focus:border-red-600"
                  placeholder="Ad Soyad"
                />

                <input
                  value={profileData.username}
                  onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                  className="p-4 bg-white dark:bg-black border dark:border-white/10 rounded-2xl text-xs outline-none focus:border-red-600"
                  placeholder="Kullanıcı Adı"
                />

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">@</span>
                  <input
                    value={profileData.instagram}
                    onChange={e => setProfileData({ ...profileData, instagram: e.target.value })}
                    className="w-full p-4 pl-8 bg-white dark:bg-black border dark:border-white/10 rounded-2xl text-xs outline-none focus:border-red-600"
                    placeholder="Instagram Kullanıcı Adı"
                  />
                </div>

                <textarea
                  value={profileData.bio}
                  onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                  className="md:col-span-2 p-4 bg-white dark:bg-black border dark:border-white/10 rounded-2xl text-xs outline-none focus:border-red-600 min-h-[80px]"
                  placeholder="Biyografi (Kendini tanıt...)"
                />

                <div className="md:col-span-2 flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200">İptal</button>
                  <button onClick={handleSaveProfile} className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-600/30 hover:bg-red-700">Değişiklikleri Kaydet</button>
                </div>
              </div>
            )}

            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8 mt-6">
              <div className="text-center"><p className="text-2xl font-black">{myBooks.length}</p><p className="text-[9px] uppercase opacity-40">Eser</p></div>
              <div className="text-center"><p className="text-2xl font-black text-red-600">{totalViews}</p><p className="text-[9px] uppercase opacity-40">Okunma</p></div>
              <button onClick={() => setModalType('followers')} className="text-center outline-none"><p className="text-2xl font-black">{myFollowers.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center outline-none"><p className="text-2xl font-black">{followedAuthors.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b dark:border-white/5 pb-4">
          {['eserler', 'kütüphane', 'taslaklar','panolar', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>{t}</button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 flex flex-col items-start gap-6 animate-in fade-in slide-in-from-bottom-2">
              <p className="italic text-gray-500 leading-relaxed w-full font-serif text-lg">
                {profileData.bio || "Biyografi henüz eklenmemiş."}
              </p>
            </div>
          ) : activeTab === 'panolar' ? (
            <div className="space-y-6">
              {myPanos.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Henüz hiç pano oluşturmamışsın.</div>
              ) : (
                myPanos.map(pano => (
                  <div 
                    key={pano.id} 
                    onClick={() => setSelectedPano(pano)}
                    className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/10 flex gap-6 relative group hover:border-red-600/30 transition-all cursor-pointer"
                  >
                    <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10">
                      {pano.books?.cover_url ? <img src={pano.books.cover_url} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <div className="flex-1">
                       <h3 className="text-xl font-black dark:text-white mb-2 line-clamp-1 group-hover:text-red-600 transition-colors">{pano.title}</h3>
                       <p className="text-[10px] text-red-600 font-bold uppercase mb-2 tracking-widest">
                         📖 {pano.books?.title} {pano.chapter_id && '• ' + (pano.chapters?.title || 'Bölüm')}
                       </p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{pano.content}</p>
                       <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full tracking-tighter mt-4">
                          Detayları Gör →
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {(activeTab === 'taslaklar' 
                ? myDrafts 
                : (activeTab === 'eserler' ? myBooks : followedBooks)
              ).map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3 shadow-md group-hover:-translate-y-1 transition-all">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 dark:bg-white/10" />}
                  </div>
                  <h3 className="text-[10px] font-black text-center uppercase truncate italic">{k.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-8 right-8 z-50">
        {showFabMenu && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <Link
              href="/pano-ekle"
              onClick={() => setShowFabMenu(false)}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-xl hover:shadow-blue-600/50 transition-all font-black text-sm uppercase group whitespace-nowrap"
            >
              <span className="text-xl">📋</span>
              <span>Pano Yaz</span>
            </Link>
            
            <Link
              href="/kitap-ekle"
              onClick={() => setShowFabMenu(false)}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-xl hover:shadow-red-600/50 transition-all font-black text-sm uppercase group whitespace-nowrap"
            >
              <span className="text-xl">📚</span>
              <span>Kitap Yaz</span>
            </Link>
          </div>
        )}

        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-full shadow-2xl shadow-red-600/50 flex items-center justify-center font-black text-2xl hover:scale-110 active:scale-95 transition-all group ${showFabMenu ? 'rotate-45' : ''}`}
        >
          <span className="transition-transform duration-300">+</span>
          
          {!showFabMenu && (
            <div className="absolute -top-12 right-0 bg-black text-white text-[9px] font-black px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              YENİ İÇERİK OLUŞTUR
            </div>
          )}
        </button>
      </div>

      {/* TAKİPÇİ/TAKİP MODALI */}
      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalType(null)}>
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase opacity-40">{modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</span>
              <button onClick={() => setModalType(null)} className="text-[10px] font-black text-red-600 uppercase">Kapat</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {(modalType === 'followers' ? myFollowers : followedAuthors).map((p, i) => {
                const pName = modalType === 'followers' ? p.follower_username : p.followed_username;
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 transition-all hover:border-red-600/30">
                    <Link href={`/yazar/${pName}`} onClick={() => setModalType(null)} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-xs">{(pName || "U")[0].toUpperCase()}</div>
                      <span className="text-xs font-bold">@{pName}</span>
                    </Link>
                    {modalType === 'following' && (
                      <button onClick={() => handleUnfollow(pName)} className="text-[9px] font-black uppercase bg-red-600 text-white px-4 py-1.5 rounded-full">Bırak</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}