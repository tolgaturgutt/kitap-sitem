'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'aac',
  'm4a',
  'mp3',
  'ogg',
  'wav',
  'webm',
]);

function getAudioExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && ALLOWED_EXTENSIONS.has(extension)) return extension;

  if (file.type === 'audio/mp4') return 'm4a';
  if (file.type === 'audio/aac') return 'aac';
  if (file.type === 'audio/ogg') return 'ogg';
  if (file.type === 'audio/wav' || file.type === 'audio/x-wav') return 'wav';
  if (file.type === 'audio/webm') return 'webm';
  return 'mp3';
}

function isAllowedAudioFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    file.type.startsWith('audio/')
    || (extension && ALLOWED_EXTENSIONS.has(extension))
  );
}

export default function ChapterAudioUploadButton({
  bookId,
  editorRef,
  onInserted,
}) {
  const inputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [canUseAudio, setCanUseAudio] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .rpc('can_use_chapter_images')
      .then(({ data }) => {
        if (!cancelled) setCanUseAudio(Boolean(data));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!canUseAudio) return null;

  function rememberEditorSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function openFilePicker(event) {
    event.preventDefault();
    rememberEditorSelection();
    inputRef.current?.click();
  }

  function insertAudioAtSelection(publicUrl) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    const range = savedRangeRef.current?.cloneRange() || document.createRange();

    if (!savedRangeRef.current) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const beforeBreak = document.createElement('br');
    const audio = document.createElement('audio');
    const afterBreak = document.createElement('br');
    const cursorAnchor = document.createTextNode('\u200B');

    audio.src = publicUrl;
    audio.controls = true;
    audio.preload = 'metadata';
    audio.dataset.chapterAudio = 'true';
    audio.contentEditable = 'false';
    audio.setAttribute('aria-label', 'Bölüm ses kaydı');

    range.deleteContents();
    range.insertNode(cursorAnchor);
    range.insertNode(afterBreak);
    range.insertNode(audio);
    range.insertNode(beforeBreak);

    range.setStartAfter(cursorAnchor);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
    onInserted?.();
  }

  async function handleAudioSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;

    if (!isAllowedAudioFile(file)) {
      toast.error('MP3, M4A, AAC, OGG, WAV veya WebM ses dosyası seçmelisin.');
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Ses dosyası en fazla 25 MB olabilir.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Bölüm sesi yükleniyor...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const extension = getAudioExtension(file);
      const filePath =
        `chapter-audio/${user.id}/${bookId}/`
        + `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '31536000',
          contentType: file.type || 'audio/mpeg',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      insertAudioAtSelection(publicUrl);
      toast.success('Ses imlecin bulunduğu yere eklendi.', { id: toastId });
    } catch (error) {
      console.error('Chapter audio upload error:', error);
      toast.error(error?.message || 'Ses dosyası yüklenemedi.', {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.aac,.ogg,.wav,.webm"
        onChange={handleAudioSelected}
        className="hidden"
      />
      <button
        type="button"
        onMouseDown={openFilePicker}
        disabled={uploading}
        className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
        title="İmlecin bulunduğu yere ses ekle"
      >
        <span aria-hidden="true">🎙️</span>
        {uploading ? 'Yükleniyor...' : 'Ses Ekle'}
      </button>
    </>
  );
}
