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
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim() !== '') {
      router.push(`/arama?q=${query.trim()}`);
    }
  };

  async function fetchNotifications(email) {
    const { data } = await supabase.from('notifications').select('*').eq('recipient_email', email).order('created_at', { ascending: false }).limit(15);
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  }

  async function markAsRead() {
    if (unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_email', user.email);
    setUnreadCount(0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Çıkış yapıldı.');
    setUser(null);
    router.push('/');
    router.refresh();
  }

  if (!mounted) return null;

  return (
    <nav className="w-full border-b sticky top-0 z-[100] backdrop-blur-md bg-white/80 dark:bg-black/90 border-gray-100 dark:border-gray-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4 md:gap-8">
        <Link href="/" className="text-2xl md:text-3xl font-extrabold tracking-tighter shrink-0 italic">
          Yazio<span className="text-red-600">.</span>
        </Link>

        <div className="flex-1 max-w-md relative">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleSearch} placeholder="Eser veya yazar ara..." className="w-full h-10 md:h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full px-10 md:px-12 text-xs md:text-sm outline-none" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              <Link href="/kitap-ekle" className="hidden sm:flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20">
                + YAZ
              </Link>

              <div className="relative" ref={notifRef}>
                <button onClick={() => { setShowNotifs(!showNotifs); if(!showNotifs) markAsRead(); }} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showNotifs ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-600 border-2 border-white dark:border-black rounded-full"></span>}
                </button>
                {showNotifs && (
                  <div className="absolute top-14 right-[-80px] md:right-0 w-[280px] md:w-[400px] bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden z-[110]">
                    <div className="p-5 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Bildirimler</span>
                      <button onClick={() => setShowNotifs(false)} className="text-[9px] font-black text-red-600">KAPAT</button>
                    </div>
                    <div className="h-[300px] overflow-y-auto p-4 no-scrollbar italic text-[10px] text-gray-500 text-center py-20">Gelişme yok kral.</div>
                  </div>
                )}
              </div>

              <Link href="/profil" className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-red-600 transition-all bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" /> : <span className="text-lg">👤</span>}
              </Link>
            </>
          ) : (
            <Link href="/giris" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest">Giriş Yap</Link>
          )}

          <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1"></div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}