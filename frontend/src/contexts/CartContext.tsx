'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  store_id: string;
  store_name: string;
  image_url: string | null;
  variant?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  getItemsByStore: () => Record<string, { store_name: string; items: CartItem[] }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'pd_cart';

function generateCartItemId(product_id: string, variant?: string): string {
  return variant ? `${product_id}_${variant}` : product_id;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Persist cart to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const id = generateCartItemId(item.product_id, item.variant);
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, { ...item, id }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getItemsByStore = useCallback(() => {
    const grouped: Record<string, { store_name: string; items: CartItem[] }> = {};
    for (const item of items) {
      if (!grouped[item.store_id]) {
        grouped[item.store_id] = { store_name: item.store_name, items: [] };
      }
      grouped[item.store_id].items.push(item);
    }
    return grouped;
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getItemCount,
      getItemsByStore,
    }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getItemCount, getItemsByStore],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
