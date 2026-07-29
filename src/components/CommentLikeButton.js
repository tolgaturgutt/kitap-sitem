'use client';

export default function CommentLikeButton({
  count = 0,
  liked = false,
  pending = false,
  disabled = false,
  compact = false,
  onClick,
}) {
  const safeCount = Math.max(0, Number(count) || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-label={liked ? 'Yorum beğenisini geri al' : 'Yorumu beğen'}
      aria-pressed={liked}
      className={`inline-flex min-h-7 items-center gap-1 rounded-full px-1.5 font-bold transition-all ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${
        liked
          ? 'text-red-600 dark:text-red-500'
          : 'text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400'
      } ${
        disabled
          ? 'cursor-default opacity-45'
          : 'active:scale-90'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${
          liked ? 'scale-110' : ''
        }`}
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
        />
      </svg>
      {safeCount > 0 && <span className="tabular-nums">{safeCount}</span>}
    </button>
  );
}
