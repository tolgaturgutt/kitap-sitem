import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastAdTime';
const INTERSTITIAL_COOLDOWN_MS = 30_000; // Test için 30 saniye

// Google Resmi Test ID
const TEST_ID = 'ca-app-pub-3940256099942544/1033173712';

let isAdMobInitialized = false;

export async function showInterstitialIfReady() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[AdMob] Native platform değil, reklam atlanıyor.');
    return false;
  }

  const lastAdTime = Number(localStorage.getItem(LAST_AD_TIME_KEY) || '0');
  if (Date.now() - lastAdTime < INTERSTITIAL_COOLDOWN_MS) {
    console.log('[AdMob] Bekleme süresi dolmadı.');
    return false;
  }

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    
    if (!isAdMobInitialized) {
      console.log('[AdMob] Initialize ediliyor...');
      await AdMob.initialize({
        initializeForTesting: true,
      });
      isAdMobInitialized = true;
    }

    console.log('[AdMob] Reklam hazırlanıyor: ', TEST_ID);
    await AdMob.prepareInterstitial({
      adId: TEST_ID,
      isTesting: true
    });

    console.log('[AdMob] Reklam gösteriliyor...');
    await AdMob.showInterstitial();
    
    localStorage.setItem(LAST_AD_TIME_KEY, String(Date.now()));
    return true;
  } catch (error) {
    console.error('[AdMob] KRİTİK HATA:', error);
    // Hata detayını kullanıcıya toast ile gösterebiliriz (isteğe bağlı)
    return false;
  }
}
