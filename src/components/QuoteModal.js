'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import BookCoverImage from '@/components/BookCoverImage';
import Username from '@/components/Username';
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
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const isOwner = Boolean(user?.id && user.id === quote.user_id);
  const bookAuthorIsAdmin = Boolean(quote.bookAuthor?.email && adminEmails.some((email) => email.toLowerCase() === quote.bookAuthor.email.toLowerCase()));

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
        supabase.from('quote_comments').select('id, quote_id, user_id, content, created_at').eq('quote_id', quote.id).order('created_at'),
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
      setComments(rows.map((comment) => ({ ...comment, profile: profileMap.get(comment.user_id) || null })));
    }
    loadEngagement();
  }, [quote.id, user]);

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
    setSendingComment(true);
    const { data, error } = await supabase.from('quote_comments').insert({ quote_id: quote.id, user_id: user.id, content }).select('id, quote_id, user_id, content, created_at').single();
    if (error) {
      toast.error('Yorum gönderilemedi.');
    } else {
      const { data: profile } = await supabase.from('profiles').select('id, username, avatar_url, email, role').eq('id', user.id).maybeSingle();
      setComments((current) => [...current, { ...data, profile: profile || null }]);
      setCommentText('');
      createQuoteCommentNotification(data.id).catch((notificationError) => console.error('Quote comment notification error:', notificationError));
    }
    setSendingComment(false);
  }

  async function deleteComment(commentId) {
    if (!confirm('Yorumu silmek istiyor musun?')) return;
    const { error } = await supabase.from('quote_comments').delete().eq('id', commentId);
    if (error) toast.error('Yorum silinemedi.');
    else setComments((current) => current.filter((comment) => comment.id !== commentId));
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

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kitaptan alıntı"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#080808] p-6 text-white shadow-2xl md:p-8"
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

        <h2 className="pr-12 text-2xl font-black tracking-tight">Kitaptan Alıntı</h2>
        <blockquote className="mt-6 border-l-4 border-red-600 pl-5 text-lg font-medium leading-8 text-gray-300 md:text-xl md:leading-9">
          “{quote.content}”
        </blockquote>

        <div className="my-8 h-px bg-white/10" />

        <h3 className="text-2xl font-black">Kitap Bilgisi</h3>
        <div className="mt-6 flex items-start gap-5">
          <div className="relative h-44 w-28 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/5 shadow-xl">
            <BookCoverImage
              src={quote.books?.cover_url}
              alt={quote.books?.title || 'Kitap kapağı'}
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 pt-1">
            <p className="text-xl font-black md:text-2xl">{quote.books?.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-400">
              <span>Kitap sahibi:</span>
              <ProfileUsername profile={quote.bookAuthor} fallback={quote.books?.username} isAdmin={bookAuthorIsAdmin} isPremium={quote.bookAuthor?.role === 'premium'} />
            </div>
            {quote.books?.summary && (
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400 md:text-base">
                {quote.books.summary}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alıntıyı paylaşan</p>
            <div className="mt-1 truncate text-sm font-bold text-gray-300"><ProfileUsername profile={quote.profile} isAdmin={ownerIsAdmin} isPremium={quote.profile?.role === 'premium'} /></div>
          </div>
          <button type="button" onClick={toggleLike} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${hasLiked ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/15'}`}>
            {hasLiked ? '♥' : '♡'} {likeCount}
          </button>
        </div>

        <section className="mt-6 border-t border-white/10 pt-6">
          <h3 className="text-lg font-black">Yorumlar <span className="text-sm text-gray-500">({comments.length})</span></h3>
          <form onSubmit={submitComment} className="mt-4 flex gap-2">
            <input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Alıntı hakkında yorum yap..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-red-600" />
            <button type="submit" disabled={sendingComment || !commentText.trim()} className="rounded-xl bg-red-600 px-4 text-xs font-black uppercase text-white disabled:opacity-50">Gönder</button>
          </form>
          <div className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-1">
            {comments.map((comment) => {
              const commentIsAdmin = Boolean(comment.profile?.email && adminEmails.some((email) => email.toLowerCase() === comment.profile.email.toLowerCase()));
              const canDeleteComment = isAdmin || isOwner || user?.id === comment.user_id;
              return (
                <div key={comment.id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <ProfileUsername profile={comment.profile} isAdmin={commentIsAdmin} isPremium={comment.profile?.role === 'premium'} className="text-xs font-black" />
                    {canDeleteComment && <button type="button" onClick={() => deleteComment(comment.id)} className="text-[10px] font-black uppercase text-red-500">Sil</button>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{comment.content}</p>
                </div>
              );
            })}
            {!comments.length && <p className="py-5 text-center text-sm text-gray-500">Henüz yorum yok.</p>}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/kitap/${quote.book_id}`}
            className="flex min-h-14 min-w-[130px] flex-1 items-center justify-center rounded-2xl bg-red-600 px-3 text-center text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700 md:text-sm"
          >
            Kitaba Git →
          </Link>
          {isAdmin && (
            <button
              type="button"
              onClick={togglePin}
              disabled={pinning}
              className="min-h-14 min-w-[120px] flex-1 rounded-2xl bg-yellow-400 px-3 text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300 disabled:opacity-60 md:text-sm"
            >
              {quote.is_pinned ? '📌 Kaldır' : '📌 Tuttur'}
            </button>
          )}
          {isOwner && (
            <Link href={`/alinti-duzenle/${quote.id}`} className="flex min-h-14 min-w-[110px] flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700 md:text-sm">Düzenle</Link>
          )}
          {(isOwner || isAdmin) && (
            <button type="button" onClick={deleteQuote} disabled={deleting} className="min-h-14 min-w-[90px] flex-1 rounded-2xl bg-white px-3 text-xs font-black uppercase tracking-wide text-black transition hover:bg-gray-200 disabled:opacity-60 md:text-sm">
              {deleting ? 'Siliniyor' : 'Sil'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
