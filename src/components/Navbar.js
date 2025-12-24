'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Username from '@/components/Username';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ books: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  // Mevcut state'lerin altına ekle
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadNotifications(session.user.email);
        
        // Profil bilgisini çek
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      }
    };
    loadSession();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications(email) {
    const { data: n } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_email', email)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(n || []);
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        // 1. KİTAPLARI ARA (Dolu Olanlar)
        let { data: b } = await supabase
          .from('books')
          .select('*, chapters(id)') // Bölüm bilgisini de iste
          .ilike('title', `%${query}%`)
          .limit(10); // Sayıyı arttırdık ki boşları atınca elde kitap kalsın
        
        // SADECE BÖLÜMÜ OLANLARI AL (HAYALET FİLTRESİ)
        if (b) {
          b = b.filter(kitap => kitap.chapters && kitap.chapters.length > 0).slice(0, 5);
        }
        
        // 2. YAZARLARI ARA
        const { data: u } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(5);
        
        // 3. (YENİ) KİTAP YAZARLARININ ROLLERİNİ BUL VE EKLE
        if (b && b.length > 0) {
            const authorNames = [...new Set(b.map(book => book.username))];
            const { data: roles } = await supabase
              .from('profiles')
              .select('username, role')
              .in('username', authorNames);
            
            // Rol bilgisini kitabın içine gömüyoruz
            b.forEach(book => {
                const author = roles?.find(r => r.username === book.username);
                book.author_role = author?.role; 
            });
        }

        setSearchResults({ books: b || [], users: u || [] });
        setShowSearch(true);
      } else setShowSearch(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Çıkış yapıldı.');
    setUser(null);
    router.push('/');
    router.refresh();
  }

  // BİLDİRİM ZİLİNE BASILINCA TÜMÜNÜ OKUNDU YAP
  async function toggleNotifications() {
    const newState = !showNotifs;
    setShowNotifs(newState);
    
    // Eğer açılıyorsa ve okunmamış bildirim varsa, hepsini okundu yap
    if (newState && user && notifications.some(n => !n.is_read)) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_email', user.email)
        .eq('is_read', false);
      
      // State'i güncelle
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }
  // --- YENİ: ARAMA İŞLEMİ TETİKLEYİCİ ---
  function handleSearchTrigger() {
    if (!query.trim()) return;
    setShowSearch(false); // Dropdown'ı kapat
    // Kullanıcıyı arama sayfasına gönder (Örn: /arama?q=ahmet)
    router.push(`/arama?q=${encodeURIComponent(query)}`);
  }

  if (!mounted) return null;

  const bookNotifs = notifications.filter(n => n.type === 'vote' || n.type === 'comment');
  const socialNotifs = notifications.filter(n => n.type === 'follow');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <nav className="w-full border-b sticky top-0 z-[100] backdrop-blur-md bg-white/80 dark:bg-black/90 border-gray-100 dark:border-gray-800 transition-all h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          {/* LOGO KUTUSU */}
          <div className="relative w-16 h-16 flex items-center justify-center">
              
              {/* GÜNDÜZ LOGOSU: mt-4 ile aşağıya, tam hizaya indirdik */}
              <img 
                src="/logo-gunduz.png" 
                alt="Logo" 
                className="w-full h-full object-contain dark:hidden mt-3" 
              />
              
              {/* GECE LOGOSU: Bu zaten ortada duruyordu, ellemeyelim */}
              <img 
                src="/logo-gece.png" 
                alt="Logo" 
                className="w-full h-full object-contain hidden dark:block" 
              />
          </div>
          
          {/* YAZI KISMI */}
          <div className="text-3xl font-black tracking-tight leading-none flex flex-col justify-center">
            <div className="flex items-center">
              <span className="text-black dark:text-white">Kitap</span>
              <span className="text-red-600">Lab</span>
            </div>
          </div>
        </Link>

        {/* ARAMA BARI */}
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative">
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()} // Enter tuşu eklendi
              placeholder="Eser veya yazar ara..." 
              className="w-full h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full pl-6 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-red-600/20" 
            />

            {/* Büyüteç SAĞ TARAFA (right-4) ALINDI */}
            <button 
              onClick={handleSearchTrigger}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors z-10"
            >
              🔍
            </button>
          </div>
          
          {showSearch && (
            <div className="absolute top-14 left-0 w-full bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
              {searchResults.books.length === 0 && searchResults.users.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="text-4xl mb-3 block">📚</span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Sonuç bulunamadı</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {searchResults.books.length > 0 && (
                    <div className="p-3">
                      <p className="text-[8px] font-black uppercase text-gray-400 mb-2 px-3 tracking-widest">Eserler</p>
                      {searchResults.books.map(b => (
                        <Link 
                          key={b.id} 
                          href={`/kitap/${b.id}`} 
                          onClick={() => setShowSearch(false)} 
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all group"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                            {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <div className="flex-1 min-w-0">
  {/* Kitap Başlığı (Sadece 1 Kere) */}
  <p className="text-xs font-bold truncate group-hover:text-red-600 transition-colors">{b.title}</p>
  
  {/* Yazar İsmi ve Tik */}
  <Username
    username={b.username}
    isAdmin={b.author_role === 'admin'}
    className="text-[9px] text-gray-400 uppercase"
  />
</div>
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.users.length > 0 && (
                    <div className="p-3 border-t dark:border-white/5">
                      <p className="text-[8px] font-black uppercase text-gray-400 mb-2 px-3 tracking-widest">Yazarlar</p>
                      {searchResults.users.map(u => (
                        <Link 
                          key={u.id} 
                          href={`/yazar/${u.username}`} 
                          onClick={() => setShowSearch(false)} 
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-red-600/10 flex items-center justify-center font-black text-red-600 text-sm shrink-0">
                            {u.avatar_url && u.avatar_url.includes('http') ? (
                              <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              u.username[0].toUpperCase()
                            )}
                          </div>
                         <div className="flex-1">
  {/* 1. Satır: Kullanıcı Adı ve Sarı Tik */}
  <Username
    username={u.username}
    isAdmin={u.role === 'admin'}
    className="text-xs font-bold group-hover:text-red-600 transition-colors"
  />
  
  {/* 2. Satır: Gerçek İsim (Sadece 1 Kere) */}
  {u.full_name && <p className="text-[9px] text-gray-400">{u.full_name}</p>}
</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SAĞ MENÜ */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* BİLDİRİM BUTONU */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={toggleNotifications}
                  className={`w-11 h-11 flex items-center justify-center rounded-full relative transition-all ${showNotifs ? 'bg-red-600 text-white scale-110' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:scale-105'}`}
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifs && (
                  <div className="absolute top-14 right-0 w-[320px] md:w-[500px] bg-white dark:bg-[#0a0a0a] border dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden z-[120] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* BAŞLIK */}
                    <div className="p-5 border-b dark:border-white/5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black dark:text-white">Bildirimler</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">
                          {notifications.length} bildirim
                        </p>
                      </div>
                      <button 
                        onClick={() => setShowNotifs(false)} 
                        className="text-[10px] font-black text-gray-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* BİLDİRİMLER */}
                    <div className="flex divide-x dark:divide-white/5 h-[400px]">
                      {/* ESERLER */}
                      <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-4 bg-gray-50/50 dark:bg-white/[0.02] sticky top-0 backdrop-blur-sm">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                            📚 Eserler
                          </p>
                        </div>
                        <div className="p-3 space-y-2">
                          {bookNotifs.length === 0 ? (
                            <div className="text-center py-12">
                              <span className="text-3xl block mb-2 opacity-20">😴</span>
                              <p className="text-[9px] text-gray-400 italic">Henüz hareket yok</p>
                            </div>
                          ) : bookNotifs.map(n => {
                            // LİNK OLUŞTUR
                            let linkUrl = '#';
                            if (n.type === 'vote' && n.book_id) {
                              linkUrl = `/kitap/${n.book_id}`;
                            } else if (n.type === 'comment' && n.book_id) {
                              if (n.chapter_id) {
                                linkUrl = `/kitap/${n.book_id}/bolum/${n.chapter_id}`;
                              } else {
                                linkUrl = `/kitap/${n.book_id}`;
                              }
                            } else if (n.type === 'new_chapter' && n.book_id && n.chapter_id) {
                              linkUrl = `/kitap/${n.book_id}/bolum/${n.chapter_id}`;
                            }

                            return (
                            <Link
                              key={n.id}
                              href={linkUrl}
                              onClick={() => setShowNotifs(false)}
                              className="block p-3 rounded-2xl transition-all group hover:scale-[1.02] bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs">
                                    {n.type === 'vote' ? '⭐' : n.type === 'new_chapter' ? '🆕' : '💬'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold leading-relaxed">
                                    <span className="text-red-600 font-black">@{n.actor_username}</span>
                                    {' '}
                                    {n.type === 'vote' 
                                      ? 'eserini oyladı' 
                                      : n.type === 'new_chapter'
                                      ? 'yeni bölüm yayınladı'
                                      : 'eserine yorum yaptı'}
                                  </p>
                                  {n.book_title && (
                                    <p className="text-[9px] text-gray-500 mt-1 truncate italic">"{n.book_title}"</p>
                                  )}
                                  <p className="text-[8px] text-gray-400 mt-1">
                                    {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          )})}
                        </div>
                      </div>

                      {/* SOSYAL */}
                      <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/30 dark:bg-white/[0.01]">
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 sticky top-0 backdrop-blur-sm">
                          <p className="text-[8px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
                            👥 Sosyal
                          </p>
                        </div>
                        <div className="p-3 space-y-2">
                          {socialNotifs.length === 0 ? (
                            <div className="text-center py-12">
                              <span className="text-3xl block mb-2 opacity-20">🫥</span>
                              <p className="text-[9px] text-gray-400 italic">Henüz takipçi yok</p>
                            </div>
                          ) : socialNotifs.map(n => (
                            <Link
                              key={n.id}
                              href={`/yazar/${n.actor_username}`}
                              onClick={() => setShowNotifs(false)}
                              className="block p-3 rounded-2xl transition-all group hover:scale-[1.02] bg-white dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0 font-black text-blue-600 text-xs">
                                  {n.actor_username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold leading-relaxed">
                                    <span className="text-blue-600 font-black">@{n.actor_username}</span>
                                    {' '}seni takip etti
                                  </p>
                                  <p className="text-[8px] text-gray-400 mt-1">
                                    {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- YENİ PROFİL MENÜSÜ (Dropdown) --- */}
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs uppercase hover:scale-110 transition-transform overflow-hidden shadow-lg border-2 border-transparent hover:border-red-400"
                >
                  {userProfile?.avatar_url && userProfile.avatar_url.includes('http') ? (
                    <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Profil" />
                  ) : (
                    user.email[0].toUpperCase()
                  )}
                </button>

                {/* AÇILIR MENÜ KUTUSU */}
                {showProfileMenu && (
                  <div className="absolute top-14 right-0 w-60 bg-white dark:bg-[#0a0a0a] border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[150] animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Üst Bilgi: İsim Soyisim */}
                    <div className="px-5 py-4 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {userProfile?.username || user.email.split('@')[0]}
                      </p>
                      <p className="text-[9px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      {/* 1. SEÇENEK: PROFİL */}
                      <Link 
                        href="/profil" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>👤</span> Profil
                      </Link>

                      {/* 2. SEÇENEK: AYARLAR */}
                      <Link 
                        href="/ayarlar" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>⚙️</span> Ayarlar
                      </Link>

                      {/* 3. SEÇENEK: TOPLULUK KURALLARI */}
                      <Link 
                        href="/kurallar" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>📜</span> Topluluk Kuralları
                      </Link>

                      {/* 4. SEÇENEK: DESTEK VE İLETİŞİM */}
                      <Link 
                        href="/iletisim" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>🛟</span> Destek ve İletişim
                      </Link>

                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                      {/* 5. SEÇENEK: ÇIKIŞ YAP */}
                      <button 
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-black uppercase text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-left"
                      >
                        <span>🚪</span> Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/giris" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase hover:scale-105 transition-transform">
              Giriş Yap
            </Link>
          )}
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:scale-110 transition-transform"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}