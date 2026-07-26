-- Bolum icerigine imlecin bulundugu konumda ses ekleme.
-- Ses ekleme ve mevcut bolum medyasini degistirme yetkisi yalnizca
-- premium profiller ile duyuru adminlerine aittir.

drop policy if exists "premium_and_admin_chapter_audio_uploads" on storage.objects;
create policy "premium_and_admin_chapter_audio_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and owner_id = auth.uid()::text
  and name like 'chapter-audio/' || auth.uid()::text || '/%'
  and public.can_use_chapter_images()
);

create or replace function public.enforce_chapter_media_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  old_media_sources text[] := array[]::text[];
  new_media_sources text[] := array[]::text[];
  old_media_count integer := 0;
  new_media_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  select
    coalesce(array_agg(matches[1]), array[]::text[]),
    count(*)::integer
  into new_media_sources, new_media_count
  from regexp_matches(
    coalesce(new.content, ''),
    '<(?:img|audio)[^>]+src="([^"]+)"[^>]*>',
    'gi'
  ) as matches;

  if tg_op = 'UPDATE' then
    select
      coalesce(array_agg(matches[1]), array[]::text[]),
      count(*)::integer
    into old_media_sources, old_media_count
    from regexp_matches(
      coalesce(old.content, ''),
      '<(?:img|audio)[^>]+src="([^"]+)"[^>]*>',
      'gi'
    ) as matches;
  end if;

  if (
    new_media_count <> old_media_count
    or new_media_sources is distinct from old_media_sources
    or (
      (
        coalesce(new.content, '') ~* '<img'
        or coalesce(new.content, '') ~* '<audio'
      )
      and new_media_count = 0
    )
  ) and not public.can_use_chapter_images() then
    raise exception using
      message = 'CHAPTER_MEDIA_REQUIRE_PREMIUM',
      detail = 'Bolum gorsel ve seslerini yalnizca premium kullanicilar ve adminler degistirebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_chapter_image_permissions on public.chapters;
drop trigger if exists enforce_chapter_media_permissions on public.chapters;
create trigger enforce_chapter_media_permissions
before insert or update of content
on public.chapters
for each row
execute function public.enforce_chapter_media_permissions();

notify pgrst, 'reload schema';
