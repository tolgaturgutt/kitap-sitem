-- Pano olusturmak icin kullanicinin yayinlanmis ve en az bir yayinlanmis
-- bolumu olan bir kitabin sahibi veya onayli ortak yazari olmasini zorunlu tutar.
-- Kitabi olan kullanici, gorsel eklediyse panoyu bir kitaba baglamak zorunda degildir.
create or replace function public.enforce_pano_admin_media_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid;
  actor_email text;
  actor_is_admin boolean;
  actor_has_published_book boolean;
begin
  actor_id := auth.uid();
  actor_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if actor_id is null or actor_email = '' then
    raise exception 'Authentication is required to create or update panos.';
  end if;

  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.books book
      where book.is_draft = false
        and (
          book.user_id = actor_id
          or (
            book.co_author_id = actor_id
            and book.co_author_status = 'accepted'
          )
        )
        and exists (
          select 1
          from public.chapters chapter
          where chapter.book_id = book.id
            and chapter.is_draft = false
        )
    )
    into actor_has_published_book;

    if not actor_has_published_book then
      raise exception using
        message = 'PANO_REQUIRES_PUBLISHED_BOOK',
        detail = 'Pano olusturmak icin yayinlanmis ve en az bir yayinlanmis bolumu olan kitap gereklidir.';
    end if;
  end if;

  select exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = actor_email
  )
  into actor_is_admin;

  if not actor_is_admin then
    if lower(coalesce(new.user_email, '')) <> actor_email then
      raise exception 'Users can only create or update their own panos.';
    end if;
  end if;

  if new.book_id is null and nullif(trim(coalesce(new.image_url, '')), '') is null then
    raise exception 'Panos without a book require an image.';
  end if;

  if new.book_id is null then
    new.chapter_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_pano_admin_media_rules on public.panolar;

create trigger enforce_pano_admin_media_rules
before insert or update of user_email, book_id, chapter_id, image_url
on public.panolar
for each row
execute function public.enforce_pano_admin_media_rules();

notify pgrst, 'reload schema';
