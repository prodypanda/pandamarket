export interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  marketplace_logo_url?: string;
  marketplace_favicon_url?: string;
  marketplace_og_image_url?: string;
  marketplace_public_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress' | 'aliexpress2';
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

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/settings`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.data || {};
  } catch {
    return {};
  }
}

export function getMarketplacePublicUrl(settings?: Pick<MarketplaceSettings, 'marketplace_public_url'>): string {
  const candidates = [
    settings?.marketplace_public_url,
    process.env.NEXT_PUBLIC_HUB_URL,
    'https://pandamarket.tn',
  ];

  for (const candidate of candidates) {
    const normalized = normalizeHttpUrl(candidate);
    if (normalized) return normalized;
  }

  return 'https://pandamarket.tn';
}

function normalizeHttpUrl(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}
