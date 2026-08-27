'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import type { SubscriptionPlanLimits } from '@/lib/subscription-plans';

interface DashboardSubscriptionContextType {
  plan: string | null;
  limits: SubscriptionPlanLimits | null;
  loading: boolean;
  isFeatureAllowed: (feature: keyof SubscriptionPlanLimits) => boolean;
  refreshSubscription: () => Promise<void>;
}

const DashboardSubscriptionContext = createContext<DashboardSubscriptionContextType | undefined>(undefined);

export function DashboardSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [limits, setLimits] = useState<SubscriptionPlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/current', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan || null);
        setLimits(data.limits || null);
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isFeatureAllowed = useCallback(
    (feature: keyof SubscriptionPlanLimits): boolean => {
      if (!limits) return false;
      const val = limits[feature];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0 || val === -1;
      return Boolean(val);
    },
    [limits]
  );

  const value = useMemo(
    () => ({
      plan,
      limits,
      loading,
      isFeatureAllowed,
      refreshSubscription,
    }),
    [plan, limits, loading, isFeatureAllowed, refreshSubscription]
  );

  return (
    <DashboardSubscriptionContext.Provider value={value}>
      {children}
    </DashboardSubscriptionContext.Provider>
  );
}

export function useDashboardSubscription(): DashboardSubscriptionContextType {
  const context = useContext(DashboardSubscriptionContext);
  if (!context) {
    return {
      plan: null,
      limits: null,
      loading: false,
      isFeatureAllowed: () => true, // safe permissive fallback
      refreshSubscription: async () => {},
    };
  }
  return context;
}
