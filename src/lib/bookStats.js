export const BOOK_LIST_STATS_SELECT = [
  'id',
  'title',
  'cover_url',
  'category',
  'is_completed',
  'is_editors_choice',
  'user_id',
  'user_email',
  'username',
  'author_email',
  'author_role',
  'co_author_id',
  'co_author_status',
  'co_author_name',
  'co_author_email',
  'co_author_role',
  'total_comments',
  'total_votes',
  'total_views',
  'interaction_score',
].join(',');

export function normalizeBookStat(book, adminEmails = []) {
  return {
    ...book,
    is_admin: adminEmails.includes(book.author_email || book.user_email),
    co_author_is_admin: Boolean(
      book.co_author_email && adminEmails.includes(book.co_author_email)
    ),
    totalComments: Number(book.total_comments) || 0,
    totalVotes: Number(book.total_votes) || 0,
    totalViews: Number(book.total_views) || 0,
    interactionScore: Number(book.interaction_score) || 0,
    role: book.author_role,
  };
}
