'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import PanoModal from '@/components/PanoModal';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

// --- YARDIMCI: SAYI FORMATLAMA ---
function formatNumber(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

export default function ProfilSayfasi() {
  const [user, setUser] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [myDrafts, setMyDrafts] = useState([]);
  const [myPanos, setMyPanos] = useState([]);

  // ✅ KUPALAR
  const [trophies, setTrophies] = useState([]);

  // Takip sayıları için
  const [followedAuthorsCount, setFollowedAuthorsCount] = useState(0);
  const [myFollowersCount, setMyFollowersCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [totalViews, setTotalViews] = useState(0);
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [selectedPano, setSelectedPano] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '', username: '', bio: '', avatar_url: '', instagram: '', role: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  // Listeler (Artık detaylı veriyi direkt çekiyoruz)
  const [followersWithProfiles, setFollowersWithProfiles] = useState([]);
  const [followingWithProfiles, setFollowingWithProfiles] = useState([]);

  useEffect(() => {
    async function getData() {
      // Admin listesini çek
      const { data: admins } = await supabase
        .from('announcement_admins')
        .select('user_email');

      const adminEmailList = admins?.map(a => a.user_email) || [];
      setAdminEmails(adminEmailList);

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
        instagram: profile?.instagram || '',
        role: profile?.role
      });

      const { data: adminData } = await supabase
        .from('announcement_admins')
        .select('*')
        .eq('user_email', activeUser.email)
        .single();

      if (adminData) setIsAdmin(true);

     // --- KİTAPLARI VE İSTATİSTİK VERİLERİNİ ÇEK (GÜNCELLENDİ) ---
      const { data: written } = await supabase
        .from('books')
        .select('*, total_comment_count, total_votes, chapters(id, views)')
        // BURASI DEĞİŞTİ: Sahibi olduğun VEYA onaylanmış ortağı olduğun kitaplar
        .or(`user_id.eq.${activeUser.id},and(co_author_id.eq.${activeUser.id},co_author_status.eq.accepted)`)
        .order('created_at', { ascending: false });

      // Verileri birleştirme fonksiyonu
      const mergeStats = (list) => {
        return list.map(book => {
          const totalBookViews = book.chapters?.reduce((acc, c) => acc + (c.views || 0), 0) || 0;

          const totalComments = book.total_comment_count || 0;
          const totalVotes = book.total_votes || 0;

          return { ...book, totalViews: totalBookViews, totalComments, totalVotes };
        });
      };

      // YAZDIĞIM KİTAPLARI AYARLA
      if (written) {
        const enrichedWritten = mergeStats(written);
        setMyBooks(enrichedWritten.filter(b => !b.is_draft));
        setMyDrafts(enrichedWritten.filter(b => b.is_draft === true));

        const grandTotal = enrichedWritten.reduce((acc, curr) => acc + curr.totalViews, 0);
        setTotalViews(grandTotal);
      }

      // ✅ --- KUPALARI ÇEK (ŞAMPİYON OLDUĞUN ETKİNLİKLER) ---
      const { data: trophyData } = await supabase
        .from('event_participants')
        .select(`
          id,
          event:events(id, title, image_url, end_date)
        `)
        .eq('user_email', activeUser.email)
        .eq('is_champion', true);

      setTrophies(trophyData || []);

      // --- YENİ TAKİP SİSTEMİ (Supabase Relations) ---

      // 1. Ben kimleri takip ediyorum? (Following)
      const { data: followingData } = await supabase
        .from('author_follows')
        .select(`
          followed_id,
          profiles:followed_id ( username, full_name, avatar_url, email, role )
        `)
        .eq('follower_id', activeUser.id);

      // 2. Beni kimler takip ediyor? (Followers)
      const { data: followersData } = await supabase
        .from('author_follows')
        .select(`
          follower_id,
          profiles:follower_id ( username, full_name, avatar_url, email, role )
        `)
        .eq('followed_id', activeUser.id);

      const cleanFollowing = followingData?.map(item => ({
        followed_id: item.followed_id,
        username: item.profiles?.username || 'Bilinmeyen',
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        role: item.profiles?.role,
        is_admin: adminEmailList.includes(item.profiles?.email)
      })) || [];

      const cleanFollowers = followersData?.map(item => ({
        follower_id: item.follower_id,
        username: item.profiles?.username || 'Bilinmeyen',
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        role: item.profiles?.role,
        is_admin: adminEmailList.includes(item.profiles?.email)
      })) || [];

      setFollowingWithProfiles(cleanFollowing);
      setFollowedAuthorsCount(cleanFollowing.length);

      setFollowersWithProfiles(cleanFollowers);
      setMyFollowersCount(cleanFollowers.length);

      // PANOLAR
      const { data: panos } = await supabase
        .from('panolar')
        .select('*, books(title, cover_url), chapters(id, title)')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      const panosWithProfile = panos?.map(p => ({
        ...p,
        profiles: profile
      })) || [];

      setMyPanos(panosWithProfile);
      setLoading(false);
    }
    getData();
  }, []);

  async function handleSaveProfile() {
    // Önce kullanıcı adı dolu mu kontrolü yapalım (Kendi ismimiz değilse)
    if (profileData.username !== user.user_metadata?.username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profileData.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        toast.error('Bu kullanıcı adı zaten kullanımda. Lütfen başka bir tane seçin.');
        return;
      }
    }

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

    if (error) {
      console.log("HATA:", error);

      if (error.message.includes('unique_username_case_insensitive')) {
        toast.error('Bu kullanıcı adı zaten kullanımda. Lütfen başka bir tane seçin.');
      } else {
        toast.error("Kaydedilemedi: " + error.message);
      }
    } else {
      toast.success("Güncellendi ✅");
      setIsEditing(false);
      setUser(prev => ({ ...prev, user_metadata: { ...prev.user_metadata, username: profileData.username } }));
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

  // --- YENİ UNFOLLOW FONKSİYONU (ID İLE) ---
  async function handleUnfollow(targetId) {
    const { error } = await supabase
      .from('author_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', targetId);

    if (!error) {
      setFollowingWithProfiles(prev => prev.filter(a => a.followed_id !== targetId));
      setFollowedAuthorsCount(prev => prev - 1);
      toast.success("Bırakıldı");
    } else {
      toast.error("Hata oluştu");
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
      <div className="text-3xl md:text-5xl font-black tracking-tighter">
        <span className="text-black dark:text-white">Kitap</span>
        <span className="text-red-600">Lab</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-6 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <Toaster />

      <PanoModal
        selectedPano={selectedPano}
        onClose={() => setSelectedPano(null)}
        user={user}
        adminEmails={adminEmails}
        isAdmin={isAdmin}
        isOwner={true}
        onDelete={(deletedId) => setMyPanos(prev => prev.filter(p => p.id !== deletedId))}
      />

      <div className="max-w-6xl mx-auto">
        {/* HEADER BÖLÜMÜ */}
        <header className="mb-8 md:mb-12 bg-white dark:bg-white/5 p-6 md:p-10 rounded-3xl md:rounded-[4rem] border dark:border-white/5">
          <div className="flex flex-col items-center md:flex-row md:items-center gap-6 md:gap-10">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 dark:bg-white/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-2xl md:text-3xl shrink-0 mx-auto md:mx-0">
              {profileData.avatar_url && profileData.avatar_url.includes('http') ? (
                <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                user.email[0].toUpperCase()
              )}
            </div>

            <div className="flex-1 w-full">
              {!isEditing ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 mb-2 justify-center md:justify-start">
                    <h1 className="text-2xl md:text-3xl font-black uppercase dark:text-white leading-none text-center md:text-left">
                      {profileData.full_name || "İsim Soyisim"}
                    </h1>
                  </div>

                  <div className="flex justify-center md:justify-start mb-3 md:mb-4">
                    <Username
                      username={profileData.username}
                      isAdmin={isAdmin}
                      isPremium={profileData.role === 'premium'}
                      className="text-xs text-gray-400 uppercase font-bold tracking-wide"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 md:px-6 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-[9px] md:text-[10px] font-black uppercase text-gray-500 hover:text-red-600 transition-all"
                    >
                      Profili Düzenle
                    </button>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="px-4 md:px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] md:text-[10px] font-black uppercase hover:opacity-80 transition-all flex items-center gap-2"
                      >
                        🛡️ Admin Paneli
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="md:col-span-2 mb-2 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl md:rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">

                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const toastId = toast.loading('Fotoğraf optimize ediliyor ve yükleniyor... ⚡');

                        try {
                          const options = {
                            maxSizeMB: 0.1,
                            maxWidthOrHeight: 500,
                            useWebWorker: false,
                            fileType: 'image/jpeg'
                          };

                          const compressedFile = await imageCompression(file, options);

                          const fileExt = "jpg";
                          const fileName = `${user.id}-${Math.random()}.${fileExt}`;

                          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);

                          if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
                            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
                            toast.success("Fotoğraf yüklendi! Kaydetmeyi unutma.", { id: toastId });
                          } else {
                            console.error(uploadError);
                            toast.error("Yükleme hatası!", { id: toastId });
                          }

                        } catch (error) {
                          console.error("Sıkıştırma hatası:", error);
                          toast.error("Resim işlenirken hata oluştu", { id: toastId });
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <span className="text-xl md:text-2xl mb-1 block">📸</span>
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 group-hover:text-red-600">Profil Fotoğrafını Değiştir</p>
                  </div>

                  {profileData.avatar_url && (
                    <div className="md:col-span-2 flex justify-center -mt-2 mb-2">
                      <button
                        onClick={handleRemovePhoto}
                        className="text-[9px] md:text-[10px] text-red-600 font-black uppercase hover:underline"
                      >
                        Mevcut Fotoğrafı Kaldır
                      </button>
                    </div>
                  )}

                  <input
                    value={profileData.full_name}
                    onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="p-3 md:p-4 bg-white dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-xs outline-none focus:border-red-600"
                    placeholder="Ad Soyad"
                  />

                  <input
                    value={profileData.username}
                    onChange={e => setProfileData({ ...profileData, username: e.target.value.replace(/\s/g, '') })}
                    className="p-3 md:p-4 bg-white dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-xs outline-none focus:border-red-600"
                    placeholder="Kullanıcı Adı"
                  />

                  <div className="relative">
                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">@</span>
                    <input
                      value={profileData.instagram}
                      onChange={e => setProfileData({ ...profileData, instagram: e.target.value })}
                      className="w-full p-3 md:p-4 pl-7 md:pl-8 bg-white dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-xs outline-none focus:border-red-600"
                      placeholder="Instagram Kullanıcı Adı"
                    />
                  </div>

                  <textarea
                    value={profileData.bio}
                    onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                    className="md:col-span-2 p-3 md:p-4 bg-white dark:bg-black border dark:border-white/10 rounded-xl md:rounded-2xl text-xs outline-none focus:border-red-600 min-h-[80px]"
                    placeholder="Biyografi (Kendini tanıt...)"
                  />

                  <div className="md:col-span-2 flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl text-[9px] md:text-[10px] font-black uppercase hover:bg-gray-200">İptal</button>
                    <button onClick={handleSaveProfile} className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase shadow-lg shadow-red-600/30 hover:bg-red-700">Değişiklikleri Kaydet</button>
                  </div>
                </div>
              )}

              <div className="flex justify-center md:justify-start gap-6 md:gap-12 border-t dark:border-white/5 pt-6 md:pt-8 mt-4 md:mt-6 w-full">
                <div className="text-center"><p className="text-xl md:text-2xl font-black">{myBooks.length}</p><p className="text-[8px] md:text-[9px] uppercase opacity-40">Eser</p></div>
                <div className="text-center"><p className="text-xl md:text-2xl font-black text-red-600">{formatNumber(totalViews)}</p><p className="text-[8px] md:text-[9px] uppercase opacity-40">Okunma</p></div>

                {/* ✅ KUPA SAYISI */}
                <div className="text-center"><p className="text-xl md:text-2xl font-black">{trophies.length}</p><p className="text-[8px] md:text-[9px] uppercase opacity-40">Kupa</p></div>

                <button onClick={() => setModalType('followers')} className="text-center outline-none"><p className="text-xl md:text-2xl font-black">{myFollowersCount}</p><p className="text-[8px] md:text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takipçi</p></button>
                <button onClick={() => setModalType('following')} className="text-center outline-none"><p className="text-xl md:text-2xl font-black">{followedAuthorsCount}</p><p className="text-[8px] md:text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takip</p></button>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-6 md:mb-8 border-b dark:border-white/5 pb-4">
          <div className="flex gap-3 md:gap-8 overflow-x-auto no-scrollbar px-1">
            {['eserler', 'taslaklar', 'panolar', 'kupalar', 'hakkında'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`shrink-0 px-4 md:px-0 py-2 rounded-full md:rounded-none text-[10px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t
                    ? 'bg-red-600 text-white md:bg-transparent md:text-red-600'
                    : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-300 md:bg-transparent'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-6 md:p-8 bg-white dark:bg-white/5 rounded-2xl md:rounded-3xl border dark:border-white/5 flex flex-col items-start gap-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-full">
                <h3 className="text-[10px] md:text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Biyografi</h3>
                <p className="italic text-gray-500 leading-relaxed w-full font-serif text-base md:text-lg whitespace-pre-wrap">
                  {profileData.bio || "Biyografi henüz eklenmemiş."}
                </p>
              </div>

              {profileData.instagram && (
                <div className="w-full pt-6 border-t dark:border-white/10">
                  <h3 className="text-[10px] md:text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">Instagram</h3>
                  <a
                    href={`https://instagram.com/${profileData.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-bold hover:scale-105 transition-transform"
                  >
                    <span>📷</span>
                    <span>@{profileData.instagram.replace('@', '')}</span>
                  </a>
                </div>
              )}
            </div>
          ) : activeTab === 'panolar' ? (
            <div className="space-y-4 md:space-y-6">
              {myPanos.length === 0 ? (
                <div className="text-center py-8 md:py-10 text-sm text-gray-500">Henüz hiç pano oluşturmamışsın.</div>
              ) : (
                myPanos.map(pano => (
                  <div
                    key={pano.id}
                    onClick={() => setSelectedPano(pano)}
                    className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-xl md:rounded-[2rem] border dark:border-white/10 flex gap-4 md:gap-6 relative group hover:border-red-600/30 transition-all cursor-pointer"
                  >
                    <div className="w-16 h-24 md:w-20 md:h-28 shrink-0 rounded-lg md:rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10">
                      {pano.books?.cover_url ? <img src={pano.books.cover_url} className="w-full h-full object-cover" alt="" /> : null}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-base md:text-xl font-black dark:text-white mb-1 md:mb-2 line-clamp-1 group-hover:text-red-600 transition-colors">{pano.title}</h3>
                      <p className="text-[9px] md:text-[10px] text-red-600 font-bold uppercase mb-2 tracking-widest">
                        📖 {pano.books?.title} {pano.chapter_id && '• ' + (pano.chapters?.title || 'Bölüm')}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{pano.content}</p>

                      <div className="inline-flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase bg-black dark:bg-white text-white dark:text-black px-4 md:px-6 py-2 md:py-3 rounded-full tracking-tighter mt-3 md:mt-4">
                        Detayları Gör →
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 md:top-6 md:right-6">
                      <Link
                        href={`/pano-duzenle/${pano.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[8px] md:text-[10px] font-black uppercase text-center hover:bg-blue-100 transition-colors"
                      >
                        DÜZENLE
                      </Link>
                      <button
                        onClick={(e) => handleDeletePano(pano.id, e)}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-[8px] md:text-[10px] font-black uppercase hover:bg-red-100 transition-colors"
                      >
                        SİL
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'kupalar' ? (
            <div className="animate-in fade-in">
              {trophies.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="font-black uppercase text-sm">Henüz kazanılmış kupa yok</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {trophies.map(t => (
                    <Link
                      key={t.id}
                      href={`/etkinlikler/${t.event?.id}`}
                      className="group relative overflow-hidden rounded-3xl p-6 border bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-orange-600/10 hover:scale-[1.02] transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10 flex gap-5 items-center">
                        <div className="text-5xl">🏆</div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase opacity-50 mb-1 tracking-widest">
                            Etkinlik Şampiyonu
                          </p>

                          <h3 className="font-black text-lg uppercase tracking-tight line-clamp-2">
                            {t.event?.title || 'Etkinlik'}
                          </h3>

                          {t.event?.end_date && (
                            <p className="text-xs opacity-50 mt-1">
                              {new Date(t.event.end_date).toLocaleDateString('tr-TR')}
                            </p>
                          )}
                        </div>

                        <div className="text-sm font-black text-yellow-600">Gör →</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
              {(activeTab === 'taslaklar' ? myDrafts : myBooks).map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group relative">
                  <div className="aspect-[2/3] rounded-xl md:rounded-[2rem] overflow-hidden border dark:border-white/5 mb-2 md:mb-3 shadow-md group-hover:-translate-y-1 transition-all relative">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-gray-200 dark:bg-white/10" />}

                    {k.is_draft && (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-lg z-10 uppercase tracking-wider">
                        TASLAK
                      </div>
                    )}
                    
                  </div>

                  <h3 className="text-[9px] md:text-[10px] font-black text-center uppercase truncate italic dark:text-white group-hover:text-red-600 transition-colors">{k.title}</h3>

                  {k.is_completed && (
                    <div className="flex justify-center mt-1">
                      <span className="text-[7px] md:text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-wide">
                        ✅ TAMAMLANDI
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-1 md:mt-1.5 text-[7px] md:text-[8px] font-black text-gray-400">
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

      {modalType && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setModalType(null)}>
          <div className="bg-white dark:bg-black w-full max-w-md rounded-2xl md:rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* BAŞLIK VE KAPAT */}
            <div className="p-4 md:p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <span className="text-[9px] md:text-[10px] font-black uppercase opacity-40 tracking-widest">
                {modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
              </span>
              <button onClick={() => setModalType(null)} className="text-[9px] md:text-[10px] font-black text-red-600 uppercase">
                Kapat
              </button>
            </div>

            {/* İÇERİK */}
            <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 scrollbar-thin scrollbar-thumb-red-600/20 scrollbar-track-transparent">
              {(modalType === 'followers' ? followersWithProfiles : followingWithProfiles).length === 0 ? (
                <p className="text-center py-8 md:py-10 text-[9px] md:text-[10px] text-gray-500 italic uppercase">Henüz kimse yok.</p>
              ) : (
                (modalType === 'followers' ? followersWithProfiles : followingWithProfiles).map((p, i) => {

                  const displayName = p.username || 'Kullanıcı';
                  const displayAvatar = p.avatar_url;
                  const targetId = modalType === 'followers' ? p.follower_id : p.followed_id;

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 hover:border-red-600/30 transition-all"
                    >
                      <Link
                        href={`/yazar/${displayName}`}
                        onClick={() => setModalType(null)}
                        className="flex items-center gap-2 md:gap-3"
                      >
                        <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-600/10 overflow-hidden flex items-center justify-center font-black text-red-600 text-[10px] md:text-xs">
                          {displayAvatar ? (
                            <Image
                              src={displayAvatar}
                              alt={displayName || 'Avatar'}
                              width={80}
                              height={80}
                              unoptimized
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            (displayName[0] || 'U').toUpperCase()
                          )}
                        </div>

                        <div>
                          <Username
                            username={displayName}
                            isAdmin={p.is_admin}
                            isPremium={p.role === 'premium'}
                            className="text-[10px] md:text-xs font-bold"
                          />
                          {p.full_name && (
                            <p className="text-[8px] md:text-[9px] text-gray-400">
                              {p.full_name}
                            </p>
                          )}
                        </div>
                      </Link>

                      {modalType === 'following' && (
                        <button
                          onClick={() => handleUnfollow(targetId)}
                          className="text-[9px] font-black uppercase bg-red-600 text-white px-4 py-1.5 rounded-full hover:bg-red-700 transition-colors"
                        >
                          Bırak
                        </button>
                      )}
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
