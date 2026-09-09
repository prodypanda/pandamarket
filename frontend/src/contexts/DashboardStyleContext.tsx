'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';

export type DashboardStyle = 'classic' | 'bento' | 'rego';
export type AccentColor = 'rouge' | 'ocre' | 'olive' | 'bleu' | 'prune' | 'charbon';
export type DashboardDensity = 'compact' | 'standard' | 'airy';

interface DashboardStyleContextType {
  dashboardStyle: DashboardStyle;
  setDashboardStyle: (style: DashboardStyle) => void;
  toggleDashboardStyle: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  density: DashboardDensity;
  setDensity: (density: DashboardDensity) => void;
}

const STORAGE_KEY = 'pd_seller_dashboard_style';
const SIDEBAR_STORAGE_KEY = 'pd_seller_sidebar_collapsed';
const ACCENT_STORAGE_KEY = 'pd_seller_accent_color';
const DENSITY_STORAGE_KEY = 'pd_seller_density';

const DashboardStyleContext = createContext<DashboardStyleContextType | undefined>(undefined);

export function DashboardStyleProvider({ children }: { children: React.ReactNode }) {
  const [dashboardStyle, setDashboardStyleState] = useState<DashboardStyle>('rego');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [accent, setAccentState] = useState<AccentColor>('rouge');
  const [density, setDensityState] = useState<DashboardDensity>('standard');

  useEffect(() => {
    try {
      const savedStyle = window.localStorage.getItem(STORAGE_KEY) as DashboardStyle | null;
      if (savedStyle === 'classic' || savedStyle === 'bento' || savedStyle === 'rego') {
        setDashboardStyleState(savedStyle);
      }
      const savedSidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedSidebar !== null) {
        setSidebarCollapsedState(savedSidebar === 'true');
      }
      const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null;
      if (savedAccent) setAccentState(savedAccent);

      const savedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY) as DashboardDensity | null;
      if (savedDensity) setDensityState(savedDensity);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setDashboardStyle = useCallback((style: DashboardStyle) => {
    setDashboardStyleState(style);
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
      document.cookie = `pm_seller_theme=${style}; path=/; max-age=31536000; SameSite=Lax`;
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
    setDashboardStyle(
      dashboardStyle === 'rego' ? 'bento' : dashboardStyle === 'bento' ? 'classic' : 'rego'
    );
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

  const setAccent = useCallback((newAccent: AccentColor) => {
    setAccentState(newAccent);
    try {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, newAccent);
    } catch {}
  }, []);

  const setDensity = useCallback((newDensity: DashboardDensity) => {
    setDensityState(newDensity);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
    } catch {}
  }, []);

  return (
    <DashboardStyleContext.Provider
      value={{
        dashboardStyle,
        setDashboardStyle,
        toggleDashboardStyle,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapsed,
        accent,
        setAccent,
        density,
        setDensity,
      }}
    >
      <div
        data-seller-theme={dashboardStyle}
        data-accent={accent}
        data-density={density}
        className={`w-full min-h-full transition-colors duration-200 acc-${accent} den-${density === 'compact' ? 'comp' : density === 'airy' ? 'air' : 'standard'}`}
      >
        {children}
      </div>
    </DashboardStyleContext.Provider>
  );
}

export function useDashboardStyle() {
  const context = useContext(DashboardStyleContext);
  if (!context) {
    return {
      dashboardStyle: (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'classic' : 'rego') as DashboardStyle,
      setDashboardStyle: () => {},
      toggleDashboardStyle: () => {},
      sidebarCollapsed: false,
      setSidebarCollapsed: () => {},
      toggleSidebarCollapsed: () => {},
      accent: 'rouge' as AccentColor,
      setAccent: () => {},
      density: 'standard' as DashboardDensity,
      setDensity: () => {},
    };
  }
  return context;
}
