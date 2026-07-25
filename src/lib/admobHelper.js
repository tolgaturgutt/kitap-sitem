import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastAdTime';
const INTERSTITIAL_COOLDOWN_MS = 60_000; // Test için 1 dakikaya düşürdüm (Normalde 15dk)

// Resmi Google Test Interstitial ID'si
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

const INTERSTITIAL_AD_UNIT_ID = TEST_INTERSTITIAL_ID; // Şimdilik testi garantilemek için direkt test ID koydum

const IS_TESTING = true; // Test modunu zorla aktif ettim

let isAdMobInitialized = false;
let isAdMobPreparing = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getLastAdTime() {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(LAST_AD_TIME_KEY) || '0');
}

export function setLastAdTime(timestamp = Date.now()) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_AD_TIME_KEY, String(timestamp));
}

export function shouldShowInterstitial() {
  if (typeof window === 'undefined') return false;
  if (!Capacitor.isNativePlatform()) return false;

  const lastAdTime = getLastAdTime();
  const diff = Date.now() - lastAdTime;
  console.log('[admobHelper] Süre kontrolü:', { diff, cooldown: INTERSTITIAL_COOLDOWN_MS });
  return diff >= INTERSTITIAL_COOLDOWN_MS;
}

export async function showInterstitialIfReady() {
  if (typeof window === 'undefined') return false;
  if (!Capacitor.isNativePlatform()) return false;
  
  // Test aşamasında süreyi bazen görmezden gelebiliriz ama şimdilik loglayalım
  if (!shouldShowInterstitial()) {
     console.log('[admobHelper] Bekleme süresi dolmadı.');
     return false;
  }
  
  if (isAdMobPreparing) return false;

  isAdMobPreparing = true;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    console.log('[admobHelper] Reklam başlatılıyor...', {
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: IS_TESTING
    });

    if (!isAdMobInitialized) {
      await AdMob.initialize({
        initializeForTesting: true,
      });
      isAdMobInitialized = true;
      await sleep(1000);
    }

    try {
      await AdMob.prepareInterstitial({ 
        adId: INTERSTITIAL_AD_UNIT_ID, 
        isTesting: IS_TESTING 
      });
      
      await sleep(500); // Hazırlanması için kısa bir süre
      
      await AdMob.showInterstitial();
      console.log('[admobHelper] Reklam başarıyla gösterildi');
      setLastAdTime(Date.now());
      return true;
    } catch (error) {
      console.error('[admobHelper] Reklam hazırlama/gösterme hatası:', error);
      throw error;
    }
  } catch (error) {
    console.error('[admobHelper] Kritik hata:', error);
    return false;
  } finally {
    isAdMobPreparing = false;
  }
}
