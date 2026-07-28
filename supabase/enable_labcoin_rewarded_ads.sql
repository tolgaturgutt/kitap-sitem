-- Mevcut kurulumlarda LabCoin odullu video reklamlarini etkinlestirir.

insert into public.app_feature_flags (feature_key, enabled, updated_at)
values ('labcoin_rewarded_ads', true, now())
on conflict (feature_key) do update
set enabled = excluded.enabled,
    updated_at = excluded.updated_at;

notify pgrst, 'reload schema';
