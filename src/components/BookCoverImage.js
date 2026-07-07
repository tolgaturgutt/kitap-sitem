'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function BookCoverImage({
  src,
  alt = 'Kitap kapağı',
  className = '',
  fallbackClassName = '',
  fill = false,
  sizes,
  width,
  height,
  objectFit = 'cover',
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackClasses = [
    fill ? 'absolute inset-0 w-full h-full' : className,
    'bg-gray-100 dark:bg-white/5 flex items-center justify-center text-center leading-tight text-[7px] md:text-[8px] font-black text-gray-400 dark:text-gray-600 tracking-widest px-1',
    fallbackClassName,
  ]
    .filter(Boolean)
    .join(' ');

  if (!src || imageFailed) {
    return <div className={fallbackClasses}>KAPAK YOK</div>;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        className={className}
        onError={() => setImageFailed(true)}
        style={{ objectFit }}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized
        className={className}
        onError={() => setImageFailed(true)}
        style={{ objectFit }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setImageFailed(true)}
    />
  );
}
