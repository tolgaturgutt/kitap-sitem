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
  const [followedBooks, setFollowedBooks] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [myFollowers, setMyFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '', username: '', bio: '', avatar_url: '', instagram: '' });
  const [isAdmin, setIsAdmin] = useState(false);

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
        avatar_url: profile?.avatar_url || '',
        instagram: profile?.instagram || ''
      });

      // ADMIN KONTROLÜ
      const { data: adminData } = await supabase
        .from('announcement_admins')
        .select('*')
        .eq('user_email', activeUser.email)
        .single();

      if (adminData) setIsAdmin(true);

      // 🔥 1. ESERLERİMİ GETİR (VE AYIKLA)
      const { data: written } = await supabase
        .from('books')
        .select('*')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      if (written) {
        console.log('📚 ESERLER DEBUG:');
        console.log('Tüm kitaplar:', written);
        console.log('is_draft değerleri:', written.map(b => ({ 
          title: b.title, 
          is_draft: b.is_draft, 
          type: typeof b.is_draft 
        })));

        // ✅ DOĞRU FİLTRELEME
        const publishedBooks = written.filter(b => !b.is_draft);
        const draftBooks = written.filter(b => b.is_draft === true);
        
        setMyBooks(publishedBooks);
        setMyDrafts(draftBooks);
        
        console.log('✅ Eserler:', publishedBooks);
        console.log('✅ Taslaklar:', draftBooks);
      }

      // 2. OKUNMA SAYISINI HESAPLA
      if (written && written.length > 0) {
        const bookIds = written.map(b => b.id);
        const { data: chapters } = await supabase.from('chapters').select('views').in('book_id', bookIds);
        const total = chapters?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;
        setTotalViews(total);
      }

      // 🔥 3. TAKİP EDİLEN KİTAPLARI GETİR (SADECE YAYINLANMIŞ OLANLAR)
      const { data: followsList } = await supabase
        .from('follows')
        .select('book_id')
        .eq('user_email', activeUser.email);

      const followBookIds = followsList?.map(f => f.book_id).filter(Boolean) || [];

      if (followBookIds.length > 0) {
        // ✅ Kütüphaneden kitapları çek - SADECE YAYINLANMIŞ OLANLARI
        const { data: rawLibrary } = await supabase
          .from('books')
          .select('*')
          .in('id', followBookIds)
          .eq('is_draft', false); // 🔥 BURASI ÖNEMLİ: Sadece yayınlanmış kitapları çek

        console.log('📚 Kütüphane kitapları:', rawLibrary);
        setFollowedBooks(rawLibrary || []);
      } else {
        setFollowedBooks([]);
      }

      // Takipçi / Takip verileri
      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_email', activeUser.email);
      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', currentUsername);
      setFollowedAuthors(following || []);
      setMyFollowers(followers || []);
      setLoading(false);
    }
    getData();
  }, []);

  async function handleSaveProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, 
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
          {['eserler', 'kütüphane', 'taslaklar', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>{t}</button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 flex flex-col items-start gap-6 animate-in fade-in slide-in-from-bottom-2">
              <p className="italic text-gray-500 leading-relaxed w-full font-serif text-lg">
                {profileData.bio || "Biyografi henüz eklenmemiş."}
              </p>

              {profileData.instagram && (
                <a
                  href={`https://instagram.com/${profileData.instagram}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 hover:shadow-red-500/40 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>@{profileData.instagram}</span>
                </a>
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

      <Link
        href="/kitap-ekle"
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-full shadow-2xl shadow-red-600/50 flex items-center justify-center font-black text-2xl hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <span className="group-hover:rotate-90 transition-transform duration-300">+</span>
        <div className="absolute -top-12 right-0 bg-black text-white text-[9px] font-black px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          YENİ KİTAP YAZ
        </div>
      </Link>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden">
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