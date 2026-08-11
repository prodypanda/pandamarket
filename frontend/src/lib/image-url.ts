/**
 * Utility for resolving WordPress-style multi-size image variants.
 *
 * Presets:
 * - 'thumbnail': 150x150 cover (best for avatars, tiny product lists)
 * - 'small': 300x300 fit (best for product cards, cart items, grid items)
 * - 'medium': 600x600 fit (best for product detail main view)
 * - 'large': 1200x1200 fit (best for lightboxes, hero banners, desktop detail zoom)
 * - 'original': full resolution upload
 */

export type ImageVariantSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

export function getResizedImageUrl(
  url: string | null | undefined,
  size: ImageVariantSize = 'small',
  fallback: string = '/placeholder-product.png',
): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // If size is original, return as-is
  if (size === 'original') {
    return trimmed;
  }

  // Do not resize SVGs or GIFs or branding logos
  if (
    trimmed.toLowerCase().endsWith('.svg') || 
    trimmed.toLowerCase().endsWith('.gif') || 
    trimmed.toLowerCase().endsWith('.ico') ||
    trimmed.includes('/branding/') ||
    trimmed.includes('logo')
  ) {
    return trimmed;
  }

  // Only apply suffix to local / proxied product images or backend storage
  const isBackendImage = trimmed.includes('/pd-product-images/') || trimmed.includes('/api/files/') || trimmed.includes('/uploads/');
  if (!isBackendImage && !trimmed.startsWith('data:')) {
    // Return static assets (e.g. /logo.png) and external URLs as-is
    return trimmed;
  }

  // Check if URL already has a size suffix
  const presets: ImageVariantSize[] = ['thumbnail', 'small', 'medium', 'large'];
  let cleanUrl = trimmed;

  for (const p of presets) {
    cleanUrl = cleanUrl.replace(new RegExp(`_${p}\\.(webp|jpg|jpeg|png)$`, 'i'), '.$1');
  }

  const lastDotIndex = cleanUrl.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${cleanUrl}_${size}.webp`;
  }

  const base = cleanUrl.substring(0, lastDotIndex);
  return `${base}_${size}.webp`;
}
