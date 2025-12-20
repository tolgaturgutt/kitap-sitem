'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function ProfilSayfasi() {
  const [user, setUser] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [followedBooks, setFollowedBooks] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [myFollowers, setMyFollowers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
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

      const { data: lib } = await supabase.from('book_follows').select('books(*)').eq('user_email', activeUser.email);
      setFollowedBooks(lib?.map(item => item.books).filter(b => b !== null) || []);

      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_email', activeUser.email);
      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', currentUsername);
      setFollowedAuthors(following || []);
      setMyFollowers(followers || []);
      setLoading(false);
    }
    getData();
  }, []);

  async function handleSaveProfile() {
    const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: profileData.full_name, username: profileData.username, bio: profileData.bio, updated_at: new Date() });
    if (!error) { toast.success("Güncellendi"); setIsEditing(false); }
  }

  async function handleUnfollow(target) {
    const { error } = await supabase.from('author_follows').delete().eq('follower_email', user.email).eq('followed_username', target);
    if (!error) { setFollowedAuthors(followedAuthors.filter(a => a.followed_username !== target)); toast.success("Bırakıldı"); }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-4xl italic animate-pulse">YAZIO</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl">
            {profileData.avatar_url ? <img src={profileData.avatar_url} /> : user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
            {!isEditing ? (
              <>
                <h1 className="text-3xl font-black uppercase dark:text-white">{profileData.full_name || "İsim Soyisim"}</h1>
                <p className="text-xs text-gray-400 mb-4 uppercase">@{profileData.username}</p>
                <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase text-gray-500">Profili Düzenle</button>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <input value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="p-3 bg-white dark:bg-black border rounded-full text-xs outline-none" placeholder="Ad Soyad" />
                <input value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} className="p-3 bg-white dark:bg-black border rounded-full text-xs outline-none" placeholder="Kullanıcı Adı" />
                <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="md:col-span-2 p-4 bg-white dark:bg-black border rounded-3xl text-xs outline-none" placeholder="Biyografi" />
                <button onClick={handleSaveProfile} className="py-3 bg-red-600 text-white rounded-full text-[10px] font-black uppercase">Kaydet</button>
              </div>
            )}
            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8 mt-6">
              <div className="text-center"><p className="text-2xl font-black">{myBooks.length}</p><p className="text-[9px] uppercase opacity-40">Eser</p></div>
              <button onClick={() => setModalType('followers')} className="text-center"><p className="text-2xl font-black">{myFollowers.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center"><p className="text-2xl font-black">{followedAuthors.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b dark:border-white/5 pb-4">
          {['eserler', 'kütüphane', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>{t}</button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 italic text-gray-500">{profileData.bio || "Biyografi henüz eklenmemiş."}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {(activeTab === 'eserler' ? myBooks : followedBooks).map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 dark:bg-white/10" />}
                  </div>
                  <h3 className="text-[10px] font-black text-center uppercase truncate">{k.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase opacity-40">{modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}</span>
              <button onClick={() => setModalType(null)} className="text-[10px] font-black text-red-600 uppercase">Kapat</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {(modalType === 'followers' ? myFollowers : followedAuthors).map((p, i) => {
                const pName = modalType === 'followers' ? p.follower_username : p.followed_username;
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5">
                    <Link href={`/yazar/${pName}`} onClick={() => setModalType(null)} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-xs">{pName[0].toUpperCase()}</div>
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