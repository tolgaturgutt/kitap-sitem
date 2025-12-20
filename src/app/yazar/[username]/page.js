'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function YazarProfili({ params }) {
  const { username } = use(params);
  const router = useRouter();

  const [data, setData] = useState({ books: [], profile: null, stats: { views: 0 }, isFollowing: false, user: null });
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAuthorData() {
      const { data: { user } } = await supabase.auth.getUser();
      // Kendi profiline bakıyorsa yönlendir
      if (user) {
        const myName = user.user_metadata?.username || user.email.split('@')[0];
        if (myName === username) { router.push('/profil'); return; }
      }

      const { data: books } = await supabase.from('books').select('*').eq('username', username).order('created_at', { ascending: false });
      const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();

      let totalViews = 0;
      if (books && books.length > 0) {
        const bookIds = books.map(b => b.id);
        const { data: chapters } = await supabase.from('chapters').select('views').in('book_id', bookIds);
        totalViews = chapters?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;
      }

      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', username);
      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_username', username);

      const namesToFetch = [];
      if (followers) namesToFetch.push(...followers.map(f => f.follower_username));
      if (following) namesToFetch.push(...following.map(f => f.followed_username));

      let avatarMap = {};
      if (namesToFetch.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('username, avatar_url').in('username', namesToFetch);
        if (profiles) profiles.forEach(p => { avatarMap[p.username] = p.avatar_url });
      }

      const finalFollowers = followers?.map(f => ({ ...f, avatar_url: avatarMap[f.follower_username] })) || [];
      const finalFollowing = following?.map(f => ({ ...f, avatar_url: avatarMap[f.followed_username] })) || [];

      let isFollowing = false;
      if (user) {
        const { data: f } = await supabase.from('author_follows').select('*').eq('followed_username', username).eq('follower_email', user.email).single();
        isFollowing = !!f;
      }

      setData({ books: books || [], profile, stats: { views: totalViews }, isFollowing, user });
      setFollowersList(finalFollowers);
      setFollowingList(finalFollowing);
      setLoading(false);
    }
    getAuthorData();
  }, [username, router]);

  // HIZLI TAKİP FONKSİYONU (SAYFA YENİLEMEDEN)
  async function handleAuthorFollow() {
    if (!data.user) return toast.error("Giriş yapmalısın.");
    const myUsername = data.user.user_metadata?.username || data.user.email.split('@')[0];

    try {
      if (data.isFollowing) {
        await supabase.from('author_follows').delete().eq('followed_username', username).eq('follower_email', data.user.email);
        setFollowersList(prev => prev.filter(f => f.follower_username !== myUsername));
        setData(prev => ({ ...prev, isFollowing: false }));
        toast.success("Takip bırakıldı.");
      } else {
        const newFollower = { followed_username: username, follower_email: data.user.email, follower_username: myUsername };
        await supabase.from('author_follows').insert([newFollower]);
        
        // Takipçi listesini anlık güncelle
        setFollowersList(prev => [...prev, { follower_username: myUsername, avatar_url: data.user.user_metadata?.avatar_url }]);
        setData(prev => ({ ...prev, isFollowing: true }));
        
        if (data.books.length > 0) {
          await supabase.from('notifications').insert([{ recipient_email: data.books[0].user_email, actor_username: myUsername, type: 'follow' }]);
        }
        toast.success("Takip edildi!");
      }
    } catch (err) {
      toast.error("Bir sorun oluştu.");
    }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-5xl italic animate-pulse">YAZIO</div>;

  return (
    <div className="min-h-screen py-20 px-6 bg-[#fafafa] dark:bg-[#080808] transition-colors">
      <Toaster />
      
      {/* MODAL (Hafifletilmiş ve Oval) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#0f0f0f] rounded-[3rem] overflow-hidden shadow-2xl border dark:border-white/5 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-[10px] dark:text-gray-400">
                {activeModal === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-red-600 transition-colors">✕</button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4 no-scrollbar">
              {(activeModal === 'followers' ? followersList : followingList).length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-[10px] font-black uppercase italic">Henüz kimse yok.</div>
              ) : (
                (activeModal === 'followers' ? followersList : followingList).map((item, i) => {
                  const targetUser = activeModal === 'followers' ? item.follower_username : item.followed_username;
                  const targetAvatar = item.avatar_url;
                  
                  return (
                    <Link key={i} href={`/yazar/${targetUser}`} onClick={() => setActiveModal(null)} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-[2rem] transition-all group">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-black overflow-hidden border dark:border-white/10 group-hover:border-red-600 transition-colors">
                        {targetAvatar ? <img src={targetAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-gray-400">{targetUser[0].toUpperCase()}</div>}
                      </div>
                      <span className="font-bold text-sm dark:text-white group-hover:text-red-600 transition-colors">@{targetUser}</span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* ÜST PROFİL ALANI */}
        <div className="text-center mb-24 relative">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/5 rounded-full mx-auto mb-8 p-1 border dark:border-white/5 shadow-2xl relative group">
            <div className="w-full h-full rounded-full overflow-hidden bg-red-600 flex items-center justify-center text-white text-5xl font-black">
              {data.profile?.avatar_url ? <img src={data.profile.avatar_url} className="w-full h-full object-cover" /> : username[0].toUpperCase()}
            </div>
          </div>
          
          <h1 className="text-5xl font-black dark:text-white mb-6 tracking-tighter italic">@{username}</h1>
          {data.profile?.bio && <p className="max-w-lg mx-auto text-gray-500 dark:text-gray-400 font-serif italic mb-8 leading-relaxed">"{data.profile.bio}"</p>}
          
          {/* İSTATİSTİK BARI (OKUNMA EKLENDİ) */}
          <div className="flex justify-center gap-10 md:gap-16 mb-12 py-10 border-y dark:border-white/5 w-full max-w-2xl mx-auto">
            <div className="text-center">
              <p className="text-3xl font-black dark:text-white">{data.books.length}</p>
              <p className="text-[9px] uppercase font-black text-gray-400 tracking-[0.2em]">Eser</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black dark:text-white">{data.stats.views}</p>
              <p className="text-[9px] uppercase font-black text-red-600 tracking-[0.2em]">Okunma</p>
            </div>
            <button onClick={() => setActiveModal('followers')} className="text-center group transition-transform active:scale-95">
              <p className="text-3xl font-black dark:text-white group-hover:text-red-600 transition-colors">{followersList.length}</p>
              <p className="text-[9px] uppercase font-black text-gray-400 tracking-[0.2em]">Takipçi</p>
            </button>
            <button onClick={() => setActiveModal('following')} className="text-center group transition-transform active:scale-95">
              <p className="text-3xl font-black dark:text-white group-hover:text-red-600 transition-colors">{followingList.length}</p>
              <p className="text-[9px] uppercase font-black text-gray-400 tracking-[0.2em]">Takip</p>
            </button>
          </div>

          <button onClick={handleAuthorFollow} className={`px-16 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl
            ${data.isFollowing ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 hover:text-white shadow-red-600/20'}`}>
            {data.isFollowing ? 'Takibi Bırak' : 'Yazarı Takip Et'}
          </button>
        </div>

        {/* ESER GRİDİ (BADGE VE PREMIUM KARTLAR) */}
        <h2 className="text-sm font-black uppercase tracking-[0.5em] text-gray-300 dark:text-gray-700 mb-12 text-center italic">Tüm Eserleri</h2>
        
        {data.books.length === 0 ? (
          <div className="text-center py-20 font-black opacity-10 text-3xl uppercase tracking-widest italic">Henüz bir eser yok.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {data.books.map((kitap) => (
              <Link key={kitap.id} href={`/kitap/${kitap.id}`} className="group">
                <div className="relative aspect-[2/3] w-full mb-6 overflow-hidden rounded-[2.5rem] border dark:border-white/5 transition-all shadow-lg group-hover:shadow-2xl group-hover:shadow-red-600/10 group-hover:-translate-y-2">
                  {kitap.cover_url ? (
                    <img src={kitap.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black text-[10px] text-gray-400 italic uppercase">Kapak Yok</div>
                  )}
                  {/* Kategori Badge */}
                  {kitap.category && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full">
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">{kitap.category}</span>
                    </div>
                  )}
                </div>
                <h3 className="font-black text-[11px] text-center dark:text-white px-2 leading-tight uppercase tracking-tight group-hover:text-red-600 transition-colors line-clamp-2 italic">{kitap.title}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}