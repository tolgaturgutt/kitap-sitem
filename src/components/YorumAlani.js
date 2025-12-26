'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import { createCommentNotification, createReplyNotification } from '@/lib/notifications';

export default function YorumAlani({ type, targetId, bookId, paraId = null, onCommentAdded, includeParagraphs = false }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // --- YANIT STATE'LERİ ---
  const [replyComment, setReplyComment] = useState(''); 
  const [replyingTo, setReplyingTo] = useState(null); 
  // ------------------------

  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // Kitap sahibi kontrolü

  useEffect(() => {
    // ✅ KRİTİK DÜZELTME: ID değiştiği an eski yorumları temizle.
    // Böylece yeni yorumlar yüklenirken eskiler ekranda kalıp kafa karıştırmaz.
    setComments([]);

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      
      if (u) {
        // 1. ADMIN KONTROLÜ
        const { data: adminData } = await supabase
          .from('announcement_admins')
          .select('*')
          .eq('user_email', u.email)
          .single();
        if (adminData) setIsAdmin(true);

        // 2. KİTAP SAHİBİ KONTROLÜ
        if (bookId) {
          const { data: book } = await supabase
            .from('books')
            .select('user_email')
            .eq('id', bookId)
            .single();
          
          if (book && book.user_email === u.email) {
            setIsOwner(true);
          }
        }
      }
      fetchComments();
    }
    load();
  }, [type, targetId, paraId, bookId, includeParagraphs]);

  async function fetchComments() {
    let query = supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(username, avatar_url, role)')
      .order('created_at', { ascending: false }); 

    if (type === 'book') {
      query = query.eq('book_id', targetId).is('chapter_id', null);
    } else if (type === 'chapter') {
      query = query.eq('chapter_id', targetId);
      
      // Eğer "includeParagraphs" true ise, filtreleme yapma (hepsini getir).
      // Eğer false ise (varsayılan), sadece paragraf ID'si boş olanları (ana yorumları) getir.
      if (!includeParagraphs) {
        query = query.is('paragraph_id', null);
      }

    } else if (type === 'paragraph') {
      query = query.eq('chapter_id', targetId);
      if (paraId === null) query = query.is('paragraph_id', null);
      else query = query.eq('paragraph_id', paraId);
    }

    const { data } = await query;
    setComments(data || []);
  }

  // --- YANIT PENCERESİNİ AÇMA MANTIĞI ---
  function openReply(targetComment) {
    if (replyingTo === targetComment.id) {
      setReplyingTo(null);
      setReplyComment('');
    } else {
      setReplyingTo(targetComment.id);
      if (targetComment.parent_id) {
        const username = targetComment.profiles?.username || targetComment.username;
        setReplyComment(`@${username} `);
      } else {
        setReplyComment('');
      }
    }
  }

  // --- GÖNDERME FONKSİYONU ---
  async function handleSend(targetComment = null) {
    const contentToSend = targetComment ? replyComment : newComment;

    if (!contentToSend.trim() || !user || isSending) return;
    setIsSending(true);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];

    let finalParentId = null;
    if (targetComment) {
        finalParentId = targetComment.parent_id ? targetComment.parent_id : targetComment.id;
    }

    const payload = { 
      content: contentToSend, 
      user_id: user.id,
      user_email: user.email,
      username: username,
      book_id: bookId, 
      chapter_id: type === 'book' ? null : targetId,
      paragraph_id: paraId || null,
      parent_id: finalParentId
    };

    const { data: insertedData, error } = await supabase
      .from('comments')
      .insert([payload])
      .select('*, profiles!comments_user_id_fkey(username, avatar_url, role)')
      .single();

    if (!error && insertedData) { 
        setComments(prev => [insertedData, ...prev]); 
        
        if (targetComment) {
            setReplyComment('');
            setReplyingTo(null);
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
    // Eğer yanıt ise
    if (comment.parent_id) {
      const parentComment = comments.find(c => c.id === comment.parent_id);
      if (parentComment) {
        await createReplyNotification(
          username,
          user.email,
          parentComment.user_email,
          bookId ? parseInt(bookId) : null,
          type === 'book' ? null : parseInt(targetId),
          null // panoId yok
        );
      }
    } else {
      // Normal yorum ise
      await createCommentNotification(
        username,
        user.email,
        parseInt(bookId),
        type === 'book' ? null : parseInt(targetId)
      );
    }
  } catch (e) { 
    console.error('Notification error:', e); 
  }
}
  async function handleReport(commentId, content) {
    const reason = prompt("Şikayet sebebiniz nedir?");
    if (!reason) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'comment',
      target_id: commentId,
      reason: reason,
      content_snapshot: content
    });
    if (!error) toast.success("Raporlandı.");
  }

  // --- SİLME FONKSİYONU ---
  async function handleDelete(commentId) {
    if(!confirm("Silmek istiyor musun?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success("Silindi.");
    } else {
      toast.error("Silinemedi.");
    }
  }

  const mainComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => {
    return comments
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  return (
    <div className="w-full">
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

      <div className="space-y-6">
        {mainComments.length === 0 && (
           <div className="text-center py-4 text-gray-400 text-xs italic">
             {/* Yükleniyor veya yorum yok mesajı buraya eklenebilir ama boş bırakmak daha temiz */}
           </div>
        )}
        
        {mainComments.map(c => (
          <div key={c.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CommentCard 
                comment={c} 
                user={user} 
                isAdmin={isAdmin}
                isOwner={isOwner}
                onReply={() => openReply(c)}
                isReplying={replyingTo === c.id}
                onDelete={handleDelete}
                onReport={handleReport}
                replyText={replyComment}
                setReplyText={setReplyComment}
                onSendReply={() => handleSend(c)}
                isSending={isSending}
                isMain={true}
            />
            <div className="pl-14 mt-3 space-y-4">
                {getReplies(c.id).map(reply => (
                    <CommentCard 
                        key={reply.id}
                        comment={reply} 
                        user={user} 
                        isAdmin={isAdmin}
                        isOwner={isOwner}
                        onReply={() => openReply(reply)}
                        isReplying={replyingTo === reply.id}
                        onDelete={handleDelete}
                        onReport={handleReport}
                        replyText={replyComment}
                        setReplyText={setReplyComment}
                        onSendReply={() => handleSend(reply)}
                        isSending={isSending}
                        isMain={false}
                    />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentCard({ comment, user, isAdmin, isOwner, onReply, isReplying, onDelete, onReport, replyText, setReplyText, onSendReply, isSending, isMain }) {
    const canDelete = user && (isAdmin || isOwner || user.id === comment.user_id);

    return (
        <div className={`group relative flex gap-3 ${!isMain ? 'border-l-2 border-gray-100 dark:border-white/5 pl-4' : ''}`}>
            <div className={`${isMain ? 'w-10 h-10' : 'w-8 h-8'} rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-gray-400 text-xs`}>
                {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : (comment.profiles?.username || "?")[0].toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <Username 
                        username={comment.profiles?.username || comment.username || "Anonim"}
                        isAdmin={comment.profiles?.role === 'admin'}
                        className={`${isMain ? 'text-[11px]' : 'text-[10px]'} font-black dark:text-gray-300 mb-1 tracking-wide uppercase`}
                    />
                    {user && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={onReply} className="text-[10px] text-blue-500 hover:underline font-bold uppercase">{isReplying ? 'Kapat' : 'Yanıtla'}</button>
                            {canDelete ? (
                                <button onClick={() => onDelete(comment.id)} className="text-[10px] text-red-500 hover:underline font-bold uppercase">Sil</button>
                            ) : (
                                <button onClick={() => onReport(comment.id, comment.content)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase">Rapor</button>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content.split(' ').map((word, i) => word.startsWith('@') ? <span key={i} className="text-blue-500 font-bold">{word} </span> : word + ' ')}
                </p>
                {isReplying && (
                    <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1">
                        <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={`@${comment.profiles?.username || 'kullanıcı'} yanıtla...`} className="flex-1 bg-gray-100 dark:bg-white/5 border dark:border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500" onKeyDown={e => e.key === 'Enter' && onSendReply()} />
                        <button onClick={onSendReply} disabled={isSending} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700">Gönder</button>
                    </div>
                )}
            </div>
        </div>
    );
}