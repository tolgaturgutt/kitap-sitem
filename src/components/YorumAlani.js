'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function YorumAlani({ type, targetId, bookId, paraId = null, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [reportingId, setReportingId] = useState(null); // Hangi yorum şikayet ediliyor?

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      fetchComments();
    }
    load();
  }, [type, targetId, paraId]);

  async function fetchComments() {
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
      if (paraId === null) query = query.is('paragraph_id', null);
      else query = query.eq('paragraph_id', paraId);
    }

    const { data } = await query;
    setComments(data || []);
  }

  async function handleSend() {
    if (!newComment.trim() || !user || isSending) return;
    setIsSending(true);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];

    const payload = { 
      content: newComment, 
      user_id: user.id,
      user_email: user.email,
      username: username,
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
        if (type === 'paragraph' && onCommentAdded) onCommentAdded(paraId);
        createNotification(insertedData, username);
    } else {
        toast.error("Hata oluştu.");
    }
    setIsSending(false);
  }

  async function createNotification(comment, username) {
    try {
      const { data: book } = await supabase.from('books').select('user_email, title').eq('id', bookId).single();
      if (book && book.user_email !== user.email) {
        await supabase.from('notifications').insert({
          recipient_email: book.user_email,
          actor_username: username,
          type: 'comment',
          book_title: book.title,
          book_id: parseInt(bookId),
          chapter_id: type === 'book' ? null : parseInt(targetId),
          is_read: false
        });
      }
    } catch (e) { console.error(e); }
  }

  // --- ŞİKAYET FONKSİYONU ---
  async function handleReport(commentId, content) {
    const reason = prompt("Şikayet sebebiniz nedir? (Örn: Küfür, Spoiler, Spam)");
    if (!reason) return;

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'comment',
      target_id: commentId,
      reason: reason,
      content_snapshot: content
    });

    if (error) toast.error("Şikayet edilemedi.");
    else toast.success("Şikayetiniz yönetime iletildi. Teşekkürler.");
    setReportingId(null);
  }

  // --- YORUM SİLME FONKSİYONU ---
  async function handleDelete(commentId) {
    if(!confirm("Yorumu silmek istiyor musun?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success("Yorum silindi.");
    }
  }

  return (
    <div className="w-full">
      {/* YAZMA ALANI */}
      <div className="mb-8 relative bg-gray-50 dark:bg-white/5 rounded-2xl p-2 border dark:border-white/10">
        <textarea 
          value={newComment} 
          onChange={e => setNewComment(e.target.value)} 
          placeholder={user ? "Düşüncelerin..." : "Giriş yapmalısın."}
          disabled={isSending || !user}
          rows={2}
          className="w-full bg-transparent px-4 py-3 text-sm outline-none dark:text-white resize-none"
        />
        <div className="flex justify-end px-2 pb-2">
           <button 
            onClick={handleSend} 
            disabled={isSending || !user} 
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50"
          >
            {isSending ? '...' : 'Gönder'}
          </button>
        </div>
      </div>

      {/* YORUM LİSTESİ */}
      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="group relative flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* AVATAR */}
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm font-black text-gray-400">
              {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" /> : (c.profiles?.username || "?")[0].toUpperCase()}
            </div>
            
            {/* İÇERİK */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-[11px] font-black dark:text-gray-300 mb-1 tracking-wide uppercase">
                  @{c.profiles?.username || c.username || "Anonim"}
                </p>
                
                {/* İŞLEM MENÜSÜ (Sadece giriş yapmışsa görünür) */}
                {user && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    {/* Kendi Yorumuysa SİL */}
                    {user.id === c.user_id && (
                       <button onClick={() => handleDelete(c.id)} className="text-[10px] text-red-500 hover:underline font-bold uppercase">Sil</button>
                    )}
                    {/* Başkasının Yorumuysa ŞİKAYET ET */}
                    {user.id !== c.user_id && (
                       <button onClick={() => handleReport(c.id, c.content)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase">Raporla</button>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                {c.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}