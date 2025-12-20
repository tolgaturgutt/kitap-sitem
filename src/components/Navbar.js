'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ books: [], users: [] });
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchNotifications(session.user.email);
      }
    };
    getUserData();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications(email) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_email', email)
      .order('created_at', { ascending: false })
      .limit(15);
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  }

  async function markAsRead() {
    if (unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_email', user.email);
    setUnreadCount(0);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Çıkış yapıldı.');
    setUser(null);
    router.push('/');
    router.refresh();
  }

  if (!mounted) return null;

  const bookNotifs = notifications.filter(n => n.type === 'vote' || n.type === 'comment');
  const socialNotifs = notifications.filter(n => n.type === 'follow');

  return (
    <nav className="w-full border-b sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-black/90 border-gray-100 dark:border-gray-800 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        <Link href="/" className="text-3xl font-extrabold tracking-tighter shrink-0 italic">
          Yazio<span className="text-red-600">.</span>
        </Link>

        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Eser veya yazar ara..." className="w-full h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full px-12 py-2 text-sm outline-none transition-all" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/kitap-ekle" className="hidden md:flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95">
                <span>+</span> Kitap Yaz
              </Link>

              <div className="relative" ref={notifRef}>
                <button onClick={() => { setShowNotifs(!showNotifs); if(!showNotifs) markAsRead(); }} className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${showNotifs ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-600'}`}>
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-600 border-2 border-white dark:border-black rounded-full animate-pulse"></span>}
                </button>

                {showNotifs && (
                  <div className="absolute top-14 right-[-50px] md:right-0 w-[340px] md:w-[450px] bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2.8rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Canlı Hareketler</span>
                      <button onClick={() => setShowNotifs(false)} className="text-[9px] font-black text-red-600 uppercase">Kapat</button>
                    </div>

                    <div className="flex divide-x dark:divide-white/5 h-[350px]">
                      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                        <p className="text-[8px] font-black uppercase text-red-600 mb-4 tracking-widest text-center">Eserler</p>
                        {bookNotifs.length === 0 ? <p className="text-[9px] text-center text-gray-500 py-10 italic">Yorum yok.</p> : bookNotifs.map(n => (
                          <div key={n.id} className="mb-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 text-[10px]">
                             <span className="text-red-600 font-bold">@{n.actor_username}</span> {n.type === 'vote' ? 'oyladı.' : 'yorum yaptı.'}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-gray-50/30 dark:bg-white/[0.02]">
                        <p className="text-[8px] font-black uppercase text-blue-600 mb-4 tracking-widest text-center">Sosyal</p>
                        {socialNotifs.length === 0 ? <p className="text-[9px] text-center text-gray-500 py-10 italic">Takipçi yok.</p> : socialNotifs.map(n => (
                          <div key={n.id} className="mb-3 p-3 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/5 text-[10px]">
                             <span className="text-blue-600 font-bold">@{n.actor_username}</span> seni takip etti.
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/profil" className="w-11 h-11 rounded-full overflow-hidden border-2 border-transparent hover:border-red-600 transition-all bg-gray-100 dark:bg-white/5 flex items-center justify-center shadow-sm">
                {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" /> : <span className="font-black text-xs">{user.email[0].toUpperCase()}</span>}
              </Link>

              <button onClick={handleLogout} className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors">Çıkış</button>
            </>
          ) : (
            <Link href="/giris" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest">Giriş Yap</Link>
          )}

          <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1"></div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:scale-110 transition-transform">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}