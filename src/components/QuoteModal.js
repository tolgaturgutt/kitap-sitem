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
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kitaptan alıntı"
    >
      <div
        className="relative max-h-[84vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#080808] p-5 text-white shadow-2xl md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-red-600"
          aria-label="Kapat"
        >
          ×
        </button>

        <h2 className="pr-12 text-xl font-black tracking-tight md:text-2xl">Kitaptan Alıntı</h2>
        <blockquote className="mt-4 border-l-4 border-red-600 pl-4 text-base font-medium leading-7 text-gray-300 md:text-lg md:leading-8">
          “{quote.content}”
        </blockquote>

        <div className="my-5 h-px bg-white/10" />

        <h3 className="text-xl font-black">Kitap Bilgisi</h3>
        <div className="mt-4 flex items-start gap-4">
          <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/5 shadow-xl">
            <BookCoverImage
              src={quote.books?.cover_url}
              alt={quote.books?.title || 'Kitap kapağı'}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 pt-1">
            <p className="text-lg font-black md:text-xl">{quote.books?.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-400">
              <span>Kitap sahibi:</span>
              <ProfileUsername profile={quote.bookAuthor} fallback={quote.books?.username} isAdmin={bookAuthorIsAdmin} isPremium={quote.bookAuthor?.role === 'premium'} />
            </div>
            {quote.books?.summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-400">
                {quote.books.summary}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alıntıyı paylaşan</p>
            <div className="mt-1 truncate text-sm font-bold text-gray-300"><ProfileUsername profile={quote.profile} isAdmin={ownerIsAdmin} isPremium={quote.profile?.role === 'premium'} /></div>
          </div>
          <button type="button" onClick={toggleLike} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${hasLiked ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/15'}`}>
            {hasLiked ? '♥' : '♡'} {likeCount}
          </button>
        </div>

        <section className="mt-4 border-t border-white/10 pt-4">
          <h3 className="text-lg font-black">Yorumlar <span className="text-sm text-gray-500">({comments.length})</span></h3>
          <div className="mt-4 max-h-52 space-y-4 overflow-y-auto pr-1">
            {comments.filter((comment) => !comment.parent_id).map((comment) => (
              <div key={comment.id} className="space-y-3">
                <CommentItem comment={comment} />
                {getThreadReplies(comment.id).map((reply) => <CommentItem key={reply.id} comment={reply} isReply />)}
              </div>
            ))}
            {!comments.length && <p className="py-5 text-sm italic text-gray-500">İlk yorumu sen yap...</p>}
          </div>
          {user && (
            <form onSubmit={submitComment} className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-2">
              {replyTo && replyToUsername && (
                <div className="mb-2 flex items-center justify-between border-b border-white/10 px-3 py-2">
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
        </section>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/kitap/${quote.book_id}`}
            className="flex min-h-12 min-w-[120px] flex-1 items-center justify-center rounded-xl bg-red-600 px-3 text-center text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700"
          >
            Kitaba Git →
          </Link>
          {isAdmin && (
            <button
              type="button"
              onClick={togglePin}
              disabled={pinning}
              className="min-h-12 min-w-[110px] flex-1 rounded-xl bg-yellow-400 px-3 text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300 disabled:opacity-60"
            >
              {quote.is_pinned ? '📌 Kaldır' : '📌 Tuttur'}
            </button>
          )}
          {isOwner && (
            <Link href={`/alinti-duzenle/${quote.id}`} className="flex min-h-12 min-w-[100px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700">Düzenle</Link>
          )}
          {(isOwner || isAdmin) && (
            <button type="button" onClick={deleteQuote} disabled={deleting} className="min-h-12 min-w-[80px] flex-1 rounded-xl bg-white px-3 text-xs font-black uppercase tracking-wide text-black transition hover:bg-gray-200 disabled:opacity-60">
              {deleting ? 'Siliniyor' : 'Sil'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
