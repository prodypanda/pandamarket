export type MarketplaceTheme = 'panda' | 'aliexpress' | 'aliexpress2';

export interface MarketplaceThemeSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  marketplace_logo_url?: string;
  marketplace_favicon_url?: string;
  marketplace_og_image_url?: string;
  marketplace_public_url?: string;
  marketplace_theme?: MarketplaceTheme;
  marketplace_support_email?: string;
  marketplace_support_phone?: string;
  marketplace_facebook_url?: string;
  marketplace_instagram_url?: string;
  marketplace_x_url?: string;
  marketplace_tiktok_url?: string;
  marketplace_youtube_url?: string;
  marketplace_linkedin_url?: string;
  marketplace_whatsapp_url?: string;
  marketplace_telegram_url?: string;
  marketplace_pinterest_url?: string;
  marketplace_snapchat_url?: string;
  marketplace_help_url?: string;
  marketplace_terms_url?: string;
  marketplace_privacy_url?: string;
  marketplace_contact_url?: string;
  default_currency?: string;
}

export function resolveMarketplaceTheme(theme?: MarketplaceTheme): MarketplaceTheme {
  return theme === 'aliexpress2' ? 'aliexpress2' : theme === 'aliexpress' ? 'aliexpress' : 'panda';
}

export function isAliExpressTheme(theme?: MarketplaceTheme): boolean {
  const resolved = resolveMarketplaceTheme(theme);
  return resolved === 'aliexpress' || resolved === 'aliexpress2';
}

export function getMarketplaceThemeClasses(theme?: MarketplaceTheme) {
  const isAliExpress = isAliExpressTheme(theme);
  const isAliExpress2 = resolveMarketplaceTheme(theme) === 'aliexpress2';

  return {
    isAliExpress,
    page: isAliExpress2
      ? 'bg-[#fafafa] text-[#111111]'
      : isAliExpress
        ? 'bg-[#f5f5f5] text-[#222222]'
        : 'bg-gray-50 text-gray-900',
    pageSoft: isAliExpress2
      ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,71,71,0.08),transparent_50%),linear-gradient(180deg,#fffafa_0%,#fafafa_100%)] text-[#111111]'
      : isAliExpress
        ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,71,71,0.12),transparent_28%),linear-gradient(180deg,#fff7f2_0%,#f5f5f5_42%,#ffffff_100%)] text-[#222222]'
        : 'bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.12),transparent_28%),linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] text-gray-900',
    header: isAliExpress2
      ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-2xl shadow-orange-900/30 border-b border-white/10 backdrop-blur-2xl'
      : isAliExpress
        ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-xl shadow-orange-900/10'
        : 'bg-gradient-to-r from-slate-950 via-slate-900 to-[#16C784] text-white shadow-xl shadow-emerald-950/10',
    primary: isAliExpress2
      ? 'bg-gradient-to-r from-[#ff4747] to-[#ff8a00] text-white hover:from-[#e63f00] hover:to-[#e67300] shadow-lg shadow-orange-600/30 font-bold backdrop-blur-md rounded-lg'
      : isAliExpress
        ? 'bg-[#ff4747] text-white hover:bg-[#e63f00] shadow-orange-900/20'
        : 'bg-[#16C784] text-white hover:bg-[#14b876] shadow-[#16C784]/20',
    primaryGradient: isAliExpress2
      ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-2xl shadow-orange-600/30'
      : isAliExpress
        ? 'bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-orange-900/20'
        : 'bg-gradient-to-r from-[#16C784] to-[#1EE69A] text-white shadow-[#16C784]/20',
    primaryText: isAliExpress2 ? 'text-[#ff4747]' : isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]',
    primaryTextHover: isAliExpress2 ? 'hover:text-[#ff4747]' : isAliExpress ? 'hover:text-[#ff4747]' : 'hover:text-[#16C784]',
    primarySoft: isAliExpress2 ? 'bg-[#ff4747]/10 text-[#ff4747] border border-[#ff4747]/20 backdrop-blur-md font-bold' : isAliExpress ? 'bg-orange-50 text-[#ff4747]' : 'bg-emerald-50 text-[#0f9f6e]',
    primaryBorder: isAliExpress2 ? 'border-[#ff4747]' : isAliExpress ? 'border-[#ff4747]' : 'border-[#16C784]',
    primaryBorderSoft: isAliExpress2 ? 'border-[#ff4747]/30' : isAliExpress ? 'border-orange-200' : 'border-emerald-200',
    focus: isAliExpress2
      ? 'focus:border-[#ff4747] focus:ring-[#ff4747]/30'
      : isAliExpress
        ? 'focus:border-[#ff4747] focus:ring-[#ff4747]/15'
        : 'focus:border-[#16C784] focus:ring-[#16C784]/15',
    checkbox: isAliExpress2
      ? 'text-[#ff4747] focus:ring-[#ff4747]'
      : isAliExpress
        ? 'text-[#ff4747] focus:ring-[#ff4747]'
        : 'text-[#16C784] focus:ring-[#16C784]',
    card: isAliExpress2
      ? 'rounded-lg border border-orange-100/50 bg-white/70 backdrop-blur-xl shadow-lg shadow-orange-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/20 hover:-translate-y-1 hover:border-orange-200/60'
      : isAliExpress
        ? 'rounded-[1.75rem] border border-orange-100/80 bg-white shadow-sm shadow-orange-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-900/10'
        : 'rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10',
    panel: isAliExpress2
      ? 'rounded-xl border border-orange-100/50 bg-white/80 backdrop-blur-xl shadow-xl shadow-orange-900/10'
      : isAliExpress
        ? 'rounded-[1.75rem] border border-orange-100/80 bg-white shadow-sm shadow-orange-900/5'
        : 'rounded-[1.75rem] border border-gray-100 bg-white shadow-sm',
    subtlePanel: isAliExpress2
      ? 'rounded-lg border border-orange-100/30 bg-orange-50/30 backdrop-blur-md'
      : isAliExpress
        ? 'rounded-2xl border border-orange-100 bg-orange-50/60'
        : 'rounded-2xl border border-gray-100 bg-gray-50',
    footer: isAliExpress2
      ? 'bg-gradient-to-br from-[#0a0a0a] to-[#1a0500] text-white border-t border-orange-900/30'
      : isAliExpress
        ? 'bg-[#191919] text-white'
        : 'bg-[#1A1A2E] text-white',
    dealPill: isAliExpress2 ? 'bg-gradient-to-r from-[#ff4747] to-[#ff8a00] text-white font-black tracking-tight shadow-md shadow-orange-600/30 uppercase' : isAliExpress ? 'bg-[#fff1e8] text-[#ff4747]' : 'bg-emerald-50 text-[#0f9f6e]',
    navStrip: isAliExpress2
      ? 'bg-white/60 text-[#ff4747] border-b border-orange-100 backdrop-blur-lg font-bold shadow-sm'
      : isAliExpress
        ? 'bg-[#fff3ed] text-[#7a2d11] border-orange-100'
        : 'bg-emerald-50 text-[#0f9f6e] border-emerald-100',
  };
}
