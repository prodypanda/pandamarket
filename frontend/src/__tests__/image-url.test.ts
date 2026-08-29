import { describe, it, expect } from 'vitest';
import { getResizedImageUrl } from '@/lib/image-url';
import { getStoreProductImage, type StoreProduct } from '@/components/themes/shared';

describe('getResizedImageUrl', () => {
  describe('Falsy inputs and fallback handling', () => {
    it('returns default fallback (/placeholder.svg) for null', () => {
      expect(getResizedImageUrl(null)).toBe('/placeholder.svg');
    });

    it('returns default fallback (/placeholder.svg) for undefined', () => {
      expect(getResizedImageUrl(undefined)).toBe('/placeholder.svg');
    });

    it('returns default fallback (/placeholder.svg) for empty string', () => {
      expect(getResizedImageUrl('')).toBe('/placeholder.svg');
    });

    it('returns default fallback (/placeholder.svg) for whitespace string', () => {
      expect(getResizedImageUrl('   ')).toBe('/placeholder.svg');
    });

    it('returns custom fallback when provided for falsy inputs', () => {
      expect(getResizedImageUrl(null, 'medium', '/custom-fallback.png')).toBe('/custom-fallback.png');
      expect(getResizedImageUrl('', 'small', '/no-image.jpg')).toBe('/no-image.jpg');
    });
  });

  describe('Original size preservation', () => {
    it('returns original URL trimmed without modifications when size is "original"', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/products/store_1/file_abc.jpg', 'original')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc.jpg',
      );
      expect(getResizedImageUrl('  /pd-product-images/products/file.png  ', 'original')).toBe(
        '/pd-product-images/products/file.png',
      );
      expect(getResizedImageUrl('https://images.unsplash.com/photo-12345?w=800', 'original')).toBe(
        'https://images.unsplash.com/photo-12345?w=800',
      );
    });
  });

  describe('Size presets & default size', () => {
    const baseCdnUrl = 'https://cdn.garbage.team/products/store_1/shoe.jpg';

    it('defaults to "medium" WebP variant when size is omitted', () => {
      expect(getResizedImageUrl(baseCdnUrl)).toBe(
        'https://cdn.garbage.team/products/store_1/shoe_medium.webp',
      );
    });

    it('correctly resolves "thumbnail" (150x150) variant', () => {
      expect(getResizedImageUrl(baseCdnUrl, 'thumbnail')).toBe(
        'https://cdn.garbage.team/products/store_1/shoe_thumbnail.webp',
      );
    });

    it('correctly resolves "small" (300x300) variant', () => {
      expect(getResizedImageUrl(baseCdnUrl, 'small')).toBe(
        'https://cdn.garbage.team/products/store_1/shoe_small.webp',
      );
    });

    it('correctly resolves "medium" (600x600) variant', () => {
      expect(getResizedImageUrl(baseCdnUrl, 'medium')).toBe(
        'https://cdn.garbage.team/products/store_1/shoe_medium.webp',
      );
    });

    it('correctly resolves "large" (1200x1200) variant', () => {
      expect(getResizedImageUrl(baseCdnUrl, 'large')).toBe(
        'https://cdn.garbage.team/products/store_1/shoe_large.webp',
      );
    });
  });

  describe('Cloudflare R2 and PandaMarket CDN URL transformations', () => {
    it('transforms cdn.garbage.team URLs to WebP variants', () => {
      const url = 'https://cdn.garbage.team/products/store_1/file_abc.jpg';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc_small.webp',
      );
    });

    it('transforms cdn.pandamarket.tn URLs to WebP variants', () => {
      const url = 'https://cdn.pandamarket.tn/categories/fashion.png';
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.pandamarket.tn/categories/fashion_large.webp',
      );
    });

    it('transforms .r2.cloudflarestorage.com URLs to WebP variants', () => {
      const url = 'https://pandamarket.r2.cloudflarestorage.com/products/store_42/watch.jpeg';
      expect(getResizedImageUrl(url, 'thumbnail')).toBe(
        'https://pandamarket.r2.cloudflarestorage.com/products/store_42/watch_thumbnail.webp',
      );
    });

    it('transforms .r2.dev public bucket URLs to WebP variants', () => {
      const url = 'https://pub-a1b2c3d4.r2.dev/products/store_7/camera.png';
      expect(getResizedImageUrl(url, 'medium')).toBe(
        'https://pub-a1b2c3d4.r2.dev/products/store_7/camera_medium.webp',
      );
    });
  });

  describe('Local backend image transformations', () => {
    it('transforms /pd-product-images/ endpoints', () => {
      expect(getResizedImageUrl('/pd-product-images/products/file.png', 'small')).toBe(
        '/pd-product-images/products/file_small.webp',
      );
    });

    it('transforms /pd-themes/ endpoints', () => {
      expect(getResizedImageUrl('/pd-themes/modern/preview.jpg', 'thumbnail')).toBe(
        '/pd-themes/modern/preview_thumbnail.webp',
      );
    });

    it('transforms /api/files/ endpoints', () => {
      expect(getResizedImageUrl('/api/files/download/asset_xyz.png', 'large')).toBe(
        '/api/files/download/asset_xyz_large.webp',
      );
    });

    it('transforms /uploads/ endpoints', () => {
      expect(getResizedImageUrl('/uploads/store_1/banner.jpeg', 'medium')).toBe(
        '/uploads/store_1/banner_medium.webp',
      );
    });

    it('transforms root-relative paths', () => {
      expect(getResizedImageUrl('/products/sample.png', 'small')).toBe(
        '/products/sample_small.webp',
      );
    });

    it('transforms filenames without extensions cleanly', () => {
      expect(getResizedImageUrl('/pd-product-images/raw-asset', 'medium')).toBe(
        '/pd-product-images/raw-asset_medium.webp',
      );
    });
  });

  describe('Suffix swapping and deduplication', () => {
    it('swaps _small.webp with _large.webp', () => {
      const url = 'https://cdn.garbage.team/products/store_1/file_abc_small.webp';
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc_large.webp',
      );
    });

    it('swaps _thumbnail.webp with _medium.webp', () => {
      const url = 'https://cdn.garbage.team/products/store_1/file_abc_thumbnail.webp';
      expect(getResizedImageUrl(url, 'medium')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc_medium.webp',
      );
    });

    it('swaps legacy jpg variant suffix _small.jpg with _large.webp', () => {
      const url = 'https://cdn.garbage.team/products/store_1/file_abc_small.jpg';
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc_large.webp',
      );
    });

    it('swaps legacy png variant suffix _medium.png with _thumbnail.webp', () => {
      const url = 'https://cdn.garbage.team/products/store_1/file_abc_medium.png';
      expect(getResizedImageUrl(url, 'thumbnail')).toBe(
        'https://cdn.garbage.team/products/store_1/file_abc_thumbnail.webp',
      );
    });

    it('does not strip words like "small" or "large" when part of the product name', () => {
      const url = 'https://cdn.garbage.team/products/small_tshirt_large_fit.jpg';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team/products/small_tshirt_large_fit_small.webp',
      );
    });
  });

  describe('Query string and hash preservation', () => {
    it('preserves query strings during transformation', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/products/image.jpg?v=2', 'medium')).toBe(
        'https://cdn.garbage.team/products/image_medium.webp?v=2',
      );
    });

    it('preserves hash fragments during transformation', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/products/image.jpg#view', 'small')).toBe(
        'https://cdn.garbage.team/products/image_small.webp#view',
      );
    });

    it('preserves both query string and hash (e.g. /image.png?version=1#top -> /image_medium.webp?version=1#top)', () => {
      expect(getResizedImageUrl('/image.png?version=1#top', 'medium')).toBe(
        '/image_medium.webp?version=1#top',
      );
    });

    it('preserves complex query params when swapping variant suffixes', () => {
      const url = 'https://cdn.garbage.team/products/file_small.webp?token=xyz123&width=300#card';
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.garbage.team/products/file_large.webp?token=xyz123&width=300#card',
      );
    });
  });

  describe('Exemptions and bypasses', () => {
    it('bypasses SVG vector images', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/icons/check.svg', 'small')).toBe(
        'https://cdn.garbage.team/icons/check.svg',
      );
      expect(getResizedImageUrl('/icons/logo-icon.SVG?v=1', 'large')).toBe(
        '/icons/logo-icon.SVG?v=1',
      );
    });

    it('bypasses animated GIFs', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/animations/spinner.gif', 'thumbnail')).toBe(
        'https://cdn.garbage.team/animations/spinner.gif',
      );
      expect(getResizedImageUrl('/assets/loader.GIF', 'medium')).toBe(
        '/assets/loader.GIF',
      );
    });

    it('bypasses ICO favicons', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/favicon.ico', 'small')).toBe(
        'https://cdn.garbage.team/favicon.ico',
      );
      expect(getResizedImageUrl('/favicon.ico', 'medium')).toBe(
        '/favicon.ico',
      );
    });

    it('bypasses base64 data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(getResizedImageUrl(dataUrl, 'small')).toBe(dataUrl);
    });

    it('bypasses branding and logo paths', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/brand/main-banner.png', 'large')).toBe(
        'https://cdn.garbage.team/brand/main-banner.png',
      );
      expect(getResizedImageUrl('/branding/store-header.jpg', 'medium')).toBe(
        '/branding/store-header.jpg',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/stores/store_1/logo.png', 'small')).toBe(
        'https://cdn.garbage.team/stores/store_1/logo.png',
      );
      expect(getResizedImageUrl('/assets/app-logo.png', 'thumbnail')).toBe(
        '/assets/app-logo.png',
      );
    });
  });

  describe('External third-party domain exemptions', () => {
    it('bypasses Unsplash sample images', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600';
      expect(getResizedImageUrl(unsplashUrl, 'small')).toBe(unsplashUrl);
    });

    it('bypasses Picsum sample images', () => {
      const picsumUrl = 'https://picsum.photos/400/400';
      expect(getResizedImageUrl(picsumUrl, 'medium')).toBe(picsumUrl);
    });

    it('bypasses Pexels sample images', () => {
      const pexelsUrl = 'https://images.pexels.com/photos/123/pexels-photo-123.jpeg';
      expect(getResizedImageUrl(pexelsUrl, 'large')).toBe(pexelsUrl);
    });

    it('bypasses via.placeholder.com sample images', () => {
      const placeholderUrl = 'https://via.placeholder.com/300';
      expect(getResizedImageUrl(placeholderUrl, 'thumbnail')).toBe(placeholderUrl);
    });

    it('bypasses arbitrary third-party external domains', () => {
      const externalUrl = 'https://example-shop.com/media/products/shirt.png';
      expect(getResizedImageUrl(externalUrl, 'small')).toBe(externalUrl);
    });
  });
});

describe('getStoreProductImage', () => {
  it('defaults to "small" WebP variant for storefront theme product cards', () => {
    const product: StoreProduct = {
      id: 'prod_1',
      title: 'Silk Scarf',
      price: 49.99,
      thumbnail: 'https://cdn.garbage.team/products/store_1/scarf.jpg',
    };

    expect(getStoreProductImage(product)).toBe(
      'https://cdn.garbage.team/products/store_1/scarf_small.webp',
    );
  });

  it('uses first image string when images array is provided', () => {
    const product: StoreProduct = {
      id: 'prod_2',
      title: 'Leather Bag',
      price: 120,
      images: ['https://cdn.garbage.team/products/store_1/bag.jpg'],
    };

    expect(getStoreProductImage(product)).toBe(
      'https://cdn.garbage.team/products/store_1/bag_small.webp',
    );
  });

  it('uses first image object url when images array contains objects', () => {
    const product: StoreProduct = {
      id: 'prod_3',
      title: 'Ceramic Mug',
      price: 25,
      images: [{ url: 'https://cdn.garbage.team/products/store_1/mug.png' }],
    };

    expect(getStoreProductImage(product)).toBe(
      'https://cdn.garbage.team/products/store_1/mug_small.webp',
    );
  });

  it('allows overriding the size parameter (e.g. "large" or "thumbnail")', () => {
    const product: StoreProduct = {
      id: 'prod_4',
      title: 'Handmade Watch',
      price: 250,
      thumbnail: 'https://cdn.garbage.team/products/store_1/watch.jpg',
    };

    expect(getStoreProductImage(product, 'large')).toBe(
      'https://cdn.garbage.team/products/store_1/watch_large.webp',
    );
    expect(getStoreProductImage(product, 'thumbnail')).toBe(
      'https://cdn.garbage.team/products/store_1/watch_thumbnail.webp',
    );
  });

  it('returns default fallback when product has no images or thumbnail', () => {
    const product: StoreProduct = {
      id: 'prod_5',
      title: 'Empty Product',
      price: 10,
    };

    expect(getStoreProductImage(product)).toBe('/placeholder.svg');
  });
});
