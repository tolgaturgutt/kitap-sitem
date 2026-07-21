-- KitapLab: bir bolum ilk kez taslaktan yayina alindiginda takipcilere
-- bildirimi tam bir kez ve ayni transaction icinde gonderir.

begin;

alter table public.chapters
  add column if not exists published_at timestamptz;

comment on column public.chapters.published_at is
  'Bolumun ilk kez yayina alindigi zaman. Tekrar yayinlarda degismez.';

-- Halihazirda yayinda olan veya daha once yeni bolum bildirimi uretilmis
-- bolumleri eski yayin olarak isaretle; migration sonrasi tekrar bildirim
-- gitmesini engelle.
update public.chapters chapter
set published_at = coalesce(chapter.updated_at, chapter.created_at, now())
where chapter.published_at is null
  and (
    chapter.is_draft = false
    or exists (
      select 1
      from public.notifications notification
      where notification.type = 'new_chapter'
        and notification.chapter_id = chapter.id
    )
  );

create or replace function public.publish_chapter(target_chapter_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  chapter_record record;
  actor_username_value text;
  is_first_publication boolean;
  was_previously_announced boolean;
begin
  select
    chapter.id,
    chapter.book_id,
    chapter.is_draft,
    chapter.published_at,
    book.title as book_title,
    book.username as book_username
  into chapter_record
  from public.chapters chapter
  join public.books book on book.id = chapter.book_id
  where chapter.id = target_chapter_id
  for update of chapter;

  if not found then
    raise exception 'Bolum bulunamadi.' using errcode = 'P0002';
  end if;

  if not public.can_manage_book(chapter_record.book_id) then
    raise exception 'Bu bolumu yayinlama yetkiniz yok.' using errcode = '42501';
  end if;

  if chapter_record.is_draft = false then
    return false;
  end if;

  select exists (
    select 1
    from public.notifications notification
    where notification.type = 'new_chapter'
      and notification.chapter_id = target_chapter_id
  )
  into was_previously_announced;

  is_first_publication :=
    chapter_record.published_at is null
    and not was_previously_announced;

  update public.chapters
  set
    is_draft = false,
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = target_chapter_id;

  if is_first_publication then
    select coalesce(
      profile.username,
      chapter_record.book_username,
      split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1),
      'Yazar'
    )
    into actor_username_value
    from (select 1) source
    left join public.profiles profile on profile.id = auth.uid();

    insert into public.notifications (
      recipient_email,
      actor_username,
      type,
      book_title,
      book_id,
      chapter_id,
      is_read,
      created_at
    )
    select distinct
      follower.user_email,
      actor_username_value,
      'new_chapter',
      chapter_record.book_title,
      chapter_record.book_id,
      target_chapter_id,
      false,
      now()
    from public.follows follower
    where follower.book_id = chapter_record.book_id
      and follower.user_email is not null
      and lower(follower.user_email) <>
        lower(coalesce(auth.jwt() ->> 'email', ''));
  end if;

  return is_first_publication;
end;
$$;

revoke all on function public.publish_chapter(bigint) from public;
grant execute on function public.publish_chapter(bigint) to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chapters'
      and column_name = 'published_at'
  ) then
    raise exception 'published_at validation failed';
  end if;

  if to_regprocedure('public.publish_chapter(bigint)') is null then
    raise exception 'publish_chapter validation failed';
  end if;
end;
$$;

commit;
