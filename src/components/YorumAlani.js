'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function YorumAlani({ type, targetId, bookId, paraId = null, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      
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

    // Kullanıcı bilgilerini profile'dan al
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || user.user_metadata?.username || user.email.split('@')[0];

    const payload = { 
      content: newComment, 
      user_id: user.id,
      user_email: user.email, // Eski sistemle uyumluluk için
      username: username,     // Eski sistemle uyumluluk için
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
        
        // Paragraf yorumuysa üst bileşene bildir
        if (type === 'paragraph' && onCommentAdded) {
          onCommentAdded(paraId);
        }

        // BİLDİRİM OLUŞTUR
        await createNotification(insertedData, username);
    } else {
        toast.error("Hata: " + (error?.message || "Gönderilemedi"));
    }
    setIsSending(false);
  }

  // BİLDİRİM OLUŞTURMA FONKSİYONU
  async function createNotification(comment, username) {
    try {
      // Kitap sahibini bul
      const { data: book } = await supabase
        .from('books')
        .select('user_email, title, username')
        .eq('id', bookId)
        .single();

      // Kendine yorum yapmışsa bildirim gönderme
      if (book && book.user_email !== user.email) {
        await supabase.from('notifications').insert({
          recipient_email: book.user_email,
          actor_username: username,
          type: 'comment',
          book_title: book.title,
          book_id: parseInt(bookId),
          chapter_id: type === 'book' ? null : parseInt(targetId),
          is_read: false,
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('Bildirim oluşturulamadı:', error);
    }
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
          value={newComment} 
          onChange={e => setNewComment(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder={user ? "Bir şeyler karala..." : "Giriş yapmalısın."}
          disabled={isSending || !user}
          className="w-full bg-transparent px-6 py-3 text-xs outline-none dark:text-white"
        />
        <button 
          onClick={handleSend} 
          disabled={isSending || !user} 
          className="absolute right-2 top-2 bottom-2 px-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
        >
          {isSending ? '...' : 'Gönder'}
        </button>
      </div>

      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="flex gap-4 animate-in fade-in duration-500">
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 border dark:border-white/5 flex items-center justify-center">
              {c.profiles?.avatar_url && c.profiles.avatar_url.includes('http') ? (
                <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="text-[9px] font-black opacity-30 italic">
                  {(c.profiles?.username || c.username || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black dark:text-white mb-1 tracking-tighter uppercase italic opacity-60">
                @{c.profiles?.username || c.username || "Anonim"}
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