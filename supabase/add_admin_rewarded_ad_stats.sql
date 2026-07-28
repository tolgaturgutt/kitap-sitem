-- Admin panelinde odullu reklam kazanimlarini kullanici bazinda listeler.
-- Yalnizca announcement_admins tablosundaki kullanicilar cagirabilir.

create or replace function public.admin_list_rewarded_ad_stats(
  p_search text default '',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  total_ads bigint,
  ads_today bigint,
  last_watched_at timestamptz,
  total_rows bigint,
  filtered_total_ads numeric,
  filtered_today_ads numeric
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := coalesce(auth.jwt() ->> 'email', '');
  safe_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  safe_offset integer := greatest(0, coalesce(p_offset, 0));
  search_term text := trim(coalesce(p_search, ''));
  day_start timestamptz :=
    date_trunc('day', timezone('Europe/Istanbul', now()))
    at time zone 'Europe/Istanbul';
begin
  if actor_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = lower(actor_email)
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  with user_stats as (
    select
      claim.user_id,
      profile.username,
      profile.full_name,
      count(*)::bigint as total_ads,
      count(*) filter (
        where claim.claimed_at >= day_start
          and claim.claimed_at < day_start + interval '1 day'
      )::bigint as ads_today,
      max(claim.claimed_at) as last_watched_at
    from public.labcoin_reward_claims claim
    left join public.profiles profile on profile.id = claim.user_id
    where search_term = ''
      or coalesce(profile.username, '') ilike '%' || search_term || '%'
      or coalesce(profile.full_name, '') ilike '%' || search_term || '%'
    group by claim.user_id, profile.username, profile.full_name
  ),
  totals as (
    select
      count(*)::bigint as total_rows,
      coalesce(sum(stats.total_ads), 0)::numeric as filtered_total_ads,
      coalesce(sum(stats.ads_today), 0)::numeric as filtered_today_ads
    from user_stats stats
  )
  select
    stats.user_id,
    stats.username,
    stats.full_name,
    stats.total_ads,
    stats.ads_today,
    stats.last_watched_at,
    totals.total_rows,
    totals.filtered_total_ads,
    totals.filtered_today_ads
  from user_stats stats
  cross join totals
  order by stats.total_ads desc, stats.last_watched_at desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.admin_list_rewarded_ad_stats(text, integer, integer)
from public, anon;

grant execute on function public.admin_list_rewarded_ad_stats(text, integer, integer)
to authenticated;

notify pgrst, 'reload schema';
