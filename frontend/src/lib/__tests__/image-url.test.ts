import { describe, it, expect } from 'vitest';
import { getResizedImageUrl } from '../image-url';

describe('getResizedImageUrl', () => {
  it('returns fallback when url is empty or null', () => {
    expect(getResizedImageUrl(null)).toBe('/placeholder-product.png');
    expect(getResizedImageUrl('')).toBe('/placeholder-product.png');
    expect(getResizedImageUrl('   ', 'large', '/custom-fallback.png')).toBe('/custom-fallback.png');
  });

  it('returns original url when size is original', () => {
    const url = 'https://cdn.garbage.team/products/store1/shoes.jpg';
    expect(getResizedImageUrl(url, 'original')).toBe(url);
  });

  it('generates multi-size WebP variant URLs for Cloudflare CDN images', () => {
    const cdnUrl = 'https://cdn.garbage.team/products/store1/shoes.jpeg';
    expect(getResizedImageUrl(cdnUrl, 'thumbnail')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_thumbnail.webp',
    );
    expect(getResizedImageUrl(cdnUrl, 'small')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_small.webp',
    );
    expect(getResizedImageUrl(cdnUrl, 'medium')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_medium.webp',
    );
    expect(getResizedImageUrl(cdnUrl, 'large')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_large.webp',
    );
  });

  it('generates multi-size WebP variant URLs for local /pd-product-images/ URLs', () => {
    const localUrl = '/pd-product-images/products/store1/shoes.png';
    expect(getResizedImageUrl(localUrl, 'medium')).toBe(
      '/pd-product-images/products/store1/shoes_medium.webp',
    );
  });

  it('swaps existing size preset suffixes cleanly', () => {
    const existingMedium = 'https://cdn.garbage.team/products/store1/shoes_medium.webp';
    expect(getResizedImageUrl(existingMedium, 'small')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_small.webp',
    );
    expect(getResizedImageUrl(existingMedium, 'large')).toBe(
      'https://cdn.garbage.team/products/store1/shoes_large.webp',
    );
  });

  it('preserves SVGs, GIFs, and branding logos without resizing', () => {
    expect(getResizedImageUrl('https://cdn.garbage.team/logo.svg', 'medium')).toBe(
      'https://cdn.garbage.team/logo.svg',
    );
    expect(getResizedImageUrl('https://cdn.garbage.team/stores/store1/branding/logo.png', 'thumbnail')).toBe(
      'https://cdn.garbage.team/stores/store1/branding/logo.png',
    );
    expect(getResizedImageUrl('https://cdn.garbage.team/animation.gif', 'small')).toBe(
      'https://cdn.garbage.team/animation.gif',
    );
  });

  it('returns external static images as-is without suffixing', () => {
    const externalUrl = 'https://images.unsplash.com/photo-123456789?auto=format';
    expect(getResizedImageUrl(externalUrl, 'medium')).toBe(externalUrl);
  });
});
