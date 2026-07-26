import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastInterstitialAdTimeV2';
const FIRST_AD_ELIGIBLE_AT_KEY = 'firstInterstitialEligibleAtV1';
const FIRST_INTERSTITIAL_DELAY_MS = 5 * 60 * 1000;
const INTERSTITIAL_COOLDOWN_MS = 15 * 60 * 1000;

const INTERSTITIAL_AD_ID = 'ca-app-pub-9356201064551661/3044605897';

let initializationPromise = null;
let interstitialPromise = null;

export function initializeInterstitialSchedule() {
  if (!Capacitor.isNativePlatform()) return 0;

  const lastAdTime = Number(localStorage.getItem(LAST_AD_TIME_KEY) || '0');
  if (lastAdTime > 0) return lastAdTime + INTERSTITIAL_COOLDOWN_MS;

  const storedEligibleAt = Number(
    localStorage.getItem(FIRST_AD_ELIGIBLE_AT_KEY) || '0'
  );
  if (storedEligibleAt > 0) return storedEligibleAt;

  const firstEligibleAt = Date.now() + FIRST_INTERSTITIAL_DELAY_MS;
  localStorage.setItem(FIRST_AD_ELIGIBLE_AT_KEY, String(firstEligibleAt));
  return firstEligibleAt;
}

export function isInterstitialCooldownComplete() {
  if (!Capacitor.isNativePlatform()) return false;

  const lastAdTime = Number(localStorage.getItem(LAST_AD_TIME_KEY) || '0');
  if (lastAdTime > 0) {
    return Date.now() - lastAdTime >= INTERSTITIAL_COOLDOWN_MS;
  }

  return Date.now() >= initializeInterstitialSchedule();
}

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
  if (!isInterstitialCooldownComplete()) {
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
    localStorage.removeItem(FIRST_AD_ELIGIBLE_AT_KEY);
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
