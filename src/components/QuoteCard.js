'use client';

import BookCoverImage from '@/components/BookCoverImage';
import Username from '@/components/Username';
import Image from 'next/image';

export default function QuoteCard({ quote, onClick, adminEmails = [], className = '' }) {
  const author = quote.profile || {};
  const authorIsAdmin = Boolean(author.email && adminEmails.some((email) => email.toLowerCase() === author.email.toLowerCase()));
  const bookAuthor = quote.bookAuthor || {};
  const bookAuthorIsAdmin = Boolean(bookAuthor.email && adminEmails.some((email) => email.toLowerCase() === bookAuthor.email.toLowerCase()));

  return (
    <button
      type="button"
      onClick={() => onClick?.(quote)}
      className={`group/quote relative flex w-full min-h-[154px] items-stretch gap-4 overflow-hidden rounded-[1.6rem] border border-red-500/75 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/10 dark:bg-[#100909] ${className}`}
    >
      {quote.is_pinned && (
        <span className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-xs shadow-md" aria-label="Tutturulmuş alıntı">📌</span>
      )}
      <div className="relative h-[122px] w-[82px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-gray-100 shadow-md dark:border-white/15 dark:bg-white/5">
        <BookCoverImage
          src={quote.books?.cover_url}
          alt={quote.books?.title || 'Kitap kapağı'}
          fill
          sizes="82px"
          className="object-cover transition-transform duration-500 group-hover/quote:scale-105"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-1">
        <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-red-600">
          {quote.books?.title}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] font-bold text-gray-400">
          <span className="shrink-0">Kitap sahibi:</span>
          <Username
            username={bookAuthor.username || quote.books?.username || 'yazar'}
            isAdmin={bookAuthorIsAdmin}
            isPremium={bookAuthor.role === 'premium'}
            className="min-w-0 truncate text-[10px] font-bold"
          />
        </div>
        <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-gray-800 dark:text-gray-100 md:text-base">
          {quote.content}
        </p>
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-3 text-gray-500 dark:text-gray-400">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[10px] font-black dark:bg-white/10">
            {author.avatar_url ? (
              <Image src={author.avatar_url} alt="" fill unoptimized sizes="28px" className="object-cover" />
            ) : (
              (author.username || '?')[0].toUpperCase()
            )}
          </span>
          <span className="min-w-0 truncate text-xs font-bold">
            <span className="mr-1 text-[9px] uppercase text-gray-400">Paylaşan</span>
            <Username
              username={author.username || 'kullanici'}
              isAdmin={authorIsAdmin}
              isPremium={author.role === 'premium'}
              className="text-xs font-bold"
            />
          </span>
        </div>
      </div>
    </button>
  );
}
