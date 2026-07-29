begin;

alter table public.events
  add column if not exists reward_system_enabled boolean not null default false,
  add column if not exists rewards_distributed_at timestamptz,
  add column if not exists rewards_distributed_by uuid references auth.users(id);

-- Mevcut satırlar ilk eklemede false olur; bundan sonra oluşturulan yarışmalar
-- ise varsayılan olarak yeni ödül sistemine dahil edilir.
alter table public.events
  alter column reward_system_enabled set default true;

update public.events event
set reward_system_enabled = true
where event.id = '5f46923f-f31a-4da0-89db-2afeba25211a'::uuid;

alter table public.event_participants
  add column if not exists placement smallint;

alter table public.event_participants
  drop constraint if exists event_participants_placement_check;

alter table public.event_participants
  add constraint event_participants_placement_check
  check (placement is null or placement between 1 and 3);

create unique index if not exists event_participants_event_placement_idx
  on public.event_participants (event_id, placement)
  where placement is not null;

create unique index if not exists event_participants_event_email_idx
  on public.event_participants (event_id, lower(user_email));

create table if not exists public.event_reward_distributions (
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.event_participants(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  placement smallint,
  participation_reward integer not null default 0
    check (participation_reward in (0, 5)),
  placement_reward integer not null default 0
    check (placement_reward in (0, 20, 50, 100)),
  total_reward integer not null check (total_reward > 0),
  distributed_at timestamptz not null default now(),
  distributed_by uuid not null references auth.users(id),
  primary key (event_id, participant_id),
  unique (event_id, user_id)
);

alter table public.event_reward_distributions enable row level security;

drop policy if exists event_reward_distributions_admin_select
  on public.event_reward_distributions;
create policy event_reward_distributions_admin_select
on public.event_reward_distributions
for select
to authenticated
using (public.is_current_user_admin() or auth.uid() = user_id);

revoke insert, update, delete
on public.event_reward_distributions
from anon, authenticated;

grant select
on public.event_reward_distributions
to authenticated;

create or replace function public.assert_event_reward_admin()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if actor_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.announcement_admins admin
    where lower(admin.user_email) = lower(actor_email)
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return actor_id;
end;
$$;

create or replace function public.admin_set_event_placement(
  p_event_id uuid,
  p_participant_id uuid,
  p_placement smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := public.assert_event_reward_admin();
  target_event public.events%rowtype;
begin
  if p_placement is null or p_placement not between 1 and 3 then
    raise exception 'INVALID_EVENT_PLACEMENT';
  end if;

  select *
  into target_event
  from public.events event
  where event.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not target_event.reward_system_enabled then
    raise exception 'EVENT_REWARD_SYSTEM_NOT_ENABLED';
  end if;
  if target_event.rewards_distributed_at is not null then
    raise exception 'EVENT_REWARDS_ALREADY_DISTRIBUTED';
  end if;
  if target_event.end_date > timezone('Europe/Istanbul', now())
    and coalesce(target_event.is_active, true)
  then
    raise exception 'EVENT_RESULTS_NOT_OPEN';
  end if;
  if not exists (
    select 1
    from public.event_participants participant
    where participant.id = p_participant_id
      and participant.event_id = p_event_id
      and participant.status = 'active'
  ) then
    raise exception 'EVENT_PARTICIPANT_NOT_FOUND';
  end if;

  update public.event_participants participant
  set
    placement = null,
    is_champion = false
  where participant.event_id = p_event_id
    and (
      participant.placement = p_placement
      or participant.id = p_participant_id
    );

  if p_placement = 1 then
    update public.event_participants participant
    set is_champion = false
    where participant.event_id = p_event_id;
  end if;

  update public.event_participants participant
  set
    placement = p_placement,
    is_champion = (p_placement = 1)
  where participant.id = p_participant_id;

  return jsonb_build_object(
    'event_id', p_event_id,
    'participant_id', p_participant_id,
    'placement', p_placement,
    'updated_by', actor_id
  );
end;
$$;

create or replace function public.admin_clear_event_placement(
  p_event_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := public.assert_event_reward_admin();
  target_event public.events%rowtype;
begin
  select *
  into target_event
  from public.events event
  where event.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not target_event.reward_system_enabled then
    raise exception 'EVENT_REWARD_SYSTEM_NOT_ENABLED';
  end if;
  if target_event.rewards_distributed_at is not null then
    raise exception 'EVENT_REWARDS_ALREADY_DISTRIBUTED';
  end if;

  update public.event_participants participant
  set
    placement = null,
    is_champion = false
  where participant.id = p_participant_id
    and participant.event_id = p_event_id;

  if not found then
    raise exception 'EVENT_PARTICIPANT_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'event_id', p_event_id,
    'participant_id', p_participant_id,
    'cleared', true,
    'updated_by', actor_id
  );
end;
$$;

create or replace function public.admin_remove_event_participant(
  p_event_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := public.assert_event_reward_admin();
  target_event public.events%rowtype;
  removed_book_id bigint;
begin
  select *
  into target_event
  from public.events event
  where event.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not target_event.reward_system_enabled then
    raise exception 'EVENT_REWARD_SYSTEM_NOT_ENABLED';
  end if;
  if target_event.rewards_distributed_at is not null then
    raise exception 'EVENT_REWARDS_ALREADY_DISTRIBUTED';
  end if;

  delete from public.event_participants participant
  where participant.id = p_participant_id
    and participant.event_id = p_event_id
  returning participant.book_id into removed_book_id;

  if not found then
    raise exception 'EVENT_PARTICIPANT_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'event_id', p_event_id,
    'participant_id', p_participant_id,
    'book_id', removed_book_id,
    'removed', true,
    'removed_by', actor_id
  );
end;
$$;

create or replace function public.admin_distribute_event_rewards(
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := public.assert_event_reward_admin();
  target_event public.events%rowtype;
  active_participant_count integer;
  matched_profile_count integer;
  placement_count integer;
  rewarded_user_count integer;
  total_distributed integer;
begin
  select *
  into target_event
  from public.events event
  where event.id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not target_event.reward_system_enabled then
    raise exception 'EVENT_REWARD_SYSTEM_NOT_ENABLED';
  end if;
  if target_event.rewards_distributed_at is not null then
    raise exception 'EVENT_REWARDS_ALREADY_DISTRIBUTED';
  end if;
  if target_event.end_date > timezone('Europe/Istanbul', now())
    and coalesce(target_event.is_active, true)
  then
    raise exception 'EVENT_RESULTS_NOT_OPEN';
  end if;

  select count(*)
  into active_participant_count
  from public.event_participants participant
  where participant.event_id = p_event_id
    and participant.status = 'active';

  if active_participant_count < 3 then
    raise exception 'EVENT_REQUIRES_THREE_PARTICIPANTS';
  end if;

  select count(distinct participant.placement)
  into placement_count
  from public.event_participants participant
  where participant.event_id = p_event_id
    and participant.status = 'active'
    and participant.placement between 1 and 3;

  if placement_count <> 3 then
    raise exception 'EVENT_PODIUM_INCOMPLETE';
  end if;

  select count(*)
  into matched_profile_count
  from public.event_participants participant
  join public.profiles profile
    on lower(profile.email) = lower(participant.user_email)
  where participant.event_id = p_event_id
    and participant.status = 'active';

  if matched_profile_count <> active_participant_count then
    raise exception 'EVENT_PARTICIPANT_PROFILE_MISSING';
  end if;

  insert into public.event_reward_distributions (
    event_id,
    participant_id,
    user_id,
    placement,
    participation_reward,
    placement_reward,
    total_reward,
    distributed_by
  )
  select
    p_event_id,
    participant.id,
    profile.id,
    participant.placement,
    case when participant.placement is null then 5 else 0 end,
    case participant.placement
      when 1 then 100
      when 2 then 50
      when 3 then 20
      else 0
    end,
    case participant.placement
      when 1 then 100
      when 2 then 50
      when 3 then 20
      else 5
    end,
    actor_id
  from public.event_participants participant
  join public.profiles profile
    on lower(profile.email) = lower(participant.user_email)
  where participant.event_id = p_event_id
    and participant.status = 'active';

  insert into public.labcoin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_key,
    description
  )
  select
    distribution.user_id,
    distribution.total_reward,
    'event_reward',
    'event:' || p_event_id::text,
    case distribution.placement
      when 1 then target_event.title || ' yarışması 1.lik ve katılım ödülü'
      when 2 then target_event.title || ' yarışması 2.lik ve katılım ödülü'
      when 3 then target_event.title || ' yarışması 3.lük ve katılım ödülü'
      else target_event.title || ' yarışması katılım ödülü'
    end
  from public.event_reward_distributions distribution
  where distribution.event_id = p_event_id;

  insert into public.labcoin_wallets (user_id, balance)
  select
    distribution.user_id,
    distribution.total_reward
  from public.event_reward_distributions distribution
  where distribution.event_id = p_event_id
  on conflict (user_id) do update
  set
    balance = public.labcoin_wallets.balance + excluded.balance,
    updated_at = now();

  update public.events event
  set
    rewards_distributed_at = now(),
    rewards_distributed_by = actor_id
  where event.id = p_event_id;

  select count(*), coalesce(sum(distribution.total_reward), 0)
  into rewarded_user_count, total_distributed
  from public.event_reward_distributions distribution
  where distribution.event_id = p_event_id;

  return jsonb_build_object(
    'event_id', p_event_id,
    'rewarded_users', rewarded_user_count,
    'total_distributed', total_distributed,
    'distributed_at', now()
  );
end;
$$;

create or replace function public.protect_distributed_event_results()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_event_id uuid;
begin
  target_event_id := case
    when tg_op = 'DELETE' then old.event_id
    else new.event_id
  end;

  if exists (
    select 1
    from public.events event
    where event.id = target_event_id
      and event.rewards_distributed_at is not null
  ) then
    raise exception 'EVENT_RESULTS_ALREADY_FINALIZED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_distributed_event_results_trigger
  on public.event_participants;

create trigger protect_distributed_event_results_trigger
before insert or update or delete
on public.event_participants
for each row
execute function public.protect_distributed_event_results();

revoke all on function public.assert_event_reward_admin()
from public, anon, authenticated;
revoke all on function public.admin_set_event_placement(uuid, uuid, smallint)
from public, anon;
revoke all on function public.admin_clear_event_placement(uuid, uuid)
from public, anon;
revoke all on function public.admin_remove_event_participant(uuid, uuid)
from public, anon;
revoke all on function public.admin_distribute_event_rewards(uuid)
from public, anon;

grant execute on function public.admin_set_event_placement(uuid, uuid, smallint)
to authenticated;
grant execute on function public.admin_clear_event_placement(uuid, uuid)
to authenticated;
grant execute on function public.admin_remove_event_participant(uuid, uuid)
to authenticated;
grant execute on function public.admin_distribute_event_rewards(uuid)
to authenticated;

notify pgrst, 'reload schema';

commit;
