-- 120 LabCoin ile 1 aylik Plus uyelik.
-- Plus; bolum gorseli, profil kapagi ve kitap fragmani yetkilerini acar.
-- Premium ve duyuru adminleri Plus ozelliklerine zaten erisebilir.

alter table public.profiles
  add column if not exists plus_expires_at timestamptz;

comment on column public.profiles.plus_expires_at is
  'Plus uyeligin bitis zamani. NULL aktif Plus uyeligi olmadigi anlamina gelir.';

create or replace function public.protect_critical_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
  ) then
    return new;
  end if;

  if current_setting('kitaplab.premium_purchase', true) = 'allowed'
    and new.id = auth.uid()
    and new.role = 'premium'
    and new.premium_expires_at > now()
    and new.plus_expires_at is not distinct from old.plus_expires_at
    and new.is_banned is not distinct from old.is_banned
  then
    return new;
  end if;

  if current_setting('kitaplab.premium_expiration', true) = 'allowed'
    and old.role = 'premium'
    and old.premium_expires_at is not null
    and old.premium_expires_at <= now()
    and new.role = 'user'
    and new.premium_expires_at is null
    and new.plus_expires_at is not distinct from old.plus_expires_at
    and new.is_banned is not distinct from old.is_banned
  then
    return new;
  end if;

  if current_setting('kitaplab.plus_purchase', true) = 'allowed'
    and new.id = auth.uid()
    and new.plus_expires_at > now()
    and new.role is not distinct from old.role
    and new.premium_expires_at is not distinct from old.premium_expires_at
    and new.is_banned is not distinct from old.is_banned
  then
    return new;
  end if;

  if current_setting('kitaplab.plus_expiration', true) = 'allowed'
    and old.plus_expires_at is not null
    and old.plus_expires_at <= now()
    and new.plus_expires_at is null
    and new.role is not distinct from old.role
    and new.premium_expires_at is not distinct from old.premium_expires_at
    and new.is_banned is not distinct from old.is_banned
  then
    return new;
  end if;

  if new.role is distinct from old.role then
    new.role := old.role;
  end if;

  if new.premium_expires_at is distinct from old.premium_expires_at then
    new.premium_expires_at := old.premium_expires_at;
  end if;

  if new.plus_expires_at is distinct from old.plus_expires_at then
    new.plus_expires_at := old.plus_expires_at;
  end if;

  if new.is_banned is distinct from old.is_banned then
    new.is_banned := old.is_banned;
  end if;

  return new;
end;
$$;

create or replace function public.can_use_plus_features()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.can_use_premium_features()
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.plus_expires_at > now()
      )
    );
$$;

create or replace function public.can_use_chapter_images()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.can_use_plus_features();
$$;

create or replace function public.expire_plus_memberships()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  expired_count integer := 0;
begin
  perform set_config('kitaplab.plus_expiration', 'allowed', true);

  update public.profiles
  set
    plus_expires_at = null,
    updated_at = now()
  where plus_expires_at is not null
    and plus_expires_at <= now();

  get diagnostics expired_count = row_count;
  perform set_config('kitaplab.plus_expiration', 'off', true);
  return expired_count;
end;
$$;

create or replace function public.get_plus_status()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  current_balance integer;
  profile_plus_expires_at timestamptz;
  profile_is_plus boolean;
  plus_access boolean;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform public.expire_plus_memberships();

  insert into public.labcoin_wallets (user_id)
  values (actor_id)
  on conflict (user_id) do nothing;

  select wallet.balance
  into current_balance
  from public.labcoin_wallets wallet
  where wallet.user_id = actor_id;

  select
    profile.plus_expires_at,
    coalesce(profile.plus_expires_at > now(), false)
  into profile_plus_expires_at, profile_is_plus
  from public.profiles profile
  where profile.id = actor_id;

  plus_access := public.can_use_plus_features();

  return jsonb_build_object(
    'balance', coalesce(current_balance, 0),
    'is_plus', coalesce(profile_is_plus, false),
    'plus_expires_at', profile_plus_expires_at,
    'has_plus_access', plus_access,
    'plus_price', 120,
    'plus_duration_months', 1,
    'can_purchase_plus',
      not plus_access and coalesce(current_balance, 0) >= 120,
    'server_now', now()
  );
end;
$$;

create or replace function public.purchase_plus_with_labcoin()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  new_balance integer;
  new_plus_expires_at timestamptz;
  purchase_reference text;
  status_payload jsonb;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));
  perform public.expire_plus_memberships();

  if public.can_use_plus_features() then
    status_payload := public.get_plus_status();
    return status_payload || jsonb_build_object(
      'purchased', false,
      'already_plus', true
    );
  end if;

  insert into public.labcoin_wallets (user_id)
  values (actor_id)
  on conflict (user_id) do nothing;

  update public.labcoin_wallets wallet
  set
    balance = wallet.balance - 120,
    updated_at = now()
  where wallet.user_id = actor_id
    and wallet.balance >= 120
  returning wallet.balance into new_balance;

  if not found then
    raise exception using
      message = 'LABCOIN_INSUFFICIENT_BALANCE',
      detail = 'Plus uyelik icin 120 LabCoin gerekir.';
  end if;

  new_plus_expires_at := now() + interval '1 month';
  purchase_reference := format(
    'monthly-plus:%s:%s',
    txid_current(),
    clock_timestamp()
  );

  perform set_config('kitaplab.plus_purchase', 'allowed', true);

  update public.profiles
  set
    plus_expires_at = new_plus_expires_at,
    updated_at = now()
  where id = actor_id;

  perform set_config('kitaplab.plus_purchase', 'off', true);

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = actor_id
      and profile.plus_expires_at = new_plus_expires_at
  ) then
    raise exception 'PLUS_UPDATE_FAILED';
  end if;

  insert into public.labcoin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_key,
    description
  )
  values (
    actor_id,
    -120,
    'plus_purchase',
    purchase_reference,
    '1 aylik KitapLab Plus uyeligi'
  );

  status_payload := public.get_plus_status();
  return status_payload || jsonb_build_object(
    'purchased', true,
    'already_plus', false,
    'balance', new_balance
  );
end;
$$;

-- Plus bolum gorseli yukleyebilir; bolum sesi Premium olarak kalir.
drop policy if exists "premium_and_admin_chapter_image_uploads" on storage.objects;
create policy "premium_and_admin_chapter_image_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'chapter-images/' || auth.uid()::text || '/%'
  and public.can_use_plus_features()
);

drop policy if exists "premium_and_admin_chapter_audio_uploads" on storage.objects;
create policy "premium_and_admin_chapter_audio_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'chapter-audio/' || auth.uid()::text || '/%'
  and public.can_use_premium_features()
);

create or replace function public.enforce_chapter_media_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  old_image_sources text[] := array[]::text[];
  new_image_sources text[] := array[]::text[];
  old_audio_sources text[] := array[]::text[];
  new_audio_sources text[] := array[]::text[];
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  select coalesce(array_agg(matches[1]), array[]::text[])
  into new_image_sources
  from regexp_matches(coalesce(new.content, ''), '<img[^>]+src="([^"]+)"[^>]*>', 'gi') matches;

  select coalesce(array_agg(matches[1]), array[]::text[])
  into new_audio_sources
  from regexp_matches(coalesce(new.content, ''), '<audio[^>]+src="([^"]+)"[^>]*>', 'gi') matches;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(matches[1]), array[]::text[])
    into old_image_sources
    from regexp_matches(coalesce(old.content, ''), '<img[^>]+src="([^"]+)"[^>]*>', 'gi') matches;

    select coalesce(array_agg(matches[1]), array[]::text[])
    into old_audio_sources
    from regexp_matches(coalesce(old.content, ''), '<audio[^>]+src="([^"]+)"[^>]*>', 'gi') matches;
  end if;

  if (
    new_image_sources is distinct from old_image_sources
    or (
      coalesce(new.content, '') ~* '<img'
      and cardinality(new_image_sources) = 0
    )
  )
    and not public.can_use_plus_features()
  then
    raise exception using
      message = 'CHAPTER_IMAGES_REQUIRE_PLUS',
      detail = 'Bolum gorsellerini yalnizca Plus, Premium kullanicilar ve adminler degistirebilir.';
  end if;

  if (
    new_audio_sources is distinct from old_audio_sources
    or (
      coalesce(new.content, '') ~* '<audio'
      and cardinality(new_audio_sources) = 0
    )
  )
    and not public.can_use_premium_features()
  then
    raise exception using
      message = 'CHAPTER_AUDIO_REQUIRE_PREMIUM',
      detail = 'Bolum seslerini yalnizca Premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

drop policy if exists "premium_and_admin_profile_banner_uploads" on storage.objects;
create policy "premium_and_admin_profile_banner_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'profile-banners/' || auth.uid()::text || '/%'
  and public.can_use_plus_features()
);

create or replace function public.enforce_premium_book_trailer()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.trailer_url = '' then
    new.trailer_url := null;
  end if;

  if new.trailer_url is not null
    and new.trailer_url !~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$'
  then
    raise exception using
      message = 'INVALID_YOUTUBE_TRAILER_URL',
      detail = 'Kitap fragmani gecerli bir YouTube video adresi olmalidir.';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if (
    (tg_op = 'INSERT' and new.trailer_url is not null)
    or (tg_op = 'UPDATE' and new.trailer_url is distinct from old.trailer_url)
  ) and not public.can_use_plus_features() then
    raise exception using
      message = 'PLUS_FEATURE_REQUIRED',
      detail = 'Kitap fragmanini yalnizca Plus, Premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_premium_profile_banner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.banner_url = '' then
    new.banner_url := null;
  end if;

  if new.banner_url is not null
    and position('/storage/v1/object/public/images/profile-banners/' in new.banner_url) = 0
  then
    raise exception using
      message = 'INVALID_PROFILE_BANNER_URL',
      detail = 'Profil kapagi KitapLab depolamasindaki bir profil kapagi olmalidir.';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if (
    (tg_op = 'INSERT' and new.banner_url is not null)
    or (tg_op = 'UPDATE' and new.banner_url is distinct from old.banner_url)
  ) and not public.can_use_plus_features() then
    raise exception using
      message = 'PLUS_FEATURE_REQUIRED',
      detail = 'Profil kapagini yalnizca Plus, Premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'kitaplab-expire-plus'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'kitaplab-expire-plus',
    '* * * * *',
    'select public.expire_plus_memberships();'
  );
end;
$$;

revoke all on function public.can_use_plus_features() from public, anon;
revoke all on function public.get_plus_status() from public, anon;
revoke all on function public.purchase_plus_with_labcoin() from public, anon;
revoke all on function public.expire_plus_memberships() from public, anon, authenticated;
grant execute on function public.can_use_plus_features() to authenticated;
grant execute on function public.get_plus_status() to authenticated;
grant execute on function public.purchase_plus_with_labcoin() to authenticated;

notify pgrst, 'reload schema';
