'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function ProfilSayfasi() {
  const [user, setUser] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [myFollowers, setMyFollowers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null); 
  const [profileData, setProfileData] = useState({ full_name: '', username: '', bio: '', avatar_url: '' });

  useEffect(() => {
    async function getData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return (window.location.href = '/giris');
      setUser(activeUser);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      const currentUsername = activeUser.user_metadata?.username || activeUser.email.split('@')[0];
      
      setProfileData({
        full_name: profile?.full_name || activeUser.user_metadata?.full_name || '',
        username: profile?.username || currentUsername,
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || ''
      });

      const { data: written } = await supabase.from('books').select('*').eq('user_email', activeUser.email).order('created_at', { ascending: false });
      setMyBooks(written || []);

      if (written?.length > 0) {
        const { data: chapters } = await supabase.from('chapters').select('views').in('book_id', written.map(b => b.id));
        setTotalViews(chapters?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0);
      }

      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_email', activeUser.email);
      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', currentUsername);
      setFollowedAuthors(following || []);
      setMyFollowers(followers || []);
      setLoading(false);
    }
    getData();
  }, []);

  async function handleUnfollow(targetUsername) {
    const { error } = await supabase.from('author_follows').delete().eq('follower_email', user.email).eq('followed_username', targetUsername);
    if (error) {
      toast.error("Hata oluştu");
    } else {
      toast.success("Takibi bıraktın");
      setFollowedAuthors(followedAuthors.filter(a => a.followed_username !== targetUsername));
    }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-4xl italic animate-pulse">YAZIO</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-6 md:gap-10 bg-white dark:bg-white/5 p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border dark:border-white/5 shadow-sm">
          <div className="w-24 h-24 md:w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden shrink-0 flex items-center justify-center">
             {profileData.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" /> : <div className="text-3xl font-black">{user.email[0].toUpperCase()}</div>}
          </div>

          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-2xl md:text-4xl font-black dark:text-white tracking-tighter uppercase">{profileData.full_name || "İsim Soyisim"}</h1>
            <p className="text-xs text-gray-400 italic">@{profileData.username}</p>
            
            <div className="grid grid-cols-2 md:flex justify-center md:justify-start gap-y-6 gap-x-4 md:gap-12 border-t dark:border-white/5 pt-8 mt-4">
              <div className="text-center md:text-left"><p className="text-xl md:text-2xl font-black dark:text-white">{myBooks.length}</p><p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Eser</p></div>
              <div className="text-center md:text-left"><p className="text-xl md:text-2xl font-black dark:text-white text-red-600">{totalViews}</p><p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Okunma</p></div>
              <button onClick={() => setModalType('followers')} className="text-center md:text-left hover:opacity-70"><p className="text-xl md:text-2xl font-black dark:text-white">{myFollowers.length}</p><p className="text-[8px] font-black uppercase text-gray-400 tracking-widest underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center md:text-left hover:opacity-70"><p className="text-xl md:text-2xl font-black dark:text-white">{followedAuthors.length}</p><p className="text-[8px] font-black uppercase text-gray-400 tracking-widest underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        {/* Eserler Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-10">
          {myBooks.map(k => (
            <div key={k.id} className="group flex flex-col">
              <Link href={`/kitap/${k.id}`} className="aspect-[2/3] mb-3 overflow-hidden rounded-[1.5rem] md:rounded-[2.8rem] border dark:border-white/5 shadow-md">
                {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full bg-gray-100 dark:bg-white/5" />}
              </Link>
              <h3 className="font-black text-[9px] text-center dark:text-white uppercase italic">{k.title}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* TAKİPÇİ/TAKİP MODAL'I */}
      {modalType && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">{modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</h3>
              <button onClick={() => setModalType(null)} className="text-[10px] font-black text-red-600 uppercase">Kapat</button>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {(modalType === 'followers' ? myFollowers : followedAuthors).length === 0 ? <p className="text-center py-10 text-[10px] text-gray-500 italic uppercase">Kimse yok...</p> : 
                (modalType === 'followers' ? myFollowers : followedAuthors).map((person, i) => {
                  const personUsername = modalType === 'followers' ? person.follower_username : person.followed_username;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 hover:border-red-600/30 transition-all">
                      <Link href={`/yazar/${personUsername}`} onClick={() => setModalType(null)} className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-[10px]">{personUsername[0].toUpperCase()}</div>
                        <span className="text-xs font-bold dark:text-white">@{personUsername}</span>
                      </Link>
                      {modalType === 'following' && (
                        <button onClick={() => handleUnfollow(personUsername)} className="text-[8px] font-black uppercase bg-red-600/10 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-600 hover:text-white transition-all">Bırak</button>
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