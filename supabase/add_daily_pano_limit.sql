-- KitapLab: adminler haric kullanici basina Istanbul gununde en fazla 5 pano.
-- Baslangic ani ilk kurulumda bir kez kaydedilir; ayni gun icindeki eski panolar sayilmaz.

begin;

create table if not exists public.pano_daily_limit_config (
  id boolean primary key default true check (id),
  started_at timestamptz not null default now()
);

alter table public.pano_daily_limit_config enable row level security;

insert into public.pano_daily_limit_config (id, started_at)
values (true, now())
on conflict (id) do nothing;

revoke all on table public.pano_daily_limit_config from public, anon, authenticated;

create index if not exists panolar_daily_limit_lookup_idx
  on public.panolar (lower(user_email), created_at desc);

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

  -- Ayni kullanicinin eszamanli eklemelerini siraya alarak limit asimini engelle.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      actor_email || ':' || (now() at time zone 'Europe/Istanbul')::date::text,
      0
    )
  );

  select count(*)
  into panos_created
  from public.panolar pano
  where lower(pano.user_email) = actor_email
    and pano.created_at >= count_started_at;

  if panos_created >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'PANO_DAILY_LIMIT_REACHED',
      detail = 'Admin olmayan kullanicilar Istanbul saatine gore gunde en fazla 5 pano olusturabilir.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_daily_pano_limit() from public;

drop trigger if exists enforce_daily_pano_limit on public.panolar;

create trigger enforce_daily_pano_limit
before insert on public.panolar
for each row
execute function public.enforce_daily_pano_limit();

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.panolar'::regclass
      and tgname = 'enforce_daily_pano_limit'
      and not tgisinternal
  ) then
    raise exception 'enforce_daily_pano_limit trigger validation failed';
  end if;

  if not exists (
    select 1 from public.pano_daily_limit_config where id = true
  ) then
    raise exception 'pano_daily_limit_config validation failed';
  end if;
end;
$$;

commit;
