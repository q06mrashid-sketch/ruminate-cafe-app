import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserOrders, subscribeUserOrders } from '../services/orders';

/**
 * Track whether the current user has any orders.
 */
export default function useHasOrders() {
  const [hasOrders, setHasOrders] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchUserOrders();
      setHasOrders((data?.length || 0) > 0);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      const off = subscribeUserOrders(load);
      load();
      return () => { try { off?.(); } catch {} };
    }, [load])
  );

  return hasOrders;
}
