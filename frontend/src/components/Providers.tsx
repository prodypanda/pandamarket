'use client';

import { CartProvider } from '../contexts/CartContext';
import { SocketProvider } from '../contexts/SocketContext';
import { LocaleProvider } from '../contexts/LocaleContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SocketProvider>
        <CartProvider>{children}</CartProvider>
      </SocketProvider>
    </LocaleProvider>
  );
}
