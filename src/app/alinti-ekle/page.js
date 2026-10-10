'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import BookCoverImage from '@/components/BookCoverImage';

const MAX_QUOTE_LENGTH = 1000;

export default function AlintiEklePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function initialize() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) {
        router.replace('/giris');
        return;
      }
      setUser(activeUser);

      const { data, error } = await supabase
        .from('books')
        .select('id, title, cover_url, summary, user_id, co_author_id, co_author_status, profiles:user_id(username)')
        .eq('is_draft', false)
        .neq('user_id', activeUser.id)
        .order('title');

      if (error) {
        toast.error('Kitaplar yüklenemedi.');
      } else {
        const selectableBooks = (data || []).filter((book) => !(
          book.co_author_id === activeUser.id && book.co_author_status === 'accepted'
        ));
        setBooks(selectableBooks);
      }
      setLoading(false);
    }
    initialize();
  }, [router]);

  const filteredBooks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedSearch) return books;
    return books.filter((book) => (
      `${book.title} ${book.profiles?.username || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
    ));
  }, [books, search]);

  async function submitQuote(event) {
    event.preventDefault();
    const cleanContent = content.trim();
    if (!selectedBook) {
      toast.error('Alıntının ait olduğu kitabı seçmelisin.');
      return;
    }
    if (cleanContent.length < 3) {
      toast.error('Alıntı en az 3 karakter olmalı.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Alıntı paylaşılıyor...');
    const { error } = await supabase.from('book_quotes').insert({
      user_id: user.id,
      book_id: selectedBook.id,
      content: cleanContent,
    });

    if (error) {
      const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      console.error('Quote insert error:', error);
      toast.error(
        error.code === 'PGRST205' || error.code === '42P01'
            ? 'Alıntı özelliği için veritabanı güncellemesi henüz uygulanmamış.'
            : error.code === '42501' || message.toLowerCase().includes('row-level security')
              ? 'Bu kitaptan alıntı paylaşma iznin yok. Kendi veya ortak yazarı olduğun kitaplar seçilemez.'
              : error.message
                ? `Alıntı paylaşılamadı: ${error.message}`
                : 'Alıntı paylaşılamadı.',
        { id: toastId }
      );
      setSaving(false);
      return;
    }

    toast.success('Alıntı paylaşıldı!', { id: toastId });
    router.push('/');
  }

  if (loading) {
    return <div className="min-h-screen bg-[#fafafa] py-40 text-center text-lg font-black dark:bg-black">Kitaplar yükleniyor...</div>;
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-20 dark:bg-black md:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter dark:text-white md:text-5xl">“ Alıntı Paylaş</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Kendi kitapların dışındaki bir kitabı seç ve paylaşmak istediğin metni yaz.</p>
        </div>

        <form onSubmit={submitQuote} className="space-y-8 rounded-[2.5rem] border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-10">
          <section>
            <label htmlFor="book-search" className="mb-3 block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Kitap Seç *</label>
            <input
              id="book-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kitap veya yazar ara..."
              className="w-full rounded-2xl border bg-gray-50 p-4 outline-none transition focus:border-red-600 dark:border-white/10 dark:bg-black"
            />

            {selectedBook && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-red-500/40 bg-red-50/50 p-3 dark:bg-red-950/10">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                  <BookCoverImage src={selectedBook.cover_url} alt={selectedBook.title} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black dark:text-white">{selectedBook.title}</p>
                  <p className="mt-1 text-xs text-gray-500">@{selectedBook.profiles?.username || 'yazar'}</p>
                </div>
                <button type="button" onClick={() => setSelectedBook(null)} className="rounded-xl px-3 py-2 text-xs font-black text-red-600">Kaldır</button>
              </div>
            )}

            {!selectedBook && (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border p-2 dark:border-white/10">
                {filteredBooks.slice(0, 50).map((book) => (
                  <button
                    type="button"
                    key={book.id}
                    onClick={() => { setSelectedBook(book); setSearch(''); }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-white/5">
                      <BookCoverImage src={book.cover_url} alt={book.title} fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black dark:text-white">{book.title}</span>
                      <span className="block truncate text-xs text-gray-500">@{book.profiles?.username || 'yazar'}</span>
                    </span>
                  </button>
                ))}
                {!filteredBooks.length && <p className="p-5 text-center text-sm text-gray-500">Seçilebilir kitap bulunamadı.</p>}
              </div>
            )}
          </section>

          <section>
            <label htmlFor="quote-content" className="mb-3 block text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Alıntı Metni *</label>
            <textarea
              id="quote-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_QUOTE_LENGTH}
              rows={7}
              placeholder="Paylaşmak istediğin alıntıyı buraya yaz..."
              className="w-full resize-none rounded-2xl border bg-gray-50 p-4 text-base leading-7 outline-none transition focus:border-red-600 dark:border-white/10 dark:bg-black"
            />
            <p className="mt-2 text-right text-xs font-bold text-gray-400">{content.length}/{MAX_QUOTE_LENGTH}</p>
          </section>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} disabled={saving} className="flex-1 rounded-2xl bg-gray-100 py-4 text-sm font-black uppercase text-gray-600 dark:bg-white/10 dark:text-gray-300">İptal</button>
            <button type="submit" disabled={saving || !selectedBook || content.trim().length < 3} className="flex-[2] rounded-2xl bg-red-600 py-4 text-sm font-black uppercase text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Paylaşılıyor...' : '“ Alıntıyı Paylaş'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
