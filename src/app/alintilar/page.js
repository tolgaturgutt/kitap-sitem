'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import QuoteCard from '@/components/QuoteCard';
import QuoteModal from '@/components/QuoteModal';
import { getAdminEmails } from '@/lib/admins';
import { fetchBookQuotes } from '@/lib/quotes';

export default function AlintilarPage() {
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [adminEmails, setAdminEmails] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: { user: activeUser } }, emails, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        getAdminEmails(),
        fetchBookQuotes({ since: new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString() }),
      ]);
      setUser(activeUser || null);
      setAdminEmails(emails);
      if (error || !data?.length) {
        setQuotes([]);
        setLoading(false);
        return;
      }

      const visible = data.filter((quote) => quote.books && !quote.books.is_draft);
      const profileIds = [...new Set(visible.flatMap((quote) => [quote.user_id, quote.books?.user_id]).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, email, role').in('id', profileIds);
      const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
      const enrichedQuotes = visible.map((quote) => ({
        ...quote,
        profile: profilesById.get(quote.user_id) || null,
        bookAuthor: profilesById.get(quote.books?.user_id) || null,
      }));
      setQuotes(enrichedQuotes);
      const requestedQuoteId = new URLSearchParams(window.location.search).get('quote');
      if (requestedQuoteId) {
        setSelectedQuote(enrichedQuotes.find((quote) => String(quote.id) === requestedQuoteId) || null);
      }

      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-20 dark:bg-black md:px-6">
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

      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex flex-col items-center gap-6 rounded-[4rem] border bg-white p-10 shadow-sm dark:border-white/5 dark:bg-white/5">
          <div className="text-center">
            <h1 className="mb-2 text-4xl font-black uppercase tracking-tighter dark:text-white md:text-5xl">“ Tüm Alıntılar</h1>
            <p className="text-sm tracking-wide text-gray-500 dark:text-gray-400">Son 24 saatin alıntıları</p>
          </div>

          <div className="flex w-full justify-center gap-12 border-t pt-6 dark:border-white/5">
            <div className="text-center">
              <p className="text-2xl font-black text-red-600">{quotes.length}</p>
              <p className="text-[9px] uppercase tracking-widest opacity-40">Toplam Alıntı</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[154px] animate-pulse rounded-[1.6rem] bg-gray-200 dark:bg-white/10" />)}
          </div>
        ) : quotes.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} onClick={setSelectedQuote} adminEmails={adminEmails} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed p-12 text-center text-gray-500 dark:border-white/10">Son 24 saatte hiç alıntı paylaşılmamış.</div>
        )}
      </div>
    </main>
  );
}
