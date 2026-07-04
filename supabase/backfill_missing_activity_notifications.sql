-- Son 7 gündeki eksik beğeni ve kütüphane bildirimlerini uygulama içi
-- Bildirimler listesine ekler. Geçmiş kayıtlar telefona push olarak gönderilmez.

begin;

-- Bölüm beğenileri -> kitabın sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  book_title,
  book_id,
  chapter_id,
  is_read,
  created_at,
  push_status
)
select
  b.user_email,
  coalesce(p.username, split_part(v.user_email, '@', 1)),
  'chapter_vote',
  b.title,
  ch.book_id,
  ch.id,
  false,
  v.created_at,
  'skipped'
from public.chapter_votes v
join public.chapters ch on ch.id = v.chapter_id
join public.books b on b.id = ch.book_id
left join public.profiles p on lower(p.email) = lower(v.user_email)
where v.created_at >= now() - interval '7 days'
  and lower(b.user_email) <> lower(v.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.type = 'chapter_vote'
      and n.chapter_id = ch.id
      and lower(n.recipient_email) = lower(b.user_email)
      and n.actor_username = coalesce(p.username, split_part(v.user_email, '@', 1))
  );

-- Pano beğenileri -> pano sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  pano_id,
  is_read,
  created_at,
  push_status
)
select
  pano.user_email,
  coalesce(p.username, split_part(v.user_email, '@', 1)),
  'pano_vote',
  pano.id,
  false,
  v.created_at,
  'skipped'
from public.pano_votes v
join public.panolar pano on pano.id = v.pano_id
left join public.profiles p on lower(p.email) = lower(v.user_email)
where v.created_at >= now() - interval '7 days'
  and lower(pano.user_email) <> lower(v.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.type = 'pano_vote'
      and n.pano_id = pano.id
      and lower(n.recipient_email) = lower(pano.user_email)
      and n.actor_username = coalesce(p.username, split_part(v.user_email, '@', 1))
  );

-- Kütüphaneye eklemeler -> kitabın sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  book_title,
  book_id,
  is_read,
  created_at,
  push_status
)
select
  b.user_email,
  coalesce(p.username, split_part(f.user_email, '@', 1)),
  'library_add',
  b.title,
  b.id,
  false,
  f.created_at,
  'skipped'
from public.follows f
join public.books b on b.id = f.book_id
left join public.profiles p on lower(p.email) = lower(f.user_email)
where f.created_at >= now() - interval '7 days'
  and lower(b.user_email) <> lower(f.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.type = 'library_add'
      and n.book_id = b.id
      and lower(n.recipient_email) = lower(b.user_email)
      and n.actor_username = coalesce(p.username, split_part(f.user_email, '@', 1))
  );

-- Pano yorumları ve yanıtları -> pano veya yorum sahibine bildirim.
insert into public.notifications (
  recipient_email,
  actor_username,
  type,
  pano_id,
  is_read,
  created_at,
  push_status
)
select
  case
    when c.parent_id is not null then parent_comment.user_email
    else pano.user_email
  end,
  coalesce(p.username, c.username, split_part(c.user_email, '@', 1)),
  case
    when c.parent_id is not null then 'reply'
    else 'pano_comment'
  end,
  c.pano_id,
  false,
  c.created_at,
  'skipped'
from public.pano_comments c
join public.panolar pano on pano.id = c.pano_id
left join public.pano_comments parent_comment on parent_comment.id = c.parent_id
left join public.profiles p on p.id = c.user_id
where c.created_at >= now() - interval '7 days'
  and lower(
    case
      when c.parent_id is not null then parent_comment.user_email
      else pano.user_email
    end
  ) <> lower(c.user_email)
  and not exists (
    select 1
    from public.notifications n
    where n.type = case
        when c.parent_id is not null then 'reply'
        else 'pano_comment'
      end
      and n.pano_id = c.pano_id
      and lower(n.recipient_email) = lower(
        case
          when c.parent_id is not null then parent_comment.user_email
          else pano.user_email
        end
      )
      and n.actor_username = coalesce(
        p.username,
        c.username,
        split_part(c.user_email, '@', 1)
      )
      and n.created_at = c.created_at
  );

commit;
