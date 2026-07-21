-- Pano silinse bile o gun kullanilan hak geri gelmez.
-- Mevcut limit baslangicindan sonraki duran panolar ilk kurulumda kaydedilir.

begin;

create table if not exists public.pano_daily_usage (
  id bigint generated always as identity primary key,
  user_email text not null,
  pano_id uuid not null unique,
  counted_at timestamptz not null default now()
);

alter table public.pano_daily_usage enable row level security;
revoke all on table public.pano_daily_usage from public, anon, authenticated;
revoke all on sequence public.pano_daily_usage_id_seq from public, anon, authenticated;

create index if not exists pano_daily_usage_email_time_idx
  on public.pano_daily_usage (lower(user_email), counted_at desc);

insert into public.pano_daily_usage (user_email, pano_id, counted_at)
select pano.user_email, pano.id, pano.created_at
from public.panolar pano
cross join public.pano_daily_limit_config config
where config.id = true
  and pano.created_at >= config.started_at
  and not exists (
    select 1
    from public.announcement_admins admin_user
    where lower(admin_user.user_email) = lower(pano.user_email)
  )
on conflict (pano_id) do nothing;

create or replace function public.enforce_daily_pano_limit()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  actor_email text;
  actor_is_admin boolean;
  limit_started_at timestamptz;
  istanbul_day_started_at timestamptz;
  count_started_at timestamptz;
  panos_created integer;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  actor_email := lower(nullif(auth.jwt() ->> 'email', ''));

  if actor_email is null then
    raise exception using errcode = 'P0001', message = 'PANO_AUTH_REQUIRED';
  end if;

  if lower(coalesce(new.user_email, '')) <> actor_email then
    raise exception using errcode = 'P0001', message = 'PANO_EMAIL_MISMATCH';
  end if;

  select exists (
    select 1
    from public.announcement_admins admin_user
    where lower(admin_user.user_email) = actor_email
  ) into actor_is_admin;

  if actor_is_admin then
    return new;
  end if;

  select config.started_at
  into limit_started_at
  from public.pano_daily_limit_config config
  where config.id = true;

  if limit_started_at is null then
    raise exception 'Pano limit configuration is missing.';
  end if;

  istanbul_day_started_at :=
    date_trunc('day', now() at time zone 'Europe/Istanbul')
    at time zone 'Europe/Istanbul';
  count_started_at := greatest(limit_started_at, istanbul_day_started_at);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      actor_email || ':' || (now() at time zone 'Europe/Istanbul')::date::text,
      0
    )
  );

  select count(*)
  into panos_created
  from public.pano_daily_usage usage_record
  where lower(usage_record.user_email) = actor_email
    and usage_record.counted_at >= count_started_at;

  if panos_created >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'PANO_DAILY_LIMIT_REACHED',
      detail = 'Silinen panolar dahil, admin olmayan kullanicilar gunde en fazla 5 pano olusturabilir.';
  end if;

  -- BEFORE INSERT icinde yazilir; pano ekleme daha sonra hata alirsa ayni transaction
  -- bu kullanim kaydini da otomatik geri alir. Pano sonradan silinirse kayit kalir.
  insert into public.pano_daily_usage (user_email, pano_id, counted_at)
  values (new.user_email, new.id, now());

  return new;
end;
$$;

revoke all on function public.enforce_daily_pano_limit() from public;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.panolar'::regclass
      and tgname = 'enforce_daily_pano_limit'
      and not tgisinternal
      and tgenabled <> 'D'
  ) then
    raise exception 'enforce_daily_pano_limit trigger validation failed';
  end if;

  if position(
    'pano_daily_usage' in
    pg_get_functiondef('public.enforce_daily_pano_limit()'::regprocedure)
  ) = 0 then
    raise exception 'persistent pano usage validation failed';
  end if;
end;
$$;

commit;
