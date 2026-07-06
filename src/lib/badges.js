export const BADGE_GROUPS = [
  {
    id: 'comments',
    title: 'Yorum Rütbeleri',
    description: 'Topluluğa yazdığın toplam yorum sayısı',
    statKey: 'commentCount',
    accent: 'from-emerald-500 to-teal-700',
    badges: [
      { name: 'Onbaşı', threshold: 1000 },
      { name: 'Çavuş', threshold: 10000 },
      { name: 'Teğmen', threshold: 20000 },
      { name: 'Albay', threshold: 50000 },
      { name: 'Mareşal', threshold: 100000 },
    ],
  },
  {
    id: 'words',
    title: 'Fantastik Yazarlık',
    description: 'Yayımladığın bölümlerdeki toplam kelime sayısı',
    statKey: 'writtenWordCount',
    accent: 'from-violet-500 to-fuchsia-700',
    badges: [
      { name: 'Yarı Tanrı', threshold: 50000 },
      { name: 'Küçük Tanrı', threshold: 100000 },
      { name: 'Yüce Tanrı', threshold: 500000 },
      { name: 'Kadim Tanrı', threshold: 1000000 },
      { name: 'Evren Hâkimi', threshold: 10000000 },
    ],
  },
  {
    id: 'support',
    title: 'Destek Rozetleri',
    description: 'Beğendiğin farklı bölüm sayısı',
    statKey: 'likedChapterCount',
    accent: 'from-rose-500 to-amber-500',
    badges: [
      { name: 'Kıvılcım Veren', threshold: 500 },
      { name: 'Sadık Destekçi', threshold: 1000 },
      { name: 'İlham Elçisi', threshold: 5000 },
      { name: 'Edebiyat Hamisi', threshold: 10000 },
      { name: 'Yazarların Koruyucusu', threshold: 50000 },
    ],
  },
  {
    id: 'views',
    title: 'Yazar Şöhreti',
    description: 'Eserlerinin aldığı toplam bölüm okunması',
    statKey: 'totalViewCount',
    accent: 'from-amber-400 to-red-600',
    badges: [
      { name: 'Sıradan Yazar', threshold: 5000 },
      { name: 'Ender Yazar', threshold: 10000 },
      { name: 'Destansı Yazar', threshold: 50000 },
      { name: 'Efsanevi Yazar', threshold: 150000 },
      { name: 'Şampiyon Yazar', threshold: 500000 },
    ],
  },
];

export const EMPTY_BADGE_STATS = {
  commentCount: 0,
  writtenWordCount: 0,
  likedChapterCount: 0,
  totalViewCount: 0,
};

export function formatBadgeNumber(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

export function getBadgeGroup(groupId) {
  return BADGE_GROUPS.find(group => group.id === groupId);
}

export function getHighestBadge(groupId, value) {
  const group = getBadgeGroup(groupId);
  if (!group) return null;

  let highest = null;
  group.badges.forEach((badge, index) => {
    if (Number(value || 0) >= badge.threshold) {
      highest = { ...badge, groupId, tier: index + 1 };
    }
  });
  return highest;
}

export function getEarnedBadgeCount(stats = EMPTY_BADGE_STATS) {
  return BADGE_GROUPS.reduce((total, group) => (
    total + group.badges.filter(badge => Number(stats[group.statKey] || 0) >= badge.threshold).length
  ), 0);
}

export function buildBadgeStats(books = [], counts = {}) {
  const chapters = books
    .filter(book => !book.is_draft)
    .flatMap(book => (book.chapters || []).filter(chapter => !chapter.is_draft));

  return {
    commentCount: Number(counts.commentCount || 0),
    likedChapterCount: Number(counts.likedChapterCount || 0),
    writtenWordCount: chapters.reduce((total, chapter) => total + Number(chapter.word_count || 0), 0),
    totalViewCount: chapters.reduce((total, chapter) => total + Number(chapter.views || 0), 0),
  };
}

export async function fetchProfileBadgeCounts(supabase, userId) {
  if (!userId) return { commentCount: 0, likedChapterCount: 0 };

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_profile_badge_stats', {
    p_user_id: userId,
  });

  if (!rpcError) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (row && Object.prototype.hasOwnProperty.call(row, 'liked_chapter_count')) {
      return {
        commentCount: Number(row.comment_count || 0),
        likedChapterCount: Number(row.liked_chapter_count || 0),
      };
    }
  }

  const [{ data: profile }, commentResult] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', userId).maybeSingle(),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const voteResult = profile?.email
    ? await supabase.from('chapter_votes').select('*', { count: 'exact', head: true }).eq('user_email', profile.email)
    : { count: 0 };

  return {
    commentCount: Number(commentResult.count || 0),
    likedChapterCount: Number(voteResult.count || 0),
  };
}

export async function fetchCommentBadgeCounts(supabase, comments = []) {
  const userIds = [...new Set(comments.map(comment => comment.user_id).filter(Boolean))];
  if (userIds.length === 0) return {};

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_comment_badge_counts', {
    p_user_ids: userIds,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    return Object.fromEntries(rpcData.map(row => [row.user_id, Number(row.comment_count || 0)]));
  }

  const results = await Promise.all(userIds.map(async userId => {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return [userId, Number(count || 0)];
  }));

  return Object.fromEntries(results);
}
