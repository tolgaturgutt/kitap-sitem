'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function YazarProfili() {
  const { username } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Giriş yapan kullanıcıyı al
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      // 2. Sayfasına bakılan yazarı al
      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (p) {
        setAuthor(p);
        
        // 3. Eserlerini, Takipçilerini ve Takip Ettiklerini al
        const { data: b } = await supabase.from('books').select('*').eq('user_email', p.email || p.id).order('created_at', { ascending: false });
        const { data: f } = await supabase.from('author_follows').select('*').eq('followed_username', username);
        const { data: fing } = await supabase.from('author_follows').select('*').eq('follower_username', username);
        
        setBooks(b || []);
        setFollowers(f || []);
        setFollowing(fing || []);

        // 4. Takip durumu kontrolü
        if (session?.user) {
          const isFollowingThisUser = f?.some(item => item.follower_email === session.user.email);
          setIsFollowing(isFollowingThisUser);
        }
      }
      setLoading(false);
    }
    load();
  }, [username]);

  // TAKİP ETME FONKSİYONU
  async function handleFollow() {
    if (!currentUser) return toast.error("Önce giriş yapmalısın.");
    
    const { error } = await supabase.from('author_follows').insert({
      follower_email: currentUser.email,
      follower_username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
      followed_username: author.username
    });

    if (!error) {
      setIsFollowing(true);
      setFollowers([...followers, { follower_username: currentUser.user_metadata?.username }]);
      toast.success("Takip edildi.");
    }
  }

  // TAKİBİ BIRAKMA FONKSİYONU
  async function handleUnfollow() {
    const { error } = await supabase.from('author_follows').delete()
      .eq('follower_email', currentUser.email)
      .eq('followed_username', author.username);

    if (!error) {
      setIsFollowing(false);
      setFollowers(followers.filter(f => f.follower_username !== (currentUser.user_metadata?.username || currentUser.email.split('@')[0])));
      toast.success("Takip bırakıldı.");
    }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-4xl italic animate-pulse">YAZIO</div>;
  if (!author) return <div className="py-40 text-center font-black">Yazar bulunamadı.</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5 shadow-sm">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl shrink-0">
            {author.avatar_url ? <img src={author.avatar_url} className="w-full h-full object-cover" /> : author.username[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-black uppercase dark:text-white tracking-tighter">{author.full_name || author.username}</h1>
                <p className="text-xs text-gray-400 uppercase italic">@{author.username}</p>
              </div>
              
              {/* TAKİP BUTONU */}
              {currentUser && currentUser.email !== author.email && (
                <button 
                  onClick={isFollowing ? handleUnfollow : handleFollow}
                  className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    isFollowing 
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-600' 
                    : 'bg-red-600 text-white shadow-lg shadow-red-600/20 active:scale-95'
                  }`}
                >
                  {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                </button>
              )}
            </div>

            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8 mt-6">
              <div className="text-center"><p className="text-2xl font-black">{books.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest">Eser</p></div>
              <button onClick={() => setModalType('followers')} className="text-center outline-none"><p className="text-2xl font-black">{followers.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center outline-none"><p className="text-2xl font-black">{following.length}</p><p className="text-[9px] uppercase opacity-40 tracking-widest underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b dark:border-white/5 pb-4">
          {['eserler', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>
              {t}
              {activeTab === t && <div className="absolute -bottom-4 left-0 right-0 h-[2px] bg-red-600" />}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 italic text-gray-500 leading-relaxed whitespace-pre-line">{author.bio || "Biyografi henüz eklenmemiş."}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {books.map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group flex flex-col">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3 shadow-md group-hover:-translate-y-1 transition-all duration-500">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black opacity-20 text-[8px]">KAPAK YOK</div>}
                  </div>
                  <h3 className="text-[10px] font-black text-center uppercase truncate italic">{k.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TAKİPÇİ/TAKİP MODAL'I */}
      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden">
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
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 transition-all hover:border-red-600/30">
                      <Link href={`/yazar/${pName}`} onClick={() => setModalType(null)} className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-xs">{pName?.[0]?.toUpperCase()}</div>
                        <span className="text-xs font-bold">@{pName}</span>
                      </Link>
                    </div>
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