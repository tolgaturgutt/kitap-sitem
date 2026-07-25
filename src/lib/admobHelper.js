import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastAdTime';
const INTERSTITIAL_COOLDOWN_MS = 900_000; // 15 dakika

// Use env AD unit if provided, otherwise use official AdMob test interstitial ID
const INTERSTITIAL_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID ||
  'ca-app-pub-3940256099942544/1033173712';

// Default to testing mode unless explicitly disabled by setting
// NEXT_PUBLIC_ADMOB_IS_TESTING=false in the environment.
const IS_TESTING = process.env.NEXT_PUBLIC_ADMOB_IS_TESTING === 'false' ? false : true;

let isAdMobInitialized = false;

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
  return Date.now() - lastAdTime >= INTERSTITIAL_COOLDOWN_MS;
}

export async function showInterstitialIfReady() {
  if (typeof window === 'undefined') return false;
  if (!Capacitor.isNativePlatform()) return false;
  if (!shouldShowInterstitial()) return false;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    console.log('[admobHelper] initializing AdMob', {
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: IS_TESTING,
      initialized: isAdMobInitialized,
    });

    if (!isAdMobInitialized) {
      await AdMob.initialize();
      isAdMobInitialized = true;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID, isTesting: IS_TESTING });
    await AdMob.showInterstitial();
    setLastAdTime(Date.now());
    return true;
  } catch (error) {
    console.error('[admobHelper] Interstitial reklam gösterilemedi:', error);
    return false;
  }
}