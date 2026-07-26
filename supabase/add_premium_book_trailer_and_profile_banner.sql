-- Premium/admin kitap fragmani ve profil kapagi.
-- Arayuz kontrollerine ek olarak alan degisiklikleri ve dosya yuklemeleri
-- veritabani tarafinda da korunur.

alter table public.books
  add column if not exists trailer_url text;

alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists premium_expires_at timestamptz;

create or replace function public.can_use_premium_features()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.role = 'premium'
          and (
            profile.premium_expires_at is null
            or profile.premium_expires_at > now()
          )
      )
      or exists (
        select 1
        from public.announcement_admins admin
        where lower(admin.user_email) =
          lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    );
$$;

revoke all on function public.can_use_premium_features() from public, anon;
grant execute on function public.can_use_premium_features() to authenticated;

drop policy if exists "premium_and_admin_profile_banner_uploads" on storage.objects;
create policy "premium_and_admin_profile_banner_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'profile-banners/' || auth.uid()::text || '/%'
  and public.can_use_premium_features()
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
    or (
      tg_op = 'UPDATE'
      and new.trailer_url is distinct from old.trailer_url
    )
  ) and not public.can_use_premium_features() then
    raise exception using
      message = 'PREMIUM_FEATURE_REQUIRED',
      detail = 'Kitap fragmanini yalnizca premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_premium_book_trailer on public.books;
create trigger enforce_premium_book_trailer
before insert or update of trailer_url
on public.books
for each row
execute function public.enforce_premium_book_trailer();

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
    or (
      tg_op = 'UPDATE'
      and new.banner_url is distinct from old.banner_url
    )
  ) and not public.can_use_premium_features() then
    raise exception using
      message = 'PREMIUM_FEATURE_REQUIRED',
      detail = 'Profil kapagini yalnizca premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_premium_profile_banner on public.profiles;
create trigger enforce_premium_profile_banner
before insert or update of banner_url
on public.profiles
for each row
execute function public.enforce_premium_profile_banner();

notify pgrst, 'reload schema';
