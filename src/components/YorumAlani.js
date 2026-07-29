'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Username from '@/components/Username';
import { CommentRankBadge } from '@/components/Badges';
import { fetchCommentBadgeCounts } from '@/lib/badges';
import CommentLikeButton from '@/components/CommentLikeButton';

export default function YorumAlani({ type, targetId, bookId, paraId = null, paraKey = null, onCommentAdded, includeParagraphs = false, onStatsUpdate }) {
  const [comments, setComments] = useState([]);
  const [commentBadgeCounts, setCommentBadgeCounts] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  
  const [replyComment, setReplyComment] = useState(''); 
  const [replyingTo, setReplyingTo] = useState(null); 

  const [user, setUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const fetchCommentLikes = useCallback(async (commentRows) => {
    const commentIds = (commentRows || [])
      .map(comment => Number(comment.id))
      .filter(Number.isFinite);

    if (commentIds.length === 0) {
      setCommentLikes({});
      return;
    }

    const emptyLikes = Object.fromEntries(
      commentIds.map(commentId => [
        String(commentId),
        { count: 0, liked: false },
      ])
    );

    const { data, error } = await supabase.rpc('get_comment_like_summaries', {
      p_comment_ids: commentIds,
    });

    if (error) {
      setCommentLikes(emptyLikes);
      return;
    }

    const nextLikes = { ...emptyLikes };
    (data || []).forEach(item => {
      nextLikes[String(item.comment_id)] = {
        count: Number(item.like_count || 0),
        liked: Boolean(item.liked_by_me),
      };
    });
    setCommentLikes(nextLikes);
  }, []);

  const fetchComments = useCallback(async () => {
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
      if (!includeParagraphs) {
        query = query.is('paragraph_id', null);
      }
    } else if (type === 'paragraph') {
      query = query.eq('chapter_id', targetId);

      if (paraKey) {
        query = query.eq('paragraph_key', paraKey);
      } else if (paraId === null || paraId === undefined) {
        query = query.is('paragraph_id', null);
      } else {
        query = query.eq('paragraph_id', paraId);
      }
    }

    const { data } = await query;
    const sortedData = [...(data || [])];

    if (type === 'paragraph') {
      sortedData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setComments(sortedData);
    const badgeCounts = await fetchCommentBadgeCounts(supabase, sortedData);
    setCommentBadgeCounts(badgeCounts);
    await fetchCommentLikes(sortedData);
  }, [fetchCommentLikes, includeParagraphs, paraId, paraKey, targetId, type]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setComments([]), 0);

    let cancelled = false;

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!cancelled) setUser(u);

      if (u) {
        const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', u.email).maybeSingle();
        if (adminData && !cancelled) setIsAdmin(true);

        if (bookId) {
          const { data: book } = await supabase.from('books').select('user_email').eq('id', bookId).single();
          if (book && book.user_email === u.email && !cancelled) setIsOwner(true);
        }
      }

      await fetchComments();
    }

    load();

    // Auth state listener: güncel oturum değişikliklerinde `user`'ı anlık güncelle
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);

      if (!newUser) {
        setIsAdmin(false);
        setIsOwner(false);
        return;
      }

      // Oturum açıldığında admin/owner durumlarını tekrar kontrol et
      (async () => {
        try {
          const { data: adminData } = await supabase.from('announcement_admins').select('*').eq('user_email', newUser.email).maybeSingle();
          if (adminData) setIsAdmin(true);

          if (bookId) {
            const { data: book } = await supabase.from('books').select('user_email').eq('id', bookId).single();
            if (book && book.user_email === newUser.email) setIsOwner(true);
          }

          // Oturum açıldığında yorumları yeniden yükle ki input ve liste güncellensin
          try {
            await fetchComments();
          } catch (e) {
            console.error('[YorumAlani] fetchComments on login error:', e);
          }
        } catch (e) {
          console.error('[YorumAlani] auth listener check error:', e);
        }
      })();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, [bookId, fetchComments]);

  useEffect(() => {
    // Sadece yeni yorum eklendiğinde scroll yap
    if (type === 'paragraph' && shouldScrollToBottomRef.current && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      shouldScrollToBottomRef.current = false;
    }
  }, [comments, type]);

  function openReply(targetComment) {
    if (replyingTo === targetComment.id) {
      setReplyingTo(null);
      setReplyComment('');
    } else {
      setReplyingTo(targetComment.id);
      const username = targetComment.profiles?.username || targetComment.username;
      setReplyComment(`@${username} `);
    }
  }

  async function handleSend(targetComment = null) {
    const contentToSend = targetComment ? replyComment : newComment;

    if (!contentToSend.trim() || !user || isSending) return;
    setIsSending(true);

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
    const username = profile?.username || user.email.split('@')[0];

    let finalParentId = null;
    
    // 🔥 ÖNEMLİ: paragraph_id mantığını düzelt
    let finalParaId = null;
    let finalParaKey = null;
    
    if (type === 'paragraph') {
        // Paragraf yorumu modundaysak
        if (targetComment) {
            // Yanıt ise, hedef yorumun paragraph_id'sini al
            finalParaId = targetComment.paragraph_id;
            finalParaKey = targetComment.paragraph_key;
        } else {
            // Yeni yorum ise, mevcut paraId'yi al
            finalParaId = paraId;
            finalParaKey = paraKey;
        }
    } else if (type === 'chapter' && includeParagraphs && targetComment) {
        // Bölüm sayfasında paragraf yorumuna yanıt veriyorsak
        finalParaId = targetComment.paragraph_id;
        finalParaKey = targetComment.paragraph_key;
    }
    // type === 'chapter' veya 'book' ve yeni yorum ise finalParaId = null kalır

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
      paragraph_id: finalParaId,
      paragraph_key: finalParaKey,
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
            shouldScrollToBottomRef.current = true;
        } else {
            setComments(prev => [insertedData, ...prev]); 
        }
        
        if (targetComment) {
            setReplyComment('');
            setReplyingTo(null);
        } else {
            setNewComment(''); 
        }

        if (type === 'paragraph' && onCommentAdded) {
          onCommentAdded(paraKey || paraId);
        }

        const updatedBadgeCounts = await fetchCommentBadgeCounts(supabase, [insertedData]);
        setCommentBadgeCounts(prev => ({ ...prev, ...updatedBadgeCounts }));
        setCommentLikes(prev => ({
          ...prev,
          [String(insertedData.id)]: { count: 0, liked: false },
        }));
        
        await createNotification(insertedData, targetComment);

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

  async function createNotification(comment, targetComment) {
    try {
      console.log('🔔 Bildirim oluşturuluyor:', {
        comment_id: comment.id,
        paragraph_id: comment.paragraph_id,
        parent_id: comment.parent_id,
        targetComment: targetComment?.user_email
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch('/api/notifications/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          comment_id: comment.id,
          target_comment_id: targetComment?.id || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        console.error('❌ Bildirim API hatası:', result);
      }
    } catch (e) { 
      console.error('❌ Bildirim hatası:', e); 
    }
  }

  async function handleReport(id, content) {
    const r = prompt("Sebep?"); if(!r) return;
    await supabase.from('reports').insert({ reporter_id: user.id, target_type: 'comment', target_id: id, reason: r, content_snapshot: content });
    toast.success("Raporlandı.");
  }

  async function handleDelete(id) {
    if(!confirm("Silinsin mi?")) return;
    const deletedComment = comments.find(comment => comment.id === id);
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) { 
        setComments(prev => prev.filter(c => c.id !== id)); 
        setCommentLikes(prev => {
          const next = { ...prev };
          delete next[String(id)];
          return next;
        });
        if (deletedComment?.user_id) {
          setCommentBadgeCounts(prev => ({
            ...prev,
            [deletedComment.user_id]: Math.max(0, Number(prev[deletedComment.user_id] || 0) - 1),
          }));
        }

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

  async function handleCommentLike(comment) {
    if (!user) {
      toast.error('Beğenmek için giriş yapmalısın.');
      return;
    }

    if (String(user.id) === String(comment.user_id)) return;

    const commentKey = String(comment.id);
    if (pendingLikeIds.has(commentKey)) return;

    const previousLike = commentLikes[commentKey] || { count: 0, liked: false };
    const optimisticLike = {
      liked: !previousLike.liked,
      count: Math.max(
        0,
        previousLike.count + (previousLike.liked ? -1 : 1)
      ),
    };

    setCommentLikes(prev => ({ ...prev, [commentKey]: optimisticLike }));
    setPendingLikeIds(prev => new Set(prev).add(commentKey));

    try {
      const { data, error } = await supabase.rpc('toggle_comment_like', {
        p_comment_id: Number(comment.id),
      });
      if (error) throw error;

      setCommentLikes(prev => ({
        ...prev,
        [commentKey]: {
          count: Number(data?.like_count || 0),
          liked: Boolean(data?.liked_by_me),
        },
      }));
    } catch (error) {
      console.error('Comment like error:', error);
      setCommentLikes(prev => ({ ...prev, [commentKey]: previousLike }));
      toast.error('Beğeni kaydedilemedi.');
    } finally {
      setPendingLikeIds(prev => {
        const next = new Set(prev);
        next.delete(commentKey);
        return next;
      });
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
                commentCount={commentBadgeCounts[c.user_id] || 0}
                likeInfo={commentLikes[String(c.id)]}
                isLikePending={pendingLikeIds.has(String(c.id))}
                onLike={() => handleCommentLike(c)}
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
                        commentCount={commentBadgeCounts[reply.user_id] || 0}
                        likeInfo={commentLikes[String(reply.id)]}
                        isLikePending={pendingLikeIds.has(String(reply.id))}
                        onLike={() => handleCommentLike(reply)}
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

            <div
                className="shrink-0 px-3 pt-3 bg-white dark:bg-[#0f0f0f] border-t dark:border-white/5 z-20"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
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

function CommentCard({ comment, user, isAdmin, isOwner, onReply, isReplying, onDelete, onReport, replyText, setReplyText, onSendReply, isSending, isMain, commentCount, likeInfo, isLikePending, onLike }) {
    const canDelete = user && (isAdmin || isOwner || user.id === comment.user_id);
    const isOwnComment = user && user.id === comment.user_id;
    const commentUsername = comment.profiles?.username || comment.username || "Anonim";
    const profileLink = isOwnComment ? '/profil' : `/yazar/${commentUsername}`;

    return (
        <div 
            className={`group relative flex gap-3`}
            data-comment-id={comment.id}
        >
            <a 
                href={profileLink}
                className={`${isMain ? 'w-8 h-8' : 'w-6 h-6'} rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center font-black text-gray-400 text-[10px] hover:ring-2 hover:ring-red-600 transition-all cursor-pointer`}
            >
                {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt={commentUsername} className="w-full h-full object-cover" /> : (commentUsername)[0].toUpperCase()}
            </a>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 pr-2">
                        <a href={profileLink} className="hover:text-red-600 transition-colors">
                            <Username
                                username={commentUsername}
                                isAdmin={comment.profiles?.role === 'admin'}
                                isPremium={comment.profiles?.role === 'premium'}
                                className={`${isMain ? 'text-[11px]' : 'text-[9px]'} font-black dark:text-gray-300 tracking-wide uppercase`}
                            />
                        </a>
                        <CommentRankBadge count={commentCount} compact={!isMain} />
                    </div>
                    {user && (
                        <div className="flex gap-2 opacity-60 hover:opacity-100">
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

                <div className="mt-1 flex items-center gap-1">
                    <CommentLikeButton
                        count={likeInfo?.count || 0}
                        liked={Boolean(likeInfo?.liked)}
                        pending={isLikePending}
                        disabled={Boolean(isOwnComment)}
                        compact={!isMain}
                        onClick={onLike}
                    />
                    {!isReplying && user && (
                        <button
                            type="button"
                            onClick={onReply}
                            className="min-h-7 rounded-full px-1.5 text-[9px] font-bold uppercase text-gray-400 transition-colors hover:text-blue-500"
                        >
                            Yanıtla
                        </button>
                    )}
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
