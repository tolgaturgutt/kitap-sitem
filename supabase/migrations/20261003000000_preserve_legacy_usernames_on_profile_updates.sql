begin;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

create or replace function public.enforce_profile_username_format()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_username text;
begin
  if new.username is not null
    and new.username ~ '^[a-z0-9_-]{3,20}$'
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.username is not distinct from old.username
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select profile.username
    into existing_username
    from public.profiles profile
    where profile.id = new.id;

    if found and existing_username is not distinct from new.username then
      return new;
    end if;
  end if;

  raise exception using
    errcode = '23514',
    message = 'new row for relation "profiles" violates check constraint "profiles_username_format_check"',
    constraint = 'profiles_username_format_check';
end;
$$;

revoke all on function public.enforce_profile_username_format()
from public, anon, authenticated;

drop trigger if exists profiles_username_format_check on public.profiles;
create trigger profiles_username_format_check
before insert or update of username
on public.profiles
for each row
execute function public.enforce_profile_username_format();

commit;

notify pgrst, 'reload schema';