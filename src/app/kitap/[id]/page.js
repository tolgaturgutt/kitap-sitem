'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import YorumAlani from '@/components/YorumAlani';

export default function KitapDetay({ params }) {
  const { id } = use(params); 
  
  const [data, setData] = useState({ 
    book: null, 
    authorProfile: null, 
    chapters: [], 
    stats: { views: 0, votes: 0, follows: 0 }, 
    isFollowing: false, 
    hasVoted: false, 
    user: null 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: book } = await supabase.from('books').select('*').eq('id', id).single();
      
      const { data: chapters } = await supabase.from('chapters')
        .select('*')
        .eq('book_id', id)
        .order('order_no', { ascending: true });
      
      let authorProfile = null;
      if (book) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('username', book.username).single();
        authorProfile = profile;
      }
      
      const totalViews = chapters?.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0) || 0;
      
      const { count: votes } = await supabase.from('book_votes').select('*', { count: 'exact', head: true }).eq('book_id', id);
      const { count: follows } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('book_id', id);
      
      let following = false, voted = false;
      if (user) {
        const { data: f } = await supabase.from('follows').select('*').eq('book_id', id).eq('user_email', user.email).single();
        following = !!f;
        const { data: v } = await supabase.from('book_votes').select('*').eq('book_id', id).eq('user_email', user.email).single();
        voted = !!v;
      }

      setData({ 
        book, 
        authorProfile, 
        chapters: chapters || [], 
        stats: { views: totalViews, votes: votes || 0, follows: follows || 0 }, 
        isFollowing: following, 
        hasVoted: voted, 
        user 
      });
      setLoading(false);
    }
    fetchAll();
  }, [id]);

  async function handleBookVote() {
     if (!data.user) return toast.error("Giriş yapmalısın.");
     
     if (data.hasVoted) {
       await supabase.from('book_votes').delete().eq('book_id', id).eq('user_email', data.user.email);
       setData(prev => ({ ...prev, hasVoted: false, stats: { ...prev.stats, votes: prev.stats.votes - 1 } }));
       toast.success("Oy geri alındı");
     } else {
       await supabase.from('book_votes').insert([{ book_id: id, user_email: data.user.email }]);
       setData(prev => ({ ...prev, hasVoted: true, stats: { ...prev.stats, votes: prev.stats.votes + 1 } }));
       toast.success("Oy verildi");
       
       // BİLDİRİM OLUŞTUR (kendine oy vermemişse)
       if (data.book.user_email !== data.user.email) {
         const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).single();
         const username = profile?.username || data.user.user_metadata?.username || data.user.email.split('@')[0];
         
         await supabase.from('notifications').insert({
           recipient_email: data.book.user_email,
           actor_username: username,
           type: 'vote',
           book_title: data.book.title,
           book_id: parseInt(id),
           chapter_id: null,
           is_read: false,
           created_at: new Date()
         });
       }
     }
  }

  async function handleLibrary() {
     if (!data.user) return toast.error("Giriş yapmalısın.");
     
     if (data.isFollowing) {
       await supabase.from('follows').delete().eq('book_id', id).eq('user_email', data.user.email);
       setData(prev => ({ ...prev, isFollowing: false, stats: { ...prev.stats, follows: prev.stats.follows - 1 } }));
       toast.success("Kütüphaneden çıkarıldı");
     } else {
       await supabase.from('follows').insert([{ book_id: id, user_email: data.user.email }]);
       setData(prev => ({ ...prev, isFollowing: true, stats: { ...prev.stats, follows: prev.stats.follows + 1 } }));
       toast.success("Kütüphaneye eklendi");
     }
  }

  if (loading) return <div className="py-40 text-center font-black opacity-10 italic text-5xl animate-pulse uppercase">YAZIO</div>;
  if (!data.book) return <div className="py-20 text-center font-black">ESER BULUNAMADI</div>;

  const isAuthor = data.user && data.book.user_email === data.user.email;

  return (
    <div className="min-h-screen py-16 px-6 bg-[#fafafa] dark:bg-[#080808] transition-colors duration-1000">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 mb-24 items-start">
          <div className="w-full md:w-80 aspect-[2/3] shrink-0 rounded-[2.5rem] overflow-hidden shadow-2xl border dark:border-white/5 bg-white dark:bg-black/20">
            {data.book.cover_url ? <img src={data.book.cover_url} className="w-full h-full object-cover" alt={data.book.title} /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-300 italic text-sm">Kapak Yok</div>}
          </div>
          
          <div className="flex-1 pt-6">
            <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-1.5 rounded-full tracking-[0.2em]">{data.book.category}</span>
            <h1 className="text-5xl md:text-6xl font-black my-6 tracking-tighter dark:text-white leading-tight uppercase">{data.book.title}</h1>
            
            <Link href={`/yazar/${data.book.username}`} className="flex items-center gap-4 mb-10 group w-fit">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all flex items-center justify-center font-black text-xs uppercase">
                {data.authorProfile?.avatar_url ? <img src={data.authorProfile.avatar_url} className="w-full h-full object-cover" alt="" /> : data.book.username[0]}
              </div>
              <div>
                <p className="text-sm font-black dark:text-white group-hover:text-red-600 transition-colors">@{data.book.username}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Eser Sahibi</p>
              </div>
            </Link>
            
            <div className="flex gap-12 mb-10 border-y dark:border-white/5 py-8">
              <div className="text-center">
                 <p className="text-2xl font-black dark:text-white">{data.stats.views}</p>
                 <p className="text-[9px] uppercase text-gray-400 font-black tracking-widest">Okunma</p>
              </div>
              <div className="text-center"><p className="text-2xl font-black dark:text-white">{data.stats.votes}</p><p className="text-[9px] uppercase text-gray-400 font-black tracking-widest">Oy</p></div>
              <div className="text-center"><p className="text-2xl font-black dark:text-white">{data.stats.follows}</p><p className="text-[9px] uppercase text-gray-400 font-black tracking-widest">Kitaplık</p></div>
            </div>

            <p className="text-xl text-gray-600 dark:text-gray-400 font-serif italic mb-12 leading-relaxed">{data.book.summary}</p>
            
            <div className="flex flex-wrap gap-4">
               <button onClick={handleBookVote} className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${data.hasVoted ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-black border dark:border-white/5 dark:text-white'}`}>{data.hasVoted ? 'OYLANDI ⭐' : 'OY VER'}</button>
               <button onClick={handleLibrary} className={`px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${data.isFollowing ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 'bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white'}`}>{data.isFollowing ? 'KÜTÜPHANEDE 📚' : 'KÜTÜPHANEYE EKLE'}</button>
               {isAuthor && (
                 <>
                   <Link href={`/kitap/${id}/bolum-ekle`} className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20">BÖLÜM EKLE</Link>
                   <Link href={`/kitap-duzenle/${id}`} className="px-10 py-4 bg-gray-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest">DÜZENLE</Link>
                 </>
               )}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mb-32">
          <h2 className="text-2xl font-black mb-10 dark:text-white uppercase tracking-widest italic">Eserin Bölümleri</h2>
          <div className="space-y-4">
            {data.chapters.map(c => (
              <div key={c.id} className="flex items-center gap-4 group">
                <Link href={`/kitap/${id}/bolum/${c.id}`} className="flex-1 flex items-center justify-between p-6 bg-white dark:bg-white/5 border dark:border-white/5 rounded-[2rem] hover:border-red-600 transition-all shadow-sm">
                  <div className="flex items-center gap-6">
                     <span className="text-[10px] font-black text-gray-300 dark:text-gray-700 tracking-widest">{String(c.order_no).padStart(2, '0')}</span>
                     <span className="font-bold text-base dark:text-white">{c.title}</span>
                     <span className="text-[9px] text-gray-400 opacity-40">({c.views || 0} okuma)</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">OKU →</span>
                </Link>
                {isAuthor && (
                  <Link href={`/bolum-duzenle/${id}/${c.id}`} className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-full text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    DÜZENLE
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-20 border-t dark:border-white/5">
           <YorumAlani type="book" targetId={id} bookId={id} />
        </div>
      </div>
    </div>
  );
}