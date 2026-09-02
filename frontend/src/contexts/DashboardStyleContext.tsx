'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';

export type DashboardStyle = 'classic' | 'bento';

interface DashboardStyleContextType {
  dashboardStyle: DashboardStyle;
  setDashboardStyle: (style: DashboardStyle) => void;
  toggleDashboardStyle: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

const STORAGE_KEY = 'pd_seller_dashboard_style';
const SIDEBAR_STORAGE_KEY = 'pd_seller_sidebar_collapsed';

const DashboardStyleContext = createContext<DashboardStyleContextType | undefined>(undefined);

export function DashboardStyleProvider({ children }: { children: React.ReactNode }) {
  const [dashboardStyle, setDashboardStyleState] = useState<DashboardStyle>('classic');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedStyle = window.localStorage.getItem(STORAGE_KEY) as DashboardStyle | null;
      if (savedStyle === 'classic' || savedStyle === 'bento') {
        setDashboardStyleState(savedStyle);
      }
      const savedSidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedSidebar !== null) {
        setSidebarCollapsedState(savedSidebar === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setDashboardStyle = useCallback((style: DashboardStyle) => {
    setDashboardStyleState(style);
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
      // Ignore
    }

    // Background sync with store settings
    fetchWithCsrf('/api/pd/stores/me/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        settings: { preferred_dashboard_style: style },
      }),
    }).catch(() => {
      // Non-blocking background sync
    });
  }, []);

  const toggleDashboardStyle = useCallback(() => {
    setDashboardStyle(dashboardStyle === 'classic' ? 'bento' : 'classic');
  }, [dashboardStyle, setDashboardStyle]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return (
    <DashboardStyleContext.Provider
      value={{
        dashboardStyle,
        setDashboardStyle,
        toggleDashboardStyle,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapsed,
      }}
    >
      {children}
    </DashboardStyleContext.Provider>
  );
}

export function useDashboardStyle() {
  const context = useContext(DashboardStyleContext);
  if (!context) {
    return {
      dashboardStyle: 'classic' as DashboardStyle,
      setDashboardStyle: () => {},
      toggleDashboardStyle: () => {},
      sidebarCollapsed: false,
      setSidebarCollapsed: () => {},
      toggleSidebarCollapsed: () => {},
    };
  }
  return context;
}
