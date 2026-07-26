'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';

const MAX_ADJUSTMENT = 1000000;

function getAdminLabCoinError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();

  if (message.includes('labcoin_balance_cannot_be_negative')) {
    return 'Kullanıcının bakiyesi silmek istediğin miktardan az.';
  }
  if (message.includes('labcoin_amount_too_large')) {
    return 'Tek işlemde en fazla 1.000.000 LabCoin düzenleyebilirsin.';
  }
  if (message.includes('admin_required')) {
    return 'Bu işlem yalnızca adminler tarafından yapılabilir.';
  }

  return 'LabCoin bakiyesi güncellenemedi.';
}

export default function AdminLabCoinManager({ targetUserId, targetUsername }) {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!targetUserId) return;

    const { data, error } = await supabase.rpc('admin_get_user_labcoin', {
      p_target_user_id: targetUserId,
    });
    if (error) throw error;

    setBalance(data?.balance || 0);
  }, [targetUserId]);

  useEffect(() => {
    let cancelled = false;

    async function initializeBalance() {
      try {
        await loadBalance();
      } catch (error) {
        console.error('Admin LabCoin load error:', error);
        if (!cancelled) toast.error(getAdminLabCoinError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initializeBalance();
    return () => {
      cancelled = true;
    };
  }, [loadBalance]);

  async function adjustBalance(direction) {
    if (adjusting) return;

    const parsedAmount = Number.parseInt(amount, 10);
    if (
      !Number.isInteger(parsedAmount)
      || parsedAmount < 1
      || parsedAmount > MAX_ADJUSTMENT
    ) {
      toast.error('1 ile 1.000.000 arasında bir miktar gir.');
      return;
    }

    const delta = direction === 'add' ? parsedAmount : -parsedAmount;
    const actionText = direction === 'add' ? 'eklemek' : 'silmek';
    if (!window.confirm(
      `@${targetUsername} hesabına ${parsedAmount} LabCoin ${actionText} istiyor musun?`
    )) {
      return;
    }

    setAdjusting(true);
    const toastId = toast.loading('LabCoin bakiyesi güncelleniyor...');

    try {
      const { data, error } = await supabase.rpc('admin_adjust_user_labcoin', {
        p_target_user_id: targetUserId,
        p_delta: delta,
      });
      if (error) throw error;

      setBalance(data?.balance || 0);
      toast.success(
        direction === 'add'
          ? `${parsedAmount} LabCoin eklendi.`
          : `${parsedAmount} LabCoin silindi.`,
        { id: toastId }
      );
    } catch (error) {
      console.error('Admin LabCoin adjustment error:', error);
      toast.error(getAdminLabCoinError(error), { id: toastId });
      await loadBalance().catch(() => {});
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-xl shadow-amber-500/10 dark:border-amber-500/20 dark:from-amber-950/30 dark:via-[#111] dark:to-black">
      <div className="grid gap-6 p-6 md:grid-cols-[0.75fr_1.25fr] md:items-center md:p-8">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber-300 bg-white shadow-lg">
            <Image
              src="/labcoin.jpg"
              alt="LabCoin"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">
              Admin LabCoin Yönetimi
            </p>
            <p className="mt-1 text-3xl font-black text-gray-950 dark:text-white">
              {loading ? '—' : balance}
            </p>
            <p className="text-xs font-bold text-gray-500">
              @{targetUsername} mevcut bakiye
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-labcoin-amount"
            className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500"
          >
            İşlem miktarı
          </label>
          <input
            id="admin-labcoin-amount"
            type="number"
            min="1"
            max={MAX_ADJUSTMENT}
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            disabled={loading || adjusting}
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-lg font-black text-gray-950 outline-none transition-colors focus:border-amber-500 disabled:opacity-50 dark:border-white/10 dark:bg-black dark:text-white"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => adjustBalance('add')}
              disabled={loading || adjusting}
              className="rounded-2xl bg-emerald-600 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Coin Ekle
            </button>
            <button
              type="button"
              onClick={() => adjustBalance('remove')}
              disabled={loading || adjusting}
              className="rounded-2xl bg-red-600 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              − Coin Sil
            </button>
          </div>

          <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-gray-400">
            Bu alan yalnızca adminlere görünür ve bütün işlemler kaydedilir.
          </p>
        </div>
      </div>
    </section>
  );
}
