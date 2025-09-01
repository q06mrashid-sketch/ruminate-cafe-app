import React, { createContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getMyStats } from '../services/stats';
import { syncVouchers } from '../services/vouchers';
import { applyStampAccrual } from '../utils/rewards';
import { markLoaded } from '../boot/loadingSignals';
import { supabase } from '../lib/supabase';

export const StatsContext = createContext({
  stats: { loyaltyStamps: 0, vouchers: [], freebiesLeft: 0 },
  refreshStats: async () => ({ loyaltyStamps: 0, vouchers: [], freebiesLeft: 0 }),
  setStats: () => {},
});

export function StatsProvider({ children }) {

  const initialRaw = globalThis.preloaded?.stats || {
    loyaltyStamps: 0,
    vouchers: [],
  };
  const initial = {
    loyaltyStamps: Number(initialRaw.loyaltyStamps) || 0,
    vouchers: Array.isArray(initialRaw.vouchers)
      ? initialRaw.vouchers.filter(Boolean)
      : [],
  };
  initial.freebiesLeft = initial.vouchers.length;

  const [stats, setStatsState] = useState(initial);
  const statsRef = useRef(initial);

  const applyStats = useCallback((s) => {

    const vouchers = Array.isArray(s.vouchers) ? s.vouchers.filter(Boolean) : [];
    const next = {
      loyaltyStamps: Number(s.loyaltyStamps) || 0,
      vouchers,
      freebiesLeft: vouchers.length,
    };
    statsRef.current = next;
    setStatsState(next);
    globalThis.freebiesLeft = next.freebiesLeft;
    globalThis.loyaltyStamps = next.loyaltyStamps;
    globalThis.preloaded = globalThis.preloaded || {};
    globalThis.preloaded.stats = next;

  }, []);

  const refreshStats = useCallback(async () => {
    try {
      let s = await getMyStats();
      const outOfRange = s.loyaltyStamps < 0 || s.loyaltyStamps > 7;
      if (outOfRange) {
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
          s.vouchers = Array.isArray(s.vouchers) ? s.vouchers : [];
        }
      }
      const decorated = {
        ...s,
        freebiesLeft: Array.isArray(s.vouchers) ? s.vouchers.length : 0,
      };
      applyStats(decorated);
      markLoaded('stamps');
      return decorated;
    } catch {
      const fallback = statsRef.current;
      applyStats(fallback);
      markLoaded('stamps');
      return fallback;
    }
  }, [applyStats]);

  useEffect(() => {
    if (!supabase?.auth) return;
    const zero = { loyaltyStamps: 0, vouchers: [] };
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
        console.log(
          `[LOYALTY] ${tag} → stamps: ${s.loyaltyStamps}, free drinks: ${s.freebiesLeft}`,
        );
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
