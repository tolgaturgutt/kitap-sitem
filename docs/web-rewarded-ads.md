# KitapLab web ödüllü reklam kurulumu

Web ödüllü reklamlar, mobil uygulamadaki AdMob reklam biriminden ayrı olarak
Google Ad Manager üzerinden yayınlanır.

## Google Ad Manager

1. KitapLab alan adını Google Ad Manager/AdSense tarafında onaylat.
2. `kitaplab_web_rewarded` koduyla bir web reklam birimi oluştur.
3. Ödül miktarını `1`, ödül türünü `LabCoin` olarak ayarla.
4. AdSense backfill veya uygun Ad Exchange talebini bu reklam birimine bağla.
5. Google'ın verdiği tam reklam birimi yolunu kopyala. Değer şu biçimde olur:
   `/1234567/kitaplab_web_rewarded`

## Yayın ortamı

Coolify'daki frontend ortam değişkenlerine aşağıdaki değeri ekle:

```text
NEXT_PUBLIC_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH=/1234567/kitaplab_web_rewarded
```

Frontend yeniden oluşturulduktan sonra `/premium` sayfasındaki ödüllü reklam
butonu web tarayıcılarında etkinleşir. Uygulama ve web aynı Supabase ödül
kaydını kullandığı için günlük dört hak ve 30 dakikalık bekleme süresi ortaktır.

## Kontrol listesi

- Reklam yalnızca kullanıcının açıkça bastığı butondan açılır.
- Reklam tamamlanmadan veya ödül verilmeden LabCoin eklenmez.
- Reklam talebi boş dönerse kullanıcıya daha sonra tekrar denemesi söylenir.
- Web ödüllü reklamlarda Google sunucu tarafı doğrulaması sunmaz; ödül sistemi
  düşük değerli tutulmalı ve şüpheli kazanımlar izlenmelidir.
