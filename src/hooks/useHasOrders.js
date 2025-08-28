import { useState, useEffect } from 'react';
import { fetchUserOrders, subscribeUserOrders, onLocalOrdersChange } from '../services/orders';

/**
 * Track whether the current user has any orders.
 */
export default function useHasOrders() {
  const [hasOrders, setHasOrders] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchUserOrders();
        if (active) setHasOrders((data?.length || 0) > 0);
      } catch {}
    };

    load();
    const offRt = subscribeUserOrders(load);
    const offLocal = onLocalOrdersChange(load);
    return () => {
      active = false;
      try { offRt?.(); } catch {}
      try { offLocal?.(); } catch {}
    };
  }, []);

  return hasOrders;
}
