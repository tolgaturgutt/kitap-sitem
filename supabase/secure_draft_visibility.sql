-- KitapLab: kitap ve bölüm taslaklarını veritabanı seviyesinde korur.
-- Supabase SQL Editor'da tek parça çalıştırılır. Transaction içindeki herhangi
-- bir hata bütün değişiklikleri geri alır.

begin;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.announcement_admins admin_user
    where lower(admin_user.user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.can_manage_book(target_book_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_current_user_admin() or exists (
    select 1
    from public.books book
    where book.id = target_book_id
      and (
        book.user_id = auth.uid()
        or (
          book.co_author_id = auth.uid()
          and book.co_author_status = 'accepted'
        )
      )
  );
$$;

create or replace function public.is_book_published(target_book_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.books book
    where book.id = target_book_id
      and coalesce(book.is_draft, false) = false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
revoke all on function public.can_manage_book(bigint) from public;
revoke all on function public.is_book_published(bigint) from public;
grant execute on function public.is_current_user_admin() to anon, authenticated, service_role;
grant execute on function public.can_manage_book(bigint) to anon, authenticated, service_role;
grant execute on function public.is_book_published(bigint) to anon, authenticated, service_role;

alter table public.books enable row level security;
alter table public.chapters enable row level security;

create schema if not exists security_audit;
create table if not exists security_audit.policy_backup_20260721 as
select now() as captured_at, policy_snapshot.*
from pg_policies policy_snapshot
where policy_snapshot.schemaname = 'public'
  and policy_snapshot.tablename in ('books', 'chapters');

-- Eski geniş SELECT/ALL policy'leri yeni kısıtları OR ile etkisiz bırakmasın.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('books', 'chapters')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create policy books_select_visible_or_collaborator
on public.books
for select
to anon, authenticated
using (
  coalesce(is_draft, false) = false
  or user_id = auth.uid()
  or (co_author_id = auth.uid() and co_author_status = 'accepted')
  or public.is_current_user_admin()
);

create policy books_insert_owner
on public.books
for insert
to authenticated
with check (
  public.is_current_user_admin()
  or (
    user_id = auth.uid()
    and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy books_update_collaborator
on public.books
for update
to authenticated
using (
  user_id = auth.uid()
  or co_author_id = auth.uid()
  or public.is_current_user_admin()
)
with check (
  user_id = auth.uid()
  or co_author_id = auth.uid()
  or co_author_id is null
  or public.is_current_user_admin()
);

create or replace function public.protect_book_ownership_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() = 'service_role'
     or public.is_current_user_admin()
     or old.user_id = auth.uid() then
    return new;
  end if;

  if old.co_author_id = auth.uid() then
    if new.user_id is distinct from old.user_id
       or new.user_email is distinct from old.user_email then
      raise exception 'Kitap sahipliği değiştirilemez.';
    end if;

    if old.co_author_status = 'pending' then
      if (to_jsonb(new) - array['co_author_id', 'co_author_status', 'updated_at'])
         is distinct from
         (to_jsonb(old) - array['co_author_id', 'co_author_status', 'updated_at']) then
        raise exception 'Bekleyen ortak yazar yalnızca davete yanıt verebilir.';
      end if;

      if new.co_author_id is not null and new.co_author_id <> auth.uid() then
        raise exception 'Ortak yazar kimliği değiştirilemez.';
      end if;

      if new.co_author_status is not null
         and new.co_author_status not in ('accepted', 'rejected') then
        raise exception 'Geçersiz ortak yazar yanıtı.';
      end if;
    elsif new.co_author_id is distinct from old.co_author_id
          or new.co_author_status is distinct from old.co_author_status then
      raise exception 'Ortak yazar bilgileri yalnızca kitap sahibi tarafından değiştirilebilir.';
    end if;

    return new;
  end if;

  raise exception 'Bu kitabı güncelleme yetkiniz yok.';
end;
$$;

drop trigger if exists protect_book_ownership_fields_trigger on public.books;
create trigger protect_book_ownership_fields_trigger
before update on public.books
for each row execute function public.protect_book_ownership_fields();

create policy books_delete_collaborator
on public.books
for delete
to authenticated
using (
  user_id = auth.uid()
  or (co_author_id = auth.uid() and co_author_status = 'accepted')
  or public.is_current_user_admin()
);

create policy chapters_select_visible_or_collaborator
on public.chapters
for select
to anon, authenticated
using (
  public.can_manage_book(book_id)
  or (
    coalesce(is_draft, false) = false
    and public.is_book_published(book_id)
  )
);

create policy chapters_insert_collaborator
on public.chapters
for insert
to authenticated
with check (public.can_manage_book(book_id));

create policy chapters_update_collaborator
on public.chapters
for update
to authenticated
using (public.can_manage_book(book_id))
with check (public.can_manage_book(book_id));

create policy chapters_delete_collaborator
on public.chapters
for delete
to authenticated
using (public.can_manage_book(book_id));

-- Migrasyonun temel sözleşmesini SQL tarafında doğrula.
do $$
declare
  books_policy_count integer;
  chapters_policy_count integer;
begin
  select count(*) into books_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'books';

  select count(*) into chapters_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'chapters';

  if books_policy_count <> 4 then
    raise exception 'books policy doğrulaması başarısız: %', books_policy_count;
  end if;

  if chapters_policy_count <> 4 then
    raise exception 'chapters policy doğrulaması başarısız: %', chapters_policy_count;
  end if;
end
$$;

commit;
