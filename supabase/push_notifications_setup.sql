-- Bu dosyayı Supabase SQL Editor içinde bir kez çalıştırın.
-- Her bildirim için push gönderim durumunu tutar ve çift gönderimi önler.

alter table public.notifications
  add column if not exists push_status text not null default 'pending',
  add column if not exists push_attempted_at timestamptz,
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_last_error text;

create index if not exists notifications_push_status_idx
  on public.notifications (push_status, created_at desc);

comment on column public.notifications.push_status is
  'Push teslim durumu: pending, processing, sent veya failed.';
