begin;

alter table public.book_quotes
  add column if not exists is_pinned boolean not null default false;

create index if not exists book_quotes_pinned_created_idx
  on public.book_quotes (is_pinned desc, created_at desc);

create or replace function quote_private.protect_book_quote_update()
returns trigger
language plpgsql
security invoker
set search_path = public, quote_private, auth, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'QUOTE_OWNER_CANNOT_CHANGE';
  end if;

  if public.is_current_user_admin() then
    return new;
  end if;

  if auth.uid() is null or old.user_id is distinct from auth.uid() then
    raise exception 'QUOTE_UPDATE_NOT_ALLOWED';
  end if;

  if new.is_pinned is distinct from old.is_pinned then
    raise exception 'QUOTE_PIN_ADMIN_ONLY';
  end if;

  if not quote_private.can_quote_book(new.book_id) then
    raise exception 'QUOTE_BOOK_NOT_ALLOWED';
  end if;

  return new;
end;
$$;

revoke all on function quote_private.protect_book_quote_update() from public;

drop trigger if exists protect_book_quote_update_trigger on public.book_quotes;
create trigger protect_book_quote_update_trigger
before update on public.book_quotes
for each row execute function quote_private.protect_book_quote_update();

drop policy if exists book_quotes_update_owner_or_admin on public.book_quotes;
create policy book_quotes_update_owner_or_admin
on public.book_quotes
for update
to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.is_current_user_admin())
)
with check (
  (
    (select auth.uid()) = user_id
    and (select quote_private.can_quote_book(book_id))
  )
  or (select public.is_current_user_admin())
);

drop policy if exists book_quotes_delete_own on public.book_quotes;
drop policy if exists book_quotes_delete_owner_or_admin on public.book_quotes;
create policy book_quotes_delete_owner_or_admin
on public.book_quotes
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.is_current_user_admin())
);

grant update on table public.book_quotes to authenticated;

commit;

notify pgrst, 'reload schema';

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'book_quotes'
      and column_name = 'is_pinned'
  ) as pin_column_installed,
  exists (
    select 1 from pg_trigger
    where tgname = 'protect_book_quote_update_trigger'
      and not tgisinternal
  ) as update_guard_installed;
