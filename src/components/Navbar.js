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
  const [searchResults, setSearchResults] = useState({ books: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: n } = await supabase.from('notifications').select('*').eq('recipient_email', session.user.email).order('created_at', { ascending: false }).limit(20);
        setNotifications(n || []);
      }
    };
    loadSession();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        const { data: b } = await supabase.from('books').select('*').ilike('title', `%${query}%`).limit(5);
        const { data: u } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(5);
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

  if (!mounted) return null;

  // BİLDİRİMLERİ İKİYE AYIRMA MANTIĞI
  const bookNotifs = notifications.filter(n => n.type === 'vote' || n.type === 'comment');
  const socialNotifs = notifications.filter(n => n.type === 'follow');

  return (
    <nav className="w-full border-b sticky top-0 z-[100] backdrop-blur-md bg-white/80 dark:bg-black/90 border-gray-100 dark:border-gray-800 transition-all h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8">
        <Link href="/" className="text-3xl font-extrabold tracking-tighter shrink-0 italic">
          Yazio<span className="text-red-600">.</span>
        </Link>

        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Eser veya yazar ara..." className="w-full h-11 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-full px-12 text-sm outline-none transition-all" />
          {showSearch && (
            <div className="absolute top-14 left-0 w-full bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2rem] shadow-2xl p-4 z-[110]">
              {searchResults.books.map(b => (
                <Link key={b.id} href={`/kitap/${b.id}`} onClick={() => setShowSearch(false)} className="block p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold uppercase italic">{b.title}</Link>
              ))}
              {searchResults.users.map(u => (
                <Link key={u.id} href={`/yazar/${u.username}`} onClick={() => setShowSearch(false)} className="block p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-bold">@{u.username}</Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifs(!showNotifs)} className={`w-11 h-11 flex items-center justify-center rounded-full ${showNotifs ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                  <span className="text-xl">🔔</span>
                </button>
                {showNotifs && (
                  <div className="absolute top-14 right-[-80px] md:right-0 w-[280px] md:w-[450px] bg-white dark:bg-[#0f0f0f] border dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden z-[120]">
                    <div className="p-4 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5 font-black text-[10px] uppercase opacity-40 flex justify-between">
                      <span>Bildirimler</span>
                      <button onClick={() => setShowNotifs(false)} className="text-red-600">Kapat</button>
                    </div>
                    
                    {/* İKİYE AYRILAN PANEL */}
                    <div className="flex divide-x dark:divide-white/5 h-[350px]">
                      {/* SOL SÜTUN: ESERLER */}
                      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                        <p className="text-[8px] font-black uppercase text-red-600 mb-3 tracking-widest text-center">Eserler</p>
                        {bookNotifs.length === 0 ? <p className="text-[9px] text-center text-gray-400 py-10 italic">Hareket yok.</p> : bookNotifs.map(n => (
                          <div key={n.id} className="mb-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 text-[9px] font-bold">
                             <span className="text-red-600">@{n.actor_username}</span> {n.type === 'vote' ? 'eserini oyladı.' : 'yorum yaptı.'}
                          </div>
                        ))}
                      </div>

                      {/* SAĞ SÜTUN: SOSYAL */}
                      <div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-gray-50/30 dark:bg-white/[0.02]">
                        <p className="text-[8px] font-black uppercase text-blue-600 mb-3 tracking-widest text-center">Sosyal</p>
                        {socialNotifs.length === 0 ? <p className="text-[9px] text-center text-gray-400 py-10 italic">Takipçi yok.</p> : socialNotifs.map(n => (
                          <div key={n.id} className="mb-2 p-2.5 rounded-xl bg-white dark:bg-white/5 border dark:border-white/5 text-[9px] font-bold">
                             <span className="text-blue-600">@{n.actor_username}</span> seni takip etti.
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link href="/profil" className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center text-white font-black text-xs uppercase">{user.email[0]}</Link>
              <button onClick={handleLogout} className="hidden md:block text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors">Çıkış</button>
            </>
          ) : (
            <Link href="/giris" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase">Giriş Yap</Link>
          )}
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}