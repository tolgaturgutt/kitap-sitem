'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

import { supabase } from '@/lib/supabase';
import Username from '@/components/Username';
import {
  isRewardedAdAvailable,
  showLabCoinRewardAd,
} from '@/lib/admobHelper';

const EMPTY_STATUS = {
  balance: 0,
  claims_today: 0,
  daily_limit: 4,
  next_claim_at: null,
  can_claim: false,
  rewarded_ads_enabled: false,
  is_premium: false,
  premium_expires_at: null,
  premium_is_permanent: false,
  is_admin: false,
  has_premium_access: false,
  premium_price: 500,
  premium_duration_months: 1,
  can_purchase_premium: false,
  server_now: null,
};

const PREMIUM_FEATURES = [
  {
    icon: '✓',
    title: 'Mavi Tik',
    description: 'Kullanıcı adının yanında her yerde Premium mavi tiki görünür.',
    accent: 'bg-blue-500'
  },
  {
    icon: '🎙️',
    title: 'Sesli Kitap',
    description: 'Podcast tarzı oynatıcıyla özel sesli kitap ve ses bölümleri oluştur.',
    accent: 'bg-red-600'
  },
  {
    icon: '🖼️',
    title: 'Bölümlere Görsel',
    description: 'Yazarken imlecin bulunduğu yere bölüm görselleri yerleştir.',
    accent: 'bg-purple-600'
  },
  {
    icon: '🎧',
    title: 'Bölümlere Ses',
    description: 'Normal kitap bölümlerine imlecin bulunduğu yerden ses kaydı ekle.',
    accent: 'bg-emerald-600'
  },
  {
    icon: '▶',
    title: 'YouTube Fragmanı',
    description: 'Kitap sayfalarına YouTube bağlantısıyla oynatılabilir fragman ekle.',
    accent: 'bg-red-500'
  },
  {
    icon: '🌄',
    title: 'Profil Kapağı',
    description: 'Profil fotoğrafının arkasına özel kapak görseli yerleştir.',
    accent: 'bg-amber-500'
  }
];

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPremiumExpiry(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getRewardErrorMessage(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();

  if (message.includes('labcoin_daily_limit_reached')) {
    return 'Bugünkü 4 reklam hakkını kullandın. Yarın tekrar gelebilirsin.';
  }
  if (message.includes('labcoin_cooldown_active')) {
    return 'Yeni reklam için 30 dakikalık bekleme süresi henüz dolmadı.';
  }
  if (message.includes('labcoin_rewarded_ad_id_missing')) {
    return 'Ödüllü reklam kimliği henüz tanımlanmadı.';
  }
  if (message.includes('labcoin_rewarded_disabled')) {
    return 'Ödüllü reklamlar Google onayından sonra aktif edilecek.';
  }
  if (message.includes('labcoin_native_app_required')) {
    return 'LabCoin reklamları yalnızca mobil uygulamada izlenebilir.';
  }
  if (message.includes('labcoin_reward_not_earned')) {
    return 'Reklam tamamlanmadığı için LabCoin eklenmedi.';
  }

  return 'Reklam şu anda gösterilemedi. Lütfen daha sonra tekrar dene.';
}

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [watchingAd, setWatchingAd] = useState(false);
  const [purchasingPremium, setPurchasingPremium] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadStatus = useCallback(async () => {
    const [statusResult, rewardedAdsResult] = await Promise.all([
      supabase.rpc('get_labcoin_status'),
      supabase.rpc('is_labcoin_rewarded_ads_enabled'),
    ]);
    if (statusResult.error) throw statusResult.error;
    if (rewardedAdsResult.error) throw rewardedAdsResult.error;

    const nextStatus = {
      ...EMPTY_STATUS,
      ...(statusResult.data || {}),
      rewarded_ads_enabled: Boolean(rewardedAdsResult.data),
    };
    setStatus(nextStatus);
    if (nextStatus.server_now) {
      setServerOffsetMs(
        new Date(nextStatus.server_now).getTime() - Date.now()
      );
    }
    return nextStatus;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) {
        router.replace('/giris');
        return;
      }

      if (cancelled) return;
      setUser(activeUser);

      try {
        await loadStatus();
      } catch (error) {
        console.error('LabCoin status error:', error);
        toast.error('LabCoin bilgileri alınamadı.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initializePage();
    return () => {
      cancelled = true;
    };
  }, [loadStatus, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsUntilNext = useMemo(() => {
    if (!status.next_claim_at) return 0;
    const nextClaimTime = new Date(status.next_claim_at).getTime();
    return Math.max(
      0,
      Math.ceil((nextClaimTime - (nowTick + serverOffsetMs)) / 1000)
    );
  }, [nowTick, serverOffsetMs, status.next_claim_at]);

  const dailyLimitReached = status.claims_today >= status.daily_limit;
  const cooldownActive = secondsUntilNext > 0;
  const isNative = Capacitor.isNativePlatform();
  const rewardedFeatureEnabled = status.rewarded_ads_enabled;
  const rewardedAdReady = isRewardedAdAvailable();
  const canWatch =
    Boolean(user) &&
    rewardedFeatureEnabled &&
    rewardedAdReady &&
    !watchingAd &&
    !dailyLimitReached &&
    !cooldownActive;

  async function handleWatchRewardedAd() {
    if (!canWatch) return;
    setWatchingAd(true);

    try {
      const latestStatus = await loadStatus();
      if (!latestStatus.rewarded_ads_enabled) {
        toast.error('Ödüllü reklamlar Google onayından sonra aktif edilecek.');
        return;
      }
      if (!latestStatus.can_claim) {
        toast.error(
          latestStatus.claims_today >= latestStatus.daily_limit
            ? 'Bugünkü reklam hakkın doldu.'
            : 'Yeni reklam için bekleme süresi henüz dolmadı.'
        );
        return;
      }

      const rewardToken = crypto.randomUUID();
      await showLabCoinRewardAd();

      const { data, error } = await supabase.rpc('claim_labcoin_reward', {
        p_reward_token: rewardToken,
      });
      if (error) throw error;

      setStatus(previousStatus => ({
        ...EMPTY_STATUS,
        ...(data || {}),
        rewarded_ads_enabled: previousStatus.rewarded_ads_enabled,
      }));
      if (data?.server_now) {
        setServerOffsetMs(new Date(data.server_now).getTime() - Date.now());
      }
      toast.success('+1 LabCoin kazandın! 🪙');
    } catch (error) {
      console.error('LabCoin rewarded ad error:', error);
      toast.error(getRewardErrorMessage(error));
      await loadStatus().catch(() => {});
    } finally {
      setWatchingAd(false);
    }
  }

  async function handlePurchasePremium() {
    if (status.has_premium_access || purchasingPremium) return;

    const price = status.premium_price || 500;
    if (status.balance < price) {
      toast.error(`Premium için ${price - status.balance} LabCoin daha gerekiyor.`);
      return;
    }

    const confirmed = window.confirm(
      `${price} LabCoin ödeyerek hesabını 1 aylığına Premium yapmak istiyor musun?`
    );
    if (!confirmed) return;

    setPurchasingPremium(true);
    const toastId = toast.loading('Premium üyeliğin etkinleştiriliyor...');

    try {
      const { data, error } = await supabase.rpc('purchase_premium_with_labcoin');
      if (error) throw error;

      setStatus({ ...EMPTY_STATUS, ...(data || {}) });
      toast.success('1 aylık Premium üyeliğin aktif! Mavi tikin hazır. ✓', { id: toastId });
      router.refresh();
    } catch (error) {
      console.error('Premium purchase error:', error);
      const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
      toast.error(
        message.includes('labcoin_insufficient_balance')
          ? 'Premium için en az 500 LabCoin gerekiyor.'
          : 'Premium üyelik şu anda etkinleştirilemedi.',
        { id: toastId }
      );
      await loadStatus().catch(() => {});
    } finally {
      setPurchasingPremium(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-black">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-8 dark:bg-black md:px-6 md:py-14">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-amber-200 bg-gradient-to-br from-[#fff9db] via-white to-[#fff1a8] p-7 shadow-2xl shadow-amber-500/10 dark:border-amber-500/20 dark:from-[#241900] dark:via-[#0d0d0d] dark:to-[#332300] md:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_260px]">
            <div>
              <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                KitapLab Premium
              </span>
              <h1 className="mt-5 text-4xl font-black uppercase tracking-[-0.05em] text-gray-950 dark:text-white md:text-6xl">
                LabCoin Merkezi
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300 md:text-base">
                Ödüllü reklamı tamamla, 1 LabCoin kazan. Günde en fazla 4 kez
                izleyebilir ve her ödülden sonra 30 dakika beklersin.
              </p>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-full border-4 border-amber-300 bg-white shadow-2xl shadow-amber-600/25">
              <Image
                src="/labcoin.jpg"
                alt="LabCoin"
                fill
                priority
                sizes="240px"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[2rem] border border-gray-200 bg-white p-7 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
              Bakiyen
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-amber-300">
                <Image src="/labcoin.jpg" alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-950 dark:text-white">
                  {status.balance}
                </p>
                <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                  LabCoin
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-gray-100 pt-6 dark:border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Bugünkü hak</span>
                <span className="text-gray-950 dark:text-white">
                  {status.claims_today}/{status.daily_limit}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: status.daily_limit }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full ${
                      index < status.claims_today
                        ? 'bg-amber-500'
                        : 'bg-gray-200 dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-200 bg-white p-7 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/5 md:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">
                  Ödüllü Reklam
                </p>
                <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">
                  İzle ve 1 LabCoin kazan
                </h2>
              </div>
              <span className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-black text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                +1
              </span>
            </div>

            <div className="mt-7 rounded-2xl bg-gray-50 p-5 dark:bg-black/30">
              {dailyLimitReached ? (
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                  Bugünkü 4 hakkını tamamladın. Hakların gece yenilenir.
                </p>
              ) : cooldownActive ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                    Sonraki reklam için kalan süre
                  </p>
                  <span className="font-mono text-xl font-black text-amber-600">
                    {formatCountdown(secondsUntilNext)}
                  </span>
                </div>
              ) : (
                <p className="text-sm font-bold text-green-600">
                  Reklam izlemeye ve LabCoin kazanmaya hazırsın.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleWatchRewardedAd}
              disabled={!canWatch}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-5 text-sm font-black uppercase tracking-wider text-black shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            >
              {watchingAd
                ? 'Reklam hazırlanıyor...'
                : !rewardedFeatureEnabled
                  ? 'Google Onayı Bekleniyor'
                  : !isNative
                  ? 'Mobil uygulamada kullanılabilir'
                  : !rewardedAdReady
                    ? 'Reklam kimliği bekleniyor'
                    : dailyLimitReached
                      ? 'Günlük hak tamamlandı'
                      : cooldownActive
                        ? `${formatCountdown(secondsUntilNext)} bekle`
                        : 'Reklamı İzle • +1 LabCoin'}
            </button>

            {!rewardedFeatureEnabled && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-center dark:border-amber-500/25 dark:bg-amber-500/10">
                <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                  Ödüllü reklamlar şu anda Google onayı bekliyor.
                </p>
                <p className="mt-1 text-[10px] font-bold leading-5 text-amber-700/80 dark:text-amber-200/70">
                  Onay tamamlandığında video izleyerek LabCoin kazanma özelliği aktif edilecek.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="overflow-hidden rounded-[2.5rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 shadow-2xl shadow-blue-500/10 dark:border-blue-500/20 dark:from-blue-950/30 dark:via-[#0d0d0d] dark:to-amber-950/20">
          <div className="grid gap-8 p-7 md:grid-cols-[1.25fr_0.75fr] md:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                500 LabCoin · 1 Aylık Premium
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                LabCoin&apos;lerini Premium&apos;a çevir
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                500 LabCoin biriktirdiğinde başka bir engel olmadan hesabını 1 aylığına
                Premium yapabilir ve bütün ayrıcalıkları anında açabilirsin. Süre dolunca
                yeniden 500 LabCoin ile üyeliğini yenileyebilirsin.
              </p>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-white/75 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-gray-500">Premium hedefi</span>
                  <span className="text-gray-950 dark:text-white">
                    {Math.min(status.balance, status.premium_price || 500)}/{status.premium_price || 500}
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (status.balance / (status.premium_price || 500)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePurchasePremium}
                disabled={
                  status.has_premium_access
                  || purchasingPremium
                  || status.balance < (status.premium_price || 500)
                }
                className="mt-6 w-full rounded-2xl bg-blue-600 px-6 py-5 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:min-w-80"
              >
                {status.has_premium_access
                  ? status.is_admin
                    ? 'Admin Premium Yetkisi Aktif'
                    : status.premium_is_permanent
                      ? 'Süresiz Premium Aktif ✓'
                      : '1 Aylık Premium Aktif ✓'
                  : purchasingPremium
                    ? 'Premium Açılıyor...'
                    : status.balance >= (status.premium_price || 500)
                      ? `${status.premium_price || 500} LabCoin ile Premium Ol`
                      : `${(status.premium_price || 500) - status.balance} LabCoin Daha Gerekli`}
              </button>

              {status.is_premium && (
                <p className="mt-4 text-xs font-bold text-blue-700 dark:text-blue-300">
                  {status.premium_is_permanent
                    ? 'Bu hesap için Premium üyelik süresizdir.'
                    : `Premium bitişi: ${formatPremiumExpiry(status.premium_expires_at)}`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-blue-200 bg-white/80 p-7 text-center dark:border-blue-500/20 dark:bg-blue-500/5">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-4xl font-black text-white shadow-2xl shadow-blue-500/30">
                ✓
              </span>
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.25em] text-blue-600">
                Premium Mavi Tik
              </p>
              <div className="mt-3 text-lg font-black text-gray-950 dark:text-white">
                <Username
                  username={
                    user?.user_metadata?.username
                    || user?.email?.split('@')[0]
                    || 'kitaplabüyesi'
                  }
                  isAdmin={false}
                  isPremium
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Premium olduğunda kullanıcı adının yanında otomatik görünür.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-gray-200 bg-white p-7 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-white/[0.04] md:p-10">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">
              Premium Ayrıcalıkları
            </p>
            <h2 className="mt-3 text-3xl font-black text-gray-950 dark:text-white">
              Premium ile açılan özellikler
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PREMIUM_FEATURES.map(feature => (
              <article
                key={feature.title}
                className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-6 transition-transform hover:-translate-y-1 dark:border-white/5 dark:bg-white/5"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg ${feature.accent}`}>
                  {feature.icon}
                </span>
                <h3 className="mt-5 text-lg font-black text-gray-950 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
