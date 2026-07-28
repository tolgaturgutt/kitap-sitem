const GPT_SCRIPT_ID = 'google-publisher-tag';
const GPT_SCRIPT_URL = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
const WEB_REWARDED_AD_UNIT_PATH =
  process.env.NEXT_PUBLIC_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH?.trim() || '';

let gptLoadPromise = null;
let rewardedAdPromise = null;

export function isWebRewardedAdAvailable() {
  return typeof window !== 'undefined' && Boolean(WEB_REWARDED_AD_UNIT_PATH);
}

function loadGooglePublisherTag() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('WEB_REWARDED_BROWSER_REQUIRED'));
  }

  if (window.googletag?.apiReady) {
    return Promise.resolve(window.googletag);
  }

  if (!gptLoadPromise) {
    gptLoadPromise = new Promise((resolve, reject) => {
      window.googletag = window.googletag || { cmd: [] };

      const timeout = window.setTimeout(() => {
        reject(new Error('WEB_REWARDED_SDK_LOAD_FAILED'));
      }, 15000);

      window.googletag.cmd.push(() => {
        window.clearTimeout(timeout);
        resolve(window.googletag);
      });

      const existingScript = document.getElementById(GPT_SCRIPT_ID);
      if (existingScript) return;

      const script = document.createElement('script');
      script.id = GPT_SCRIPT_ID;
      script.async = true;
      script.src = GPT_SCRIPT_URL;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('WEB_REWARDED_SDK_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      gptLoadPromise = null;
      throw error;
    });
  }

  return gptLoadPromise;
}

async function loadAndShowWebRewardedAd() {
  if (!WEB_REWARDED_AD_UNIT_PATH) {
    throw new Error('WEB_REWARDED_AD_UNIT_MISSING');
  }

  const googletag = await loadGooglePublisherTag();

  return new Promise((resolve, reject) => {
    googletag.cmd.push(() => {
      const rewardedSlot = googletag.defineOutOfPageSlot(
        WEB_REWARDED_AD_UNIT_PATH,
        googletag.enums.OutOfPageFormat.REWARDED
      );

      if (!rewardedSlot) {
        reject(new Error('WEB_REWARDED_UNSUPPORTED'));
        return;
      }

      const pubads = googletag.pubads();
      let rewardGranted = false;
      let adReady = false;
      let settled = false;
      let readyTimeout;

      const cleanup = () => {
        window.clearTimeout(readyTimeout);
        pubads.removeEventListener('rewardedSlotReady', onReady);
        pubads.removeEventListener('rewardedSlotGranted', onGranted);
        pubads.removeEventListener('rewardedSlotClosed', onClosed);
        pubads.removeEventListener('slotRenderEnded', onRenderEnded);
        googletag.destroySlots([rewardedSlot]);
      };

      const finish = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve({ amount: 1, type: 'LabCoin' });
      };

      const onReady = (event) => {
        if (event.slot !== rewardedSlot) return;
        adReady = true;
        window.clearTimeout(readyTimeout);
        event.makeRewardedVisible();
      };

      const onGranted = (event) => {
        if (event.slot === rewardedSlot) rewardGranted = true;
      };

      const onClosed = (event) => {
        if (event.slot !== rewardedSlot) return;
        finish(
          rewardGranted ? null : new Error('LABCOIN_REWARD_NOT_EARNED')
        );
      };

      const onRenderEnded = (event) => {
        if (event.slot === rewardedSlot && event.isEmpty) {
          finish(new Error('WEB_REWARDED_NO_FILL'));
        }
      };

      readyTimeout = window.setTimeout(() => {
        if (!adReady) finish(new Error('WEB_REWARDED_NO_FILL'));
      }, 15000);

      pubads.addEventListener('rewardedSlotReady', onReady);
      pubads.addEventListener('rewardedSlotGranted', onGranted);
      pubads.addEventListener('rewardedSlotClosed', onClosed);
      pubads.addEventListener('slotRenderEnded', onRenderEnded);

      rewardedSlot.addService(pubads);
      googletag.enableServices();
      googletag.display(rewardedSlot);
    });
  });
}

export async function showWebLabCoinRewardAd() {
  if (!rewardedAdPromise) {
    rewardedAdPromise = loadAndShowWebRewardedAd().finally(() => {
      rewardedAdPromise = null;
    });
  }

  return rewardedAdPromise;
}
