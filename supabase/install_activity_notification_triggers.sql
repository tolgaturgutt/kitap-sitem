-- Yeni beğeni, pano yorumu ve kütüphane kayıtlarından bildirim oluşturur.
-- Bu dosyayı Supabase SQL Editor içinde bir kez çalıştırın.

begin;

create or replace function public.create_chapter_vote_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_email_value text;
  book_title_value text;
  book_id_value bigint;
  actor_username_value text;
begin
  select b.user_email, b.title, b.id
    into recipient_email_value, book_title_value, book_id_value
  from public.chapters ch
  join public.books b on b.id = ch.book_id
  where ch.id = new.chapter_id;

  if recipient_email_value is null
     or lower(recipient_email_value) = lower(new.user_email) then
    return new;
  end if;

  select p.username
    into actor_username_value
  from public.profiles p
  where lower(p.email) = lower(new.user_email)
  limit 1;

  actor_username_value := coalesce(
    actor_username_value,
    split_part(new.user_email, '@', 1)
  );

  if not exists (
    select 1
    from public.notifications n
    where n.type = 'chapter_vote'
      and n.chapter_id = new.chapter_id
      and lower(n.recipient_email) = lower(recipient_email_value)
      and n.actor_username = actor_username_value
  ) then
    insert into public.notifications (
      recipient_email,
      actor_username,
      type,
      book_title,
      book_id,
      chapter_id,
      is_read
    ) values (
      recipient_email_value,
      actor_username_value,
      'chapter_vote',
      book_title_value,
      book_id_value,
      new.chapter_id,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists chapter_vote_notification_trigger
  on public.chapter_votes;

create trigger chapter_vote_notification_trigger
after insert on public.chapter_votes
for each row execute function public.create_chapter_vote_notification();


create or replace function public.create_pano_vote_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_email_value text;
  actor_username_value text;
begin
  select pano.user_email
    into recipient_email_value
  from public.panolar pano
  where pano.id = new.pano_id;

  if recipient_email_value is null
     or lower(recipient_email_value) = lower(new.user_email) then
    return new;
  end if;

  select p.username
    into actor_username_value
  from public.profiles p
  where lower(p.email) = lower(new.user_email)
  limit 1;

  actor_username_value := coalesce(
    actor_username_value,
    split_part(new.user_email, '@', 1)
  );

  if not exists (
    select 1
    from public.notifications n
    where n.type = 'pano_vote'
      and n.pano_id = new.pano_id
      and lower(n.recipient_email) = lower(recipient_email_value)
      and n.actor_username = actor_username_value
  ) then
    insert into public.notifications (
      recipient_email,
      actor_username,
      type,
      pano_id,
      is_read
    ) values (
      recipient_email_value,
      actor_username_value,
      'pano_vote',
      new.pano_id,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists pano_vote_notification_trigger
  on public.pano_votes;

create trigger pano_vote_notification_trigger
after insert on public.pano_votes
for each row execute function public.create_pano_vote_notification();


create or replace function public.create_pano_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_email_value text;
  actor_username_value text;
  notification_type_value text;
begin
  if new.parent_id is not null then
    select parent_comment.user_email
      into recipient_email_value
    from public.pano_comments parent_comment
    where parent_comment.id = new.parent_id;

    notification_type_value := 'reply';
  else
    select pano.user_email
      into recipient_email_value
    from public.panolar pano
    where pano.id = new.pano_id;

    notification_type_value := 'pano_comment';
  end if;

  if recipient_email_value is null
     or lower(recipient_email_value) = lower(new.user_email) then
    return new;
  end if;

  select p.username
    into actor_username_value
  from public.profiles p
  where p.id = new.user_id
  limit 1;

  actor_username_value := coalesce(
    actor_username_value,
    new.username,
    split_part(new.user_email, '@', 1)
  );

  if not exists (
    select 1
    from public.notifications n
    where n.type = notification_type_value
      and n.pano_id = new.pano_id
      and lower(n.recipient_email) = lower(recipient_email_value)
      and n.actor_username = actor_username_value
      and n.created_at = new.created_at
  ) then
    insert into public.notifications (
      recipient_email,
      actor_username,
      type,
      pano_id,
      is_read,
      created_at
    ) values (
      recipient_email_value,
      actor_username_value,
      notification_type_value,
      new.pano_id,
      false,
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists pano_comment_notification_trigger
  on public.pano_comments;

create trigger pano_comment_notification_trigger
after insert on public.pano_comments
for each row execute function public.create_pano_comment_notification();


create or replace function public.create_library_add_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_email_value text;
  book_title_value text;
  actor_username_value text;
begin
  select b.user_email, b.title
    into recipient_email_value, book_title_value
  from public.books b
  where b.id = new.book_id;

  if recipient_email_value is null
     or lower(recipient_email_value) = lower(new.user_email) then
    return new;
  end if;

  select p.username
    into actor_username_value
  from public.profiles p
  where lower(p.email) = lower(new.user_email)
  limit 1;

  actor_username_value := coalesce(
    actor_username_value,
    split_part(new.user_email, '@', 1)
  );

  if not exists (
    select 1
    from public.notifications n
    where n.type = 'library_add'
      and n.book_id = new.book_id
      and lower(n.recipient_email) = lower(recipient_email_value)
      and n.actor_username = actor_username_value
  ) then
    insert into public.notifications (
      recipient_email,
      actor_username,
      type,
      book_title,
      book_id,
      is_read
    ) values (
      recipient_email_value,
      actor_username_value,
      'library_add',
      book_title_value,
      new.book_id,
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists library_add_notification_trigger
  on public.follows;

create trigger library_add_notification_trigger
after insert on public.follows
for each row execute function public.create_library_add_notification();

commit;
