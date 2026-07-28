'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 25;

function formatDate(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

export default function AdminRewardedAdStats() {
  const [stats, setStats] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalAds: 0,
    todayAds: 0,
  });

  const loadStats = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc('admin_list_rewarded_ad_stats', {
      p_search: search.trim(),
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });

    if (error) {
      console.error('Admin rewarded ad stats error:', error);
      toast.error('Reklam izleme bilgileri alınamadı.');
      setStats([]);
      setLoading(false);
      return;
    }

    const rows = data || [];
    const totals = rows[0];
    setStats(rows);
    setSummary({
      totalUsers: Number(totals?.total_rows || 0),
      totalAds: Number(totals?.filtered_total_ads || 0),
      todayAds: Number(totals?.filtered_today_ads || 0),
    });
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const delay = setTimeout(loadStats, 350);
    return () => clearTimeout(delay);
  }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(summary.totalUsers / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black uppercase text-gray-950 dark:text-white">
          Ödüllü Reklamlar
        </h2>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Reklamı tamamlayıp LabCoin kazanan kullanıcılar gösterilir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-500/10">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Toplam reklam
          </p>
          <p className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
            {summary.totalAds}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-500/10">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Bugün
          </p>
          <p className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
            {summary.todayAds}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-500/10">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
            İzleyen kullanıcı
          </p>
          <p className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
            {summary.totalUsers}
          </p>
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Kullanıcı ara..."
        className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-5 py-4 font-bold text-gray-950 outline-none transition-colors focus:border-red-600 dark:bg-black/20 dark:text-white"
      />

      {loading ? (
        <div className="py-16 text-center text-sm font-black uppercase tracking-widest text-gray-400">
          Yükleniyor...
        </div>
      ) : stats.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 py-16 text-center font-bold text-gray-400 dark:bg-white/5">
          Henüz ödüllü reklam kaydı yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_190px] gap-4 bg-gray-50 px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-400 md:grid dark:bg-white/5">
            <span>Kullanıcı</span>
            <span className="text-center">Toplam</span>
            <span className="text-center">Bugün</span>
            <span>Son izleme</span>
          </div>

          {stats.map((item) => (
            <div
              key={item.user_id}
              className="grid gap-4 border-t border-gray-100 p-5 first:border-t-0 md:grid-cols-[minmax(0,1fr)_120px_120px_190px] md:items-center dark:border-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-gray-950 dark:text-white">
                  @{item.username || 'isimsiz'}
                </p>
                {item.full_name && (
                  <p className="mt-1 truncate text-xs font-bold text-gray-400">
                    {item.full_name}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between md:block md:text-center">
                <span className="text-xs font-black uppercase text-gray-400 md:hidden">Toplam</span>
                <span className="text-xl font-black text-amber-600">{item.total_ads}</span>
              </div>

              <div className="flex items-center justify-between md:block md:text-center">
                <span className="text-xs font-black uppercase text-gray-400 md:hidden">Bugün</span>
                <span className="text-xl font-black text-emerald-600">{item.ads_today}</span>
              </div>

              <div className="flex items-center justify-between gap-4 md:block">
                <span className="text-xs font-black uppercase text-gray-400 md:hidden">
                  Son izleme
                </span>
                <span className="text-right text-xs font-bold text-gray-500 md:text-left">
                  {formatDate(item.last_watched_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {summary.totalUsers > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-5 dark:border-white/10">
          <span className="text-xs font-bold text-gray-400">
            Sayfa {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-black uppercase disabled:opacity-50 dark:bg-white/10"
            >
              Önceki
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-black uppercase disabled:opacity-50 dark:bg-white/10"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
