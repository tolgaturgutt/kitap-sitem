'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function YazarProfili() {
  const { username } = useParams();
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'followers' veya 'following'

  useEffect(() => {
    async function getAuthorData() {
      // 1. Yazarı bul
      const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
      
      if (profile) {
        setAuthor(profile);
        
        // 2. Kitaplarını getir
        const { data: b } = await supabase.from('books').select('*').eq('user_email', profile.email || profile.id).order('created_at', { ascending: false });
        setBooks(b || []);

        // 3. Takipçilerini getir
        const { data: f } = await supabase.from('author_follows').select('*').eq('followed_username', username);
        setFollowers(f || []);

        // 4. Takip ettiklerini getir
        const { data: fing } = await supabase.from('author_follows').select('*').eq('follower_username', username);
        setFollowing(fing || []);
      }
      setLoading(false);
    }
    getAuthorData();
  }, [username]);

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-4xl italic animate-pulse uppercase">YAZIO</div>;
  if (!author) return <div className="py-40 text-center font-black uppercase tracking-widest text-gray-400 italic">Yazar bulunamadı kral...</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <div className="max-w-6xl mx-auto">
        
        {/* YAZAR HEADER */}
        <header className="mb-12 flex flex-col md:flex-row items-center gap-6 md:gap-10 bg-white dark:bg-white/5 p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border dark:border-white/5 shadow-sm">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden shrink-0 flex items-center justify-center border dark:border-white/10 shadow-inner">
            {author.avatar_url ? (
              <img src={author.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl md:text-5xl font-black text-gray-300 dark:text-gray-700">{author.username[0].toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-2xl md:text-4xl font-black dark:text-white tracking-tighter uppercase leading-tight">
              {author.full_name || author.username}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 italic mb-6 uppercase tracking-widest">@{author.username}</p>
            
            {/* İSTATİSTİKLER - Tıklanabilir yapıldı */}
            <div className="grid grid-cols-2 md:flex justify-center md:justify-start gap-y-6 gap-x-4 md:gap-12 border-t dark:border-white/5 pt-8 mt-2">
              <div className="text-center md:text-left">
                <p className="text-xl md:text-2xl font-black dark:text-white">{books.length}</p>
                <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest">Eser</p>
              </div>
              
              <button onClick={() => setModalType('followers')} className="text-center md:text-left hover:opacity-70 transition-all outline-none">
                <p className="text-xl md:text-2xl font-black dark:text-white">{followers.length}</p>
                <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest underline decoration-red-600/20 underline-offset-4">Takipçi</p>
              </button>
              
              <button onClick={() => setModalType('following')} className="text-center md:text-left hover:opacity-70 transition-all outline-none">
                <p className="text-xl md:text-2xl font-black dark:text-white">{following.length}</p>
                <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest underline decoration-red-600/20 underline-offset-4">Takip</p>
              </button>
            </div>
          </div>
        </header>

        {/* ESERLER GRİDİ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-10">
          {books.length === 0 ? (
            <div className="col-span-full py-20 text-center text-[10px] font-black uppercase text-gray-400 italic tracking-[0.3em]">
              Henüz bir eser yayınlamamış...
            </div>
          ) : (
            books.map(k => (
              <div key={k.id} className="group flex flex-col">
                <Link href={`/kitap/${k.id}`} className="aspect-[2/3] mb-4 overflow-hidden rounded-[1.8rem] md:rounded-[2.8rem] border dark:border-white/5 shadow-md hover:-translate-y-1 transition-all duration-500">
                  {k.cover_url ? (
                    <img src={k.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black opacity-20 text-[8px]">KAPAK YOK</div>
                  )}
                </Link>
                <h3 className="font-black text-[9px] md:text-[10px] text-center dark:text-white truncate uppercase italic px-2 tracking-tight">{k.title}</h3>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TAKİPÇİ/TAKİP MODAL'I - 404 HATASI DÜZELTİLDİ */}
      {modalType && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] border dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">
                {modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-[10px] font-black text-red-600 uppercase tracking-widest">Kapat</button>
            </div>
            <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {(modalType === 'followers' ? followers : following).length === 0 ? (
                <p className="text-center py-10 text-[10px] text-gray-500 italic uppercase tracking-widest">Burada kimse yok kral...</p>
              ) : (
                (modalType === 'followers' ? followers : following).map((person, i) => {
                  const targetUsername = modalType === 'followers' ? person.follower_username : person.followed_username;
                  return (
                    <Link 
                      key={i} 
                      href={`/yazar/${targetUsername}`} // BURASI ARTIK DOĞRU YOLDA (404 FIX)
                      onClick={() => setModalType(null)}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border dark:border-white/5 hover:border-red-600 transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-red-600/10 flex items-center justify-center font-black text-red-600 text-[10px]">
                        {targetUsername[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-bold dark:text-white tracking-tight">@{targetUsername}</span>
                    </Link>
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