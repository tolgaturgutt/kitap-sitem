-- KitapLab: etkinlik ve sikayet tablolarini RLS ile korur.
-- Supabase SQL Editor'da tek parca calistirilir. Herhangi bir hata tum
-- degisiklikleri geri alir.

begin;

create schema if not exists security_audit;
revoke all on schema security_audit from public, anon, authenticated;

create table if not exists security_audit.policy_backup_event_report_20260721 as
select *
from pg_policies
where false;

insert into security_audit.policy_backup_event_report_20260721
select policy.*
from pg_policies policy
where policy.schemaname = 'public'
  and policy.tablename in ('events', 'event_participants', 'event_votes', 'reports')
  and not exists (
    select 1
    from security_audit.policy_backup_event_report_20260721 backup
    where backup.schemaname = policy.schemaname
      and backup.tablename = policy.tablename
      and backup.policyname = policy.policyname
  );

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_votes enable row level security;
alter table public.reports enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('events', 'event_participants', 'event_votes', 'reports')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

-- Etkinlikler site ziyaretcileri tarafindan gorulebilir; degisiklikleri yalnizca
-- yoneticiler yapabilir.
create policy events_public_select
on public.events
for select
to anon, authenticated
using (true);

create policy events_admin_insert
on public.events
for insert
to authenticated
with check (public.is_current_user_admin());

create policy events_admin_update
on public.events
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy events_admin_delete
on public.events
for delete
to authenticated
using (public.is_current_user_admin());

-- Katilimci listesi mevcut arayuz icin herkese okunabilir kalir. Kullanici
-- sadece kendi e-posta adresiyle katilabilir ve kendi kaydini silebilir.
create policy event_participants_public_select
on public.event_participants
for select
to anon, authenticated
using (true);

create policy event_participants_member_insert
on public.event_participants
for insert
to authenticated
with check (
  lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy event_participants_admin_update
on public.event_participants
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy event_participants_owner_delete
on public.event_participants
for delete
to authenticated
using (
  public.is_current_user_admin()
  or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Oylar okunabilir; oturum acmis kullanici yalnizca kendi kimligiyle oy
-- ekleyebilir veya kendi oyunu geri cekebilir.
create policy event_votes_public_select
on public.event_votes
for select
to anon, authenticated
using (true);

create policy event_votes_member_insert
on public.event_votes
for insert
to authenticated
with check (
  lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy event_votes_admin_update
on public.event_votes
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy event_votes_owner_delete
on public.event_votes
for delete
to authenticated
using (
  public.is_current_user_admin()
  or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Sikayetler halka ve diger uyelere kapali kalir. Uye yalnizca kendi auth
-- kimligiyle sikayet olusturabilir; listeleme ve yonetim sadece admindedir.
create policy reports_admin_all
on public.reports
for all
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy reports_member_insert
on public.reports
for insert
to authenticated
with check (reporter_id = auth.uid());

do $$
declare
  invalid_table_count integer;
  invalid_policy_count integer;
begin
  select count(*)
  into invalid_table_count
  from pg_class table_info
  join pg_namespace schema_info on schema_info.oid = table_info.relnamespace
  where schema_info.nspname = 'public'
    and table_info.relname in ('events', 'event_participants', 'event_votes', 'reports')
    and not table_info.relrowsecurity;

  if invalid_table_count <> 0 then
    raise exception 'RLS validation failed for % table(s)', invalid_table_count;
  end if;

  select count(*)
  into invalid_policy_count
  from (
    values
      ('events', 4),
      ('event_participants', 4),
      ('event_votes', 4),
      ('reports', 2)
  ) expected(tablename, policy_count)
  where (
    select count(*)
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = expected.tablename
  ) <> expected.policy_count;

  if invalid_policy_count <> 0 then
    raise exception 'Policy validation failed for % table(s)', invalid_policy_count;
  end if;
end;
$$;

commit;
