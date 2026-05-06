export interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_tagline?: string;
  marketplace_logo_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress';
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
