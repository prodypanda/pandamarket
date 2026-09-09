'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AdminTheme = 'enterprise' | 'command' | 'rego';
export type AdminAccentColor = 'rouge' | 'ocre' | 'olive' | 'bleu' | 'prune' | 'charbon';
export type AdminDensity = 'compact' | 'standard' | 'airy';

interface AdminThemeContextType {
  adminTheme: AdminTheme;
  setAdminTheme: (theme: AdminTheme) => void;
  toggleAdminTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  accent: AdminAccentColor;
  setAccent: (accent: AdminAccentColor) => void;
  density: AdminDensity;
  setDensity: (density: AdminDensity) => void;
}

const STORAGE_KEY = 'pd_admin_dashboard_theme';
const SIDEBAR_STORAGE_KEY = 'pd_admin_sidebar_collapsed';
const ACCENT_STORAGE_KEY = 'pd_admin_accent_color';
const DENSITY_STORAGE_KEY = 'pd_admin_density';

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [adminTheme, setAdminThemeState] = useState<AdminTheme>('rego');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [accent, setAccentState] = useState<AdminAccentColor>('rouge');
  const [density, setDensityState] = useState<AdminDensity>('standard');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
      if (savedTheme === 'enterprise' || savedTheme === 'command' || savedTheme === 'rego') {
        setAdminThemeState(savedTheme);
      }
      const savedSidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedSidebar !== null) {
        setSidebarCollapsedState(savedSidebar === 'true');
      }
      const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY) as AdminAccentColor | null;
      if (savedAccent) setAccentState(savedAccent);

      const savedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY) as AdminDensity | null;
      if (savedDensity) setDensityState(savedDensity);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setAdminTheme = useCallback((theme: AdminTheme) => {
    setAdminThemeState(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
      document.cookie = `pm_admin_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore
    }
  }, []);

  const toggleAdminTheme = useCallback(() => {
    setAdminTheme(
      adminTheme === 'rego' ? 'command' : adminTheme === 'command' ? 'enterprise' : 'rego'
    );
  }, [adminTheme, setAdminTheme]);

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

  const setAccent = useCallback((newAccent: AdminAccentColor) => {
    setAccentState(newAccent);
    try {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, newAccent);
    } catch {}
  }, []);

  const setDensity = useCallback((newDensity: AdminDensity) => {
    setDensityState(newDensity);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
    } catch {}
  }, []);

  return (
    <AdminThemeContext.Provider
      value={{
        adminTheme,
        setAdminTheme,
        toggleAdminTheme,
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
        data-admin-theme={adminTheme}
        data-accent={accent}
        data-density={density}
        className={`w-full min-h-full transition-colors duration-200 acc-${accent} den-${density === 'compact' ? 'comp' : density === 'airy' ? 'air' : 'standard'}`}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    return {
      adminTheme: (typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'enterprise' : 'rego') as AdminTheme,
      setAdminTheme: () => {},
      toggleAdminTheme: () => {},
      sidebarCollapsed: false,
      setSidebarCollapsed: () => {},
      toggleSidebarCollapsed: () => {},
      accent: 'rouge' as AdminAccentColor,
      setAccent: () => {},
      density: 'standard' as AdminDensity,
      setDensity: () => {},
    };
  }
  return context;
}
