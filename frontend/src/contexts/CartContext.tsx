'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  type CartItem,
  addItem,
  removeItem,
  removeItemsByStore,
  updateItemQuantity,
  getCartTotal as _getCartTotal,
  getItemCount as _getItemCount,
  getItemsByStore as _getItemsByStore,
} from '../lib/cart-utils';

export type { CartItem } from '../lib/cart-utils';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  removeStoreItems: (storeId: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  getItemsByStore: () => Record<string, { store_name: string; items: CartItem[] }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'pd_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => addItem(prev, item));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => removeItem(prev, id));
  }, []);

  const removeStoreItems = useCallback((storeId: string) => {
    setItems((prev) => removeItemsByStore(prev, storeId));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => updateItemQuantity(prev, id, quantity));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getCartTotal = useCallback(() => _getCartTotal(items), [items]);
  const getItemCount = useCallback(() => _getItemCount(items), [items]);
  const getItemsByStore = useCallback(() => _getItemsByStore(items), [items]);

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, removeStoreItems, updateQuantity, clearCart, getCartTotal, getItemCount, getItemsByStore }),
    [items, addToCart, removeFromCart, removeStoreItems, updateQuantity, clearCart, getCartTotal, getItemCount, getItemsByStore],
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
