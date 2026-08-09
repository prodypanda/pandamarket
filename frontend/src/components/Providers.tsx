'use client';

import { CartProvider } from '../contexts/CartContext';
import { SocketProvider } from '../contexts/SocketContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { GamifiedRewardsWidget } from './retention/GamifiedRewardsWidget';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SocketProvider>
        <CartProvider>
          {children}
          <GamifiedRewardsWidget />
        </CartProvider>
      </SocketProvider>
    </LocaleProvider>
  );
}
