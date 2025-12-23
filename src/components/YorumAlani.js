'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function YorumAlani({ type, targetId, bookId, paraId = null, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // --- YENİ: YANIT STATE'LERİ ---
  const [replyComment, setReplyComment] = useState(''); // Yanıt metni
  const [replyingTo, setReplyingTo] = useState(null); // Hangi yoruma yanıt veriyoruz?
  // ------------------------------

  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      
      if (u) {
        const { data: adminData } = await supabase
          .from('announcement_admins')
          .select('*')
          .eq('user_email', u.email)
          .single();
        if (adminData) setIsAdmin(true);
      }
      fetchComments();
    }
    load();
  }, [type, targetId, paraId]);

  async function fetchComments() {
    let query = supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
      .order('created_at', { ascending: false }); // Ana yorumlar: Yeniden eskiye

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

  // --- GÜNCELLENDİ: Hem normal yorum hem yanıt gönderir ---
  async function handleSend(parentId = null) {
    const contentToSend = parentId ? replyComment : newComment;

    if (!contentToSend.trim() || !user || isSending) return;
    setIsSending(true);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];

    const payload = { 
      content: contentToSend, 
      user_id: user.id,
      user_email: user.email,
      username: username,
      book_id: bookId, 
      chapter_id: type === 'book' ? null : targetId,
      paragraph_id: paraId || null,
      parent_id: parentId // Yanıtsa ID gider, değilse null
    };

    const { data: insertedData, error } = await supabase
      .from('comments')
      .insert([payload])
      .select('*, profiles!comments_user_id_fkey(username, avatar_url)')
      .single();

    if (!error && insertedData) { 
        setComments(prev => [insertedData, ...prev]); 
        
        if (parentId) {
            setReplyComment('');
            setReplyingTo(null); // Yanıt modunu kapat
            toast.success("Yanıt gönderildi");
        } else {
            setNewComment(''); 
            toast.success("Yorum eklendi");
        }

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
      
      // Kime bildirim gidecek?
      // 1. Eğer bir yoruma yanıt verdiysek, o yorumun sahibine gitsin.
      // 2. Yoksa kitap sahibine gitsin.
      
      let recipientEmail = book.user_email;
      let notifType = 'comment';
      
      if (comment.parent_id) {
          const parentComment = comments.find(c => c.id === comment.parent_id);
          if (parentComment) {
              recipientEmail = parentComment.user_email;
              notifType = 'reply';
          }
      }

      if (recipientEmail && recipientEmail !== user.email) {
        await supabase.from('notifications').insert({
          recipient_email: recipientEmail,
          actor_username: username,
          type: notifType,
          book_title: book.title,
          book_id: parseInt(bookId),
          chapter_id: type === 'book' ? null : parseInt(targetId),
          is_read: false
        });
      }
    } catch (e) { console.error(e); }
  }

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
  }

  async function handleDelete(commentId) {
    if(!confirm("Yorumu silmek istiyor musun?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success("Yorum silindi.");
    } else {
      toast.error("Silinemedi: " + error.message);
    }
  }

  // Yorumları Ana ve Alt olarak ayırıyoruz
  const mainComments = comments.filter(c => !c.parent_id);
  
  // Alt yorumları bul ve ESKİDEN YENİYE sırala (Konuşma akışı için)
  const getReplies = (parentId) => {
    return comments
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  return (
    <div className="w-full">
      {/* ANA YORUM YAZMA ALANI */}
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
            onClick={() => handleSend(null)} 
            disabled={isSending || !user} 
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-50"
          >
            {isSending ? '...' : 'Gönder'}
          </button>
        </div>
      </div>

      {/* YORUM LİSTESİ */}
      <div className="space-y-6">
        {mainComments.map(c => (
          <div key={c.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ANA YORUM KARTI */}
            <div className="group relative flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm font-black text-gray-400">
                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" /> : (c.profiles?.username || "?")[0].toUpperCase()}
                </div>
                
                <div className="flex-1">
                <div className="flex justify-between items-start">
                    <p className="text-[11px] font-black dark:text-gray-300 mb-1 tracking-wide uppercase">
                    @{c.profiles?.username || c.username || "Anonim"}
                    </p>
                    
                    {/* İŞLEM MENÜSÜ */}
                    {user && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-3">
                        {/* Yanıtla Butonu */}
                        <button 
                            onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                            className="text-[10px] text-blue-500 hover:underline font-bold uppercase"
                        >
                            {replyingTo === c.id ? 'İptal' : 'Yanıtla ↩'}
                        </button>

                        {(user.id === c.user_id || isAdmin) ? (
                        <button onClick={() => handleDelete(c.id)} className="text-[10px] text-red-500 hover:underline font-bold uppercase">Sil 🗑️</button>
                        ) : (
                        <button onClick={() => handleReport(c.id, c.content)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase">Raporla 🚩</button>
                        )}
                    </div>
                    )}
                </div>
                
                <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                    {c.content}
                </p>

                {/* YANIT YAZMA KUTUSU (Sadece bu yoruma yanıt veriyorsak açılır) */}
                {replyingTo === c.id && (
                    <div className="mt-3 flex gap-2 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            value={replyComment}
                            onChange={e => setReplyComment(e.target.value)}
                            placeholder={`@${c.profiles?.username || 'kullanıcı'} kullanıcısına yanıt ver...`}
                            className="flex-1 bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-xl px-4 py-2 text-xs outline-none"
                            onKeyDown={e => e.key === 'Enter' && handleSend(c.id)}
                        />
                        <button 
                            onClick={() => handleSend(c.id)}
                            disabled={isSending}
                            className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                        >
                            Gönder
                        </button>
                    </div>
                )}
                </div>
            </div>

            {/* ALT YORUMLAR (YANITLAR) */}
            <div className="pl-14 mt-3 space-y-4">
                {getReplies(c.id).map(reply => (
                    <div key={reply.id} className="group relative flex gap-3 border-l-2 border-gray-100 dark:border-white/5 pl-4">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center text-xs font-black text-gray-400">
                            {reply.profiles?.avatar_url ? <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" /> : (reply.profiles?.username || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black dark:text-gray-400 mb-0.5 tracking-wide uppercase">
                                    @{reply.profiles?.username || reply.username}
                                </p>
                                {/* Alt Yorum İşlemleri */}
                                {user && (user.id === reply.user_id || isAdmin) && (
                                    <button onClick={() => handleDelete(reply.id)} className="opacity-0 group-hover:opacity-100 text-[9px] text-red-500 hover:underline font-bold uppercase transition-opacity">
                                        Sil
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {reply.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}