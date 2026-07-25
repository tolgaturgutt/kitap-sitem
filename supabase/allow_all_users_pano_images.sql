-- Giris yapmis tum kullanicilar kendi panolarina ozel gorsel ekleyebilir.
-- Kitabi olmayan kullanicilar gorsel ekleyerek kitaptan bagimsiz pano olusturabilir.
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
  actor_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if actor_email = '' then
    raise exception 'Authentication is required to create or update panos.';
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

notify pgrst, 'reload schema';
