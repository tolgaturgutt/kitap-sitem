'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { supabase } from '@/lib/supabase';
import QuoteCard from '@/components/QuoteCard';
import QuoteModal from '@/components/QuoteModal';
import { fetchBookQuotes } from '@/lib/quotes';

function Link(props) {
  return <NextLink prefetch={false} {...props} />;
}

export default function QuoteCarousel({ user, adminEmails = [] }) {
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadQuotes() {
      const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
      const { data, error } = await fetchBookQuotes({ limit: 10, since: twentyFourHoursAgo });

      if (error || !data?.length) {
        setQuotes([]);
        return;
      }

      const visibleQuotes = data.filter((quote) => quote.books && !quote.books.is_draft);
      const userIds = [...new Set(visibleQuotes.flatMap((quote) => [quote.user_id, quote.books?.user_id]).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, email, role')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
      setQuotes(visibleQuotes.map((quote) => ({
        ...quote,
        profile: profileMap.get(quote.user_id) || null,
        bookAuthor: profileMap.get(quote.books?.user_id) || null,
      })));
    }
    loadQuotes();
  }, [user]);

  const quoteGroups = useMemo(() => {
    const groups = [];
    for (let index = 0; index < quotes.length; index += 2) groups.push(quotes.slice(index, index + 2));
    return groups;
  }, [quotes]);

  const scroll = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction === 'right' ? scrollRef.current.clientWidth * 0.9 : -scrollRef.current.clientWidth * 0.9,
      behavior: 'smooth',
    });
  };

  if (!quotes.length) return null;

  return (
    <section className="mb-20">
      {selectedQuote && (
        <QuoteModal
          quote={selectedQuote}
          user={user}
          isAdmin={Boolean(user?.email && adminEmails.some((email) => email.toLowerCase() === user.email.toLowerCase()))}
          ownerIsAdmin={Boolean(selectedQuote.profile?.email && adminEmails.some((email) => email.toLowerCase() === selectedQuote.profile.email.toLowerCase()))}
          adminEmails={adminEmails}
          onClose={() => setSelectedQuote(null)}
          onUpdated={(quoteId, changes) => {
            setQuotes((current) => current
              .map((quote) => quote.id === quoteId ? { ...quote, ...changes } : quote)
              .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.created_at) - new Date(a.created_at)));
            setSelectedQuote((current) => current?.id === quoteId ? { ...current, ...changes } : current);
          }}
          onDeleted={(quoteId) => setQuotes((current) => current.filter((quote) => quote.id !== quoteId))}
        />
      )}

      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-red-600">
          <span className="text-xl leading-none">“</span> Alıntılar
        </h2>
        <Link href="/alintilar" className="text-[10px] font-black uppercase tracking-widest text-gray-400 transition hover:text-red-600">
          Tümünü Gör →
        </Link>
      </div>

      <div className="group relative">
        <button type="button" onClick={() => scroll('left')} className="absolute -left-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-lg shadow-xl transition hover:scale-110 md:flex dark:border-gray-800 dark:bg-gray-900">←</button>
        <button type="button" onClick={() => scroll('right')} className="absolute -right-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-lg shadow-xl transition hover:scale-110 md:flex dark:border-gray-800 dark:bg-gray-900">→</button>

        <div ref={scrollRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide md:gap-5">
          {quoteGroups.map((group) => (
            <div
              key={group[0].id}
              className="flex w-[calc(100%-2.5rem)] shrink-0 snap-start flex-col gap-3 md:w-[calc(50%-0.625rem)]"
            >
              {group.map((quote) => <QuoteCard key={quote.id} quote={quote} onClick={setSelectedQuote} adminEmails={adminEmails} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
