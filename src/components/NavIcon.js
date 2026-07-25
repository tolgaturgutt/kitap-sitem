export default function NavIcon({ name, className = 'h-5 w-5' }) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'category') {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
        <rect x="14" y="14" width="6.5" height="6.5" rx="1.5" />
      </svg>
    );
  }

  if (name === 'books') {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h3M8 17h7" />
      </svg>
    );
  }

  if (name === 'ranking') {
    return (
      <svg {...commonProps}>
        <path d="M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9M3 20h18" />
      </svg>
    );
  }

  if (name === 'pin') {
    return (
      <svg {...commonProps}>
        <path d="m8 4 8 8M14.5 3.5l6 6-3 1.5-5 5-1.5 3-6-6 3-1.5 5-5zM5 19l-2 2" />
      </svg>
    );
  }

  if (name === 'write') {
    return (
      <svg {...commonProps}>
        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4M4 20l1-4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
