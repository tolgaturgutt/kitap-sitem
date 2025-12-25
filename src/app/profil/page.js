'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import Username from '@/components/Username';
import PanoModal from '@/components/PanoModal';

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

  useEffect(() => {
    async function getData() {
      // Admin listesini çek
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

      // --- 1. KİTAPLARI VE İSTATİSTİK VERİLERİNİ ÇEK ---
      // (Burada chapters(id, views) diyerek okunma sayılarını da alıyoruz)
      const { data: written } = await supabase
        .from('books')
        .select('*, chapters(id, views)')
        .eq('user_email', activeUser.email)
        .order('created_at', { ascending: false });

      // --- 2. TAKİP EDİLEN KİTAPLARI ÇEK ---
      const { data: followsList } = await supabase
        .from('follows')
        .select('book_id')
        .eq('user_email', activeUser.email);

      const followBookIds = followsList?.map(f => f.book_id).filter(Boolean) || [];
      
      let rawLibrary = [];
      if (followBookIds.length > 0) {
        const { data: libraryData } = await supabase
          .from('books')
          .select('*, chapters(id, views)')
          .in('id', followBookIds)
          .eq('is_draft', false);
        rawLibrary = libraryData || [];
      }

      // --- 3. EKSTRA İSTATİSTİKLER (Yorumlar ve Beğeniler) ---
      // Elimdeki tüm kitapların (yazdıklarım + takip ettiklerim) ID'lerini topluyorum
      const allBooksList = [...(written || []), ...rawLibrary];
      const allBookIds = allBooksList.map(b => b.id);
      const allChapterIds = allBooksList.flatMap(b => b.chapters.map(c => c.id));

      // Tek seferde tüm yorum sayılarını ve oyları çekiyoruz (Performans için)
      const { data: commentsData } = await supabase.from('comments').select('book_id').in('book_id', allBookIds);
      const { data: votesData } = await supabase.from('chapter_votes').select('chapter_id').in('chapter_id', allChapterIds);

      // Verileri birleştirme fonksiyonu
      const mergeStats = (list) => {
        return list.map(book => {
          // Toplam Okunma
          const totalBookViews = book.chapters?.reduce((acc, c) => acc + (c.views || 0), 0) || 0;
          
          // Toplam Yorum
          const totalComments = commentsData?.filter(c => c.book_id === book.id).length || 0;
          
          // Toplam Beğeni
          const chIds = book.chapters?.map(c => c.id) || [];
          const totalVotes = votesData?.filter(v => chIds.includes(v.chapter_id)).length || 0;

          return { ...book, totalViews: totalBookViews, totalComments, totalVotes };
        });
      };

      // YAZDIĞIM KİTAPLARI AYARLA
      if (written) {
        const enrichedWritten = mergeStats(written);
        setMyBooks(enrichedWritten.filter(b => !b.is_draft));
        setMyDrafts(enrichedWritten.filter(b => b.is_draft === true));

        // Profil başlığındaki toplam okunma sayısını buradan hesapla
        const grandTotal = enrichedWritten.reduce((acc, curr) => acc + curr.totalViews, 0);
        setTotalViews(grandTotal);
      }

      // TAKİP ETTİĞİM KİTAPLARI AYARLA
      if (rawLibrary.length > 0) {
        setFollowedBooks(mergeStats(rawLibrary));
      } else {
        setFollowedBooks([]);
      }

      // TAKİPÇİLER VE TAKİP EDİLENLER
      const { data: following } = await supabase.from('author_follows').select('followed_username').eq('follower_email', activeUser.email);
      const { data: followers } = await supabase.from('author_follows').select('follower_username').eq('followed_username', currentUsername);
      setFollowedAuthors(following || []);
      setMyFollowers(followers || []);

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
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl shrink-0">
            {profileData.avatar_url && profileData.avatar_url.includes('http') ? (
              <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="" />
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
              <div className="text-center"><p className="text-2xl font-black text-red-600">{formatNumber(totalViews)}</p><p className="text-[9px] uppercase opacity-40">Okunma</p></div>
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

                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 right-6">
                      <Link 
                        href={`/pano-duzenle/${pano.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-black uppercase text-center hover:bg-blue-100 transition-colors"
                      >
                        DÜZENLE
                      </Link>
                      <button 
                        onClick={(e) => handleDeletePano(pano.id, e)}
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-[10px] font-black uppercase hover:bg-red-100 transition-colors"
                      >
                        SİL
                      </button>
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
                <Link key={k.id} href={`/kitap/${k.id}`} className="group relative">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3 shadow-md group-hover:-translate-y-1 transition-all relative">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-gray-200 dark:bg-white/10" />}
                    
                    {/* Taslak Rozeti */}
                    {k.is_draft && (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg z-10 uppercase tracking-wider">
                        TASLAK
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-[10px] font-black text-center uppercase truncate italic dark:text-white group-hover:text-red-600 transition-colors">{k.title}</h3>
                  
                  {/* ✅ TAMAMLANDI ROZETİ (Başlığın altına alındı) */}
                  {k.is_completed && (
                    <div className="flex justify-center mt-1">
                      <span className="text-[8px] font-black text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        ✅ TAMAMLANDI
                      </span>
                    </div>
                  )}
                  
                  {/* ✅ İSTATİSTİK ŞERİDİ */}
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