'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import Username from '@/components/Username';
import Image from 'next/image';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ books: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);

  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [adminEmails, setAdminEmails] = useState([]);

  if (pathname === '/sifre-yenile') {
    return null;
  }

 useEffect(() => {
    setMounted(true);
    const loadSession = async () => {
      // YENİ: Admin listesini çek (Giriş yapmasa bile herkes adminleri doğru görsün)
      const fetchAdmins = async () => {
        const { data } = await supabase.from('announcement_admins').select('user_email');
        if (data) setAdminEmails(data.map(a => a.user_email));
      };
      fetchAdmins();

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

        if (session.user.user_metadata?.avatar_url) {
          setUserProfile({
            avatar_url: session.user.user_metadata.avatar_url,
            username: session.user.user_metadata.username || session.user.email.split('@')[0]
          });
        }

        const fetchProfile = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, username,role')
            .eq('id', session.user.id)
            .single();

          if (profile) setUserProfile(profile);
        };

        const fetchNotifs = async () => {
          await loadNotifications(session.user.email);
        };

        // --- YENİ: Ortak Yazar Davetlerini Çek ---
        const fetchInvites = async () => {
          const { data } = await supabase
            .from('books')
            .select('id, title, username')
            .eq('co_author_id', session.user.id)
            .eq('co_author_status', 'pending');
          
          if (data) setInvites(data);
        };

        fetchProfile();
        fetchNotifs();
        fetchInvites(); 
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
    // 🔥 SON 7 GÜN AYARI
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: n } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_email', email)
      .gte('created_at', sevenDaysAgo.toISOString()) // Sadece son 7 gün
      .order('created_at', { ascending: false }); // ❌ .limit(50) satırını sildim, artık sınır yok!

    if (n && n.length > 0) {
      const chapterIds = n
        .filter(notif => notif.chapter_id && !notif.chapter_title)
        .map(notif => notif.chapter_id);

      if (chapterIds.length > 0) {
        const uniqueIds = [...new Set(chapterIds)];
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, title')
          .in('id', uniqueIds);

        if (chapters) {
          n.forEach(notif => {
            const foundChapter = chapters.find(c => c.id === notif.chapter_id);
            if (foundChapter) notif.chapter_title = foundChapter.title;
          });
        }
      }

      const panoIds = n
        .filter(notif => notif.pano_id && !notif.pano_title)
        .map(notif => notif.pano_id);

      if (panoIds.length > 0) {
        const uniquePanoIds = [...new Set(panoIds)];
        const { data: panos } = await supabase
          .from('panolar')
          .select('id, title')
          .in('id', uniquePanoIds);

        if (panos) {
          n.forEach(notif => {
            const foundPano = panos.find(p => p.id === notif.pano_id);
            if (foundPano) notif.pano_title = foundPano.title;
          });
        }
      }
    }
    setNotifications(n || []);
  }

 useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        
        // 1. KİTAPLARI ÇEK (Ortak yazar bilgileriyle beraber)
        let { data: b } = await supabase
          .from('books')
          .select('*, chapters(id), profiles:user_id(username, email, role), co_author:profiles!co_author_id(username, email, role)')
          .ilike('title', `%${query}%`)
          .limit(10);

        if (b) {
          b = b.filter(kitap => kitap.chapters && kitap.chapters.length > 0).slice(0, 5);
          
          // VERİYİ İŞLE (Adminleri ve Ortak Yazarları formatla)
          b = b.map(book => {
            const ownerEmail = book.profiles?.email || book.user_email;
            const hasAcceptedCoAuthor = book.co_author_id && book.co_author_status === 'accepted' && book.co_author;
            const coAuthorEmail = book.co_author?.email;

            return {
              ...book,
              username: book.profiles?.username || book.username,
              author_role: book.profiles?.role,
              is_admin: adminEmails.includes(ownerEmail), // Gerçek admin kontrolü
              co_author_name: hasAcceptedCoAuthor ? book.co_author.username : null,
              co_author_role: hasAcceptedCoAuthor ? book.co_author.role : null,
              co_author_is_admin: coAuthorEmail ? adminEmails.includes(coAuthorEmail) : false
            };
          });
        }

        // 2. KULLANICILARI ÇEK
        const { data: u } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(5);

        // Kullanıcılara da gerçek admin kontrolü yap
        const mappedUsers = u?.map(user => ({
          ...user,
          is_admin: adminEmails.includes(user.email)
        })) || [];

        setSearchResults({ books: b || [], users: mappedUsers });
        setShowSearch(true);
      } else setShowSearch(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, adminEmails]);
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
  // 🔥 REALTIME BİLDİRİM DİNLEYİCİSİ (Bunu eklemen yeterli)
  // 🔥 REALTIME BİLDİRİM DİNLEYİCİSİ (Çarpı Butonlu & Şık Tasarım)
  useEffect(() => {
    if (!user) return;

    // Kanalı oluşturuyoruz
    const channel = supabase
      .channel('bildirim-dinleyici')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Yeni veri eklendiğinde
          schema: 'public',
          table: 'notifications',
          filter: `recipient_email=eq.${user.email}` // Sadece BANA gelenleri dinle
        },
        async (payload) => {
          console.log("🔔 Anlık bildirim geldi:", payload);

          // Listeyi yenile ki zil ikonundaki sayı artsın
          await loadNotifications(user.email);

          // 👇 BURASI: Çarpı butonlu özel bildirim kutusu
          toast((t) => (
            <div className="flex items-center justify-between w-full gap-4 min-w-[250px]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <span className="text-sm font-bold">Yeni bir bildiriminiz var!</span>
              </div>
              {/* ÇARPI BUTONU */}
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xs font-black border border-white/10"
              >
                ✕
              </button>
            </div>
          ), {
            // Kutunun dış görünüş ayarları (Karanlık tema)
            style: {
              background: '#1a1a1a', // Koyu gri arka plan
              color: '#fff',         // Beyaz yazı
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            duration: 5000, // 5 saniye sonra kendiliğinden gider
            position: 'bottom-right', // Sağ altta çıksın
          });
        }
      )
      .subscribe();

    // Temizlik: Sayfadan çıkınca dinlemeyi bırak
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  function handleSearchTrigger() {
    if (!query.trim()) return;
    setShowSearch(false);
    setShowMobileSearch(false);
    router.push(`/arama?q=${encodeURIComponent(query)}`);
  }
  // 🗑️ BİLDİRİM SİLME FONKSİYONU
  async function deleteNotification(e, id) {
    e.preventDefault(); // Linke tıklamayı engelle
    e.stopPropagation();

    // Listeden hemen sil (Hız hissi için)
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Silinemedi');
      loadNotifications(user.email); // Hata olursa geri yükle
    } else {
      toast.success('Bildirim silindi');
    }
  }

  if (!mounted) return null;

  const socialNotifs = notifications.filter(n => n.type === 'follow' || (n.type === 'reply' && n.pano_id));
  const activityNotifs = notifications.filter(n =>
    n.type === 'vote' ||
    n.type === 'chapter_vote' ||
    n.type === 'comment' ||
    n.type === 'new_chapter' ||
    n.type === 'pano_vote' ||
    n.type === 'pano_comment' ||
    (n.type === 'reply' && !n.pano_id)
  );
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalAlerts = unreadCount + invites.length;
  // --- YENİ: Daveti Yanıtlama Fonksiyonu ---
  async function respondToInvite(bookId, accept) {
    // Kabul ederse accepted yap, reddederse co_author sütunlarını tamamen temizle
    const updateData = accept 
      ? { co_author_status: 'accepted' } 
      : { co_author_id: null, co_author_status: null };

    const { error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', bookId);

    if (error) {
      toast.error('İşlem başarısız oldu.');
    } else {
      toast.success(accept ? '✅ Ortaklık davetini kabul ettin!' : '❌ Daveti reddettin.');
      // Daveti listeden sil ki ekrandan kaybolsun
      setInvites(prev => prev.filter(inv => inv.id !== bookId));
    }
  }





  // Navbar.js içindeki getNotificationLink fonksiyonunu BU HALE getir:

  function getNotificationLink(n) {
    // 🔍 DEBUG: Bildirimi console'a yazdır
    console.log('📢 Bildirim verisi:', {
      type: n.type,
      paragraph_id: n.paragraph_id,
      paragraph_id_type: typeof n.paragraph_id,
      comment_id: n.comment_id,
      book_id: n.book_id,
      chapter_id: n.chapter_id
    });

    switch (n.type) {
      case 'vote':
        return n.book_id ? `/kitap/${n.book_id}` : '#';

      case 'chapter_vote':
        return n.book_id && n.chapter_id ? `/kitap/${n.book_id}/bolum/${n.chapter_id}` : '#';

      case 'comment':
        if (n.chapter_id && n.book_id) {
          // 🔥 PARAGRAF YORUMU MU KONTROL ET - null string de kontrol et
          if (n.paragraph_id !== null && n.paragraph_id !== undefined && n.paragraph_id !== 'null') {
            console.log('✅ Paragraf yorumuna gidiliyor:', n.paragraph_id);
            // Paragraf yorumu - paragrafa git ve aç
            return `/kitap/${n.book_id}/bolum/${n.chapter_id}?openPara=${n.paragraph_id}&commentId=${n.comment_id || ''}`;
          } else {
            console.log('✅ Bölüm yorumuna gidiliyor');
            // Bölüm yorumu - bölüm yorumlarına git
            return `/kitap/${n.book_id}/bolum/${n.chapter_id}?scrollTo=chapter-comments&commentId=${n.comment_id || ''}`;
          }
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
        if (n.pano_id) {
          return `/pano/${n.pano_id}`;
        } else if (n.chapter_id && n.book_id) {
          // 🔥 PARAGRAF YORUMU YANITI MI YOKSA BÖLÜM YORUMU YANITI MI?
          if (n.paragraph_id !== null && n.paragraph_id !== undefined && n.paragraph_id !== 'null') {
            console.log('✅ Paragraf yorumu yanıtına gidiliyor:', n.paragraph_id);
            // Paragraf yorumu yanıtı - paragrafa git ve aç
            return `/kitap/${n.book_id}/bolum/${n.chapter_id}?openPara=${n.paragraph_id}&commentId=${n.comment_id || ''}`;
          } else {
            console.log('✅ Bölüm yorumu yanıtına gidiliyor');
            // Bölüm yorumu yanıtı - bölüm yorumlarına git
            return `/kitap/${n.book_id}/bolum/${n.chapter_id}?scrollTo=chapter-comments&commentId=${n.comment_id || ''}`;
          }
        } else if (n.book_id) {
          return `/kitap/${n.book_id}`;
        }
        return '#';

      case 'follow':
        return n.actor_username ? `/yazar/${n.actor_username}` : '#';

      default:
        return '#';
    }
  }
  function getNotificationText(n) {
    switch (n.type) {
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
    switch (n.type) {
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
                          <div className="relative w-8 h-12 shrink-0 rounded overflow-hidden shadow-sm border dark:border-white/10">
                            <Image
                              src={b.cover_url}
                              alt={b.title}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate group-hover:text-red-600 transition-colors">{b.title}</p>
                            <div className="flex flex-col mt-0.5 gap-0.5 text-[9px] text-gray-400 uppercase tracking-widest">
                              <Username
                                username={b.username}
                                isAdmin={b.is_admin}
                                isPremium={b.author_role === 'premium'}
                              />
                              {b.co_author_name && (
                                <Username
                                  username={b.co_author_name}
                                  isAdmin={b.co_author_is_admin}
                                  isPremium={b.co_author_role === 'premium'}
                                />
                              )}
                            </div>
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
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-red-600/10 flex items-center justify-center font-black text-red-600 text-sm shrink-0">
                            {u.avatar_url && u.avatar_url.includes('http') ? (
                              <Image
                                src={u.avatar_url}
                                alt={u.username}
                                fill
                                unoptimized
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              u.username[0].toUpperCase()
                            )}
                          </div>
                         <div className="flex-1">
                                <Username
                                  username={u.username}
                                  isAdmin={u.is_admin}
                                  isPremium={u.role === 'premium'}
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
                 {totalAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-600 text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {totalAlerts}
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
                    {/* --- YENİ: BEKLEYEN DAVETLER VİTRİNİ --- */}
                    {invites.length > 0 && (
                      <div className="p-3 md:p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-900/50">
                        <p className="text-[9px] font-black uppercase text-yellow-600 tracking-[0.2em] mb-2.5 flex items-center gap-2">
                          🤝 Bekleyen Ortaklık Davetleri
                        </p>
                        <div className="space-y-2">
                          {invites.map(inv => (
                            <div key={inv.id} className="bg-white dark:bg-black/50 p-3 rounded-xl border border-yellow-200 dark:border-yellow-700/50 shadow-sm">
                              <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
                                <span className="font-black text-red-600">@{inv.username}</span> seni <span className="font-bold italic">"{inv.title}"</span> kitabına ortak yazar olarak davet ediyor.
                              </p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => respondToInvite(inv.id, true)} 
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-colors"
                                >
                                  Kabul Et
                                </button>
                                <button 
                                  onClick={() => respondToInvite(inv.id, false)} 
                                  className="flex-1 bg-gray-200 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-colors"
                                >
                                  Reddet
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    <div className="flex flex-col md:flex-row md:divide-x dark:divide-white/5 h-[65vh] md:h-[400px]">

                      {/* SOL TARA (AKTİVİTELER) */}
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
                              <p className="text-[8px] md:text-[9px] text-gray-400 italic">Son 7 günde aktivite yok</p>
                            </div>
                          ) : activityNotifs.map(n => (
                            <Link
                              key={n.id}
                              href={getNotificationLink(n)}
                              onClick={() => setShowNotifs(false)}
                              className="relative block p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all group hover:scale-[1.02] bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/20 pr-8"
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
                                    {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              {/* 🗑️ SİLME BUTONU */}
                              <button
                                onClick={(e) => deleteNotification(e, n.id)}
                                // 👇 DEĞİŞİKLİKLER: 
                                // 1. 'top-3 right-3' yerine 'top-2 right-2' (Yukarı ve sağa çektik)
                                // 2. 'w-7 h-7' yerine 'w-6 h-6' (Mobilde küçülttük, kibar oldu)
                                className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 z-20 shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100"
                                title="Bildirimi Sil"
                              >
                                {/* İkon boyutunu da mobilde 3 (12px), masaüstünde 4 (16px) yaptık */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* SAĞ TARAF (SOSYAL) */}
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
                              <p className="text-[8px] md:text-[9px] text-gray-400 italic">Son 7 günde sosyal aktivite yok</p>
                            </div>
                          ) : socialNotifs.map(n => (
                            <Link
                              key={n.id}
                              href={getNotificationLink(n)}
                              onClick={() => setShowNotifs(false)}
                              className="relative block p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all group hover:scale-[1.02] bg-white dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/20 pr-8"
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
                                  {n.pano_title && (
                                    <p className="text-[8px] md:text-[9px] text-gray-500 mt-1 truncate italic">
                                      "{n.pano_title}"
                                    </p>
                                  )}
                                  <p className="text-[7px] md:text-[8px] text-gray-400 mt-1">
                                    {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              {/* 🗑️ SİLME BUTONU */}
                              <button
                                onClick={(e) => deleteNotification(e, n.id)}
                                // 👇 DEĞİŞİKLİKLER: 
                                // 1. 'top-3 right-3' yerine 'top-2 right-2' (Yukarı ve sağa çektik)
                                // 2. 'w-7 h-7' yerine 'w-6 h-6' (Mobilde küçülttük, kibar oldu)
                                className="absolute top-2 right-2 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 z-20 shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100"
                                title="Bildirimi Sil"
                              >
                                {/* İkon boyutunu da mobilde 3 (12px), masaüstünde 4 (16px) yaptık */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
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
                    <Image
                      src={userProfile.avatar_url}
                      alt="Profil"
                      width={44}
                      height={44}
                      unoptimized
                      className="w-full h-full object-cover"
                      priority
                    />
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
                            <div className="relative w-8 h-12 shrink-0 rounded overflow-hidden shadow-sm border dark:border-white/10">
                              <Image
                                src={b.cover_url}
                                alt={b.title}
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="32px"
                              />
                            </div>
                           <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate group-hover:text-red-600 transition-colors">{b.title}</p>
                                <div className="flex flex-col mt-0.5 gap-0.5 text-[9px] text-gray-400 uppercase tracking-widest">
                                  <Username
                                    username={b.username}
                                    isAdmin={b.is_admin}
                                    isPremium={b.author_role === 'premium'}
                                  />
                                  {b.co_author_name && (
                                    <Username
                                      username={b.co_author_name}
                                      isAdmin={b.co_author_is_admin}
                                      isPremium={b.co_author_role === 'premium'}
                                    />
                                  )}
                                </div>
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
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-red-600/10 flex items-center justify-center font-black text-red-600 text-sm shrink-0">
                              {u.avatar_url && u.avatar_url.includes('http') ? (
                                <Image
                                  src={u.avatar_url}
                                  alt={u.username}
                                  fill
                                  unoptimized
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                u.username[0].toUpperCase()
                              )}
                            </div>
                            <div className="flex-1">
                              <Username
                                username={u.username}
                                isAdmin={u.is_admin}
                                isPremium={u.role === 'premium'}
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