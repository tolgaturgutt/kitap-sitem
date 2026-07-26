'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import AudiobookAudioUpload from '@/components/AudiobookAudioUpload';
import { supabase } from '@/lib/supabase';

export default function SesBolumuEkle({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState({ url: '', duration: 0 });
  const [bannedWords, setBannedWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(null);

  useEffect(() => {
    async function loadPage() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/giris');
        return;
      }

      const [{ data: currentBook, error: bookError }, { data: premiumAccess }, { data: words }] = await Promise.all([
        supabase
          .from('books')
          .select('id, title, cover_url, book_type, user_id, user_email, username, co_author_id, co_author_status')
          .eq('id', id)
          .single(),
        supabase.rpc('can_use_premium_features'),
        supabase.from('banned_words').select('word')
      ]);

      if (bookError || !currentBook) {
        toast.error('Sesli kitap bulunamadı.');
        router.replace('/');
        return;
      }

      const { data: admin } = await supabase
        .from('announcement_admins')
        .select('user_email')
        .eq('user_email', user.email)
        .maybeSingle();
      const canEdit = currentBook.user_id === user.id
        || currentBook.user_email === user.email
        || (
          currentBook.co_author_id === user.id
          && currentBook.co_author_status === 'accepted'
        )
        || Boolean(admin);

      if (currentBook.book_type !== 'audio') {
        router.replace(`/kitap/${id}/bolum-ekle`);
        return;
      }

      if (!canEdit || !premiumAccess) {
        toast.error('Sesli kitap bölümü yalnızca Premium üyeler ve adminler tarafından eklenebilir.');
        router.replace(`/kitap/${id}`);
        return;
      }

      setBook(currentBook);
      setBannedWords(words?.map(item => item.word.toLowerCase()) || []);
      setLoading(false);
    }

    loadPage();
  }, [id, router]);

  function findBannedWords(value) {
    const words = value.toLowerCase().match(/[a-zA-ZğüşıöçĞÜŞİÖÇ]+/g) || [];
    return bannedWords.filter(word => words.includes(word.toLowerCase()));
  }

  function censorTitle(value) {
    return bannedWords.reduce(
      (result, word) => result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '***'),
      value
    );
  }

  async function saveChapter(event, isDraft = false) {
    event.preventDefault();

    if (!title.trim()) {
      toast.error('Ses bölümünün başlığını yazmalısın.');
      return;
    }
    if (!audio.url) {
      toast.error('Bir ses dosyası yüklemelisin.');
      return;
    }

    const detectedWords = findBannedWords(title);
    if (detectedWords.length > 0) {
      toast.error(`Yasaklı kelimeler tespit edildi: ${detectedWords.join(', ')}`);
      return;
    }

    setSavingMode(isDraft ? 'draft' : 'publish');

    try {
      const { count } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id);
      const orderNo = (count || 0) + 1;
      const { data: newChapter, error } = await supabase
        .from('chapters')
        .insert({
          book_id: id,
          title: censorTitle(title.trim()),
          content: '',
          audio_url: audio.url,
          audio_duration_seconds: audio.duration || 0,
          order_no: orderNo,
          word_count: 0,
          is_draft: isDraft,
          published_at: isDraft ? null : new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (!isDraft) {
        const { data: followers } = await supabase
          .from('follows')
          .select('user_email')
          .eq('book_id', id);

        if (followers?.length) {
          await supabase.from('notifications').insert(
            followers.map(follower => ({
              recipient_email: follower.user_email,
              actor_username: book.username,
              type: 'new_chapter',
              book_title: book.title,
              book_id: Number(id),
              chapter_id: newChapter.id,
              is_read: false,
              created_at: new Date()
            }))
          );
        }
      }

      toast.success(isDraft ? 'Ses bölümü taslağa kaydedildi.' : 'Ses bölümü yayınlandı.');
      router.push(`/kitap/${id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        `${error?.message || ''}`.includes('PREMIUM')
          ? 'Sesli kitap bölümlerini yalnızca Premium üyeler ve adminler ekleyebilir.'
          : `Ses bölümü kaydedilemedi: ${error.message}`
      );
    } finally {
      setSavingMode(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-4xl font-black text-white/10">
        YÜKLENİYOR
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-24 text-white md:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <span className="mb-4 inline-flex rounded-full bg-amber-400 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-black">
            Premium Sesli Kitap
          </span>
          <h1 className="text-4xl font-black tracking-tighter">Yeni Ses Bölümü</h1>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            Podcast bölümünü yükle
          </p>
        </header>

        <form
          onSubmit={(event) => saveChapter(event, false)}
          className="space-y-7 rounded-[2.5rem] border border-white/10 bg-[#111] p-6 shadow-2xl md:p-10"
        >
          <div>
            <label className="mb-3 ml-3 block text-[9px] font-black uppercase tracking-widest text-white/40">
              Bölüm Başlığı
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 font-bold text-white outline-none transition-colors focus:border-red-500"
              placeholder="Örn: 1. Bölüm · Başlangıç"
            />
          </div>

          <AudiobookAudioUpload
            bookId={id}
            value={audio.url}
            duration={audio.duration}
            title={title}
            bookTitle={book.title}
            coverUrl={book.cover_url}
            onChange={setAudio}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-14 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/45 hover:bg-white/10"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={(event) => saveChapter(event, true)}
              disabled={savingMode !== null}
              className="h-14 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/15 disabled:opacity-50"
            >
              {savingMode === 'draft' ? 'Kaydediliyor...' : 'Taslağa Kaydet'}
            </button>
            <button
              type="submit"
              disabled={savingMode !== null}
              className="h-14 rounded-full bg-red-600 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/25 hover:bg-red-500 disabled:opacity-50"
            >
              {savingMode === 'publish' ? 'Yayınlanıyor...' : 'Ses Bölümünü Yayınla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
