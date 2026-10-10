begin;

create or replace function quote_private.can_quote_book(target_book_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.books book
    where book.id = target_book_id
      and coalesce(book.is_draft, false) = false
      and book.user_id is distinct from auth.uid()
      and not (
        book.co_author_id is not distinct from auth.uid()
        and coalesce(book.co_author_status = 'accepted', false)
      )
  );
$$;

revoke all on function quote_private.can_quote_book(bigint) from public;
grant usage on schema quote_private to authenticated;
grant execute on function quote_private.can_quote_book(bigint) to authenticated;

commit;

notify pgrst, 'reload schema';

select
  quote_private.can_quote_book(null) = false as function_is_available,
  position(
    'coalesce(book.co_author_status = ''accepted'', false)'
    in pg_get_functiondef('quote_private.can_quote_book(bigint)'::regprocedure)
  ) > 0 as null_safe_rule_installed;
