'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import { useRouter } from 'next/navigation';

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

  // ✅ PANO OY/YORUM İÇİN
  const [panoLikes, setPanoLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [panoComments, setPanoComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [commentAvatars, setCommentAvatars] = useState({});

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

      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single();

      if (p) {
        if (user && user.id === p.id) {
          router.replace('/profil');
          return;
        }

        // Sahibi olup olmadığını kontrol et (admin için önemli)
        setIsOwner(user && (user.id === p.id || user.email === p.email));

        setAuthor(p);

        let { data: b } = await supabase
          .from('books')
          .select('*, chapters(id)')
          .eq('user_email', p.email || p.id)
          .order('created_at', { ascending: false });

        if (b) {
          b = b.filter(book =>
            book.chapters &&
            book.chapters.length > 0 &&
            !book.is_draft
          );
        }

        const { data: authorPanos } = await supabase
          .from('panolar')
          .select('*, books(title, cover_url), chapters(id, title)')
          .eq('user_email', p.email || p.id)
          .order('created_at', { ascending: false });

        setPanos(authorPanos || []);

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

  async function handleDeletePano(panoId, e) {
    if (e) e.stopPropagation();
    if (!confirm("Bu panoyu silmek istediğine emin misin Admin?")) return;

    const { error } = await supabase.from('panolar').delete().eq('id', panoId);
    if (error) {
      toast.error("Hata oluştu.");
    } else {
      setPanos(prev => prev.filter(p => p.id !== panoId));
      toast.success("Pano silindi.");
      if (selectedPano?.id === panoId) setSelectedPano(null);
    }
  }

  // ✅ PANO MODAL AÇILINCA OY/YORUM VERİLERİNİ ÇEK
  useEffect(() => {
    if (!selectedPano) return;

    async function loadPanoData() {
      // Beğeni sayısı
      const { count } = await supabase.from('pano_votes').select('*', { count: 'exact', head: true }).eq('pano_id', selectedPano.id);
      setPanoLikes(count || 0);

      // Kullanıcı beğenmiş mi?
      if (currentUser) {
        const { data } = await supabase.from('pano_votes').select('*').eq('pano_id', selectedPano.id).eq('user_email', currentUser.email).single();
        setHasLiked(!!data);
      }

      const { data: comments } = await supabase
        .from('pano_comments')
        .select('*')
        .eq('pano_id', selectedPano.id)
        .order('created_at', { ascending: true });

      setPanoComments(comments || []);


      if (comments && comments.length > 0) {
        const emails = [...new Set(comments.map(c => c.user_email))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('email, avatar_url')
          .in('email', emails);

        const map = {};
        profiles?.forEach(p => {
          map[p.email] = p.avatar_url;
        });

        setCommentAvatars(map);
      }

    }

    loadPanoData();
  }, [selectedPano, currentUser]);

  async function handleLike() {
    if (!currentUser) return toast.error('Giriş yapmalısın!');

    if (hasLiked) {
      await supabase.from('pano_votes').delete().eq('pano_id', selectedPano.id).eq('user_email', currentUser.email);
      setHasLiked(false);
      setPanoLikes(prev => prev - 1);
    } else {
      await supabase.from('pano_votes').insert({ pano_id: selectedPano.id, user_email: currentUser.email });
      setHasLiked(true);
      setPanoLikes(prev => prev + 1);
    }
  }

  async function handleComment() {
    if (!currentUser) return toast.error('Giriş yapmalısın!');
    if (!newComment.trim()) return;

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();
    const username = profile?.username || currentUser.email.split('@')[0];

    await supabase.from('pano_comments').insert({
      pano_id: selectedPano.id,
      parent_id: replyTo,
      user_email: currentUser.email,
      username,
      content: newComment
    });

    setNewComment('');
    setReplyTo(null);

    const { data: comments } = await supabase
      .from('pano_comments')
      .select('*')
      .eq('pano_id', selectedPano.id)
      .order('created_at', { ascending: true });

    setPanoComments(comments || []);
    if (comments && comments.length > 0) {
      const emails = [...new Set(comments.map(c => c.user_email))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('email, avatar_url')
        .in('email', emails);

      const map = {};
      profiles?.forEach(p => {
        map[p.email] = p.avatar_url;
      });

      setCommentAvatars(map);
    }



    toast.success('Yorum eklendi!');
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

      {/* ✅ PANO MODALI - ANA SAYFADAKİ DUYURU MODALIYLA BİREBİR AYNI */}
      {selectedPano && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setSelectedPano(null)}>
          <div
            className="bg-white dark:bg-[#080808] w-full max-w-5xl h-fit max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Kapatma Butonu */}
            <button
              onClick={() => setSelectedPano(null)}
              className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md"
            >
              ✕
            </button>

            {/* GÖRSEL BÖLÜMÜ */}
            {selectedPano.books?.cover_url && (
              <div className="shrink-0 flex items-center justify-center p-8 bg-gray-50 dark:bg-black/40 md:w-1/2">
                <img
                  src={selectedPano.books.cover_url}
                  className="shadow-[0_20px_60px_rgba(0,0,0,0.5)] object-contain rounded-2xl max-h-[600px] w-auto"
                  alt=""
                />
              </div>
            )}

            {/* METİN BÖLÜMÜ */}
            <div className="p-10 md:p-16 overflow-y-auto flex-1 flex flex-col justify-center">
              {/* Kitap Etiketi */}
              <span className="text-xs font-black text-red-600 tracking-[0.3em] uppercase mb-4 block">
                📖 {selectedPano.books?.title} {selectedPano.chapter_id && '• ' + (selectedPano.chapters?.title || 'Bölüm')}
              </span>

              {/* Başlık */}
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter dark:text-white">
                {selectedPano.title}
              </h2>

              {/* İçerik */}
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-wrap mb-8">
                {selectedPano.content}
              </p>

              {/* ✅ BEĞENİ BUTONU */}
              <div className="flex items-center gap-4 mb-8 pb-8 border-b dark:border-white/5">
                <button onClick={handleLike} className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all ${hasLiked ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  ❤️ {panoLikes}
                </button>
                <span className="text-sm text-gray-400">💬 {panoComments.length} yorum</span>
              </div>

              {/* ✅ YORUM BÖLÜMÜ */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
                {panoComments.filter(c => !c.parent_id).map(comment => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-white/5">
                        {commentAvatars[comment.user_email] ? (
                          <img
                            src={commentAvatars[comment.user_email]}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-red-600">
                            {comment.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <Link href={`/yazar/${comment.username}`} className="text-xs font-black hover:text-red-600">@{comment.username}</Link>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
                        <button onClick={() => setReplyTo(comment.id)} className="text-[10px] text-gray-400 hover:text-red-600 font-bold mt-1">Yanıtla</button>
                      </div>
                    </div>
                    {/* Alt yorumlar */}
                    {panoComments.filter(r => r.parent_id === comment.id).map(reply => (
                      <div key={reply.id} className="ml-11 flex gap-3">
                       {commentAvatars[reply.user_email] ? (
  <img
    src={commentAvatars[reply.user_email]}
    className="w-8 h-8 rounded-full object-cover"
    alt=""
  />
) : (
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-red-600 bg-gray-200 dark:bg-white/5">
    {reply.username?.[0]?.toUpperCase()}
  </div>
)}


                        <div className="flex-1">
                          <Link href={`/yazar/${reply.username}`} className="text-[10px] font-black hover:text-red-600">@{reply.username}</Link>
                          <p className="text-xs text-gray-500">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* ✅ YORUM YAZMA */}
              {currentUser && (
                <div className="mb-8">
                  {replyTo && <p className="text-xs text-gray-400 mb-2">Yanıt yazıyorsun • <button onClick={() => setReplyTo(null)} className="text-red-600">İptal</button></p>}
                  <div className="flex gap-2">
                    <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Yorumunu yaz..." className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-sm outline-none" />
                    <button onClick={handleComment} className="px-6 py-2 bg-red-600 text-white rounded-full text-sm font-black">Gönder</button>
                  </div>
                </div>
              )}

              {/* ALT KISIM: TARİH VE BUTONLAR */}
              <div className="mt-auto pt-8 border-t dark:border-white/5 flex flex-col gap-4">
                {/* Üst Satır: Yazar Bilgisi */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-black">
                        {author.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      <Username username={author.username} isAdmin={author.role === 'admin'} />
                    </p>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                      {new Date(selectedPano.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Alt Satır: Butonlar */}
                <div className="flex gap-3">
                  {/* Bölüme Git Butonu (Öncelikli - Eğer Varsa) */}
                  {selectedPano.chapter_id && selectedPano.chapters?.id ? (
                    <Link
                      href={`/kitap/${selectedPano.book_id}/bolum/${selectedPano.chapter_id}`}
                      className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                    >
                      {selectedPano.chapters?.title || 'Bölüme Git'} →
                    </Link>
                  ) : (
                    /* Kitaba Git Butonu (Bölüm Yoksa) */
                    <Link
                      href={`/kitap/${selectedPano.book_id}`}
                      className="inline-flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3 rounded-2xl uppercase tracking-wider transition-all shadow-2xl hover:shadow-red-600/50"
                    >
                      Kitaba Git →
                    </Link>
                  )}

                  {/* Admin Silme Butonu */}
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeletePano(selectedPano.id, e)}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-lg"
                    >
                      SİL (ADMIN)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isFollowing ? 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-600' : 'bg-red-600 text-white shadow-lg shadow-red-600/20 active:scale-95'
                    }`}
                >
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et ➕'}
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={handleBan}
                  className={`ml-4 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${author.is_banned ? 'bg-green-600 text-white' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 hover:text-white'
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

        {/* TAB MENÜSÜ */}
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
              {panos.length === 0 ? (
                <div className="text-center py-20 text-gray-500 italic">Henüz hiç pano oluşturmamış.</div>
              ) : (
                panos.map(pano => (
                  <div
                    key={pano.id}
                    onClick={() => setSelectedPano(pano)}
                    className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border dark:border-white/10 flex gap-6 relative group hover:border-red-600/30 transition-all cursor-pointer"
                  >
                    <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10">
                      {pano.books?.cover_url ? <img src={pano.books.cover_url} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black dark:text-white mb-2 line-clamp-1">{pano.title}</h3>
                      <p className="text-[10px] text-red-600 font-bold uppercase mb-2 tracking-widest">
                        📖 {pano.books?.title} {pano.chapter_id && '• ' + (pano.chapters?.title || 'Bölüm')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{pano.content}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={(e) => handleDeletePano(pano.id, e)} className="absolute top-6 right-6 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">SİL</button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {books.map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group flex flex-col">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3 shadow-md group-hover:-translate-y-1 transition-all duration-500 relative">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black opacity-20 text-[8px]">KAPAK YOK</div>}
                    {k.is_completed && <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10">FİNAL</div>}
                  </div>
                  <h3 className="text-[10px] font-black text-center uppercase truncate italic">{k.title}</h3>
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
              {(modalType === 'followers' ? followers : following).length === 0 ? <p className="text-center py-10 text-[10px] text-gray-500 italic">KİMSE YOK</p> :
                (modalType === 'followers' ? followers : following).map((p, i) => {
                  const pName = modalType === 'followers' ? p.follower_username : p.followed_username;
                  return (
                    <Link key={i} href={`/yazar/${pName}`} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:border-red-600 border dark:border-white/5 transition-all">
                      <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-xs">{pName?.[0]?.toUpperCase()}</div>
                      <span className="text-xs font-bold">@{pName}</span>
                    </Link>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}