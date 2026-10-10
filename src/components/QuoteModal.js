'use client';

import { useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import BookCoverImage from '@/components/BookCoverImage';
import Username from '@/components/Username';
import CommentLikeButton from '@/components/CommentLikeButton';
import { createQuoteCommentNotification, createQuoteVoteNotification } from '@/lib/notifications';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

function ProfileUsername({ profile, fallback, ...usernameProps }) {
  const profileUsername = profile?.username || fallback;
  if (!profileUsername) return null;

  return (
    <Link href={`/yazar/${encodeURIComponent(profileUsername)}`} className="inline-flex hover:underline" onClick={(event) => event.stopPropagation()}>
      <Username username={profileUsername} {...usernameProps} />
    </Link>
  );
}

export default function QuoteModal({ quote, user, isAdmin = false, ownerIsAdmin = false, adminEmails = [], onClose, onUpdated, onDeleted }) {
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentLikes, setCommentLikes] = useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState(() => new Set());
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyToUsername, setReplyToUsername] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const isOwner = Boolean(user?.id && user.id === quote.user_id);
  const bookAuthorIsAdmin = Boolean(quote.bookAuthor?.email && adminEmails.some((email) => email.toLowerCase() === quote.bookAuthor.email.toLowerCase()));

  const loadCommentLikes = useCallback(async (commentRows) => {
    const commentIds = (commentRows || []).map((comment) => Number(comment.id)).filter(Boolean);
    if (!commentIds.length) {
      setCommentLikes({});
      return;
    }

    const emptyLikes = Object.fromEntries(commentIds.map((commentId) => [String(commentId), { count: 0, liked: false }]));
    const { data, error } = await supabase.rpc('get_quote_comment_like_summaries', { p_comment_ids: commentIds });
    if (error) {
      setCommentLikes(emptyLikes);
      return;
    }

    const nextLikes = { ...emptyLikes };
    (data || []).forEach((item) => {
      nextLikes[String(item.comment_id)] = {
        count: Number(item.like_count || 0),
        liked: Boolean(item.liked_by_me),
      };
    });
    setCommentLikes(nextLikes);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function loadEngagement() {
      const [likesResult, commentsResult, myVoteResult] = await Promise.all([
        supabase.from('quote_votes').select('*', { count: 'exact', head: true }).eq('quote_id', quote.id),
        supabase.from('quote_comments').select('id, quote_id, parent_id, user_id, content, created_at').eq('quote_id', quote.id).order('created_at'),
        user ? supabase.from('quote_votes').select('id').eq('quote_id', quote.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setLikeCount(likesResult.count || 0);
      setHasLiked(Boolean(myVoteResult.data));

      const rows = commentsResult.data || [];
      const profileIds = [...new Set(rows.map((comment) => comment.user_id).filter(Boolean))];
      const { data: profiles } = profileIds.length
        ? await supabase.from('profiles').select('id, username, avatar_url, email, role').in('id', profileIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
      const enrichedComments = rows.map((comment) => ({ ...comment, profile: profileMap.get(comment.user_id) || null }));
      setComments(enrichedComments);
      loadCommentLikes(enrichedComments);
    }
    loadEngagement();
  }, [loadCommentLikes, quote.id, user]);

  async function toggleLike() {
    if (!user) return toast.error('Beğenmek için giriş yapmalısın.');
    const wasLiked = hasLiked;
    setHasLiked(!wasLiked);
    setLikeCount((count) => Math.max(0, count + (wasLiked ? -1 : 1)));
    if (wasLiked) {
      const { error } = await supabase.from('quote_votes').delete().eq('quote_id', quote.id).eq('user_id', user.id);
      if (error) { setHasLiked(true); setLikeCount((count) => count + 1); }
      return;
    }
    const { data, error } = await supabase.from('quote_votes').insert({ quote_id: quote.id, user_id: user.id }).select('id').single();
    if (error) {
      setHasLiked(false);
      setLikeCount((count) => Math.max(0, count - 1));
      toast.error('Beğeni kaydedilemedi.');
    } else if (data?.id) {
      createQuoteVoteNotification(data.id).catch((notificationError) => console.error('Quote vote notification error:', notificationError));
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!user) return toast.error('Yorum yapmak için giriş yapmalısın.');
    const content = commentText.trim();
    if (!content || sendingComment) return;
    const targetReplyTo = replyTo;
    setSendingComment(true);
    const { data, error } = await supabase.from('quote_comments').insert({ quote_id: quote.id, parent_id: targetReplyTo, user_id: user.id, content }).select('id, quote_id, parent_id, user_id, content, created_at').single();
    if (error) {
      toast.error('Yorum gönderilemedi.');
    } else {
      const { data: profile } = await supabase.from('profiles').select('id, username, avatar_url, email, role').eq('id', user.id).maybeSingle();
      setComments((current) => [...current, { ...data, profile: profile || null }]);
      setCommentLikes((current) => ({ ...current, [String(data.id)]: { count: 0, liked: false } }));
      setCommentText('');
      setReplyTo(null);
      setReplyToUsername('');
      createQuoteCommentNotification(data.id).catch((notificationError) => console.error('Quote comment notification error:', notificationError));
    }
    setSendingComment(false);
  }

  async function deleteComment(commentId) {
    if (!confirm('Yorumu silmek istiyor musun?')) return;
    const { error } = await supabase.from('quote_comments').delete().eq('id', commentId);
    if (error) toast.error('Yorum silinemedi.');
    else {
      setComments((current) => {
        const deletedIds = new Set([String(commentId)]);
        let foundMore = true;
        while (foundMore) {
          foundMore = false;
          current.forEach((comment) => {
            if (comment.parent_id && deletedIds.has(String(comment.parent_id)) && !deletedIds.has(String(comment.id))) {
              deletedIds.add(String(comment.id));
              foundMore = true;
            }
          });
        }
        return current.filter((comment) => !deletedIds.has(String(comment.id)));
      });
    }
  }

  async function reportComment(comment) {
    if (!user) return toast.error('Şikayet etmek için giriş yapmalısın.');
    const reason = prompt('Şikayet sebebiniz nedir?');
    if (!reason?.trim()) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'quote_comment',
      target_id: comment.id,
      reason: reason.trim(),
      content_snapshot: comment.content,
      status: 'pending',
    });
    if (error) toast.error('Yorum şikayet edilemedi.');
    else toast.success('Yorum şikayet edildi.');
  }

  async function toggleCommentLike(comment) {
    if (!user) return toast.error('Beğenmek için giriş yapmalısın.');
    if (String(user.id) === String(comment.user_id)) return;
    const commentId = String(comment.id);
    if (pendingCommentLikeIds.has(commentId)) return;

    const previous = commentLikes[commentId] || { count: 0, liked: false };
    const optimistic = { count: Math.max(0, previous.count + (previous.liked ? -1 : 1)), liked: !previous.liked };
    setPendingCommentLikeIds((current) => new Set(current).add(commentId));
    setCommentLikes((current) => ({ ...current, [commentId]: optimistic }));

    const { data, error } = await supabase.rpc('toggle_quote_comment_like', { p_comment_id: Number(comment.id) });
    if (error) {
      setCommentLikes((current) => ({ ...current, [commentId]: previous }));
      toast.error('Yorum beğenisi kaydedilemedi.');
    } else {
      setCommentLikes((current) => ({
        ...current,
        [commentId]: {
          count: Number(data?.like_count ?? optimistic.count),
          liked: Boolean(data?.liked_by_me ?? optimistic.liked),
        },
      }));
    }
    setPendingCommentLikeIds((current) => {
      const next = new Set(current);
      next.delete(commentId);
      return next;
    });
  }

  function getThreadReplies(rootCommentId) {
    const replies = [];
    const visited = new Set([String(rootCommentId)]);
    function appendReplies(parentId) {
      comments
        .filter((comment) => String(comment.parent_id) === String(parentId))
        .forEach((comment) => {
          if (visited.has(String(comment.id))) return;
          visited.add(String(comment.id));
          replies.push(comment);
          appendReplies(comment.id);
        });
    }
    appendReplies(rootCommentId);
    return replies;
  }

  async function togglePin() {
    if (!isAdmin) return;
    setPinning(true);
    const nextPinned = !quote.is_pinned;
    const { error } = await supabase.from('book_quotes').update({ is_pinned: nextPinned }).eq('id', quote.id);
    if (error) {
      toast.error('Alıntının tutturma durumu değiştirilemedi.');
    } else {
      onUpdated?.(quote.id, { is_pinned: nextPinned });
      toast.success(nextPinned ? 'Alıntı tutturuldu.' : 'Alıntı baştan kaldırıldı.');
    }
    setPinning(false);
  }

  async function deleteQuote() {
    if ((!isOwner && !isAdmin) || !confirm('Bu alıntıyı silmek istediğine emin misin?')) return;
    setDeleting(true);
    const { error } = await supabase.from('book_quotes').delete().eq('id', quote.id);
    if (error) {
      toast.error('Alıntı silinemedi.');
      setDeleting(false);
      return;
    }
    toast.success('Alıntı silindi.');
    onDeleted?.(quote.id);
    onClose?.();
  }

  function CommentItem({ comment, isReply = false }) {
    const commentIsAdmin = Boolean(comment.profile?.email && adminEmails.some((email) => email.toLowerCase() === comment.profile.email.toLowerCase()));
    const canDeleteComment = isAdmin || isOwner || user?.id === comment.user_id;
    const displayUsername = comment.profile?.username || 'kullanici';
    const profileLink = user?.id === comment.user_id ? '/profil' : `/yazar/${encodeURIComponent(displayUsername)}`;

    return (
      <div className={`flex gap-3 ${isReply ? 'ml-9 border-l border-white/10 pl-3' : ''}`}>
        <Link href={profileLink} className="shrink-0">
          <span className={`relative flex ${isReply ? 'h-6 w-6' : 'h-8 w-8'} items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-black`}>
            {comment.profile?.avatar_url ? (
              <Image src={comment.profile.avatar_url} alt="" fill unoptimized sizes="32px" className="object-cover" />
            ) : displayUsername[0]?.toUpperCase()}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <ProfileUsername profile={comment.profile} fallback={displayUsername} isAdmin={commentIsAdmin} isPremium={comment.profile?.role === 'premium'} className="text-xs font-black" />
            {user && (canDeleteComment ? (
              <button type="button" onClick={() => deleteComment(comment.id)} className="text-[9px] font-black uppercase text-red-500 hover:underline">Sil</button>
            ) : (
              <button type="button" onClick={() => reportComment(comment)} className="text-[9px] font-black uppercase text-gray-500 hover:text-red-500">Rapor</button>
            ))}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-300">
            {comment.content.split(/(\s+)/).map((part, index) => part.startsWith('@') ? (
              <Link key={`${comment.id}-${index}`} href={`/yazar/${encodeURIComponent(part.slice(1))}`} className="font-bold text-blue-500 hover:underline">{part}</Link>
            ) : <span key={`${comment.id}-${index}`}>{part}</span>)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <CommentLikeButton
              count={commentLikes[String(comment.id)]?.count || 0}
              liked={Boolean(commentLikes[String(comment.id)]?.liked)}
              pending={pendingCommentLikeIds.has(String(comment.id))}
              disabled={Boolean(user && String(user.id) === String(comment.user_id))}
              compact={isReply}
              onClick={() => toggleCommentLike(comment)}
            />
            {user && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(comment.id);
                  setReplyToUsername(displayUsername);
                  setCommentText(`@${displayUsername}  `);
                }}
                className="min-h-7 rounded-full px-1.5 text-[9px] font-bold uppercase text-gray-400 transition hover:text-red-500"
              >
                Yanıtla
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kitaptan alıntı"
    >
      <div
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[3rem] border border-gray-100 bg-white text-gray-900 shadow-2xl dark:border-white/5 dark:bg-[#080808] dark:text-white md:h-[90vh] md:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/10 text-lg font-black text-gray-700 backdrop-blur-md transition hover:bg-red-600 hover:text-white dark:bg-white/10 dark:text-white md:right-8 md:top-8"
          aria-label="Kapat"
        >
          ✕
        </button>

        <aside className="relative hidden w-[42%] shrink-0 flex-col items-center justify-center overflow-hidden bg-zinc-950 p-10 md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-black to-black" />
          <div className="relative h-72 w-44 overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
            <BookCoverImage
              src={quote.books?.cover_url}
              alt={quote.books?.title || 'Kitap kapağı'}
              fill
              sizes="176px"
              className="object-cover"
            />
          </div>
          <div className="relative mt-8 w-full">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-red-500">{quote.books?.title}</p>
            <blockquote className="mt-5 border-l-4 border-red-600 pl-5 text-base font-medium leading-7 text-gray-200">
              “{quote.content}”
            </blockquote>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#080808]">
          <div className="flex-1 overflow-y-auto p-6 pb-8 md:p-10 md:pb-8">
            <div className="pr-12 md:hidden">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Kitaptan Alıntı</p>
              <div className="mt-4 flex gap-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-lg dark:border-white/15 dark:bg-white/5">
                  <BookCoverImage src={quote.books?.cover_url} alt={quote.books?.title || 'Kitap kapağı'} fill sizes="80px" className="object-cover" />
                </div>
                <blockquote className="border-l-4 border-red-600 pl-4 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">“{quote.content}”</blockquote>
              </div>
            </div>

            <div className="mt-6 md:mt-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kitap Bilgisi</p>
              <h2 className="mt-2 pr-12 text-2xl font-black tracking-tight">{quote.books?.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-500">
                <span>Kitap sahibi:</span>
                <ProfileUsername profile={quote.bookAuthor} fallback={quote.books?.username} isAdmin={bookAuthorIsAdmin} isPremium={quote.bookAuthor?.role === 'premium'} />
              </div>
            </div>

            {quote.books?.summary && (
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{quote.books.summary}</p>
            )}

            <div className="mt-5 flex items-center justify-between border-y border-gray-100 py-4 dark:border-white/5">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Alıntıyı paylaşan</p>
                <div className="mt-1 truncate text-sm font-bold"><ProfileUsername profile={quote.profile} isAdmin={ownerIsAdmin} isPremium={quote.profile?.role === 'premium'} /></div>
              </div>
              <button type="button" onClick={toggleLike} className={`flex min-h-10 items-center gap-2 rounded-full px-5 text-xs font-black transition ${hasLiked ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-300'}`}>
                ❤️ {likeCount}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Yorumlar <span>({comments.length})</span></h3>
              <div className="mt-4 space-y-5 pb-4">
                {comments.filter((comment) => !comment.parent_id).map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    <CommentItem comment={comment} />
                    {getThreadReplies(comment.id).map((reply) => <CommentItem key={reply.id} comment={reply} isReply />)}
                  </div>
                ))}
                {!comments.length && <p className="py-5 text-sm italic text-gray-500">İlk yorumu sen yap...</p>}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-[#080808] md:p-6">
          {user && (
            <form onSubmit={submitComment} className="mb-3 rounded-[2rem] border border-gray-100 bg-gray-50 p-2 dark:border-white/5 dark:bg-white/5">
              {replyTo && replyToUsername && (
                <div className="mb-2 flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase text-red-500"><span className="text-gray-500">Yanıtlanıyor:</span> @{replyToUsername}</p>
                  <button type="button" onClick={() => { setReplyTo(null); setReplyToUsername(''); setCommentText(''); }} className="text-[9px] font-black uppercase text-gray-400 hover:text-red-500">İptal</button>
                </div>
              )}
              <div className="flex gap-2">
                <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Yorum yaz..." className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
                <button type="submit" disabled={sendingComment || !commentText.trim()} className="rounded-full bg-red-600 px-5 text-[10px] font-black uppercase text-white disabled:opacity-50">Gönder</button>
              </div>
            </form>
          )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/kitap/${quote.book_id}`} className="flex min-h-10 min-w-[110px] flex-1 items-center justify-center rounded-full bg-red-600 px-4 text-center text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-red-700">Kitaba Git →</Link>
              {isAdmin && <button type="button" onClick={togglePin} disabled={pinning} className="min-h-10 min-w-[100px] flex-1 rounded-full bg-yellow-400 px-4 text-[10px] font-black uppercase text-black disabled:opacity-60">{quote.is_pinned ? '📌 Kaldır' : '📌 Tuttur'}</button>}
              {isOwner && <Link href={`/alinti-duzenle/${quote.id}`} className="flex min-h-10 min-w-[90px] flex-1 items-center justify-center rounded-full bg-blue-600 px-4 text-[10px] font-black uppercase text-white">Düzenle</Link>}
              {(isOwner || isAdmin) && <button type="button" onClick={deleteQuote} disabled={deleting} className="min-h-10 min-w-[75px] flex-1 rounded-full bg-gray-100 px-4 text-[10px] font-black uppercase text-black disabled:opacity-60 dark:bg-white dark:text-black">{deleting ? 'Siliniyor' : 'Sil'}</button>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
