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
  const [totalViews, setTotalViews] = useState(0);
  const [activeTab, setActiveTab] = useState('eserler');

  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({ 
    full_name: '', 
    username: '', 
    bio: '', 
    instagram: '', 
    twitter: '', 
    avatar_url: '' 
  });

  useEffect(() => {
    async function getData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return (window.location.href = '/giris');
      setUser(activeUser);

      const currentUsername = activeUser.user_metadata?.username || activeUser.email.split('@')[0];

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      setProfileData({
        full_name: profile?.full_name || '',
        username: profile?.username || currentUsername,
        bio: profile?.bio || '',
        instagram: profile?.instagram_url || '',
        twitter: profile?.twitter_url || '',
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

  async function handleSaveProfile() {
    try {
      const { error } = await supabase.from('profiles').upsert({ 
        id: user.id, 
        full_name: profileData.full_name,
        username: profileData.username, 
        bio: profileData.bio, // Hakkında yazısını buradan güncelliyoruz
        instagram_url: profileData.instagram, 
        twitter_url: profileData.twitter, 
        avatar_url: profileData.avatar_url, 
        updated_at: new Date() 
      });
      if (error) throw error;
      toast.success("Profil güncellendi.");
      setIsEditing(false);
    } catch (e) { toast.error("Hata oluştu."); }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-5xl italic animate-pulse">YAZIO</div>;

  return (
    <div className="min-h-screen py-20 px-6 bg-[#fafafa] dark:bg-[#080808] transition-colors">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <header className="mb-20 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5 shadow-sm">
          
          {/* FOTOĞRAF ALANI: Beyazlıklar 'dark:bg-transparent' ile giderildi */}
          <div className="w-32 h-32 bg-black dark:bg-transparent rounded-[3rem] overflow-hidden shadow-2xl flex items-center justify-center border dark:border-white/10">
            {profileData.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" /> : <span className="text-white dark:text-neutral-500 text-5xl font-black">{user.email[0].toUpperCase()}</span>}
          </div>

          <div className="flex-1 text-center md:text-left">
            {!isEditing ? (
              <div className="mb-6">
                <h1 className="text-4xl font-black dark:text-white tracking-tighter">
                  {profileData.full_name || "Ad Soyad"}
                </h1>
                {/* Kullanıcı adı doğal yazımıyla (Harf zorlaması yok) */}
                <p className="text-base font-medium text-gray-400 dark:text-gray-500/50 mt-1 italic tracking-normal">
                  @{profileData.username}
                </p>
                <button onClick={() => setIsEditing(true)} className="mt-6 px-8 py-2.5 bg-gray-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-all">
                  Profili Düzenle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mt-4 animate-in slide-in-from-bottom-4 duration-500">
                <input placeholder="Ad Soyad" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="col-span-2 p-4 bg-white dark:bg-black/20 border dark:border-white/10 rounded-full text-xs outline-none focus:border-red-600" />
                <input placeholder="Kullanıcı Adı" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} className="p-4 bg-white dark:bg-black/20 border dark:border-white/10 rounded-full text-xs outline-none focus:border-red-600" />
                
                {/* HAKKINDA DÜZENLEME ALANI */}
                <textarea 
                  placeholder="Yazar Hakkında (Hikayenizi anlatın...)" 
                  value={profileData.bio} 
                  onChange={e => setProfileData({...profileData, bio: e.target.value})} 
                  className="col-span-2 p-4 bg-white dark:bg-black/20 border dark:border-white/10 rounded-[2rem] text-xs outline-none focus:border-red-600 min-h-[100px]" 
                />
                
                <button onClick={handleSaveProfile} className="col-span-2 py-4 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Kaydet</button>
              </div>
            )}
            
            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8">
              <div className="text-center"><p className="text-2xl font-black dark:text-white">{myBooks.length}</p><p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Eser</p></div>
              <div className="text-center"><p className="text-2xl font-black dark:text-white text-red-600">{totalViews}</p><p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Okunma</p></div>
              <div className="text-center"><p className="text-2xl font-black dark:text-white">{myFollowers.length}</p><p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Takipçi</p></div>
              <div className="text-center"><p className="text-2xl font-black dark:text-white">{followedAuthors.length}</p><p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Takip</p></div>
            </div>
          </div>
        </header>

        <div className="flex gap-10 mb-12 border-b dark:border-white/5 pb-4">
          {['eserler', 'kütüphane', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>
              {t}
              {activeTab === t && <div className="absolute -bottom-4 left-0 right-0 h-[2.5px] bg-red-600 rounded-full" />}
            </button>
          ))}
        </div>

        {activeTab === 'hakkında' ? (
          <div className="max-w-3xl animate-in fade-in duration-700">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 italic mb-8 px-2">Yazarın Hikayesi</h2>
            <div className="p-10 bg-white dark:bg-white/5 rounded-[3rem] border dark:border-white/5 shadow-sm">
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 font-serif italic leading-relaxed whitespace-pre-line">
                {profileData.bio || "Hikayenizi henüz anlatmadınız... 'Profili Düzenle' butonuna basarak kendinizden bahsedebilirsiniz."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-10 gap-x-8 animate-in fade-in duration-500">
            {(activeTab === 'eserler' ? myBooks : followedBooks).map(k => (
              <div key={k.id} className="group flex flex-col">
                <Link href={`/kitap/${k.id}`} className="block aspect-[2/3] mb-4 overflow-hidden rounded-[2.8rem] border dark:border-white/5 transition-all shadow-lg group-hover:shadow-2xl group-hover:-translate-y-2 group-hover:shadow-red-600/10">
                  {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full bg-gray-100 dark:bg-white/5" />}
                </Link>
                <div className="flex justify-center mb-2">
                    <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-900/15 px-3 py-0.5 rounded-full">{k.category}</span>
                </div>
                <h3 className="font-black text-[10px] text-center dark:text-white truncate uppercase px-2 italic tracking-tight">{k.title}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}