'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export function usePlusFeatureAccessState() {
  const [canUsePlusFeatures, setCanUsePlusFeatures] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .rpc('can_use_plus_features')
      .then(({ data }) => {
        if (!cancelled) {
          setCanUsePlusFeatures(Boolean(data));
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

  return { canUsePlusFeatures, loading };
}

export function usePlusFeatureAccess() {
  return usePlusFeatureAccessState().canUsePlusFeatures;
}
