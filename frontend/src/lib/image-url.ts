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
  size: ImageVariantSize = 'medium',
  fallback: string = '/placeholder.svg',
): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // If size is original, return as-is
  if (size === 'original') {
    return trimmed;
  }

  // Data URLs cannot be resized via URL modification
  if (trimmed.toLowerCase().startsWith('data:')) {
    return trimmed;
  }

  // Safely extract hash and query string to preserve them
  const hashIndex = trimmed.indexOf('#');
  const hash = hashIndex !== -1 ? trimmed.slice(hashIndex) : '';
  const withoutHash = hashIndex !== -1 ? trimmed.slice(0, hashIndex) : trimmed;

  const queryIndex = withoutHash.indexOf('?');
  const search = queryIndex !== -1 ? withoutHash.slice(queryIndex) : '';
  const basePath = queryIndex !== -1 ? withoutHash.slice(0, queryIndex) : withoutHash;

  const lowerBase = basePath.toLowerCase();

  // Preserve exemptions for SVGs, animated GIFs, ICOs
  if (
    lowerBase.endsWith('.svg') ||
    lowerBase.endsWith('.gif') ||
    lowerBase.endsWith('.ico')
  ) {
    return trimmed;
  }

  // Preserve exemptions for branding assets and logos
  if (
    lowerBase.includes('/brand/') ||
    lowerBase.includes('/branding/') ||
    lowerBase.includes('/logo') ||
    lowerBase.includes('logo')
  ) {
    return trimmed;
  }

  // Determine if URL is a remote host or relative path
  const isRemote = /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//');

  // Allow resizing for all PandaMarket CDN and Cloudflare R2 domains as well as local backend endpoints
  const isPandaHostOrEndpoint =
    lowerBase.includes('cdn.garbage.team') ||
    lowerBase.includes('cdn.pandamarket.tn') ||
    lowerBase.includes('.r2.cloudflarestorage.com') ||
    lowerBase.includes('.r2.dev') ||
    lowerBase.includes('/pd-product-images/') ||
    lowerBase.includes('/pd-themes/') ||
    lowerBase.includes('/api/files/') ||
    lowerBase.includes('/uploads/');

  // If remote URL is not from Panda CDN / R2 / local backend endpoints, keep external third-party sample hosts (e.g. Unsplash, Picsum, Pexels, via.placeholder) exempt
  if (isRemote && !isPandaHostOrEndpoint) {
    return trimmed;
  }

  // Replace existing variant suffixes (_thumbnail.webp, _small.webp, _medium.webp, _large.webp, _small.jpg, etc.)
  const variantSuffixRegex = /_(thumbnail|small|medium|large)\.[a-zA-Z0-9]+$/i;
  let cleanBase = basePath;

  if (variantSuffixRegex.test(cleanBase)) {
    cleanBase = cleanBase.replace(variantSuffixRegex, '');
  } else {
    // Strip standard image extensions (.jpg, .jpeg, .png, .webp, .avif) from the end of the filename
    const lastSlashIndex = cleanBase.lastIndexOf('/');
    const lastDotIndex = cleanBase.lastIndexOf('.');
    if (lastDotIndex > lastSlashIndex) {
      cleanBase = cleanBase.substring(0, lastDotIndex);
    }
  }

  return `${cleanBase}_${size}.webp${search}${hash}`;
}
