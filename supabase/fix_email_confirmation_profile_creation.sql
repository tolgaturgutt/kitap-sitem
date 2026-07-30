-- E-posta onayı açıkken signUp() henüz authenticated oturum döndürmez.
-- Profili auth.users işlemiyle aynı transaction içinde güvenli biçimde oluştur.

begin;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_username text;
  profile_full_name text;
begin
  profile_username := lower(
    regexp_replace(
      trim(coalesce(new.raw_user_meta_data ->> 'username', '')),
      '\s+',
      '',
      'g'
    )
  );
  profile_full_name := left(
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    255
  );

  if profile_username !~ '^[a-z0-9_-]{3,20}$' then
    raise exception 'INVALID_PROFILE_USERNAME';
  end if;

  if profile_full_name = '' then
    profile_full_name := profile_username;
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    role,
    is_admin,
    is_banned,
    premium_expires_at,
    plus_expires_at
  )
  values (
    new.id,
    new.email,
    profile_username,
    profile_full_name,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || profile_username,
    'user',
    false,
    false,
    null,
    null
  );

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user()
from public, anon, authenticated;

drop trigger if exists create_profile_after_auth_signup on auth.users;

create trigger create_profile_after_auth_signup
after insert on auth.users
for each row
execute function public.create_profile_for_new_auth_user();

-- Politika devreye girdikten sonra doğrulanmış fakat profilsiz kalan hesapları
-- yalnızca kullanıcı adı ve e-posta başka bir profile ait değilse tamamla.
insert into public.profiles (
  id,
  email,
  username,
  full_name,
  avatar_url,
  role,
  is_admin,
  is_banned,
  premium_expires_at,
  plus_expires_at
)
select
  auth_user.id,
  auth_user.email,
  lower(
    regexp_replace(
      trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')),
      '\s+',
      '',
      'g'
    )
  ) as username,
  coalesce(
    nullif(
      left(
        trim(coalesce(auth_user.raw_user_meta_data ->> 'full_name', '')),
        255
      ),
      ''
    ),
    lower(
      regexp_replace(
        trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')),
        '\s+',
        '',
        'g'
      )
    )
  ) as full_name,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' ||
    lower(
      regexp_replace(
        trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')),
        '\s+',
        '',
        'g'
      )
    ) as avatar_url,
  'user',
  false,
  false,
  null,
  null
from auth.users auth_user
where auth_user.email_confirmed_at is not null
  and auth_user.created_at >= timestamp with time zone '2026-07-28 12:41:00+00'
  and not exists (
    select 1
    from public.profiles profile
    where profile.id = auth_user.id
  )
  and lower(
    regexp_replace(
      trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')),
      '\s+',
      '',
      'g'
    )
  ) ~ '^[a-z0-9_-]{3,20}$'
  and not exists (
    select 1
    from public.profiles profile
    where lower(profile.email) = lower(auth_user.email)
       or lower(profile.username) = lower(
         regexp_replace(
           trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')),
           '\s+',
           '',
           'g'
         )
       )
  )
on conflict do nothing;

commit;

notify pgrst, 'reload schema';
