-- 26 Temmuz 2026 itibariyla is_champion = true olan etkinlik kazananlari.
-- Bir hesap birden fazla etkinlik kazanmis olsa da bu ilk toplu odulde
-- kisi basi yalnizca 100 LabCoin alir. Script tekrar calistirilsa da
-- unique hareket anahtari ikinci bir odul yazilmasini engeller.

with champions (user_id, username, won_events) as (
  values
    (
      '934890c3-3ad1-46c1-95db-7498be785b01'::uuid,
      'kuslarinevsahibi',
      'Canakkale Savasi, Son Mesaj'
    ),
    (
      'be2af0a1-1498-4555-8827-140d503a2918'::uuid,
      'beyazturna',
      'Zamanin Bedeli, Evrenlerin Carpismasi'
    ),
    (
      'e3c01c5c-c5ae-40b3-ac5c-dd7d98cb76e8'::uuid,
      'yazarcizer_trk1',
      'Sarkiya Donusen Siir'
    ),
    (
      '306563b0-84c2-48e7-8277-46a60ce1f1c4'::uuid,
      'bozkurtpencesi',
      'Roportaj Yarismasi'
    ),
    (
      '3b32cb49-0410-4037-9e62-c61154d8aed2'::uuid,
      'kartanem',
      'Unutulan Ask'
    )
),
inserted_transactions as (
  insert into public.labcoin_transactions (
    user_id,
    amount,
    transaction_type,
    reference_key,
    description
  )
  select
    champion.user_id,
    100,
    'champion_bonus',
    'event-champions:initial:2026-07-26',
    'Etkinlik sampiyonlugu odulu: ' || champion.won_events
  from champions champion
  inner join public.profiles profile
    on profile.id = champion.user_id
   and profile.username = champion.username
  on conflict (user_id, transaction_type, reference_key) do nothing
  returning user_id, amount
)
insert into public.labcoin_wallets (user_id, balance)
select transaction.user_id, transaction.amount
from inserted_transactions transaction
on conflict (user_id) do update
set
  balance = public.labcoin_wallets.balance + excluded.balance,
  updated_at = now()
returning user_id, balance;
