export type MarketplaceTheme = 'panda' | 'aliexpress';

export interface MarketplaceThemeSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  marketplace_logo_url?: string;
  marketplace_theme?: MarketplaceTheme;
  default_currency?: string;
}

export function resolveMarketplaceTheme(theme?: MarketplaceTheme): MarketplaceTheme {
  return theme === 'aliexpress' ? 'aliexpress' : 'panda';
}

export function isAliExpressTheme(theme?: MarketplaceTheme): boolean {
  return resolveMarketplaceTheme(theme) === 'aliexpress';
}

export function getMarketplaceThemeClasses(theme?: MarketplaceTheme) {
  const isAliExpress = isAliExpressTheme(theme);

  return {
    isAliExpress,
    page: isAliExpress
      ? 'bg-[#f5f5f5] text-[#222222]'
      : 'bg-gray-50 text-gray-900',
    pageSoft: isAliExpress
      ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,71,71,0.12),transparent_28%),linear-gradient(180deg,#fff7f2_0%,#f5f5f5_42%,#ffffff_100%)] text-[#222222]'
      : 'bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.12),transparent_28%),linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] text-gray-900',
    header: isAliExpress
      ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-xl shadow-orange-900/10'
      : 'bg-gradient-to-r from-slate-950 via-slate-900 to-[#16C784] text-white shadow-xl shadow-emerald-950/10',
    primary: isAliExpress
      ? 'bg-[#ff4747] text-white hover:bg-[#e63f00] shadow-orange-900/20'
      : 'bg-[#16C784] text-white hover:bg-[#14b876] shadow-[#16C784]/20',
    primaryGradient: isAliExpress
      ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-orange-900/20'
      : 'bg-gradient-to-r from-[#16C784] to-[#1EE69A] text-white shadow-[#16C784]/20',
    primaryText: isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]',
    primaryTextHover: isAliExpress ? 'hover:text-[#ff4747]' : 'hover:text-[#16C784]',
    primarySoft: isAliExpress ? 'bg-orange-50 text-[#ff4747]' : 'bg-emerald-50 text-[#0f9f6e]',
    primaryBorder: isAliExpress ? 'border-[#ff4747]' : 'border-[#16C784]',
    primaryBorderSoft: isAliExpress ? 'border-orange-200' : 'border-emerald-200',
    focus: isAliExpress
      ? 'focus:border-[#ff4747] focus:ring-[#ff4747]/15'
      : 'focus:border-[#16C784] focus:ring-[#16C784]/15',
    checkbox: isAliExpress
      ? 'text-[#ff4747] focus:ring-[#ff4747]'
      : 'text-[#16C784] focus:ring-[#16C784]',
    card: isAliExpress
      ? 'rounded-[1.75rem] border border-orange-100/80 bg-white shadow-sm shadow-orange-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-900/10'
      : 'rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10',
    panel: isAliExpress
      ? 'rounded-[1.75rem] border border-orange-100/80 bg-white shadow-sm shadow-orange-900/5'
      : 'rounded-[1.75rem] border border-gray-100 bg-white shadow-sm',
    subtlePanel: isAliExpress
      ? 'rounded-2xl border border-orange-100 bg-orange-50/60'
      : 'rounded-2xl border border-gray-100 bg-gray-50',
    footer: isAliExpress
      ? 'bg-[#191919] text-white'
      : 'bg-[#1A1A2E] text-white',
    dealPill: isAliExpress ? 'bg-[#fff1e8] text-[#ff4747]' : 'bg-emerald-50 text-[#0f9f6e]',
    navStrip: isAliExpress
      ? 'bg-[#fff3ed] text-[#7a2d11] border-orange-100'
      : 'bg-emerald-50 text-[#0f9f6e] border-emerald-100',
  };
}
