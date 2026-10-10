'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import BookCoverImage from '@/components/BookCoverImage';

export default function AlintiDuzenlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) {
        router.replace('/giris');
        return;
      }

      const { data: quote, error: quoteError } = await supabase
        .from('book_quotes')
        .select('id, user_id, book_id, content')
        .eq('id', id)
        .maybeSingle();

      if (quoteError || !quote || quote.user_id !== activeUser.id) {
        toast.error('Bu alıntıyı düzenleme yetkin yok.');
        router.replace('/');
        return;
      }

      const { data: bookRows, error: booksError } = await supabase
        .from('books')
        .select('id, title, cover_url, user_id, co_author_id, co_author_status, profiles:user_id(username)')
        .eq('is_draft', false)
        .neq('user_id', activeUser.id)
        .order('title');

      if (booksError) {
        toast.error('Kitaplar yüklenemedi.');
        return;
      }

      const selectable = (bookRows || []).filter((book) => !(
        book.co_author_id === activeUser.id && book.co_author_status === 'accepted'
      ));
      setUser(activeUser);
      setBooks(selectable);
      setSelectedBook(selectable.find((book) => String(book.id) === String(quote.book_id)) || null);
      setContent(quote.content || '');
      setLoading(false);
    }
    load();
  }, [id, router]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return query
      ? books.filter((book) => `${book.title} ${book.profiles?.username || ''}`.toLocaleLowerCase('tr-TR').includes(query))
      : books;
  }, [books, search]);

  async function save(event) {
    event.preventDefault();
    if (!user || !selectedBook || content.trim().length < 3) return;
    setSaving(true);
    const toastId = toast.loading('Alıntı güncelleniyor...');
    const { error } = await supabase
      .from('book_quotes')
      .update({ book_id: selectedBook.id, content: content.trim() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Quote update error:', error);
      toast.error('Alıntı güncellenemedi.', { id: toastId });
      setSaving(false);
      return;
    }
    toast.success('Alıntı güncellendi.', { id: toastId });
    router.push('/');
  }

  if (loading) return <div className="min-h-screen bg-[#fafafa] py-40 text-center font-black dark:bg-black">Alıntı yükleniyor...</div>;

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-20 dark:bg-black md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-4xl font-black uppercase tracking-tighter dark:text-white">Alıntıyı Düzenle</h1>
        <form onSubmit={save} className="space-y-7 rounded-[2.5rem] border bg-white p-6 dark:border-white/10 dark:bg-white/5 md:p-10">
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-gray-500">Kitap</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kitap veya yazar ara..." className="w-full rounded-2xl border bg-gray-50 p-4 outline-none focus:border-red-600 dark:border-white/10 dark:bg-black" />
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl border p-2 dark:border-white/10">
              {filteredBooks.slice(0, 50).map((book) => (
                <button type="button" key={book.id} onClick={() => setSelectedBook(book)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${selectedBook?.id === book.id ? 'bg-red-50 ring-1 ring-red-500 dark:bg-red-950/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md"><BookCoverImage src={book.cover_url} alt={book.title} fill sizes="40px" className="object-cover" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-black dark:text-white">{book.title}</span><span className="text-xs text-gray-500">@{book.profiles?.username || 'yazar'}</span></span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-gray-500">Alıntı Metni</label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} rows={7} className="w-full resize-none rounded-2xl border bg-gray-50 p-4 leading-7 outline-none focus:border-red-600 dark:border-white/10 dark:bg-black" />
            <p className="mt-2 text-right text-xs font-bold text-gray-400">{content.length}/1000</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="flex-1 rounded-2xl bg-gray-100 py-4 text-sm font-black uppercase dark:bg-white/10">İptal</button>
            <button type="submit" disabled={saving || !selectedBook || content.trim().length < 3} className="flex-[2] rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase text-white disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
