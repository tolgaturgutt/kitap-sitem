import { supabase } from '@/lib/supabase';

const QUOTE_SELECT = 'id, user_id, book_id, content, is_pinned, created_at, books(id, title, cover_url, summary, is_draft, user_id, username)';
const QUOTE_SELECT_WITHOUT_PIN = 'id, user_id, book_id, content, created_at, books(id, title, cover_url, summary, is_draft, user_id, username)';

function isMissingPinColumn(error) {
  const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === '42703' || error?.code === 'PGRST204' || text.includes('is_pinned');
}

export async function fetchBookQuotes({ limit, since, userId } = {}) {
  let query = supabase
    .from('book_quotes')
    .select(QUOTE_SELECT)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (since) query = query.gte('created_at', since);
  if (userId) query = query.eq('user_id', userId);
  if (limit) query = query.limit(limit);

  let result = await query;
  if (result.error && isMissingPinColumn(result.error)) {
    let fallbackQuery = supabase
      .from('book_quotes')
      .select(QUOTE_SELECT_WITHOUT_PIN)
      .order('created_at', { ascending: false });
    if (since) fallbackQuery = fallbackQuery.gte('created_at', since);
    if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId);
    if (limit) fallbackQuery = fallbackQuery.limit(limit);
    const fallback = await fallbackQuery;
    result = {
      ...fallback,
      data: (fallback.data || []).map((quote) => ({ ...quote, is_pinned: false })),
    };
  }

  if (result.error) console.error('Book quotes load error:', result.error);
  return result;
}
