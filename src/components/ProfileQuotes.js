'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import QuoteCard from '@/components/QuoteCard';
import QuoteModal from '@/components/QuoteModal';
import { fetchBookQuotes } from '@/lib/quotes';

export default function ProfileQuotes({ profile, user, adminEmails = [] }) {
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuotes() {
      setLoading(true);
      const { data, error } = await fetchBookQuotes({ userId: profile?.id });
      if (error || !data?.length) {
        setQuotes([]);
        setLoading(false);
        return;
      }

      const visibleQuotes = data.filter((quote) => quote.books && !quote.books.is_draft);
      const bookAuthorIds = [...new Set(visibleQuotes.map((quote) => quote.books?.user_id).filter(Boolean))];
      const { data: bookAuthors } = bookAuthorIds.length
        ? await supabase.from('profiles').select('id, username, avatar_url, email, role').in('id', bookAuthorIds)
        : { data: [] };
      const bookAuthorMap = new Map((bookAuthors || []).map((bookAuthor) => [bookAuthor.id, bookAuthor]));

      setQuotes(visibleQuotes.map((quote) => ({
        ...quote,
        profile,
        bookAuthor: bookAuthorMap.get(quote.books?.user_id) || null,
      })));
      setLoading(false);
    }

    if (profile?.id) loadQuotes();
  }, [profile]);

  const viewerIsAdmin = Boolean(user?.email && adminEmails.some((email) => email.toLowerCase() === user.email.toLowerCase()));
  const ownerIsAdmin = Boolean(profile?.email && adminEmails.some((email) => email.toLowerCase() === profile.email.toLowerCase()));

  return (
    <div>
      {selectedQuote && (
        <QuoteModal
          quote={selectedQuote}
          user={user}
          isAdmin={viewerIsAdmin}
          ownerIsAdmin={ownerIsAdmin}
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[154px] animate-pulse rounded-[1.6rem] bg-gray-200 dark:bg-white/10" />)}
        </div>
      ) : quotes.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} onClick={setSelectedQuote} adminEmails={adminEmails} />)}
        </div>
      ) : (
        <div className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Henüz paylaşılmış alıntı yok.</div>
      )}
    </div>
  );
}
