import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastInterstitialAdTimeV2';
const INTERSTITIAL_COOLDOWN_MS = 15 * 60 * 1000;

const INTERSTITIAL_AD_ID = 'ca-app-pub-9356201064551661/3044605897';

let initializationPromise = null;
let interstitialPromise = null;

function getInitializedAdMob() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { AdMob } = await import('@capacitor-community/admob');
      console.log('[AdMob] SDK başlatılıyor (production).');
      await AdMob.initialize({
        initializeForTesting: false,
      });
      return { AdMob };
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

async function loadAndShowInterstitial() {
  const lastAdTime = Number(localStorage.getItem(LAST_AD_TIME_KEY) || '0');
  if (Date.now() - lastAdTime < INTERSTITIAL_COOLDOWN_MS) {
    console.log('[AdMob] Gösterim aralığı henüz dolmadı.');
    return false;
  }

  try {
    const { AdMob } = await getInitializedAdMob();
    console.log('[AdMob] Geçiş reklamı hazırlanıyor (production).');
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: false,
    });

    console.log('[AdMob] Geçiş reklamı gösteriliyor.');
    await AdMob.showInterstitial();
    localStorage.setItem(LAST_AD_TIME_KEY, String(Date.now()));
    return true;
  } catch (error) {
    console.error('[AdMob] Geçiş reklamı gösterilemedi:', error);
    return false;
  }
}

export async function showInterstitialIfReady() {
  if (!Capacitor.isNativePlatform()) return false;

  if (!interstitialPromise) {
    interstitialPromise = loadAndShowInterstitial().finally(() => {
      interstitialPromise = null;
    });
  }

  return interstitialPromise;
}
