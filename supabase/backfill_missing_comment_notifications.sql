-- Son 7 gündeki eksik yorum bildirimlerini uygulama içi Bildirimler listesine ekler.
-- push_status = 'skipped' olduğu için geçmiş kayıtlar telefona push olarak gönderilmez.

begin;

-- Kitaba/bölüme/paragrafa yapılan ana yorumlar -> kitabın sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  book_title,
  book_id,
  chapter_id,
  paragraph_id,
  comment_id,
  is_read,
  created_at,
  push_status
)
select
  b.user_email,
  coalesce(p.username, c.username, split_part(c.user_email, '@', 1)),
  'comment',
  b.title,
  c.book_id,
  c.chapter_id,
  c.paragraph_id,
  c.id,
  false,
  c.created_at,
  'skipped'
from public.comments c
join public.books b on b.id = c.book_id
left join public.profiles p on p.id = c.user_id
where c.parent_id is null
  and c.created_at >= now() - interval '7 days'
  and lower(b.user_email) <> lower(c.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.comment_id = c.id
      and n.type = 'comment'
      and lower(n.recipient_email) = lower(b.user_email)
  );

-- Yanıtlar -> ana yorumun sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  book_title,
  book_id,
  chapter_id,
  paragraph_id,
  comment_id,
  is_read,
  created_at,
  push_status
)
select
  parent_comment.user_email,
  coalesce(p.username, c.username, split_part(c.user_email, '@', 1)),
  'reply',
  b.title,
  c.book_id,
  c.chapter_id,
  c.paragraph_id,
  c.id,
  false,
  c.created_at,
  'skipped'
from public.comments c
join public.comments parent_comment on parent_comment.id = c.parent_id
left join public.books b on b.id = c.book_id
left join public.profiles p on p.id = c.user_id
where c.parent_id is not null
  and c.created_at >= now() - interval '7 days'
  and lower(parent_comment.user_email) <> lower(c.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.comment_id = c.id
      and n.type = 'reply'
      and lower(n.recipient_email) = lower(parent_comment.user_email)
  );

commit;
