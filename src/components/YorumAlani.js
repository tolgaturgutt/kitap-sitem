'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import { createCommentNotification, createReplyNotification } from '@/lib/notifications';

export default function YorumAlani({ type, targetId, bookId, paraId = null, onCommentAdded, includeParagraphs = false, onStatsUpdate }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const commentsEndRef = useRef(null);
  
  const [replyComment, setReplyComment] = useState(''); 
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyingToUser, setReplyingToUser] = useState(null); // 🆕 KİME YANITLADIĞIMIZI TUTACAĞIZ

  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    setComments([]);
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      
      if (u) {
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', u.email).single();
        if (adminData) setIsAdmin(true);

        if (bookId) {
          const { data: book } = await supabase.from('books').select('user_email').eq('id', bookId).single();
          if (book && book.user_email === u.email) setIsOwner(true);
        }
      }
      fetchComments();
    }
    load();
  }, [type, targetId, paraId, bookId, includeParagraphs]);

  useEffect(() => {
    if (type === 'paragraph' && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, type]);

  async function fetchComments() {
    let query = supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(username, avatar_url, role)')
      .order('created_at', { ascending: true });
    
    if (type !== 'paragraph') {
       query = query.order('created_at', { ascending: false, foreignTable: '' });
    }

    if (type === 'book') {
      query = query.eq('book_id', targetId).is('chapter_id', null);
    } else if (type === 'chapter') {
      query = query.eq('chapter_id', targetId);
      if (!includeParagraphs) query = query.is('paragraph_id', null);
    } else if (type === 'paragraph') {
      query = query.eq('chapter_id', targetId);
      if (paraId === null) query = query.is('paragraph_id', null);
      else query = query.eq('paragraph_id', paraId);
    }

    const { data } = await query;
    
    let sortedData = data || [];
    if (type === 'paragraph') {
        sortedData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
        sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setComments(sortedData);
  }

  function openReply(targetComment) {
    if (replyingTo === targetComment.id) {
      setReplyingTo(null);
      setReplyComment('');
      setReplyingToUser(null); // 🆕 SIFIRLA
    } else {
      setReplyingTo(targetComment.id);
      setReplyingToUser(targetComment.user_email); // 🆕 KİME YANITLADIĞIMIZI KAYDET
      const username = targetComment.profiles?.username || targetComment.username;
      setReplyComment(`@${username} `);
    }
  }

 async function handleSend(targetComment = null) {
    const contentToSend = targetComment ? replyComment : newComment;

    if (!contentToSend.trim() || !user || isSending) return;
    setIsSending(true);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const username = profile?.username || user.email.split('@')[0];

    let finalParentId = null;
    
    // 👇 BURASI KRİTİK DEĞİŞİKLİK 👇
    // Varsayılan olarak mevcut paraId'yi al
    let finalParaId = paraId || null; 

    if (targetComment) {
        finalParentId = targetComment.parent_id ? targetComment.parent_id : targetComment.id;
        
        // EĞER BİR YORUMA YANIT VERİYORSAK, ONUN PARAGRAF ID'SİNİ KOPYALA
        // Böylece bölüm sonundan yazsak bile paragrafın içine düşer.
        finalParaId = targetComment.paragraph_id; 
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
        if (type === 'paragraph') {
            setComments(prev => [...prev, insertedData]);
        } else {
            setComments(prev => [insertedData, ...prev]); 
        }
        
        if (targetComment) {
            setReplyComment('');
            setReplyingTo(null);
            setReplyingToUser(null); // 🆕 SIFIRLA
            toast.success("Yanıt gönderildi");
        } else {
            setNewComment(''); 
            toast.success("Yorum eklendi");
        }

        if (type === 'paragraph' && onCommentAdded) onCommentAdded(paraId);
        createNotification(insertedData, username, targetComment); // 🆕 targetComment'i de gönder

        if (bookId && onStatsUpdate) {
          const { data: updatedBook } = await supabase
            .from('books')
            .select('total_comment_count, total_votes')
            .eq('id', bookId)
            .single();
          
          if (updatedBook) {
            onStatsUpdate({
              comments: updatedBook.total_comment_count,
              votes: updatedBook.total_votes
            });
          }
        }
    } else {
        toast.error("Hata oluştu.");
    }
    setIsSending(false);
}

  // 🔥 FİX: Bildirim doğru kişiye gitsin
  async function createNotification(comment, username, targetComment) {
      try {
        if (comment.parent_id) {
          // Yanıt ise: targetComment'e (yani yanıtladığımız yoruma) bildirim gönder
          const recipientEmail = replyingToUser || targetComment?.user_email;
          
          if (recipientEmail && recipientEmail !== user.email) {
            await createReplyNotification(
              username, 
              user.email, 
              recipientEmail, // 🔥 Direkt yanıtladığımız kişiye gönder
              bookId ? parseInt(bookId) : null, 
              type === 'book' ? null : parseInt(targetId), 
              null
            );
          }
        } else {
          await createCommentNotification(
            username, 
            user.email, 
            parseInt(bookId), 
            type === 'book' ? null : parseInt(targetId)
          );
        }
      } catch (e) { 
        console.error(e); 
      }
  }

  async function handleReport(id, content) {
    const r = prompt("Sebep?"); if(!r) return;
    await supabase.from('reports').insert({ reporter_id: user.id, target_type: 'comment', target_id: id, reason: r, content_snapshot: content });
    toast.success("Raporlandı.");
  }

 async function handleDelete(id) {
    if(!confirm("Silinsin mi?")) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) { 
        setComments(prev => prev.filter(c => c.id !== id)); 
        toast.success("Silindi."); 

        if (bookId && onStatsUpdate) {
          const { data: updatedBook } = await supabase
            .from('books')
            .select('total_comment_count, total_votes')
            .eq('id', bookId)
            .single();
          
          if (updatedBook) {
            onStatsUpdate({
              comments: updatedBook.total_comment_count,
              votes: updatedBook.total_votes
            });
          }
        }
    }
}

  const mainComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const InputArea = (
    <div className={`relative bg-gray-100 dark:bg-white/5 rounded-2xl p-2 border dark:border-white/10 ${type === 'paragraph' ? 'mt-0 shadow-lg' : 'mb-8'}`}>
        <textarea 
          value={newComment} 
          onChange={e => setNewComment(e.target.value)} 
          placeholder={user ? "Bir şeyler yaz..." : "Giriş yapmalısın."}
          disabled={isSending || !user}
          rows={type === 'paragraph' ? 1 : 2}
          className="w-full bg-transparent px-4 py-3 text-sm outline-none dark:text-white resize-none max-h-32"
          style={{ minHeight: '44px' }}
        />
        <div className="flex justify-end px-2 pb-1">
           <button 
            onClick={() => handleSend(null)} 
            disabled={isSending || !user} 
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {isSending ? '...' : 'GÖNDER'}
          </button>
        </div>
    </div>
  );

  const ListArea = (
    <div className={`space-y-6 ${type === 'paragraph' ? 'pb-4' : ''}`}>
        {mainComments.length === 0 && (
           <div className="text-center py-10 text-gray-400 text-xs italic opacity-50">
             Henüz yorum yok. İlk yorumu sen yaz!
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
            <div className="pl-12 mt-3 space-y-4 border-l-2 border-gray-100 dark:border-white/5 ml-2">
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
        <div ref={commentsEndRef} />
    </div>
  );
  
 if (type === 'paragraph') {
  return (
      <div className="flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto px-4 pt-4 custom-scrollbar">
              {ListArea}
          </div>

          <div className="shrink-0 px-3 pt-3 pb-10 md:pb-3 bg-white dark:bg-[#0f0f0f] border-t dark:border-white/5 z-20">
              {InputArea}
          </div>
      </div>
  );
}

  return (
    <div className="w-full">
      {InputArea}
      {ListArea}
    </div>
  );
}

function CommentCard({ comment, user, isAdmin, isOwner, onReply, isReplying, onDelete, onReport, replyText, setReplyText, onSendReply, isSending, isMain }) {
    const canDelete = user && (isAdmin || isOwner || user.id === comment.user_id);
    const isOwnComment = user && user.id === comment.user_id;
    const commentUsername = comment.profiles?.username || comment.username || "Anonim";
    const profileLink = isOwnComment ? '/profil' : `/yazar/${commentUsername}`;

    return (
        <div className={`group relative flex gap-3`}>
            <a 
                href={profileLink}
                className={`${isMain ? 'w-8 h-8' : 'w-6 h-6'} rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-gray-400 text-[10px] hover:ring-2 hover:ring-red-600 transition-all cursor-pointer`}
            >
                {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : (commentUsername)[0].toUpperCase()}
            </a>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <a href={profileLink} className="hover:text-red-600 transition-colors">
                        <Username 
                            username={commentUsername}
                            isAdmin={comment.profiles?.role === 'admin'}
                            className={`${isMain ? 'text-[11px]' : 'text-[9px]'} font-black dark:text-gray-300 tracking-wide uppercase`}
                        />
                    </a>
                    {user && (
                        <div className="flex gap-2 opacity-60 hover:opacity-100">
                             {!isReplying && <button onClick={onReply} className="text-[9px] text-gray-400 hover:text-blue-500 font-bold uppercase">Yanıtla</button>}
                            {canDelete ? (
                                <button onClick={() => onDelete(comment.id)} className="text-[9px] text-gray-400 hover:text-red-500 font-bold uppercase">Sil</button>
                            ) : (
                                <button onClick={() => onReport(comment.id, comment.content)} className="text-[9px] text-gray-400 hover:text-red-500 font-bold uppercase">Rapor</button>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content.split(' ').map((word, i) => word.startsWith('@') ? <span key={i} className="text-blue-500 font-bold">{word} </span> : word + ' ')}
                </div>
                
                {isReplying && (
                    <div className="mt-3 flex gap-2 animate-in slide-in-from-top-1 bg-gray-50 dark:bg-white/5 p-2 rounded-xl">
                        <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Yanıtın..." className="flex-1 bg-transparent text-xs outline-none dark:text-white" onKeyDown={e => e.key === 'Enter' && onSendReply()} />
                        <button onClick={onSendReply} disabled={isSending} className="text-blue-500 text-[10px] font-black uppercase hover:text-blue-400">Gönder</button>
                         <button onClick={onReply} className="text-gray-400 text-[10px] font-black uppercase hover:text-red-500">iptal</button>
                    </div>
                )}
            </div>
        </div>
    );
}