import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext({ items: [], addItem: () => {} });

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const addItem = (item) => {
    setItems((prev) => [...prev, item]);
  };
  return (
    <CartContext.Provider value={{ items, addItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

