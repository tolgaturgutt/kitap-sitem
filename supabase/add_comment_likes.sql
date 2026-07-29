begin;

create table if not exists public.comment_likes (
  comment_id bigint not null
    references public.comments(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.pano_comment_likes (
  comment_id uuid not null
    references public.pano_comments(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_id_idx
  on public.comment_likes (user_id);

create index if not exists pano_comment_likes_user_id_idx
  on public.pano_comment_likes (user_id);

alter table public.comment_likes enable row level security;
alter table public.pano_comment_likes enable row level security;

revoke all on table public.comment_likes
from public, anon, authenticated;

revoke all on table public.pano_comment_likes
from public, anon, authenticated;

create or replace function public.get_comment_like_summaries(
  p_comment_ids bigint[]
)
returns table (
  comment_id bigint,
  like_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with requested_comments as (
    select distinct requested_id as comment_id
    from unnest(coalesce(p_comment_ids, '{}'::bigint[])) requested_id
  )
  select
    requested.comment_id,
    count(liked.user_id)::bigint as like_count,
    coalesce(
      bool_or(liked.user_id = auth.uid()),
      false
    ) as liked_by_me
  from requested_comments requested
  left join public.comment_likes liked
    on liked.comment_id = requested.comment_id
  group by requested.comment_id;
$$;

create or replace function public.get_pano_comment_like_summaries(
  p_comment_ids uuid[]
)
returns table (
  comment_id uuid,
  like_count bigint,
  liked_by_me boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with requested_comments as (
    select distinct requested_id as comment_id
    from unnest(coalesce(p_comment_ids, '{}'::uuid[])) requested_id
  )
  select
    requested.comment_id,
    count(liked.user_id)::bigint as like_count,
    coalesce(
      bool_or(liked.user_id = auth.uid()),
      false
    ) as liked_by_me
  from requested_comments requested
  left join public.pano_comment_likes liked
    on liked.comment_id = requested.comment_id
  group by requested.comment_id;
$$;

create or replace function public.toggle_comment_like(
  p_comment_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  target_comment public.comments%rowtype;
  actor_username_value text;
  book_title_value text;
  is_liked boolean;
  current_like_count bigint;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  select target.*
    into target_comment
  from public.comments target
  where target.id = p_comment_id;

  if not found then
    raise exception 'COMMENT_NOT_FOUND';
  end if;

  if target_comment.user_id = actor_id then
    raise exception 'OWN_COMMENT_LIKE_NOT_ALLOWED';
  end if;

  delete from public.comment_likes liked
  where liked.comment_id = p_comment_id
    and liked.user_id = actor_id;

  if found then
    is_liked := false;
  else
    insert into public.comment_likes (comment_id, user_id)
    values (p_comment_id, actor_id)
    on conflict (comment_id, user_id) do nothing;
    is_liked := true;

    if target_comment.user_email is not null then
      select coalesce(
        profile.username,
        split_part(profile.email, '@', 1)
      )
        into actor_username_value
      from public.profiles profile
      where profile.id = actor_id
      limit 1;

      select book.title
        into book_title_value
      from public.books book
      where book.id = target_comment.book_id;

      begin
        insert into public.notifications (
          recipient_email,
          actor_username,
          type,
          book_title,
          book_id,
          chapter_id,
          paragraph_id,
          paragraph_key,
          comment_id,
          is_read
        ) values (
          target_comment.user_email,
          coalesce(actor_username_value, 'Bir kullanıcı'),
          'comment_like',
          book_title_value,
          target_comment.book_id,
          target_comment.chapter_id,
          target_comment.paragraph_id,
          target_comment.paragraph_key,
          target_comment.id,
          false
        );
      exception when others then
        raise warning 'COMMENT_LIKE_NOTIFICATION_FAILED: %', sqlerrm;
      end;
    end if;
  end if;

  select count(*)::bigint
    into current_like_count
  from public.comment_likes liked
  where liked.comment_id = p_comment_id;

  return jsonb_build_object(
    'comment_id', p_comment_id,
    'like_count', current_like_count,
    'liked_by_me', is_liked
  );
end;
$$;

create or replace function public.toggle_pano_comment_like(
  p_comment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  target_comment public.pano_comments%rowtype;
  actor_username_value text;
  is_liked boolean;
  current_like_count bigint;
begin
  if actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  select target.*
    into target_comment
  from public.pano_comments target
  where target.id = p_comment_id;

  if not found then
    raise exception 'PANO_COMMENT_NOT_FOUND';
  end if;

  if target_comment.user_id = actor_id then
    raise exception 'OWN_COMMENT_LIKE_NOT_ALLOWED';
  end if;

  delete from public.pano_comment_likes liked
  where liked.comment_id = p_comment_id
    and liked.user_id = actor_id;

  if found then
    is_liked := false;
  else
    insert into public.pano_comment_likes (comment_id, user_id)
    values (p_comment_id, actor_id)
    on conflict (comment_id, user_id) do nothing;
    is_liked := true;

    if target_comment.user_email is not null then
      select coalesce(
        profile.username,
        split_part(profile.email, '@', 1)
      )
        into actor_username_value
      from public.profiles profile
      where profile.id = actor_id
      limit 1;

      begin
        insert into public.notifications (
          recipient_email,
          actor_username,
          type,
          pano_id,
          is_read
        ) values (
          target_comment.user_email,
          coalesce(actor_username_value, 'Bir kullanıcı'),
          'pano_comment_like',
          target_comment.pano_id,
          false
        );
      exception when others then
        raise warning 'PANO_COMMENT_LIKE_NOTIFICATION_FAILED: %', sqlerrm;
      end;
    end if;
  end if;

  select count(*)::bigint
    into current_like_count
  from public.pano_comment_likes liked
  where liked.comment_id = p_comment_id;

  return jsonb_build_object(
    'comment_id', p_comment_id,
    'like_count', current_like_count,
    'liked_by_me', is_liked
  );
end;
$$;

revoke all on function public.get_comment_like_summaries(bigint[])
from public;
revoke all on function public.get_pano_comment_like_summaries(uuid[])
from public;
revoke all on function public.toggle_comment_like(bigint)
from public;
revoke all on function public.toggle_pano_comment_like(uuid)
from public;

grant execute on function public.get_comment_like_summaries(bigint[])
to anon, authenticated;
grant execute on function public.get_pano_comment_like_summaries(uuid[])
to anon, authenticated;
grant execute on function public.toggle_comment_like(bigint)
to authenticated;
grant execute on function public.toggle_pano_comment_like(uuid)
to authenticated;

commit;

notify pgrst, 'reload schema';
