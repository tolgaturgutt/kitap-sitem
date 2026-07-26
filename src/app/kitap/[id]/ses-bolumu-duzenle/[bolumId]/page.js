'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import AudiobookAudioUpload from '@/components/AudiobookAudioUpload';
import { supabase } from '@/lib/supabase';

export default function SesBolumuDuzenle({ params }) {
  const { id, bolumId } = use(params);
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [title, setTitle] = useState('');
  const [audio, setAudio] = useState({ url: '', duration: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadChapter() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/giris');
        return;
      }

      const [{ data: chapter, error }, { data: premiumAccess }] = await Promise.all([
        supabase
          .from('chapters')
          .select('id, title, audio_url, audio_duration_seconds, books(id, title, cover_url, book_type, user_id, user_email, co_author_id, co_author_status)')
          .eq('id', bolumId)
          .eq('book_id', id)
          .single(),
        supabase.rpc('can_use_premium_features')
      ]);

      if (error || !chapter?.books) {
        toast.error('Ses bölümü bulunamadı.');
        router.replace(`/kitap/${id}`);
        return;
      }

      const { data: admin } = await supabase
        .from('announcement_admins')
        .select('user_email')
        .eq('user_email', user.email)
        .maybeSingle();
      const canEdit = chapter.books.user_id === user.id
        || chapter.books.user_email === user.email
        || (
          chapter.books.co_author_id === user.id
          && chapter.books.co_author_status === 'accepted'
        )
        || Boolean(admin);

      if (chapter.books.book_type !== 'audio') {
        router.replace(`/kitap/${id}/bolum-duzenle/${bolumId}`);
        return;
      }

      if (!canEdit || !premiumAccess) {
        toast.error('Sesli kitap bölümü yalnızca Premium üyeler ve adminler tarafından düzenlenebilir.');
        router.replace(`/kitap/${id}`);
        return;
      }

      setBook(chapter.books);
      setTitle(chapter.title || '');
      setAudio({
        url: chapter.audio_url || '',
        duration: chapter.audio_duration_seconds || 0
      });
      setLoading(false);
    }

    loadChapter();
  }, [bolumId, id, router]);

  async function updateChapter(event) {
    event.preventDefault();
    if (!title.trim() || !audio.url) {
      toast.error('Bölüm başlığı ve ses dosyası zorunludur.');
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: title.trim(),
          content: '',
          audio_url: audio.url,
          audio_duration_seconds: audio.duration || 0,
          word_count: 0,
          updated_at: new Date()
        })
        .eq('id', bolumId)
        .eq('book_id', id);

      if (error) throw error;

      toast.success('Ses bölümü güncellendi.');
      router.push(`/kitap/${id}/bolum/${bolumId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        `${error?.message || ''}`.includes('PREMIUM')
          ? 'Sesli kitap bölümlerini yalnızca Premium üyeler ve adminler düzenleyebilir.'
          : `Ses bölümü güncellenemedi: ${error.message}`
      );
    } finally {
      setUpdating(false);
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
          <h1 className="text-4xl font-black tracking-tighter">Ses Bölümünü Düzenle</h1>
        </header>

        <form
          onSubmit={updateChapter}
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-14 flex-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/45 hover:bg-white/10"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={updating}
              className="h-14 flex-[2] rounded-full bg-red-600 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/25 hover:bg-red-500 disabled:opacity-50"
            >
              {updating ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
