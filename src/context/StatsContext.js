import React, { createContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getMyStats } from '../services/stats';
import { syncVouchers } from '../services/vouchers';
import { applyStampAccrual } from '../utils/rewards';
import { markLoaded } from '../boot/loadingSignals';
import { supabase } from '../lib/supabase';

export const StatsContext = createContext({
  stats: { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] },
  refreshStats: async () => ({ loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] }),
  setStats: () => {},
});

export function StatsProvider({ children }) {
  const initial = {
    loyaltyStamps: 0,
    freebiesLeft: 0,
    vouchers: [],
  };
  const [stats, setStatsState] = useState(initial);
  const statsRef = useRef(initial);

  const applyStats = useCallback((s) => {
    statsRef.current = s;
    setStatsState(s);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      let s = await getMyStats();
      const mismatch =
        s.freebiesLeft !== (Array.isArray(s.vouchers) ? s.vouchers.length : 0);
      const outOfRange = s.loyaltyStamps < 0 || s.loyaltyStamps > 7;
      if (mismatch || outOfRange) {
        await syncVouchers();
        s = await getMyStats();
      }
      if (s.loyaltyStamps < 0 || s.loyaltyStamps > 7) {
        const { vouchersEarned, stampsRemainder } = applyStampAccrual(
          0,
          s.loyaltyStamps,
        );
        s.loyaltyStamps = stampsRemainder;
        if (vouchersEarned > 0) {
          s.freebiesLeft += vouchersEarned;
          s.vouchers = Array.isArray(s.vouchers) ? s.vouchers : [];
        }
      }
      applyStats(s);
      markLoaded('stamps');
      return s;
    } catch {
      const fallback = statsRef.current;
      applyStats(fallback);
      markLoaded('stamps');
      return fallback;
    }
  }, [applyStats]);

  useEffect(() => {
    if (!supabase?.auth) return;
    const zero = { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
    const sub = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        applyStats(zero);
        console.log('[LOYALTY] reset → stamps: 0, free drinks: 0');
        return;
      }
      applyStats(zero);
      try {
        const s = await refreshStats();
        const tag = event === 'INITIAL_SESSION' ? 'on boot' : 'auth';
        console.log(`[LOYALTY] ${tag} → stamps: ${s.loyaltyStamps}, free drinks: ${s.freebiesLeft}`);
      } catch {}
    });
    return () => { try { sub?.data?.subscription?.unsubscribe?.(); } catch {} };
  }, [applyStats, refreshStats]);

  const value = useMemo(
    () => ({ stats, refreshStats, setStats: applyStats }),
    [stats, refreshStats, applyStats],
  );

  return (
    <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
  );
}
