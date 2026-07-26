-- Odullu reklamlar AdMob onayi tamamlanana kadar kapali tutulur.
-- Bayrak daha sonra tek bir veritabani guncellemesiyle acilabilir.

create table if not exists public.app_feature_flags (
  feature_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_feature_flags (feature_key, enabled)
values ('labcoin_rewarded_ads', false)
on conflict (feature_key) do nothing;

alter table public.app_feature_flags enable row level security;

revoke all on public.app_feature_flags from anon, authenticated;

create or replace function public.is_labcoin_rewarded_ads_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select flag.enabled
      from public.app_feature_flags flag
      where flag.feature_key = 'labcoin_rewarded_ads'
    ),
    false
  );
$$;

create or replace function public.enforce_labcoin_rewarded_ads_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_labcoin_rewarded_ads_enabled() then
    raise exception using
      message = 'LABCOIN_REWARDED_DISABLED',
      detail = 'Odullu reklamlar Google onayi tamamlanana kadar kapali.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_labcoin_rewarded_ads_enabled
on public.labcoin_reward_claims;
create trigger enforce_labcoin_rewarded_ads_enabled
before insert
on public.labcoin_reward_claims
for each row
execute function public.enforce_labcoin_rewarded_ads_enabled();

revoke all on function public.is_labcoin_rewarded_ads_enabled()
from public, anon;
grant execute on function public.is_labcoin_rewarded_ads_enabled()
to authenticated;

notify pgrst, 'reload schema';
