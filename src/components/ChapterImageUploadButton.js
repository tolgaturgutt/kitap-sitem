'use client';

import { useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';

function getFileExtension(file) {
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;

  return 'jpg';
}

async function getImageDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      reject(new Error('Görsel boyutları okunamadı.'));
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

export default function ChapterImageUploadButton({
  bookId,
  editorRef,
  onInserted,
}) {
  const inputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [canUseImages, setCanUseImages] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .rpc('can_use_chapter_images')
      .then(({ data }) => {
        if (!cancelled) setCanUseImages(Boolean(data));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!canUseImages) return null;

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

  function insertImageAtSelection(publicUrl, dimensions) {
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
    const image = document.createElement('img');
    const afterBreak = document.createElement('br');
    const cursorAnchor = document.createTextNode('\u200B');

    image.src = publicUrl;
    image.alt = 'Bölüm görseli';
    image.dataset.chapterImage = 'true';
    image.contentEditable = 'false';
    image.loading = 'lazy';
    image.width = dimensions.width;
    image.height = dimensions.height;

    range.deleteContents();
    range.insertNode(cursorAnchor);
    range.insertNode(afterBreak);
    range.insertNode(image);
    range.insertNode(beforeBreak);

    range.setStartAfter(cursorAnchor);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
    onInserted?.();
  }

  async function handleImageSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Yalnızca görsel dosyası yükleyebilirsin.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Bölüm görseli yükleniyor...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.65,
        maxWidthOrHeight: 1600,
        fileType: 'image/webp',
        initialQuality: 0.88,
        useWebWorker: true,
      });
      const dimensions = await getImageDimensions(compressedFile);
      const extension = getFileExtension(compressedFile);
      const filePath =
        `chapter-images/${user.id}/${bookId}/` +
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedFile, {
          cacheControl: '31536000',
          contentType: compressedFile.type || file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      insertImageAtSelection(publicUrl, dimensions);
      toast.success('Görsel imlecin bulunduğu yere eklendi.', { id: toastId });
    } catch (error) {
      console.error('Chapter image upload error:', error);
      toast.error(error?.message || 'Görsel yüklenemedi.', { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />
      <button
        type="button"
        onMouseDown={openFilePicker}
        disabled={uploading}
        className="ml-auto flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-black text-black transition-all hover:bg-amber-400 disabled:opacity-50"
        title="İmlecin bulunduğu yere görsel ekle"
      >
        <span aria-hidden="true">🖼️</span>
        {uploading ? 'Yükleniyor...' : 'Görsel Ekle'}
      </button>
    </>
  );
}
