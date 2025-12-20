'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function YorumAlani({ type, targetId, bookId, paraId = null }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      
      // 406 ve 400 hatalarını önlemek için sorgu başlangıcı
      let query = supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
        .order('created_at', { ascending: false });

      if (type === 'book') {
        query = query.eq('book_id', targetId).is('chapter_id', null);
      } else if (type === 'chapter') {
        query = query.eq('chapter_id', targetId).is('paragraph_id', null);
      } else if (type === 'paragraph') {
        query = query.eq('chapter_id', targetId);
        // 400 FIX: paraId null ise .is() değilse .eq() kullanıyoruz
        if (paraId === null) {
          query = query.is('paragraph_id', null);
        } else {
          query = query.eq('paragraph_id', paraId);
        }
      }

      const { data } = await query;
      setComments(data || []);
    }
    load();
  }, [type, targetId, paraId]);

  async function handleSend() {
    if (!newComment.trim() || !user || isSending) return;
    setIsSending(true);

    const payload = { 
      content: newComment, 
      user_id: user.id,
      book_id: bookId, 
      chapter_id: type === 'book' ? null : targetId,
      paragraph_id: paraId || null
    };

    const { data: insertedData, error } = await supabase
      .from('comments')
      .insert([payload])
      .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
      .single();

    if (!error && insertedData) { 
        setComments(prev => [insertedData, ...prev]); 
        setNewComment(''); 
        toast.success("Yorum eklendi");
    } else {
        toast.error("Hata: " + (error?.message || "Gönderilemedi"));
    }
    setIsSending(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full">
      <div className="mb-10 relative bg-white dark:bg-white/5 rounded-[2rem] p-2 border dark:border-white/10 ring-1 ring-black/5">
        <input 
          value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={user ? "Bir şeyler karala..." : "Giriş yapmalısın."}
          disabled={isSending || !user}
          className="w-full bg-transparent px-6 py-3 text-xs outline-none dark:text-white"
        />
        <button onClick={handleSend} disabled={isSending || !user} className="absolute right-2 top-2 bottom-2 px-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
          {isSending ? '...' : 'Gönder'}
        </button>
      </div>

      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="flex gap-4 animate-in fade-in duration-500">
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 border dark:border-white/5 flex items-center justify-center">
              {/* 406 FIX: avatar_url'in geçerli bir link olduğunu (http) kontrol ediyoruz */}
              {c.profiles?.avatar_url && c.profiles.avatar_url.includes('http') ? (
                <img src={c.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[9px] font-black opacity-30 italic">
                  {(c.profiles?.username || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black dark:text-white mb-1 tracking-tighter uppercase italic opacity-60">
                @{c.profiles?.username}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {c.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}