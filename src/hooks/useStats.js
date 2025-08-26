import { useState, useCallback } from 'react';
import { getMyStats } from '../services/stats';
import { syncVouchers } from '../services/vouchers';
import { applyStampAccrual } from '../utils/rewards';

export function useStats() {
  const [stats, setStats] = useState({ loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] });

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
      return s;
    } catch {
      const fallback = { loyaltyStamps: 0, freebiesLeft: 0, vouchers: [] };
      setStats(fallback);
      return fallback;
    }
  }, []);

  return { stats, refreshStats };
}
