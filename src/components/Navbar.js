'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// 👇 1. usePathname EKLENDİ
import { useRouter, usePathname } from 'next/navigation'; 
import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Username from '@/components/Username';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  // 👇 2. MEVCUT SAYFAYI ALIYORUZ
  const pathname = usePathname(); 

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ books: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);
  
  const searchRef = useRef(null);       
  const mobileSearchRef = useRef(null); 

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // 👇 3. KRİTİK NOKTA: ŞİFRE YENİLEME SAYFASINDAYSAK NAVBAR'I İPTAL ET
  // Eğer başka sayfalarda da gizlemek istersen: if (['/sifre-yenile', '/giris'].includes(pathname))
  if (pathname === '/sifre-yenile') {
    return null;
  }

  useEffect(() => {
    setMounted(true);
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadNotifications(session.user.email);
        
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
      const isOutsideDesktop = searchRef.current && !searchRef.current.contains(e.target);
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(e.target);

      if (isOutsideDesktop && isOutsideMobile) {
        setShowSearch(false);
      }

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
    .limit(50);
  
  if (n && n.length > 0) {
    for (let notif of n) {
      if (notif.chapter_id && !notif.chapter_title) {
        const { data: chapter } = await supabase
          .from('chapters')
          .select('title')
          .eq('id', notif.chapter_id)
          .single();
        
        if (chapter) {
          notif.chapter_title = chapter.title;
        }
      }
    }
  }
  
  setNotifications(n || []);
}

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        let { data: b } = await supabase
          .from('books')
          .select('*, chapters(id)')
          .ilike('title', `%${query}%`)
          .limit(10);
        
        if (b) {
          b = b.filter(kitap => kitap.chapters && kitap.chapters.length > 0).slice(0, 5);
        }
        
        const { data: u } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(5);
        
        if (b && b.length > 0) {
            const authorNames = [...new Set(b.map(book => book.username))];
            const { data: roles } = await supabase
              .from('profiles')
              .select('username, role')
              .in('username', authorNames);
            
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

  async function toggleNotifications() {
    const newState = !showNotifs;
    setShowNotifs(newState);
    
    if (newState && user && notifications.some(n => !n.is_read)) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_email', user.email)
        .eq('is_read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }

  function handleSearchTrigger() {
    if (!query.trim()) return;
    setShowSearch(false);
    setShowMobileSearch(false);
    router.push(`/arama?q=${encodeURIComponent(query)}`);
  }

  if (!mounted) return null;

  const socialNotifs = notifications.filter(n => n.type === 'follow' || n.type === 'reply');
  const activityNotifs = notifications.filter(n => 
    n.type === 'vote' || 
    n.type === 'chapter_vote' || 
    n.type === 'comment' || 
    n.type === 'new_chapter' || 
    n.type === 'pano_vote' || 
    n.type === 'pano_comment'
  );
  const unreadCount = notifications.filter(n => !n.is_read).length;

  function getNotificationLink(n) {
    switch(n.type) {
      case 'vote':
        return n.book_id ? `/kitap/${n.book_id}` : '#';
      case 'chapter_vote':
        return n.book_id && n.chapter_id ? `/kitap/${n.book_id}/bolum/${n.chapter_id}` : '#';
      case 'comment':
        if (n.chapter_id && n.book_id) {
          return `/kitap/${n.book_id}/bolum/${n.chapter_id}`;
        } else if (n.book_id) {
          return `/kitap/${n.book_id}`;
        }
        return '#';
      case 'new_chapter':
        return n.book_id && n.chapter_id ? `/kitap/${n.book_id}/bolum/${n.chapter_id}` : '#';
      case 'pano_vote':
      case 'pano_comment':
        return n.pano_id ? `/pano/${n.pano_id}` : '#';
      case 'reply':
        if (n.chapter_id && n.book_id) {
          return `/kitap/${n.book_id}/bolum/${n.chapter_id}`;
        } else if (n.book_id) {
          return `/kitap/${n.book_id}`;
        } else if (n.pano_id) {
          return `/pano/${n.pano_id}`;
        }
        return '#';
      case 'follow':
        return n.actor_username ? `/yazar/${n.actor_username}` : '#';
      default:
        return '#';
    }
  }

function getNotificationText(n) {
  switch(n.type) {
    case 'vote': return 'eserini beğendi';
    case 'chapter_vote': return 'bölümünü beğendi';
    case 'comment': 
      return n.chapter_id ? 'bölümüne yorum yaptı' : 'eserine yorum yaptı';
    case 'new_chapter': return 'yeni bölüm yayınladı';
    case 'pano_vote': return 'panonuzu beğendi';
    case 'pano_comment': return 'panonuza yorum yaptı';
    case 'reply': return 'yorumunuza yanıt verdi';
    case 'follow': return 'seni takip etti';
    default: return 'bir aktivite gerçekleştirdi';
  }
}

  function getNotificationIcon(n) {
    switch(n.type) {
      case 'vote': case 'chapter_vote': case 'pano_vote': return '⭐';
      case 'comment': case 'pano_comment': return '💬';
      case 'new_chapter': return '🆕';
      case 'reply': return '↩️';
      case 'follow': return '👤';
      default: return '🔔';
    }
  }

  return (
    <nav className="w-full border-b sticky top-0 z-[100] backdrop-blur-md bg-white/80 dark:bg-black/90 border-gray-100 dark:border-gray-800 transition-all h-16 md:h-20">
      <div className="max-w-7xl mx-auto px-3 md:px-6 h-full flex items-center justify-between gap-2 md:gap-8">
        <Link href="/" className="flex items-center gap-0.5 md:gap-1 shrink-0 group">
            <div className="relative w-10 h-10 md:w-16 md:h-16 flex items-center justify-center">
              <img 
                src="/logo-gunduz.png" 
                alt="Logo" 
                className="w-full h-full object-contain dark:hidden mt-4 md:mt-4 ml-1 md:ml-1" 
              />
              <img 
                src="/logo-gece.png" 
                alt="Logo" 
                className="w-full h-full object-contain hidden dark:block" 
              />
          </div>
          
          <div className="text-xl md:text-3xl font-black tracking-tight leading-none flex flex-col justify-center">
            <div className="flex items-center">
              <span className="text-black dark:text-white">Kitap</span>
              <span className="text-red-600">Lab</span>
            </div>
          </div>
        </Link>

        {/* ARAMA BARI - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative w-full">
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
              placeholder="Eser veya yazar ara..." 
              className="w-full h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full pl-6 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-red-600/20" 
            />
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
                            <p className="text-xs font-bold truncate group-hover:text-red-600 transition-colors">{b.title}</p>
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
                            <Username
                              username={u.username}
                              isAdmin={u.role === 'admin'}
                              className="text-xs font-bold group-hover:text-red-600 transition-colors"
                            />
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
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:scale-105 transition-transform"
          >
            <span className="text-base">🔍</span>
          </button>

          {user ? (
            <>
              {/* BİLDİRİM BUTONU */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={toggleNotifications}
                  className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full relative transition-all ${showNotifs ? 'bg-red-600 text-white scale-110' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:scale-105'}`}
                >
                  <span className="text-base md:text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-600 text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifs && (
                  <div className="fixed md:absolute top-[72px] md:top-14 right-2 md:right-0 w-[calc(100vw-16px)] max-w-[340px] md:w-[500px] md:max-w-none bg-white dark:bg-[#0a0a0a] border dark:border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden z-[120] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 md:p-5 border-b dark:border-white/5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex justify-between items-center">
                      <div>
                        <p className="text-xs md:text-sm font-black dark:text-white">Bildirimler</p>
                        <p className="text-[8px] md:text-[9px] text-gray-500 uppercase tracking-widest">
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
                    
                   <div className="flex flex-col md:flex-row md:divide-x dark:divide-white/5 h-[65vh] md:h-[400px]">
                     <div className="flex-1 overflow-y-auto no-scrollbar h-1/2 md:h-auto">
                        <div className="p-3 md:p-4 bg-gray-50/50 dark:bg-white/[0.02] sticky top-0 backdrop-blur-sm z-10">
                          <p className="text-[8px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                            🔔 Aktiviteler
                          </p>
                        </div>
                        <div className="p-2 md:p-3 space-y-2">
  {activityNotifs.length === 0 ? (
    <div className="text-center py-8 md:py-12">
      <span className="text-2xl md:text-3xl block mb-2 opacity-20">😴</span>
      <p className="text-[8px] md:text-[9px] text-gray-400 italic">Henüz aktivite yok</p>
    </div>
  ) : activityNotifs.map(n => (
    <Link
      key={n.id}
      href={getNotificationLink(n)}
      onClick={() => setShowNotifs(false)}
      className="block p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all group hover:scale-[1.02] bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/20"
    >
      <div className="flex items-start gap-2 md:gap-3">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
          <span className="text-xs">{getNotificationIcon(n)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] md:text-[10px] font-bold leading-relaxed">
            <span className="text-red-600 font-black">@{n.actor_username}</span>
            {' '}
            {getNotificationText(n)}
          </p>
          
          {n.book_title && (
            <p className="text-[8px] md:text-[9px] text-gray-500 mt-1 truncate italic">
              "{n.book_title}
              {n.chapter_title && ` - ${n.chapter_title}`}"
            </p>
          )}
          
          <p className="text-[7px] md:text-[8px] text-gray-400 mt-1">
            {new Date(n.created_at).toLocaleDateString('tr-TR', { 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </Link>
  ))}
</div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/30 dark:bg-white/[0.01] border-t md:border-t-0 dark:border-white/5 h-1/2 md:h-auto">
                        <div className="p-3 md:p-4 bg-blue-50/50 dark:bg-blue-950/10 sticky top-0 backdrop-blur-sm z-10">
                          <p className="text-[8px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
                            👥 Sosyal
                          </p>
                        </div>
                        <div className="p-2 md:p-3 space-y-2">
                          {socialNotifs.length === 0 ? (
                            <div className="text-center py-8 md:py-12">
                              <span className="text-2xl md:text-3xl block mb-2 opacity-20">🫥</span>
                              <p className="text-[8px] md:text-[9px] text-gray-400 italic">Henüz sosyal aktivite yok</p>
                            </div>
                          ) : socialNotifs.map(n => (
                            <Link
                              key={n.id}
                              href={getNotificationLink(n)}
                              onClick={() => setShowNotifs(false)}
                              className="block p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all group hover:scale-[1.02] bg-white dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <div className="flex items-start gap-2 md:gap-3">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0 font-black text-blue-600 text-xs">
                                  {n.actor_username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] md:text-[10px] font-bold leading-relaxed">
                                    <span className="text-blue-600 font-black">@{n.actor_username}</span>
                                    {' '}
                                    {getNotificationText(n)}
                                  </p>
                                  <p className="text-[7px] md:text-[8px] text-gray-400 mt-1">
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

              {/* PROFİL MENÜSÜ */}
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-[10px] md:text-xs uppercase hover:scale-110 transition-transform overflow-hidden shadow-lg border-2 border-transparent hover:border-red-400"
                >
                  {userProfile?.avatar_url && userProfile.avatar_url.includes('http') ? (
                    <img src={userProfile.avatar_url} className="w-full h-full object-cover" alt="Profil" />
                  ) : (
                    user.email[0].toUpperCase()
                  )}
                </button>

                {showProfileMenu && (
                  <div className="absolute top-14 right-0 w-60 bg-white dark:bg-[#0a0a0a] border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[150] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {userProfile?.username || user.email.split('@')[0]}
                      </p>
                      <p className="text-[9px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link 
                        href="/profil" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>👤</span> Profil
                      </Link>

                      <Link 
                        href="/ayarlar" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>⚙️</span> Ayarlar
                      </Link>

                      <Link 
                        href="/kurallar" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>📜</span> Topluluk Kuralları
                      </Link>

                      <Link 
                        href="/kvkk" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>🔒</span> KVKK Metni
                      </Link>

                      <Link 
                        href="/iletisim" 
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold uppercase text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <span>🛟</span> Destek ve İletişim
                      </Link>

                      <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

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
            <Link href="/giris" className="bg-black dark:bg-white text-white dark:text-black px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase hover:scale-105 transition-transform">
              Giriş
            </Link>
          )}
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:scale-110 transition-transform text-base md:text-xl"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {showMobileSearch && (
       <div ref={mobileSearchRef} className="md:hidden fixed top-16 left-0 w-full bg-white dark:bg-black border-b dark:border-white/10 p-3 z-[200] animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                placeholder="Eser veya yazar ara..." 
                className="w-full h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full pl-6 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-red-600/20" 
                autoFocus
              />
              <button 
                onClick={handleSearchTrigger}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors z-10"
              >
                🔍
              </button>
            </div>
            
            {showSearch && (
              <div className="mt-3 bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-[210]">
                {searchResults.books.length === 0 && searchResults.users.length === 0 ? (
                  <div className="p-6 text-center">
                    <span className="text-3xl mb-2 block">📚</span>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Sonuç bulunamadı</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {searchResults.books.length > 0 && (
                      <div className="p-3">
                        <p className="text-[8px] font-black uppercase text-gray-400 mb-2 px-3 tracking-widest">Eserler</p>
                        {searchResults.books.map(b => (
                          <Link 
                            key={b.id} 
                            href={`/kitap/${b.id}`} 
                            onClick={() => { setShowSearch(false); setShowMobileSearch(false); setQuery(''); }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all group"
                          >
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                              {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" alt="" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate group-hover:text-red-600 transition-colors">{b.title}</p>
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
                            onClick={() => { setShowSearch(false); setShowMobileSearch(false); setQuery(''); }}
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
                              <Username
                                username={u.username}
                                isAdmin={u.role === 'admin'}
                                className="text-xs font-bold group-hover:text-red-600 transition-colors"
                              />
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
        </div>
      )}
    </nav>
  );
}