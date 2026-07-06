-- KitapLab rozet sistemi
-- Bu dosyayı Supabase SQL Editor'da bir kez çalıştırın.

-- Eski bölüm-okuma rozeti artık kullanılmıyor. Geçmiş tabloyu veri kaybı
-- oluşturmamak için silmiyoruz; yalnızca kayıt fonksiyonunu devreden çıkarıyoruz.
drop function if exists public.record_chapter_badge_read(bigint, bigint);

-- Dönüş alanları değiştiği için fonksiyonu temiz biçimde yeniden kuruyoruz.
drop function if exists public.get_profile_badge_stats(uuid);

create function public.get_profile_badge_stats(p_user_id uuid)
returns table(comment_count bigint, liked_chapter_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.comments where user_id = p_user_id),
    (
      select count(distinct vote.chapter_id)
      from public.chapter_votes vote
      join auth.users badge_user
        on lower(badge_user.email) = lower(vote.user_email)
      where badge_user.id = p_user_id
    );
$$;

create or replace function public.get_comment_badge_counts(p_user_ids uuid[])
returns table(user_id uuid, comment_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id, count(*)::bigint
  from public.comments c
  where c.user_id = any(p_user_ids)
  group by c.user_id;
$$;

revoke all on function public.get_profile_badge_stats(uuid) from public;
grant execute on function public.get_profile_badge_stats(uuid) to anon, authenticated;

revoke all on function public.get_comment_badge_counts(uuid[]) from public;
grant execute on function public.get_comment_badge_counts(uuid[]) to anon, authenticated;
