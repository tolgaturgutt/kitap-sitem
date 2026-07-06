'use client';

import {
  BADGE_GROUPS,
  EMPTY_BADGE_STATS,
  formatBadgeNumber,
  getEarnedBadgeCount,
  getHighestBadge,
} from '@/lib/badges';

const GROUP_THEMES = {
  comments: { from: '#10b981', via: '#06b6d4', to: '#2563eb', glow: 'rgba(16,185,129,.28)', label: 'Topluluk Gücü' },
  words: { from: '#8b5cf6', via: '#d946ef', to: '#f43f5e', glow: 'rgba(217,70,239,.28)', label: 'Kozmik Kudret' },
  support: { from: '#f43f5e', via: '#f97316', to: '#eab308', glow: 'rgba(249,115,22,.3)', label: 'İlham Gücü' },
  views: { from: '#f59e0b', via: '#f43f5e', to: '#7c3aed', glow: 'rgba(245,158,11,.3)', label: 'Şöhret Destanı' },
};

const BADGE_PALETTES = {
  comments: [
    { from: '#059669', via: '#10b981', to: '#0f766e', glow: 'rgba(16,185,129,.38)' },
    { from: '#0891b2', via: '#06b6d4', to: '#2563eb', glow: 'rgba(6,182,212,.4)' },
    { from: '#2563eb', via: '#4f46e5', to: '#7c3aed', glow: 'rgba(79,70,229,.42)' },
    { from: '#7c3aed', via: '#c026d3', to: '#db2777', glow: 'rgba(192,38,211,.42)' },
    { from: '#f59e0b', via: '#ef4444', to: '#991b1b', glow: 'rgba(245,158,11,.48)' },
  ],
  words: [
    { from: '#4f46e5', via: '#7c3aed', to: '#581c87', glow: 'rgba(124,58,237,.4)' },
    { from: '#7c3aed', via: '#a855f7', to: '#c026d3', glow: 'rgba(168,85,247,.42)' },
    { from: '#c026d3', via: '#ec4899', to: '#9d174d', glow: 'rgba(236,72,153,.42)' },
    { from: '#be123c', via: '#f43f5e', to: '#7f1d1d', glow: 'rgba(244,63,94,.43)' },
    { from: '#111827', via: '#6d28d9', to: '#f59e0b', glow: 'rgba(245,158,11,.5)' },
  ],
  support: [
    { from: '#e11d48', via: '#f43f5e', to: '#be123c', glow: 'rgba(244,63,94,.4)' },
    { from: '#ea580c', via: '#f97316', to: '#e11d48', glow: 'rgba(249,115,22,.42)' },
    { from: '#d97706', via: '#f59e0b', to: '#ea580c', glow: 'rgba(245,158,11,.44)' },
    { from: '#7c3aed', via: '#db2777', to: '#f97316', glow: 'rgba(219,39,119,.46)' },
    { from: '#facc15', via: '#f97316', to: '#be123c', glow: 'rgba(250,204,21,.52)' },
  ],
  views: [
    { from: '#475569', via: '#2563eb', to: '#1e3a8a', glow: 'rgba(37,99,235,.4)' },
    { from: '#059669', via: '#10b981', to: '#0f766e', glow: 'rgba(16,185,129,.42)' },
    { from: '#9333ea', via: '#db2777', to: '#9f1239', glow: 'rgba(219,39,119,.43)' },
    { from: '#ea580c', via: '#f43f5e', to: '#be123c', glow: 'rgba(244,63,94,.46)' },
    { from: '#facc15', via: '#f97316', to: '#dc2626', glow: 'rgba(249,115,22,.52)' },
  ],
};

function Star({ x, y, size = 2, opacity = 1 }) {
  return <path d={`M${x} ${y - size}l${size * .55} ${size * 1.4}L${x + size} ${y}l-${size * 1.45} ${size * .45}L${x} ${y + size}l-${size * .55}-${size * 1.4}L${x - size} ${y}l${size * 1.45}-${size * .45}L${x} ${y - size}z`} fill="currentColor" opacity={opacity} />;
}

function MilitaryIcon({ tier }) {
  const chevrons = tier === 1 ? [35] : tier === 2 ? [31, 39] : [];
  const stars = tier === 3 ? [32] : tier === 4 ? [24, 40] : [32];

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg" fill="none" aria-hidden="true">
      <path d="M32 4 54 12v17c0 14-8.8 24.6-22 31C18.8 53.6 10 43 10 29V12L32 4Z" fill="currentColor" opacity=".2" />
      <path d="M32 7 51 14v15c0 12.1-7.2 21.6-19 27.8C20.2 50.6 13 41.1 13 29V14L32 7Z" stroke="currentColor" strokeWidth="2.3" />
      <path d="M18 18h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      {chevrons.map(y => <path key={y} d={`M20 ${y - 7} 32 ${y}l12-7`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
      {tier >= 3 && tier < 5 && stars.map(x => <Star key={x} x={x} y={34} size={tier === 3 ? 8 : 6} />)}
      {tier >= 4 && <path d="M20 46c-5-6-5-13-2-19M44 46c5-6 5-13 2-19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
      {tier === 5 && (
        <>
          <path d="m20 43 24-24M44 43 20 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".8" />
          <Star x={32} y={32} size={10} />
          <path d="M20 13 24 7l8 5 8-5 4 6-5 6H25l-5-6Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function FantasyIcon({ tier }) {
  const rays = 6 + tier * 2;
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="1.5" strokeDasharray={tier >= 4 ? '3 3' : '2 6'} opacity=".65" />
      <circle cx="32" cy="32" r="19" fill="currentColor" opacity=".13" />
      {Array.from({ length: rays }).map((_, index) => {
        const angle = (360 / rays) * index;
        return <path key={angle} d="M32 3v7" stroke="currentColor" strokeWidth={tier === 5 ? 2.2 : 1.5} strokeLinecap="round" transform={`rotate(${angle} 32 32)`} opacity={index % 2 ? .55 : 1} />;
      })}
      <path d="m32 12 12 15-5 20-7 7-7-7-5-20 12-15Z" fill="currentColor" opacity=".28" />
      <path d="m32 12 5 15-5 27-7-7-5-20 12-15Zm0 0 12 15-5 20-7 7V12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 27h24M25 47l7-20 7 20" stroke="currentColor" strokeWidth="1.5" opacity=".75" />
      {tier >= 3 && <><Star x={12} y={17} size={3} /><Star x={52} y={46} size={3} /><Star x={51} y={15} size={2} opacity=".8" /></>}
      {tier === 5 && <path d="M17 55c8-5 22-5 30 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function SupportIcon({ tier }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="25" fill="currentColor" opacity=".12" />
      <path d="M32 52S10 40 10 24c0-8 10-13 16-5l6 7 6-7c6-8 16-3 16 5 0 16-22 28-22 28Z" fill="currentColor" opacity=".3" />
      <path d="M32 52S10 40 10 24c0-8 10-13 16-5l6 7 6-7c6-8 16-3 16 5 0 16-22 28-22 28Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="m32 26 3 6.2 6.8.8-5 4.6 1.4 6.7-6.2-3.4-6.2 3.4 1.4-6.7-5-4.6 6.8-.8 3-6.2Z" fill="currentColor" />
      {tier >= 2 && <path d="M13 36 4 31l8-4M51 36l9-5-8-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {tier >= 3 && <><Star x={12} y={14} size={2.5} /><Star x={52} y={14} size={2.5} /><Star x={32} y={7} size={3} /></>}
      {tier >= 4 && <path d="M20 13 24 7l8 4 8-4 4 6-5 5H25l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />}
      {tier === 5 && <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />}
    </svg>
  );
}

function ViewsIcon({ tier }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-lg" fill="none" aria-hidden="true">
      <path d="M32 5 51 14v17c0 12-7.6 21.4-19 27C20.6 52.4 13 43 13 31V14L32 5Z" fill="currentColor" opacity=".18" />
      <path d="M32 7 49 15v16c0 10.7-6.6 19.2-17 24.5C21.6 50.2 15 41.7 15 31V15L32 7Z" stroke="currentColor" strokeWidth="2.3" />
      <path d="M25 42 21 27l11-11 11 11-4 15-7 6-7-6Z" fill="currentColor" opacity=".27" />
      <path d="m32 16 4 12-4 20-4-20 4-12Zm0 0 11 11-4 15-7 6M32 16 21 27l4 15 7 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {tier >= 2 && <path d="M19 19 14 9l10 4 8-8 8 8 10-4-5 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
      {tier >= 3 && <><Star x={10} y={30} size={2.5} /><Star x={54} y={30} size={2.5} /></>}
      {tier >= 4 && <path d="M20 52h24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
      {tier === 5 && <path d="M7 42c4 8 10 13 18 16M57 42c-4 8-10 13-18 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

export function BadgeIcon({ groupId, tier, className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {groupId === 'comments' && <MilitaryIcon tier={tier} />}
      {groupId === 'words' && <FantasyIcon tier={tier} />}
      {groupId === 'support' && <SupportIcon tier={tier} />}
      {groupId === 'views' && <ViewsIcon tier={tier} />}
    </span>
  );
}

function SparkleField() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
      <span className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-black/15 blur-2xl" />
      <span className="absolute right-5 top-5 h-1.5 w-1.5 rotate-45 bg-white/80 shadow-[0_0_12px_white]" />
      <span className="absolute left-5 top-10 h-1 w-1 rotate-45 bg-white/70 shadow-[0_0_10px_white]" />
      <span className="absolute bottom-9 right-8 h-1 w-1 rounded-full bg-white/80 shadow-[0_0_10px_white]" />
    </span>
  );
}

export function CommentRankBadge({ count = 0, compact = false }) {
  const badge = getHighestBadge('comments', count);
  if (!badge) return null;
  const palette = BADGE_PALETTES.comments[badge.tier - 1];

  return (
    <span
      title={`${formatBadgeNumber(count)} yorum · ${badge.name}`}
      className={`relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full border border-white/30 text-white ${compact ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[8px]'}`}
      style={{
        backgroundImage: `linear-gradient(120deg, ${palette.from}, ${palette.via}, ${palette.to})`,
        boxShadow: `0 5px 16px ${palette.glow}`,
      }}
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
      <BadgeIcon groupId="comments" tier={badge.tier} className={`relative ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
      <span className="relative font-black uppercase tracking-wide">{badge.name}</span>
    </span>
  );
}

export function ProfileBadges({ stats = EMPTY_BADGE_STATS }) {
  const earnedCount = getEarnedBadgeCount(stats);

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2">
      <div className="relative isolate flex min-h-44 flex-col justify-center gap-5 overflow-hidden rounded-[2rem] border border-white/20 bg-[#111827] p-6 text-white shadow-2xl md:flex-row md:items-center md:justify-between md:p-9">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,.48),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,.48),transparent_34%),radial-gradient(circle_at_55%_100%,rgba(245,158,11,.38),transparent_38%)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
        <div className="absolute -left-8 top-7 h-28 w-28 rounded-full border border-white/10" />
        <div className="absolute -left-2 top-[3.25rem] h-16 w-16 rounded-full border border-white/10" />
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_#fcd34d]" />
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-white/85">Rozet Koleksiyonu</p>
          </div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Kendi destanını yazıyorsun</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/65">Her rütbe, her sembol ve her renk yolculuğunda bıraktığın ayrı bir iz.</p>
        </div>
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center self-center rounded-full bg-[conic-gradient(from_20deg,#22d3ee,#8b5cf6,#ec4899,#f59e0b,#22d3ee)] p-[3px] shadow-[0_0_40px_rgba(168,85,247,.45)]">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#111827]">
            <span className="text-3xl font-black">{earnedCount}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.22em] text-white/50">20 Rozet</span>
          </div>
        </div>
      </div>

      {BADGE_GROUPS.map(group => {
        const value = Number(stats[group.statKey] || 0);
        const currentBadge = getHighestBadge(group.id, value);
        const nextBadge = group.badges.find(badge => value < badge.threshold);
        const progressTarget = nextBadge?.threshold || group.badges[group.badges.length - 1].threshold;
        const progress = Math.min(100, Math.round((value / progressTarget) * 100));
        const theme = GROUP_THEMES[group.id];

        return (
          <section key={group.id} className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_60px_rgba(15,23,42,.08)] dark:border-white/10 dark:bg-[#0b0b10]">
            <div
              className="relative overflow-hidden border-b border-white/15 p-5 text-white md:p-7"
              style={{ backgroundImage: `linear-gradient(120deg, ${theme.from}, ${theme.via}, ${theme.to})` }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,.35),transparent_38%)]" />
              <div className="absolute -bottom-16 -right-8 h-40 w-40 rounded-full border-[24px] border-white/10" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md">
                    <BadgeIcon groupId={group.id} tier={currentBadge?.tier || 1} className="h-10 w-10" />
                  </span>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.28em] text-white/60">{theme.label}</p>
                    <h3 className="mt-1 text-lg font-black uppercase tracking-tight">{group.title}</h3>
                    <p className="mt-1 text-[10px] text-white/70">{group.description}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black">{formatBadgeNumber(value)}</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/65">
                    {nextBadge ? `Sıradaki: ${nextBadge.name}` : `${currentBadge?.name} · Seri tamamlandı`}
                  </p>
                </div>
              </div>
              <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-black/20 shadow-inner">
                <div className="h-full rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,.8)] transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 px-5 pt-3 text-[8px] font-black uppercase tracking-[0.18em] text-gray-400 lg:hidden">
              Sağa kaydır <span className="text-sm">→</span>
            </div>
            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 pt-3 md:gap-4 md:p-6 md:pt-3">
              {group.badges.map((badge, index) => {
                const earned = value >= badge.threshold;
                const palette = BADGE_PALETTES[group.id][index];

                return (
                  <div
                    key={badge.name}
                    title={`${badge.name}: ${formatBadgeNumber(badge.threshold)}`}
                    className={`group relative flex min-h-[190px] w-[38%] min-w-[132px] shrink-0 snap-start flex-col items-center justify-center overflow-hidden rounded-[1.4rem] border p-4 text-center transition-all duration-300 sm:w-[28%] lg:w-auto lg:min-w-0 lg:flex-1 ${earned ? 'border-white/20 text-white hover:-translate-y-1 hover:scale-[1.02]' : 'border-dashed border-gray-300 bg-gray-50 text-gray-400 grayscale dark:border-white/10 dark:bg-white/[.03]'}`}
                    style={earned ? {
                      backgroundImage: `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 48%, ${palette.to} 100%)`,
                      boxShadow: `0 16px 34px ${palette.glow}, inset 0 1px 0 rgba(255,255,255,.28)`,
                    } : undefined}
                  >
                    {earned && <SparkleField />}
                    {earned && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/20 text-[10px] font-black shadow-lg backdrop-blur-md">✓</span>
                    )}
                    <span className={`relative flex h-[78px] w-[78px] items-center justify-center rounded-full border ${earned ? 'border-white/35 bg-white/15 shadow-[inset_0_0_18px_rgba(255,255,255,.12),0_10px_24px_rgba(0,0,0,.18)]' : 'border-gray-300 bg-gray-200/60 dark:border-white/10 dark:bg-white/5'}`}>
                      <span className={`absolute inset-1 rounded-full border ${earned ? 'border-white/20' : 'border-gray-300 dark:border-white/10'}`} />
                      <BadgeIcon groupId={group.id} tier={index + 1} className="relative h-14 w-14" />
                    </span>
                    <p className={`relative mt-4 text-[11px] font-black uppercase leading-tight tracking-[0.08em] ${earned ? 'text-white drop-shadow-md' : 'dark:text-gray-500'}`}>{badge.name}</p>
                    <span className={`relative mt-2 rounded-full px-3 py-1 text-[8px] font-black tracking-wider ${earned ? 'border border-white/20 bg-black/15 text-white/80' : 'bg-gray-200 text-gray-400 dark:bg-white/5'}`}>
                      {formatBadgeNumber(badge.threshold)}
                    </span>
                    {!earned && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] dark:bg-white/10">🔒</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
