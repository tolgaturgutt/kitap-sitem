import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastInterstitialAdTimeV2';
const FIRST_AD_ELIGIBLE_AT_KEY = 'firstInterstitialEligibleAtV1';
const INTERSTITIAL_COOLDOWN_MS = 15 * 60 * 1000;

const INTERSTITIAL_AD_ID = 'ca-app-pub-9356201064551661/3044605897';
const REWARDED_TEST_AD_ID = 'ca-app-pub-3940256099942544/5224354917';
const REWARDED_PRODUCTION_AD_ID =
  'ca-app-pub-9356201064551661/3856681616';
const ADMOB_IS_TESTING =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ADMOB_IS_TESTING === 'true';
const REWARDED_AD_ID =
  process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID ||
  (ADMOB_IS_TESTING ? REWARDED_TEST_AD_ID : REWARDED_PRODUCTION_AD_ID);

let initializationPromise = null;
let interstitialPromise = null;
let sessionInterstitialEligibleAt = 0;

export function initializeInterstitialSchedule() {
  if (!Capacitor.isNativePlatform()) return 0;

  if (sessionInterstitialEligibleAt === 0) {
    sessionInterstitialEligibleAt = Date.now() + INTERSTITIAL_COOLDOWN_MS;
    localStorage.removeItem(FIRST_AD_ELIGIBLE_AT_KEY);
  }

  return sessionInterstitialEligibleAt;
}

export function isInterstitialCooldownComplete() {
  if (!Capacitor.isNativePlatform()) return false;

  if (Date.now() < initializeInterstitialSchedule()) return false;

  const lastAdTime = Number(localStorage.getItem(LAST_AD_TIME_KEY) || '0');
  if (lastAdTime > 0) {
    return Date.now() - lastAdTime >= INTERSTITIAL_COOLDOWN_MS;
  }

  return true;
}

function getInitializedAdMob() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { AdMob } = await import('@capacitor-community/admob');
      console.log(
        `[AdMob] SDK başlatılıyor (${ADMOB_IS_TESTING ? 'test' : 'production'}).`
      );
      await AdMob.initialize({
        initializeForTesting: ADMOB_IS_TESTING,
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

export function isRewardedAdAvailable() {
  return Capacitor.isNativePlatform() && Boolean(REWARDED_AD_ID);
}

export async function showLabCoinRewardAd() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('LABCOIN_NATIVE_APP_REQUIRED');
  }

  if (!REWARDED_AD_ID) {
    throw new Error('LABCOIN_REWARDED_AD_ID_MISSING');
  }

  const { AdMob } = await getInitializedAdMob();
  await AdMob.prepareRewardVideoAd({
    adId: REWARDED_AD_ID,
    isTesting: ADMOB_IS_TESTING,
    immersiveMode: true,
  });

  const reward = await AdMob.showRewardVideoAd();
  if (!reward || Number(reward.amount || 0) <= 0) {
    throw new Error('LABCOIN_REWARD_NOT_EARNED');
  }

  return reward;
}
