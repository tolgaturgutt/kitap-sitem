-- Public discovery pages should receive already-aggregated book statistics
-- instead of downloading every chapter and calculating totals in the browser.

create index if not exists idx_chapters_book_published_stats
  on public.chapters (book_id)
  include (views)
  where is_draft = false;

create index if not exists idx_chapters_published_at
  on public.chapters (published_at desc)
  where is_draft = false;

create index if not exists idx_comments_created_book
  on public.comments (created_at desc, book_id);

create index if not exists idx_follows_created_book
  on public.follows (created_at desc, book_id);

create index if not exists idx_chapter_votes_created_chapter
  on public.chapter_votes (created_at desc, chapter_id);

create index if not exists idx_reading_history_user_updated
  on public.reading_history (user_email, updated_at desc);

create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_email, created_at desc);

create index if not exists idx_books_published_category
  on public.books (category)
  where is_draft = false;

create or replace view public.book_list_stats
with (security_invoker = true)
as
with chapter_stats as (
  select
    chapters.book_id,
    count(*)::bigint as published_chapter_count,
    coalesce(sum(chapters.views), 0)::bigint as total_views
  from public.chapters
  where chapters.is_draft = false
  group by chapters.book_id
),
recent_comments as (
  select
    comments.book_id,
    count(*)::bigint as recent_comment_count
  from public.comments
  where comments.created_at >= now() - interval '10 days'
  group by comments.book_id
),
recent_follows as (
  select
    follows.book_id,
    count(*)::bigint as recent_follow_count
  from public.follows
  where follows.created_at >= now() - interval '10 days'
    and follows.book_id is not null
  group by follows.book_id
),
recent_votes as (
  select
    chapters.book_id,
    count(*)::bigint as recent_vote_count
  from public.chapter_votes
  join public.chapters
    on chapters.id = chapter_votes.chapter_id
  where chapter_votes.created_at >= now() - interval '10 days'
    and chapters.is_draft = false
  group by chapters.book_id
)
select
  books.id,
  books.title,
  books.cover_url,
  books.category,
  books.is_completed,
  books.is_editors_choice,
  books.user_id,
  books.user_email,
  coalesce(owner_profile.username, books.username) as username,
  coalesce(owner_profile.email, books.user_email) as author_email,
  owner_profile.role as author_role,
  books.co_author_id,
  books.co_author_status,
  case
    when books.co_author_status = 'accepted'
      then co_author_profile.username
    else null
  end as co_author_name,
  case
    when books.co_author_status = 'accepted'
      then co_author_profile.email
    else null
  end as co_author_email,
  case
    when books.co_author_status = 'accepted'
      then co_author_profile.role
    else null
  end as co_author_role,
  coalesce(books.total_comment_count, 0)::bigint as total_comments,
  coalesce(books.total_votes, 0)::bigint as total_votes,
  chapter_stats.total_views,
  coalesce(recent_comments.recent_comment_count, 0)::bigint
    as recent_comment_count,
  coalesce(recent_follows.recent_follow_count, 0)::bigint
    as recent_follow_count,
  coalesce(recent_votes.recent_vote_count, 0)::bigint
    as recent_vote_count,
  (
    coalesce(recent_follows.recent_follow_count, 0) * 20
    + coalesce(recent_comments.recent_comment_count, 0) * 3
    + coalesce(recent_votes.recent_vote_count, 0) * 5
  )::bigint as interaction_score
from public.books
join chapter_stats
  on chapter_stats.book_id = books.id
left join public.profiles as owner_profile
  on owner_profile.id = books.user_id
left join public.profiles as co_author_profile
  on co_author_profile.id = books.co_author_id
left join recent_comments
  on recent_comments.book_id = books.id
left join recent_follows
  on recent_follows.book_id = books.id
left join recent_votes
  on recent_votes.book_id = books.id
where books.is_draft = false
  and chapter_stats.published_chapter_count > 0;

grant select on public.book_list_stats to anon, authenticated;

create or replace function public.get_home_category_books(
  p_categories text[],
  p_per_category integer default 10
)
returns setof public.book_list_stats
language sql
stable
security invoker
set search_path = ''
as $$
  select selected.*
  from unnest(coalesce(p_categories, array[]::text[]))
    as requested(category_name)
  cross join lateral (
    select stats.*
    from public.book_list_stats as stats
    where stats.category = requested.category_name
    order by md5(stats.id::text || current_date::text)
    limit least(greatest(coalesce(p_per_category, 10), 1), 20)
  ) as selected;
$$;

revoke all on function public.get_home_category_books(text[], integer)
  from public;
grant execute on function public.get_home_category_books(text[], integer)
  to anon, authenticated;

notify pgrst, 'reload schema';
