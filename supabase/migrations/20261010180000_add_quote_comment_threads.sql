begin;

alter table public.quote_comments
  add column if not exists parent_id bigint references public.quote_comments(id) on delete cascade;

create table if not exists public.quote_comment_likes (
  comment_id bigint not null references public.quote_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists quote_comments_parent_id_idx on public.quote_comments (parent_id);
create index if not exists quote_comment_likes_user_id_idx on public.quote_comment_likes (user_id);

alter table public.quote_comment_likes enable row level security;
revoke all on table public.quote_comment_likes from public, anon, authenticated;

create or replace function quote_private.validate_quote_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public, quote_private, pg_temp
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.quote_comments parent_comment
    where parent_comment.id = new.parent_id
      and parent_comment.quote_id = new.quote_id
  ) then
    raise exception 'QUOTE_COMMENT_PARENT_INVALID';
  end if;

  return new;
end;
$$;

revoke all on function quote_private.validate_quote_comment_parent() from public;

drop trigger if exists validate_quote_comment_parent_trigger on public.quote_comments;
create trigger validate_quote_comment_parent_trigger
before insert or update of parent_id, quote_id on public.quote_comments
for each row execute function quote_private.validate_quote_comment_parent();

create or replace function public.get_quote_comment_like_summaries(p_comment_ids bigint[])
returns table (
  comment_id bigint,
  like_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with requested_comments as (
    select distinct requested_id as comment_id
    from unnest(coalesce(p_comment_ids, '{}'::bigint[])) requested_id
  )
  select
    requested.comment_id,
    count(liked.user_id)::bigint as like_count,
    coalesce(bool_or(liked.user_id = (select auth.uid())), false) as liked_by_me
  from requested_comments requested
  left join public.quote_comment_likes liked on liked.comment_id = requested.comment_id
  group by requested.comment_id;
$$;

create or replace function public.toggle_quote_comment_like(p_comment_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_comment public.quote_comments%rowtype;
  actor_username_value text;
  recipient_email_value text;
  is_liked boolean;
  current_like_count bigint;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  select target.* into target_comment
  from public.quote_comments target
  where target.id = p_comment_id;

  if not found then
    raise exception 'QUOTE_COMMENT_NOT_FOUND';
  end if;

  if target_comment.user_id = actor_id then
    raise exception 'OWN_COMMENT_LIKE_NOT_ALLOWED';
  end if;

  delete from public.quote_comment_likes liked
  where liked.comment_id = p_comment_id and liked.user_id = actor_id;

  if found then
    is_liked := false;
  else
    insert into public.quote_comment_likes (comment_id, user_id)
    values (p_comment_id, actor_id)
    on conflict (comment_id, user_id) do nothing;
    is_liked := true;

    select coalesce(profile.username, split_part(profile.email, '@', 1))
      into actor_username_value
    from public.profiles profile
    where profile.id = actor_id
    limit 1;

    select profile.email into recipient_email_value
    from public.profiles profile
    where profile.id = target_comment.user_id
    limit 1;

    if recipient_email_value is not null then
      begin
        insert into public.notifications (
          recipient_email,
          actor_username,
          type,
          quote_id,
          is_read
        ) values (
          recipient_email_value,
          coalesce(actor_username_value, 'Bir kullanıcı'),
          'quote_comment_like',
          target_comment.quote_id,
          false
        );
      exception when others then
        raise warning 'QUOTE_COMMENT_LIKE_NOTIFICATION_FAILED: %', sqlerrm;
      end;
    end if;
  end if;

  select count(*)::bigint into current_like_count
  from public.quote_comment_likes liked
  where liked.comment_id = p_comment_id;

  return jsonb_build_object(
    'comment_id', p_comment_id,
    'like_count', current_like_count,
    'liked_by_me', is_liked
  );
end;
$$;

revoke all on function public.get_quote_comment_like_summaries(bigint[]) from public;
revoke all on function public.toggle_quote_comment_like(bigint) from public;
grant execute on function public.get_quote_comment_like_summaries(bigint[]) to anon, authenticated;
grant execute on function public.toggle_quote_comment_like(bigint) to authenticated;

commit;

notify pgrst, 'reload schema';

select
  to_regclass('public.quote_comment_likes') as quote_comment_likes_table,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_comments' and column_name = 'parent_id'
  ) as reply_support_installed;
