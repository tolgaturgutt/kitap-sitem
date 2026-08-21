begin;

-- Weekly writing rankings measure when a chapter first became public, not when
-- an author initially saved its draft. This index matches the common filter.
create index if not exists chapters_published_at_public_idx
  on public.chapters (published_at)
  where is_draft = false;

create or replace function public.get_weekly_top_writers(start_date text)
returns table(
  username text,
  email text,
  avatar_url text,
  role text,
  total_words bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    profile.username,
    profile.email,
    profile.avatar_url,
    profile.role,
    sum(chapter.word_count)::bigint as total_words
  from public.chapters chapter
  join public.books book on book.id = chapter.book_id
  join public.profiles profile on profile.id = book.user_id
  where chapter.published_at >= start_date::timestamptz
    and chapter.is_draft = false
  group by
    profile.username,
    profile.email,
    profile.avatar_url,
    profile.role
  order by total_words desc
  limit 10;
$function$;

create or replace function public.get_period_top_writer(
  start_date text,
  end_date text
)
returns table(
  username text,
  email text,
  avatar_url text,
  role text,
  total_words bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    profile.username,
    profile.email,
    profile.avatar_url,
    profile.role,
    sum(chapter.word_count)::bigint as total_words
  from public.chapters chapter
  join public.books book on book.id = chapter.book_id
  join public.profiles profile on profile.id = book.user_id
  where chapter.published_at >= start_date::timestamptz
    and chapter.published_at < end_date::timestamptz
    and chapter.is_draft = false
  group by
    profile.username,
    profile.email,
    profile.avatar_url,
    profile.role
  order by total_words desc
  limit 1;
$function$;

revoke all on function public.get_weekly_top_writers(text) from public;
revoke all on function public.get_period_top_writer(text, text) from public;
grant execute on function public.get_weekly_top_writers(text)
  to anon, authenticated, service_role;
grant execute on function public.get_period_top_writer(text, text)
  to anon, authenticated, service_role;

commit;
