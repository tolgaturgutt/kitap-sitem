begin;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (
    username is not null
    and username ~ '^[a-z0-9_-]{3,20}$'
  ) not valid;

commit;

notify pgrst, 'reload schema';
