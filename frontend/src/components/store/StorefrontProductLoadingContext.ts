'use client';

import { createContext } from 'react';
import type { StorefrontProductLoadingMode } from '@pandamarket/types';
import type { StoreProduct } from '../themes/shared';

export interface StorefrontProductLoadingContextValue {
  products: StoreProduct[];
  mode: StorefrontProductLoadingMode;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  totalProducts?: number;
  isLoading: boolean;
  error: string | null;
  loadPage: (page: number) => Promise<boolean>;
  loadNextPage: () => Promise<boolean>;
  retry: () => Promise<boolean>;
}

export const StorefrontProductLoadingContext = createContext<StorefrontProductLoadingContextValue | null>(null);
