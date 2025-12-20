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
  const [activeTab, setActiveTab] = useState('eserler');
  const [modalType, setModalType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (p) {
        setAuthor(p);
        const { data: b } = await supabase.from('books').select('*').eq('user_email', p.email || p.id);
        setBooks(b || []);
        const { data: f } = await supabase.from('author_follows').select('*').eq('followed_username', username);
        const { data: fing } = await supabase.from('author_follows').select('*').eq('follower_username', username);
        setFollowers(f || []);
        setFollowing(fing || []);
      }
      setLoading(false);
    }
    load();
  }, [username]);

  if (loading) return <div className="py-40 text-center font-black opacity-10 text-4xl italic animate-pulse">YAZIO</div>;
  if (!author) return <div className="py-40 text-center font-black">Yazar bulunamadı.</div>;

  return (
    <div className="min-h-screen py-10 md:py-20 px-4 md:px-6 bg-[#fafafa] dark:bg-black transition-colors">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-10 bg-white dark:bg-white/5 p-10 rounded-[4rem] border dark:border-white/5">
          <div className="w-32 h-32 bg-gray-100 dark:bg-white/10 rounded-[2.5rem] overflow-hidden flex items-center justify-center font-black text-3xl">
            {author.avatar_url ? <img src={author.avatar_url} /> : author.username[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black uppercase">{author.full_name || author.username}</h1>
            <p className="text-xs text-gray-400 mb-6 uppercase">@{author.username}</p>
            <div className="flex justify-center md:justify-start gap-12 border-t dark:border-white/5 pt-8">
              <div className="text-center"><p className="text-2xl font-black">{books.length}</p><p className="text-[9px] uppercase opacity-40">Eser</p></div>
              <button onClick={() => setModalType('followers')} className="text-center"><p className="text-2xl font-black">{followers.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takipçi</p></button>
              <button onClick={() => setModalType('following')} className="text-center"><p className="text-2xl font-black">{following.length}</p><p className="text-[9px] uppercase opacity-40 underline decoration-red-600/20">Takip</p></button>
            </div>
          </div>
        </header>

        <div className="flex gap-8 mb-8 border-b dark:border-white/5 pb-4">
          {['eserler', 'hakkında'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === t ? 'text-red-600' : 'text-gray-400'}`}>{t}</button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'hakkında' ? (
            <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border dark:border-white/5 italic text-gray-500">{author.bio || "Hakkında bilgi yok."}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {books.map(k => (
                <Link key={k.id} href={`/kitap/${k.id}`} className="group">
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border dark:border-white/5 mb-3">
                    {k.cover_url ? <img src={k.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 dark:bg-white/10" />}
                  </div>
                  <h3 className="text-[10px] font-black text-center uppercase truncate">{k.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Modal Yapısı Profil Sayfasıyla Aynı */}
    </div>
  );
}