import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchUserOrders, subscribeUserOrders } from '../services/orders';

interface Ctx {
  hasOrders: boolean;
  setHasOrders: React.Dispatch<React.SetStateAction<boolean>>;
  refreshOrdersPresence: () => Promise<void>;
}

const OrdersCtx = createContext<Ctx | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [hasOrders, setHasOrders] = useState(false);

  const refreshOrdersPresence = useCallback(async () => {
    try {
      const data = await fetchUserOrders();
      setHasOrders((data?.length ?? 0) > 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeUserOrders(refreshOrdersPresence);
    // initial check
    refreshOrdersPresence();
    return () => {
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [refreshOrdersPresence]);

  return (
    <OrdersCtx.Provider value={{ hasOrders, setHasOrders, refreshOrdersPresence }}>
      {children}
    </OrdersCtx.Provider>
  );
}

export function useOrdersPresence() {
  const ctx = useContext(OrdersCtx);
  if (!ctx) throw new Error('useOrdersPresence must be used within OrdersProvider');
  return ctx;
}
