-- Adminlerin kullanici profillerindeki LabCoin bakiyesini goruntulemesi
-- ve guvenli bicimde artirip azaltmasi.

create or replace function public.admin_get_user_labcoin(
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := coalesce(auth.jwt() ->> 'email', '');
  target_username text;
  target_balance integer;
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

  if p_target_user_id is null then
    raise exception 'TARGET_USER_REQUIRED';
  end if;

  select profile.username
  into target_username
  from public.profiles profile
  where profile.id = p_target_user_id;

  if not found then
    raise exception 'TARGET_USER_NOT_FOUND';
  end if;

  select coalesce(wallet.balance, 0)
  into target_balance
  from public.labcoin_wallets wallet
  where wallet.user_id = p_target_user_id;

  return jsonb_build_object(
    'user_id', p_target_user_id,
    'username', target_username,
    'balance', coalesce(target_balance, 0)
  );
end;
$$;

create or replace function public.admin_adjust_user_labcoin(
  p_target_user_id uuid,
  p_delta integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := coalesce(auth.jwt() ->> 'email', '');
  target_username text;
  new_balance integer;
  transaction_reference text;
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

  if p_target_user_id is null then
    raise exception 'TARGET_USER_REQUIRED';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'LABCOIN_AMOUNT_REQUIRED';
  end if;

  if p_delta < -1000000 or p_delta > 1000000 then
    raise exception 'LABCOIN_AMOUNT_TOO_LARGE';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('labcoin:' || p_target_user_id::text, 0)
  );

  select profile.username
  into target_username
  from public.profiles profile
  where profile.id = p_target_user_id;

  if not found then
    raise exception 'TARGET_USER_NOT_FOUND';
  end if;

  insert into public.labcoin_wallets (user_id, balance)
  values (p_target_user_id, 0)
  on conflict (user_id) do nothing;

  update public.labcoin_wallets wallet
  set
    balance = wallet.balance + p_delta,
    updated_at = now()
  where wallet.user_id = p_target_user_id
    and wallet.balance + p_delta >= 0
  returning wallet.balance into new_balance;

  if not found then
    raise exception using
      message = 'LABCOIN_BALANCE_CANNOT_BE_NEGATIVE',
      detail = 'Kullanicinin bakiyesi silinmek istenen LabCoin miktarindan az.';
  end if;

  transaction_reference := format(
    'admin-adjustment:%s:%s:%s',
    actor_id,
    txid_current(),
    clock_timestamp()
  );

  insert into public.labcoin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_key,
    description
  )
  values (
    p_target_user_id,
    p_delta,
    'admin_adjustment',
    transaction_reference,
    case
      when p_delta > 0
        then format('Admin tarafindan %s LabCoin eklendi.', p_delta)
      else format('Admin tarafindan %s LabCoin silindi.', -p_delta)
    end
  );

  return jsonb_build_object(
    'user_id', p_target_user_id,
    'username', target_username,
    'balance', new_balance,
    'change', p_delta
  );
end;
$$;

revoke all on function public.admin_get_user_labcoin(uuid)
from public, anon;
revoke all on function public.admin_adjust_user_labcoin(uuid, integer)
from public, anon;

grant execute on function public.admin_get_user_labcoin(uuid)
to authenticated;
grant execute on function public.admin_adjust_user_labcoin(uuid, integer)
to authenticated;

notify pgrst, 'reload schema';
