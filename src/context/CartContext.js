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
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const incrementItem = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const decrementItem = (id) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
      )
    );
  };

  const updateQuantity = (id, delta) => {
    if (delta === 'remove') return removeItem(id);
    if (typeof delta === 'number') {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, quantity: Math.max(1, i.quantity + delta) }
            : i
        )
      );
    }
  };

  const clear = () => setItems([]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      incrementItem,
      decrementItem,
      updateQuantity,
      clear,
      itemCount,
      subtotal,
    }),
    [items, itemCount, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
