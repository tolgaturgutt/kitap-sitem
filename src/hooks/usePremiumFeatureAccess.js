'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export function usePremiumFeatureAccessState() {
  const [canUsePremiumFeatures, setCanUsePremiumFeatures] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .rpc('can_use_premium_features')
      .then(({ data }) => {
        if (!cancelled) {
          setCanUsePremiumFeatures(Boolean(data));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { canUsePremiumFeatures, loading };
}

export function usePremiumFeatureAccess() {
  return usePremiumFeatureAccessState().canUsePremiumFeatures;
}
