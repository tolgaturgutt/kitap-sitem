'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import PodcastAudioPlayer from '@/components/PodcastAudioPlayer';
import { supabase } from '@/lib/supabase';

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/x-aac',
  'audio/ogg',
  'application/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm'
];

function getAudioExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'webm'].includes(extension)) {
    return extension;
  }
  if (file.type === 'audio/mp4') return 'm4a';
  if (file.type === 'audio/aac') return 'aac';
  if (file.type === 'audio/ogg') return 'ogg';
  if (file.type.includes('wav')) return 'wav';
  if (file.type === 'audio/webm') return 'webm';
  return 'mp3';
}

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
    audio.src = objectUrl;
  });
}

export default function AudiobookAudioUpload({
  bookId,
  value,
  duration,
  title,
  bookTitle,
  coverUrl,
  onChange,
  disabled = false
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const extension = getAudioExtension(file);
    const hasAcceptedExtension = ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'webm']
      .includes(file.name.split('.').pop()?.toLowerCase());
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type) && !hasAcceptedExtension) {
      toast.error('MP3, M4A, AAC, OGG, WAV veya WebM ses dosyası seçmelisin.');
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      toast.error('Ses dosyası en fazla 250 MB olabilir.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Ses bölümü yükleniyor...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Önce giriş yapmalısın.');

      const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileName = `${user.id}/${bookId}/${uniqueId}.${extension}`;
      const audioDuration = await readAudioDuration(file);
      const { error: uploadError } = await supabase.storage
        .from('audiobooks')
        .upload(fileName, file, {
          cacheControl: '31536000',
          contentType: file.type || 'audio/mpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('audiobooks').getPublicUrl(fileName);
      onChange({ url: publicUrl, duration: audioDuration });
      toast.success('Ses bölümü hazır.', { id: toastId });
    } catch (error) {
      console.error('Audiobook upload error:', error);
      toast.error(
        `${error?.message || ''}`.includes('PREMIUM')
          ? 'Sesli kitap yalnızca Premium üyeler ve adminler içindir.'
          : `Ses yüklenemedi: ${error.message}`,
        { id: toastId }
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className={`relative flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed p-8 text-center transition-all ${
        uploading || disabled
          ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-60 dark:border-white/10 dark:bg-white/5'
          : 'border-red-500/50 bg-red-50 hover:border-red-500 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20'
      }`}>
        <input
          type="file"
          accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.aac,.ogg,.wav,.webm"
          onChange={handleFileChange}
          disabled={uploading || disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-3xl text-white shadow-xl shadow-red-600/30">
          {uploading ? '…' : '+'}
        </span>
        <p className="text-sm font-black uppercase tracking-widest dark:text-white">
          {uploading ? 'Ses yükleniyor' : value ? 'Ses dosyasını değiştir' : 'Ses dosyası ekle'}
        </p>
        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
          MP3, M4A, AAC, OGG, WAV veya WebM · En fazla 250 MB
        </p>
      </label>

      {value && (
        <PodcastAudioPlayer
          src={value}
          title={title || 'Ses Bölümü Önizlemesi'}
          bookTitle={bookTitle}
          coverUrl={coverUrl}
        />
      )}
    </div>
  );
}
