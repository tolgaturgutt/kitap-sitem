'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

const PULL_THRESHOLD = 70;   // bu mesafeyi geçince "bırak" state'ine geçer
const MAX_PULL = 110;        // maksimum çekilebilecek mesafe
const RESISTANCE = 2.2;      // parmağın hareketine göre direnç (yüksek = daha zor çekilir)

export default function RefreshWrapper({ children }) {
  const wrapperRef = useRef(null);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullingRef = useRef(false);   // aktif olarak çekiliyor mu (ref -> event listener içinde güncel kalsın diye)
  const statusRef = useRef('idle');   // idle | pulling | canRelease | refreshing (ref -> event listener closure sorunu olmasın diye)

  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState('idle');
  const [isDragging, setIsDragging] = useState(false);

  const setStatusBoth = (s) => {
    statusRef.current = s;
    setStatus(s);
  };

  const reset = useCallback(() => {
    pullingRef.current = false;
    setIsDragging(false);
    setPullDistance(0);
    setStatusBoth('idle');
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const pageScrollTop = () => {
      const scrollingElement = document.scrollingElement || document.documentElement;

      return Math.max(
        window.scrollY || 0,
        scrollingElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
    };

    const atTop = () => pageScrollTop() <= 1;

    const isInsideScrollableArea = (target) => {
      let node = target instanceof Element ? target : null;

      while (node && node !== el) {
        const style = window.getComputedStyle(node);
        const scrollableY = /(auto|scroll)/.test(style.overflowY);

        if (scrollableY && node.scrollHeight > node.clientHeight + 2) {
          return true;
        }

        node = node.parentElement;
      }

      return false;
    };

    const onTouchStart = (e) => {
      if (statusRef.current === 'refreshing') return;
      if (e.touches.length !== 1) return;
      if (!atTop()) return;
      if (isInsideScrollableArea(e.target)) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      pullingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!pullingRef.current || statusRef.current === 'refreshing') return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diff = currentY - startYRef.current;
      const horizontalDiff = Math.abs(currentX - startXRef.current);

      if (horizontalDiff > Math.abs(diff)) {
        reset();
        return;
      }

      // ✅ Yukarı doğru çekildi (ya da sayfa artık en üstte değil) -> tamamen iptal
      if (diff <= 0 || !atTop()) {
        reset();
        return;
      }

      // Aşağı çekiliyor, sayfanın kendisinin kaymasını engelle
      e.preventDefault();

      const distance = Math.min(diff / RESISTANCE, MAX_PULL);
      setIsDragging(true);
      setPullDistance(distance);
      setStatusBoth(distance >= PULL_THRESHOLD ? 'canRelease' : 'pulling');
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      setIsDragging(false);

      if (statusRef.current === 'canRelease') {
        // ✅ Eşik geçilmiş ve bırakılmış -> gerçek yenileme burada başlıyor
        setStatusBoth('refreshing');
        setPullDistance(PULL_THRESHOLD);
        // Not: reload tetiklenmeden önce görünen yazıyı gizliyoruz ki
        // reload anındaki "donmuş kare" de Yenileniyor yazmasın.
        requestAnimationFrame(() => {
          window.location.reload();
        });
      } else {
        reset();
      }
    };

    const onTouchCancel = () => reset();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false }); // preventDefault için passive:false şart
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [reset]);

  const label =
    status === 'canRelease'
      ? 'BIRAK, YENİLENSİN ↑'
      : status === 'refreshing'
      ? 'KitapLab Yenileniyor... 📚'
      : '↓ Kaydırarak Yenile';

  const textClass =
    status === 'canRelease'
      ? 'text-red-500'
      : status === 'refreshing'
      ? 'text-red-600 animate-pulse'
      : 'text-gray-400';

  return (
    <div ref={wrapperRef} className="min-h-screen overscroll-y-contain">
      {/* Sadece çekilirken / yenilenirken yüksekliği açılan indikatör alanı.
          Sayfa ilk açıldığında (idle + pullDistance 0) hiçbir şey render edilmez. */}
      <div
        style={{
          height: pullDistance,
          transition: isDragging ? 'none' : 'height 0.25s ease',
          overflow: 'hidden',
        }}
        className="flex items-center justify-center"
      >
        {pullDistance > 0 && (
          <div className={`text-[12px] font-black uppercase tracking-wider transition-colors ${textClass}`}>
            {label}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
