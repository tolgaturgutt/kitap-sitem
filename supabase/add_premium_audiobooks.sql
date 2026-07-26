-- Premium/admin sesli kitaplar.
-- Sesli kitaplar normal kitap tablosunda yer alir; bolumleri ise yalnizca
-- ozel podcast oynaticisinda kullanilan tek bir ses dosyasi tasir.

alter table public.profiles
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

alter table public.books
  add column if not exists book_type text not null default 'text';

alter table public.books
  drop constraint if exists books_book_type_check;

alter table public.books
  add constraint books_book_type_check
  check (book_type in ('text', 'audio'));

alter table public.chapters
  add column if not exists audio_url text;

alter table public.chapters
  add column if not exists audio_duration_seconds integer not null default 0;

alter table public.chapters
  drop constraint if exists chapters_audio_duration_nonnegative;

alter table public.chapters
  add constraint chapters_audio_duration_nonnegative
  check (audio_duration_seconds >= 0);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'audiobooks',
  'audiobooks',
  true,
  262144000,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/x-aac',
    'audio/ogg',
    'application/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "premium_and_admin_audiobook_uploads" on storage.objects;
create policy "premium_and_admin_audiobook_uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audiobooks'
  and owner_id = auth.uid()::text
  and name like auth.uid()::text || '/%'
  and public.can_use_premium_features()
);

create or replace function public.enforce_premium_audiobook()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if (
    (tg_op = 'INSERT' and new.book_type = 'audio')
    or (
      tg_op = 'UPDATE'
      and (
        old.book_type = 'audio'
        or new.book_type = 'audio'
      )
    )
  ) and not public.can_use_premium_features() then
    raise exception using
      message = 'PREMIUM_AUDIOBOOK_REQUIRED',
      detail = 'Sesli kitaplari yalnizca premium kullanicilar ve adminler olusturabilir ve duzenleyebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_premium_audiobook on public.books;
create trigger enforce_premium_audiobook
before insert or update of
  title,
  summary,
  cover_url,
  trailer_url,
  is_draft,
  is_completed,
  co_author_id,
  co_author_status,
  book_type
on public.books
for each row
execute function public.enforce_premium_audiobook();

create or replace function public.enforce_audiobook_chapter()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  parent_book_type text;
begin
  select book.book_type
  into parent_book_type
  from public.books book
  where book.id = new.book_id;

  if parent_book_type = 'audio' then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
      and not public.can_use_premium_features()
    then
      raise exception using
        message = 'PREMIUM_AUDIOBOOK_REQUIRED',
        detail = 'Sesli kitap bolumlerini yalnizca premium kullanicilar ve adminler degistirebilir.';
    end if;

    if nullif(trim(coalesce(new.audio_url, '')), '') is null then
      raise exception using
        message = 'AUDIOBOOK_AUDIO_REQUIRED',
        detail = 'Sesli kitap bolumunde bir ses dosyasi bulunmalidir.';
    end if;

    if position('/storage/v1/object/public/audiobooks/' in new.audio_url) = 0 then
      raise exception using
        message = 'INVALID_AUDIOBOOK_AUDIO_URL',
        detail = 'Sesli kitap sesi KitapLab sesli kitap deposunda bulunmalidir.';
    end if;

    if trim(coalesce(new.content, '')) <> '' then
      raise exception using
        message = 'AUDIOBOOK_AUDIO_ONLY',
        detail = 'Sesli kitap bolumlerine yazi veya satir ici medya eklenemez.';
    end if;

    new.content := '';
    new.word_count := 0;
  elsif nullif(trim(coalesce(new.audio_url, '')), '') is not null then
    raise exception using
      message = 'AUDIO_CHAPTER_REQUIRES_AUDIOBOOK',
      detail = 'Ozel ses bolumleri yalnizca sesli kitaplara eklenebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_audiobook_chapter on public.chapters;
create trigger enforce_audiobook_chapter
before insert or update of
  title,
  content,
  audio_url,
  audio_duration_seconds,
  is_draft
on public.chapters
for each row
execute function public.enforce_audiobook_chapter();

notify pgrst, 'reload schema';
