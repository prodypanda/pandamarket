'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMarketplaceThemeClasses, resolveMarketplaceTheme, type MarketplaceThemeSettings } from '../lib/marketplace-theme';

export function useMarketplaceTheme(initialSettings: MarketplaceThemeSettings = {}) {
  const [settings, setSettings] = useState<MarketplaceThemeSettings>(initialSettings);

  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      try {
        const res = await fetch('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setSettings(data.data || {});
      } catch {
        if (active) setSettings({});
      }
    }

    fetchSettings();

    return () => {
      active = false;
    };
  }, []);

  const theme = resolveMarketplaceTheme(settings.marketplace_theme);
  const classes = useMemo(() => getMarketplaceThemeClasses(theme), [theme]);

  return {
    settings,
    theme,
    classes,
    isAliExpress: classes.isAliExpress,
    isAliExpress2: theme === 'aliexpress2',
  };
}
