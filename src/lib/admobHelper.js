import { Capacitor } from '@capacitor/core';

const LAST_AD_TIME_KEY = 'lastAdTime';
const INTERSTITIAL_COOLDOWN_MS = 900_000; // 15 dakika
const INTERSTITIAL_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID ||
  'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx';

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

    await AdMob.initialize();
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: process.env.NODE_ENV !== 'production',
    });

    await AdMob.showInterstitial();
    setLastAdTime(Date.now());
    return true;
  } catch (error) {
    console.error('[admobHelper] Interstitial reklâm gösterilemedi:', error);
    return false;
  }
}
