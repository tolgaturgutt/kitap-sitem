'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function PodcastAudioPlayer({
  src,
  title,
  bookTitle,
  coverUrl,
  storageKey
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const waveform = useMemo(
    () => Array.from({ length: 44 }, (_, index) => 20 + ((index * 17) % 55)),
    []
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.load();
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !storageKey || !duration) return;

    const savedTime = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < duration - 5) {
      audio.currentTime = savedTime;
    }
  }, [duration, storageKey]);

  useEffect(() => {
    if (!storageKey || currentTime <= 0) return;

    const saveTimer = window.setTimeout(() => {
      localStorage.setItem(storageKey, String(currentTime));
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [currentTime, storageKey]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  }

  function seekTo(value) {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Math.min(Math.max(Number(value), 0), duration || 0);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    if (storageKey && nextTime <= 0) localStorage.removeItem(storageKey);
  }

  function skip(seconds) {
    seekTo(currentTime + seconds);
  }

  function cyclePlaybackRate() {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    const audio = audioRef.current;
    if (audio) audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] text-white shadow-2xl shadow-black/30">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEmptied={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (storageKey) localStorage.removeItem(storageKey);
        }}
      />

      <div className="flex items-center gap-4 border-b border-white/5 p-5 md:p-6">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-red-950 shadow-lg shadow-red-600/20 md:h-20 md:w-20">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🎙️</span>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.22em] text-red-500">
            KitapLab Sesli Kitap
          </p>
          <h2 className="truncate text-base font-black md:text-xl">{title}</h2>
          {bookTitle && <p className="mt-1 truncate text-[10px] font-bold text-white/45">{bookTitle}</p>}
        </div>
      </div>

      <div className="p-5 md:p-7">
        <div className="mb-5 flex h-14 items-center gap-[3px] overflow-hidden rounded-2xl bg-black/25 px-4">
          {waveform.map((height, index) => {
            const barProgress = (index / Math.max(waveform.length - 1, 1)) * 100;
            return (
              <span
                key={index}
                className={`w-1 shrink-0 rounded-full transition-colors ${
                  barProgress <= progress ? 'bg-red-500' : 'bg-white/20'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seekTo(event.target.value)}
          aria-label="Ses kaydında ilerle"
          className="podcast-progress h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, #ef4444 ${progress}%, rgba(255,255,255,.14) ${progress}%)`
          }}
        />

        <div className="mt-2 flex justify-between text-[9px] font-bold tabular-nums text-white/40">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mt-5 grid grid-cols-5 items-center gap-2">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="mx-auto flex h-10 min-w-10 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] font-black hover:bg-white/10"
            aria-label="Oynatma hızını değiştir"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={() => skip(-10)}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[11px] font-black hover:bg-white/10"
            aria-label="10 saniye geri sar"
          >
            ↶10
          </button>

          <button
            type="button"
            onClick={togglePlayback}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl shadow-xl shadow-red-600/30 transition-transform hover:bg-red-500 active:scale-95"
            aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>

          <button
            type="button"
            onClick={() => skip(10)}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[11px] font-black hover:bg-white/10"
            aria-label="10 saniye ileri sar"
          >
            10↷
          </button>

          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm">
            🎧
          </div>
        </div>
      </div>
    </section>
  );
}
