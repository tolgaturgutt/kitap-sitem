-- Admin panolari icin kitaptan bagimsiz tek gorsel destegi.
alter table public.panolar
  add column if not exists image_url text;

alter table public.panolar
  alter column book_id drop not null;

create or replace function public.enforce_pano_admin_media_rules()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_email text;
  actor_is_admin boolean;
begin
  actor_email := lower(coalesce(auth.jwt() ->> 'email', new.user_email));

  select exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = actor_email
  )
  into actor_is_admin;

  if not actor_is_admin then
    if new.book_id is null then
      raise exception 'Only admins can create panos without a book.';
    end if;

    if nullif(trim(coalesce(new.image_url, '')), '') is not null then
      raise exception 'Only admins can attach custom pano images.';
    end if;
  elsif new.book_id is null and nullif(trim(coalesce(new.image_url, '')), '') is null then
    raise exception 'Admin panos without a book require an image.';
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
