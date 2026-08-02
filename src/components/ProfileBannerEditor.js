'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const EMPTY_TRANSFORM = { zoom: 1, x: 0, y: 0 };

function getGeometry(image, viewport, transform) {
  if (!image.width || !image.height || !viewport.width || !viewport.height) return null;
  const baseScale = Math.max(viewport.width / image.width, viewport.height / image.height);
  const scale = baseScale * transform.zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const maxX = Math.max(0, (width - viewport.width) / 2);
  const maxY = Math.max(0, (height - viewport.height) / 2);
  return { width, height, offsetX: transform.x * maxX, offsetY: transform.y * maxY, maxX, maxY };
}

export default function ProfileBannerEditor({ imageUrl, isSaving = false, onCancel, onConfirm }) {
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const [activeDevice, setActiveDevice] = useState('desktop');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [transforms, setTransforms] = useState({
    desktop: { ...EMPTY_TRANSFORM },
    mobile: { ...EMPTY_TRANSFORM }
  });
  const activeTransform = transforms[activeDevice];

  const geometry = useMemo(
    () => getGeometry(imageSize, previewSize, activeTransform),
    [imageSize, previewSize, activeTransform]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSaving, onCancel]);

  useEffect(() => {
    if (!previewRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setPreviewSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, []);

  function updateActiveTransform(update) {
    setTransforms((current) => ({
      ...current,
      [activeDevice]: typeof update === 'function' ? update(current[activeDevice]) : update
    }));
  }

  function startDragging(event) {
    if (!geometry) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: activeTransform.x,
      y: activeTransform.y,
      maxX: geometry.maxX,
      maxY: geometry.maxY
    };
  }

  function dragImage(event) {
    const start = dragRef.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const deltaX = event.clientX - start.clientX;
    const deltaY = event.clientY - start.clientY;
    updateActiveTransform((current) => ({
      ...current,
      x: start.maxX ? clamp(start.x + (deltaX / start.maxX), -1, 1) : 0,
      y: start.maxY ? clamp(start.y + (deltaY / start.maxY), -1, 1) : 0
    }));
  }

  function updateZoom(value) {
    updateActiveTransform((current) => ({ ...current, zoom: clamp(value, 1, 3) }));
  }

  const isDesktop = activeDevice === 'desktop';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="banner-editor-title">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-zinc-950 sm:rounded-[2rem] sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="banner-editor-title" className="text-lg font-black text-zinc-950 dark:text-white sm:text-xl">Profil kapağını ayarla</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">PC ve mobil kadrajını ayrı ayrı sürükleyip yakınlaştır.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isSaving} aria-label="Kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-600 disabled:opacity-50 dark:bg-white/10 dark:text-white">×</button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1.5 dark:bg-white/5">
          <button type="button" onClick={() => setActiveDevice('desktop')} className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase transition-colors ${isDesktop ? 'bg-white text-red-600 shadow-sm dark:bg-zinc-900' : 'text-zinc-500'}`}>🖥️ PC Kadrajı</button>
          <button type="button" onClick={() => setActiveDevice('mobile')} className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase transition-colors ${!isDesktop ? 'bg-white text-red-600 shadow-sm dark:bg-zinc-900' : 'text-zinc-500'}`}>📱 Mobil Kadrajı</button>
        </div>

        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
          <span>{isDesktop ? 'PC önizleme · 16:9' : 'Mobil profil kartı önizlemesi'}</span>
          <span>{isDesktop ? '2048 × 1152' : '1080 × 1300'}</span>
        </div>
        <div
          ref={previewRef}
          onPointerDown={startDragging}
          onPointerMove={dragImage}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onWheel={(event) => {
            event.preventDefault();
            updateZoom(activeTransform.zoom + (event.deltaY < 0 ? 0.1 : -0.1));
          }}
          className={`relative touch-none cursor-grab select-none overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-black/10 active:cursor-grabbing dark:ring-white/10 ${isDesktop ? 'aspect-video w-full' : 'mx-auto aspect-[1080/1300] w-full max-w-sm'}`}
        >
          <img
            src={imageUrl}
            alt={`${isDesktop ? 'PC' : 'Mobil'} profil kapağı önizlemesi`}
            draggable="false"
            onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            className="pointer-events-none absolute max-w-none"
            style={geometry ? {
              width: `${geometry.width}px`, height: `${geometry.height}px`,
              left: `calc(50% + ${geometry.offsetX}px)`, top: `calc(50% + ${geometry.offsetY}px)`,
              transform: 'translate(-50%, -50%)'
            } : { opacity: 0 }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/30" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-white/30" />
        </div>

        <div className="mt-4 rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500"><span>🔍 Yakınlaştır</span><span>%{Math.round(activeTransform.zoom * 100)}</span></div>
          <input type="range" min="1" max="3" step="0.01" value={activeTransform.zoom} onChange={(event) => updateZoom(Number(event.target.value))} className="w-full accent-red-600" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">Minimum seviyede fotoğraf alanı boşluksuz doldurur. Daha fazla küçültülemez.</p>
            <button type="button" onClick={() => updateActiveTransform({ ...EMPTY_TRANSFORM })} className="shrink-0 rounded-lg bg-white px-3 py-2.5 text-[8px] font-black uppercase text-zinc-600 shadow-sm dark:bg-black dark:text-zinc-300">↺ Alana Sığdır</button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} disabled={isSaving} className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-[10px] font-black uppercase text-zinc-600 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-300">Vazgeç</button>
          <button type="button" onClick={() => onConfirm(transforms)} disabled={isSaving || !geometry} className="flex-[2] rounded-xl bg-red-600 px-4 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{isSaving ? 'İki kapak hazırlanıyor…' : 'PC ve Mobil Kadrajını Kaydet'}</button>
        </div>
      </div>
    </div>
  );
}
