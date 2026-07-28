-- Normal kullanicilarin panolarini yayinlanmis kendi kitaplarindan birine
-- baglamasini zorunlu tutar. Adminler kitapsiz, gorselli pano paylasabilir.
create or replace function public.enforce_pano_admin_media_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  actor_is_admin boolean;
  selected_book_is_eligible boolean;
begin
  if actor_id is null or actor_email = '' then
    raise exception 'Authentication is required to create or update panos.';
  end if;

  select exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = actor_email
  )
  into actor_is_admin;

  if not actor_is_admin
    and lower(coalesce(new.user_email, '')) <> actor_email
  then
    raise exception 'Users can only create or update their own panos.';
  end if;

  if not actor_is_admin then
    if new.book_id is null then
      raise exception using
        message = 'PANO_BOOK_REQUIRED',
        detail = 'Normal kullanicilar pano paylasmak icin yayinlanmis kitaplarini secmelidir.';
    end if;

    select exists (
      select 1
      from public.books book
      where book.id = new.book_id
        and book.is_draft = false
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
    into selected_book_is_eligible;

    if not selected_book_is_eligible then
      raise exception using
        message = 'PANO_BOOK_REQUIRED',
        detail = 'Secilen kitap yayinlanmis olmali ve kullanici kitabin yazari veya onayli ortak yazari olmalidir.';
    end if;
  elsif new.book_id is null
    and nullif(trim(coalesce(new.image_url, '')), '') is null
  then
    raise exception using
      message = 'PANO_IMAGE_REQUIRED',
      detail = 'Kitapsiz admin panolari bir gorsel icermelidir.';
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
