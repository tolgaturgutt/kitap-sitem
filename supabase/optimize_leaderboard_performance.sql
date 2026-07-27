-- Liderlik sayfasinin ham chapter_views kayitlarini istemciye indirmesini
-- engeller ve haftalik/aylik/gecen hafta listelerini tek sorguda uretir.
create index if not exists idx_chapter_views_created_chapter
  on public.chapter_views (created_at desc, chapter_id);

create or replace function public.get_leaderboard_book_rankings(
  p_week_start timestamptz,
  p_month_start timestamptz,
  p_last_week_start timestamptz,
  p_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with period_counts as (
    select
      chapters.book_id,
      count(*) filter (
        where chapter_views.created_at >= p_week_start
      )::bigint as weekly_reads,
      count(*) filter (
        where chapter_views.created_at >= p_month_start
      )::bigint as monthly_reads,
      count(*) filter (
        where chapter_views.created_at >= p_last_week_start
          and chapter_views.created_at < p_week_start
      )::bigint as last_week_reads
    from public.chapter_views
    join public.chapters
      on chapters.id = chapter_views.chapter_id
    join public.books
      on books.id = chapters.book_id
    where chapter_views.created_at >= least(p_month_start, p_last_week_start)
      and chapters.is_draft = false
      and books.is_draft = false
    group by chapters.book_id
  ),
  period_books as (
    select
      books.id,
      books.title,
      books.cover_url,
      books.user_id,
      coalesce(profiles.username, books.username) as author_username,
      coalesce(profiles.email, books.user_email) as author_email,
      profiles.role as author_role,
      period_counts.weekly_reads,
      period_counts.monthly_reads,
      period_counts.last_week_reads
    from period_counts
    join public.books
      on books.id = period_counts.book_id
    left join public.profiles
      on profiles.id = books.user_id
  )
  select jsonb_build_object(
    'weekly',
    coalesce((
      select jsonb_agg(to_jsonb(weekly_ranked))
      from (
        select *
        from period_books
        where weekly_reads > 0
        order by weekly_reads desc, id
        limit least(greatest(coalesce(p_limit, 10), 1), 25)
      ) as weekly_ranked
    ), '[]'::jsonb),
    'monthly',
    coalesce((
      select jsonb_agg(to_jsonb(monthly_ranked))
      from (
        select *
        from period_books
        where monthly_reads > 0
        order by monthly_reads desc, id
        limit least(greatest(coalesce(p_limit, 10), 1), 25)
      ) as monthly_ranked
    ), '[]'::jsonb),
    'last_week',
    coalesce((
      select jsonb_agg(to_jsonb(last_week_ranked))
      from (
        select *
        from period_books
        where last_week_reads > 0
        order by last_week_reads desc, id
        limit least(greatest(coalesce(p_limit, 10), 1), 25)
      ) as last_week_ranked
    ), '[]'::jsonb),
    'all_time',
    coalesce((
      select jsonb_agg(to_jsonb(all_time_ranked))
      from (
        select
          stats.id,
          stats.title,
          stats.cover_url,
          stats.user_id,
          stats.username as author_username,
          stats.author_email,
          stats.author_role,
          stats.total_views
        from public.book_list_stats as stats
        order by stats.total_views desc, stats.id
        limit least(greatest(coalesce(p_limit, 10), 1), 25)
      ) as all_time_ranked
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_leaderboard_book_rankings(
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) from public;
grant execute on function public.get_leaderboard_book_rankings(
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) to anon, authenticated;

notify pgrst, 'reload schema';
