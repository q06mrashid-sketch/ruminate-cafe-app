import { useState, useCallback } from 'react';
import { getMyStats } from '../services/stats';
import { syncVouchers } from '../services/vouchers';
import { applyStampAccrual } from '../utils/rewards';
import { markLoaded } from '../boot/loadingSignals';

export function useStats() {
  const initialStats = {
    loyaltyStamps: globalThis.loyaltyStamps ?? globalThis.stats?.loyaltyStamps ?? 0,
    freebiesLeft: globalThis.freebiesLeft ?? globalThis.stats?.freebiesLeft ?? 0,
    vouchers: Array.isArray(globalThis.stats?.vouchers) ? globalThis.stats.vouchers : [],
  };
  const [stats, setStats] = useState(initialStats);

  const refreshStats = useCallback(async () => {
    try {
      let s = await getMyStats();
      const mismatch = s.freebiesLeft !== (Array.isArray(s.vouchers) ? s.vouchers.length : 0);
      const outOfRange = s.loyaltyStamps < 0 || s.loyaltyStamps > 7;
      if (mismatch || outOfRange) {
        await syncVouchers();
        s = await getMyStats();
      }
      if (s.loyaltyStamps < 0 || s.loyaltyStamps > 7) {
        const { vouchersEarned, stampsRemainder } = applyStampAccrual(0, s.loyaltyStamps);
        s.loyaltyStamps = stampsRemainder;
        if (vouchersEarned > 0) {
          s.freebiesLeft += vouchersEarned;
          s.vouchers = Array.isArray(s.vouchers) ? s.vouchers : [];
        }
      }
      setStats(s);
      globalThis.freebiesLeft = s.freebiesLeft;
      globalThis.loyaltyStamps = s.loyaltyStamps;
      globalThis.stats = s;
      markLoaded('stamps');
      return s;
    } catch {
      const fallback = { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
      setStats(fallback);
      markLoaded('stamps');
      return fallback;
    }
  }, []);

  return { stats, refreshStats };
}
