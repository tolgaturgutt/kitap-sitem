-- Ana sayfadaki gunun kitabini yalnizca adminler secer.
-- Ayni anda en fazla bir kitap secili olabilir.

alter table public.books
  add column if not exists is_home_featured boolean not null default false;

create unique index if not exists books_single_home_featured_idx
  on public.books (is_home_featured)
  where is_home_featured = true;

create or replace function public.enforce_home_featured_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
       (tg_op = 'INSERT' and new.is_home_featured = true)
       or (tg_op = 'UPDATE' and new.is_home_featured is distinct from old.is_home_featured)
     )
     and not exists (
       select 1
       from public.announcement_admins admin
       where lower(admin.user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     ) then
    raise exception 'HOME_FEATURED_ADMIN_ONLY' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_home_featured_admin on public.books;
create trigger enforce_home_featured_admin
before insert or update on public.books
for each row
execute function public.enforce_home_featured_admin();

create or replace function public.set_home_featured_book(target_book_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) then
    raise exception 'HOME_FEATURED_ADMIN_ONLY' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(4815162342);

  if target_book_id is not null and not exists (
    select 1
    from public.books book
    where book.id = target_book_id
      and book.is_draft = false
  ) then
    raise exception 'HOME_FEATURED_BOOK_NOT_FOUND_OR_DRAFT' using errcode = 'P0002';
  end if;

  update public.books
  set is_home_featured = false
  where is_home_featured = true
    and (target_book_id is null or id <> target_book_id);

  if target_book_id is not null then
    update public.books
    set is_home_featured = true
    where id = target_book_id;
  end if;

  return target_book_id;
end;
$$;

revoke all on function public.set_home_featured_book(bigint) from public, anon;
grant execute on function public.set_home_featured_book(bigint) to authenticated;
