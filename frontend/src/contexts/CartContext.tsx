'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { trackAddToCart } from '../lib/marketplace-analytics';
import { fetchWithCsrf } from '../lib/api';

export type { CartItem } from '../lib/cart-utils';

interface CartContextType {
  items: CartItem[];
  couponCode: string | null;
  discountAmount: number;
  combinedShippingSavings: number;
  sessionToken: string;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  removeStoreItems: (storeId: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { success: boolean; message: string; discount?: number };
  removeCoupon: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
  getItemsByStore: () => Record<string, { store_name: string; items: CartItem[] }>;
  syncToServer: (email?: string, phone?: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'pd_cart';
const COUPON_STORAGE_KEY = 'pd_coupon';
const SESSION_STORAGE_KEY = 'pd_cart_session';

function getOrGenerateSessionToken(): string {
  if (typeof window === 'undefined') return 'sess_default';
  let token = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!token) {
    token = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, token);
  }
  return token;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [combinedShippingSavings, setCombinedShippingSavings] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string>('sess_init');
  const [isHydrated, setIsHydrated] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local calculation of combined shipping and coupons
  const recalculateDiscounts = useCallback((currentItems: CartItem[], coupon: string | null) => {
    const subtotal = _getCartTotal(currentItems);
    const storeMap = _getItemsByStore(currentItems);
    const storeCount = Object.keys(storeMap).length;

    // Multi-Vendor Combined Shipping Savings
    let shippingSavings = 0;
    if (storeCount >= 2) {
      shippingSavings = (storeCount - 1) * 3.000;
    }
    setCombinedShippingSavings(shippingSavings);

    // Coupon discount logic
    let disc = 0;
    const cleanCoupon = (coupon || '').trim().toUpperCase();

    if (cleanCoupon === 'CHANCE5DT') {
      disc = Math.min(subtotal, 5.000);
    } else if (cleanCoupon === 'LIVRAISON_ZERO') {
      const baseShipping = Math.max(0, storeCount * 7.000 - shippingSavings);
      disc = baseShipping;
    } else if (cleanCoupon === 'PANDA10') {
      disc = Math.round(subtotal * 0.1 * 1000) / 1000;
    } else if (cleanCoupon === 'SUPER15') {
      if (subtotal >= 80.000) {
        disc = 15.000;
      }
    } else if (cleanCoupon === 'FIDELITE5') {
      disc = Math.round(subtotal * 0.05 * 1000) / 1000;
    }

    setDiscountAmount(disc);
  }, []);

  // Server sync
  const syncToServer = useCallback(async (email?: string, phone?: string) => {
    try {
      const token = getOrGenerateSessionToken();
      await fetchWithCsrf('/api/pd/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_token: token,
          items,
          coupon_code: couponCode || undefined,
          customer_email: email,
          customer_phone: phone,
        }),
      });
    } catch {
      // ignore sync errors silently
    }
  }, [items, couponCode]);

  useEffect(() => {
    try {
      const token = getOrGenerateSessionToken();
      setSessionToken(token);

      const storedItems = localStorage.getItem(CART_STORAGE_KEY);
      const storedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);

      const parsedItems = storedItems ? JSON.parse(storedItems) : [];
      setItems(parsedItems);
      setCouponCode(storedCoupon || null);

      recalculateDiscounts(parsedItems, storedCoupon || null);
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, [recalculateDiscounts]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      if (couponCode) {
        localStorage.setItem(COUPON_STORAGE_KEY, couponCode);
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
      recalculateDiscounts(items, couponCode);

      // Debounce server sync
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncToServer();
      }, 1000);
    }
  }, [items, couponCode, isHydrated, recalculateDiscounts, syncToServer]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => addItem(prev, item));
    trackAddToCart(item.product_id, item.store_id);
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
    setCouponCode(null);
    setDiscountAmount(0);
    setCombinedShippingSavings(0);
  }, []);

  const applyCoupon = useCallback((code: string) => {
    const clean = (code || '').trim().toUpperCase();
    const subtotal = _getCartTotal(items);

    if (clean === 'CHANCE5DT') {
      setCouponCode(clean);
      return { success: true, message: '🎉 5.000 DT de remise appliqués !', discount: 5.0 };
    } else if (clean === 'LIVRAISON_ZERO') {
      setCouponCode(clean);
      return { success: true, message: '🚚 Frais de livraison offerts !' };
    } else if (clean === 'PANDA10') {
      setCouponCode(clean);
      return { success: true, message: '🔥 10% de remise appliqués sur votre panier !' };
    } else if (clean === 'SUPER15') {
      if (subtotal < 80.0) {
        return { success: false, message: '⚠️ Ce code nécessite un panier minimum de 80 DT.' };
      }
      setCouponCode(clean);
      return { success: true, message: '🎁 15.000 DT de réduction appliqués !', discount: 15.0 };
    } else if (clean === 'FIDELITE5') {
      setCouponCode(clean);
      return { success: true, message: '⭐ 5% de réduction fidélité appliqués !' };
    }

    return { success: false, message: '❌ Code promo invalide ou expiré.' };
  }, [items]);

  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    setDiscountAmount(0);
  }, []);

  const getCartTotal = useCallback(() => _getCartTotal(items), [items]);
  const getItemCount = useCallback(() => _getItemCount(items), [items]);
  const getItemsByStore = useCallback(() => _getItemsByStore(items), [items]);

  const value = useMemo(
    () => ({
      items,
      couponCode,
      discountAmount,
      combinedShippingSavings,
      sessionToken,
      addToCart,
      removeFromCart,
      removeStoreItems,
      updateQuantity,
      clearCart,
      applyCoupon,
      removeCoupon,
      getCartTotal,
      getItemCount,
      getItemsByStore,
      syncToServer,
    }),
    [
      items,
      couponCode,
      discountAmount,
      combinedShippingSavings,
      sessionToken,
      addToCart,
      removeFromCart,
      removeStoreItems,
      updateQuantity,
      clearCart,
      applyCoupon,
      removeCoupon,
      getCartTotal,
      getItemCount,
      getItemsByStore,
      syncToServer,
    ],
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
