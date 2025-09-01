import React, { createContext, useState, useCallback, useMemo } from 'react';
import { getMyStats } from '../services/stats';
import { syncVouchers } from '../services/vouchers';
import { applyStampAccrual } from '../utils/rewards';

export const StatsContext = createContext({
  stats: { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] },
  refreshStats: async () => ({ loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] }),
  setStats: () => {},
});

export function StatsProvider({ children }) {
  const initial =
    globalThis.preloaded?.stats || {
      loyaltyStamps: 0,
      freebiesLeft: 0,
      vouchers: [],
    };
  const [stats, setStatsState] = useState(initial);

  const applyStats = useCallback((s) => {
    setStatsState(s);
    globalThis.freebiesLeft = s.freebiesLeft;
    globalThis.loyaltyStamps = s.loyaltyStamps;
    globalThis.preloaded = globalThis.preloaded || {};
    globalThis.preloaded.stats = s;
  }, []);

  const refreshStats = useCallback(
    async () => {
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
        console.log('loyalty stamps and free drinks have been received');
        return s;
      } catch {
        const fallback = globalThis.preloaded?.stats || stats;
        applyStats(fallback);
        return fallback;
      }
    },
    [applyStats, stats],
  );

  const value = useMemo(
    () => ({ stats, refreshStats, setStats: applyStats }),
    [stats, refreshStats, applyStats],
  );

  return (
    <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
  );
}
