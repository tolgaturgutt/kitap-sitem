-- Profil silip guvensiz alanlarla yeniden olusturarak Premium/Plus veya
-- ban durumunu degistirme yolunu kapatir.

begin;

-- Eski INSERT policy'leri permissive (OR) calistigi icin tek bir guvenli
-- policy eklemek yetmez; profiles uzerindeki tum INSERT policy'leri kaldirilir.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on public.profiles',
      policy_row.policyname
    );
  end loop;
end
$$;

create policy profiles_insert_own_safe
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and lower(coalesce(email, '')) =
    lower(coalesce(auth.jwt() ->> 'email', ''))
  and coalesce(role, 'user') = 'user'
  and premium_expires_at is null
  and plus_expires_at is null
  and coalesce(is_admin, false) = false
  and coalesce(is_banned, false) = false
);

-- Hesap silme islemi security definer delete_user() RPC'si uzerinden yapilir.
-- Normal kullanicinin yalniz profil satirini silmesi uyelik/ban sifirlamaya
-- donusmemelidir.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'DELETE'
  loop
    execute format(
      'drop policy if exists %I on public.profiles',
      policy_row.policyname
    );
  end loop;
end
$$;

commit;

notify pgrst, 'reload schema';
