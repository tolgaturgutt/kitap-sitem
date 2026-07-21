-- Yorum ve bolum begenisi tetikleyicilerinin kitap sayaclarini guncelleyebilmesini
-- saglar. Normal kullanicilarin kitap alanlarini guncelleme yetkisini genisletmez.

begin;

create or replace function public.protect_book_ownership_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- SECURITY DEFINER sayac tetikleyicileri yalnizca bu turetilmis alanlari degistirir.
  -- Dogrudan kullanici UPDATE istekleri yine books RLS politikasina takilir.
  if (to_jsonb(new) - array['total_comment_count', 'total_votes'])
     is not distinct from
     (to_jsonb(old) - array['total_comment_count', 'total_votes']) then
    return new;
  end if;

  if auth.role() = 'service_role'
     or public.is_current_user_admin()
     or old.user_id = auth.uid() then
    return new;
  end if;

  if old.co_author_id = auth.uid() then
    if new.user_id is distinct from old.user_id
       or new.user_email is distinct from old.user_email then
      raise exception 'Kitap sahipligi degistirilemez.';
    end if;

    if old.co_author_status = 'pending' then
      if (to_jsonb(new) - array['co_author_id', 'co_author_status', 'updated_at'])
         is distinct from
         (to_jsonb(old) - array['co_author_id', 'co_author_status', 'updated_at']) then
        raise exception 'Bekleyen ortak yazar yalnizca davete yanit verebilir.';
      end if;

      if new.co_author_id is not null and new.co_author_id <> auth.uid() then
        raise exception 'Ortak yazar kimligi degistirilemez.';
      end if;

      if new.co_author_status is not null
         and new.co_author_status not in ('accepted', 'rejected') then
        raise exception 'Gecersiz ortak yazar yaniti.';
      end if;
    elsif new.co_author_id is distinct from old.co_author_id
          or new.co_author_status is distinct from old.co_author_status then
      raise exception 'Ortak yazar bilgileri yalnizca kitap sahibi tarafindan degistirilebilir.';
    end if;

    return new;
  end if;

  raise exception 'Bu kitabi guncelleme yetkiniz yok.';
end;
$$;

do $$
begin
  if position(
    'total_comment_count' in
    pg_get_functiondef('public.protect_book_ownership_fields()'::regprocedure)
  ) = 0 then
    raise exception 'protect_book_ownership_fields counter hotfix validation failed';
  end if;
end;
$$;

commit;

