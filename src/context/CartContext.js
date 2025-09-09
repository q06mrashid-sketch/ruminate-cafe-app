import React, { createContext, useState, useMemo, useContext } from 'react';

export const CartContext = createContext({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  incrementItem: () => {},
  decrementItem: () => {},
  updateQuantity: () => {},
  clear: () => {},
  itemCount: 0,
  subtotal: 0,
});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list.find((i) => i.id === item.id);
      if (existing) {
        return list.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...list, { ...item, quantity: item.quantity || 1 }];
    });
    console.log(`[CART] add ${item.id} x${item.quantity || 1}`);
  };

  const removeItem = (id) => {
    setItems((prev) => (Array.isArray(prev) ? prev.filter((i) => i.id !== id) : []));
    console.log(`[CART] remove ${id}`);
  };

  const incrementItem = (id) => {
    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
    console.log(`[CART] increment ${id}`);
  };

  const decrementItem = (id) => {
    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
      )
    );
    console.log(`[CART] decrement ${id}`);
  };

  const updateQuantity = (id, delta) => {
    if (delta === 'remove') return removeItem(id);
    if (typeof delta === 'number') {
      setItems((prev) =>
        (Array.isArray(prev) ? prev : []).map((i) =>
          i.id === id
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i
        )
      );
      console.log(`[CART] update ${id} delta ${delta}`);
    }
  };

  const clear = () => {
    setItems([]);
    console.log('[CART] clear');
  };

  const safeItems = Array.isArray(items) ? items : [];
  const itemCount = safeItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const subtotal = safeItems.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantity || 0),
    0
  );

  const value = useMemo(
    () => ({
      items: safeItems,
      addItem,
      removeItem,
      incrementItem,
      decrementItem,
      updateQuantity,
      clear,
      itemCount,
      subtotal,
    }),
    [safeItems, itemCount, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
