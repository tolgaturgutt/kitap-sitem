-- Bolum icerigine satir ici gorsel ekleme yetkisi:
-- yalnizca premium profiller ve duyuru adminleri.

alter table public.profiles
  add column if not exists premium_expires_at timestamptz;

create or replace function public.can_use_chapter_images()
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

revoke all on function public.can_use_chapter_images() from public, anon;
grant execute on function public.can_use_chapter_images() to authenticated;

drop policy if exists "premium_and_admin_chapter_image_uploads" on storage.objects;
create policy "premium_and_admin_chapter_image_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'chapter-images/' || auth.uid()::text || '/%'
  and public.can_use_chapter_images()
);

create or replace function public.enforce_chapter_image_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  old_image_sources text[] := array[]::text[];
  new_image_sources text[] := array[]::text[];
  old_image_count integer := 0;
  new_image_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  select
    coalesce(array_agg(matches[1]), array[]::text[]),
    count(*)::integer
  into new_image_sources, new_image_count
  from regexp_matches(
    coalesce(new.content, ''),
    '<img[^>]+src="([^"]+)"[^>]*>',
    'gi'
  ) as matches;

  if tg_op = 'UPDATE' then
    select
      coalesce(array_agg(matches[1]), array[]::text[]),
      count(*)::integer
    into old_image_sources, old_image_count
    from regexp_matches(
      coalesce(old.content, ''),
      '<img[^>]+src="([^"]+)"[^>]*>',
      'gi'
    ) as matches;
  end if;

  if (
    new_image_count <> old_image_count
    or new_image_sources is distinct from old_image_sources
    or (
      coalesce(new.content, '') ~* '<img'
      and new_image_count = 0
    )
  ) and not public.can_use_chapter_images() then
    raise exception using
      message = 'CHAPTER_IMAGES_REQUIRE_PREMIUM',
      detail = 'Bolum gorsellerini yalnizca premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_chapter_image_permissions on public.chapters;
create trigger enforce_chapter_image_permissions
before insert or update of content
on public.chapters
for each row
execute function public.enforce_chapter_image_permissions();

notify pgrst, 'reload schema';
