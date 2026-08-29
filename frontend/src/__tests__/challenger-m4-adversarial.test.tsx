import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { getResizedImageUrl, type ImageVariantSize } from '@/lib/image-url';
import {
  getStoreProductImage,
  type StoreProduct,
  type ThemeProps,
} from '@/components/themes/shared';
import { themes, type ThemeId } from '@/lib/themes';
import { themeComponents } from '@/components/themes/ThemeWrapper';
import { CartProvider } from '@/contexts/CartContext';

// Mock next/image for Vitest DOM rendering
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props });
  },
}));

describe('Challenger M4: Adversarial Stress Tests for getResizedImageUrl & Theme Storefronts', () => {
  describe('1. Complex URLs (Query params, Ports, Encoded chars, Hash anchors)', () => {
    it('handles URLs with explicit port, query params, and hash anchor', () => {
      const url = 'https://cdn.garbage.team:443/products/store%201/image.png?v=1&token=xyz#preview';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team:443/products/store%201/image_small.webp?v=1&token=xyz#preview',
      );
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.garbage.team:443/products/store%201/image_large.webp?v=1&token=xyz#preview',
      );
    });

    it('handles URLs with custom port numbers on local/mock endpoints', () => {
      const url = 'http://localhost:8080/pd-product-images/uploads/item_42.jpg?time=12345';
      expect(getResizedImageUrl(url, 'medium')).toBe(
        'http://localhost:8080/pd-product-images/uploads/item_42_medium.webp?time=12345',
      );
    });

    it('handles URLs with percent-encoded paths and Unicode/Arabic characters', () => {
      const url = 'https://cdn.pandamarket.tn/products/%D9%82%D9%85%D9%8A%D8%B5-%D8%AD%D8%B1%D9%8A%D8%B1/photo%20(1).jpg?size=full#zoom';
      expect(getResizedImageUrl(url, 'thumbnail')).toBe(
        'https://cdn.pandamarket.tn/products/%D9%82%D9%85%D9%8A%D8%B5-%D8%AD%D8%B1%D9%8A%D8%B1/photo%20(1)_thumbnail.webp?size=full#zoom',
      );
    });

    it('handles URLs with multiple query parameters containing nested dots or extension-like values', () => {
      const url = 'https://cdn.garbage.team/products/store_1/main.png?orig=photo.jpg&redirect=icon.svg&v=2.1#section.3';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team/products/store_1/main_small.webp?orig=photo.jpg&redirect=icon.svg&v=2.1#section.3',
      );
    });

    it('handles Cloudflare R2 bucket URLs with complex signatures and expiration timestamps', () => {
      const url = 'https://pandamarket.r2.cloudflarestorage.com/products/item.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260829T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef123456';
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://pandamarket.r2.cloudflarestorage.com/products/item_large.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260829T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef123456',
      );
    });
  });

  describe('2. Suffix Collision Attacks (Words like "small", "large", "thumbnail" in product names)', () => {
    it('safely handles my_small_box_thumbnail.jpg without corrupting "small"', () => {
      const url = 'https://cdn.garbage.team/products/my_small_box_thumbnail.jpg';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team/products/my_small_box_small.webp',
      );
      expect(getResizedImageUrl(url, 'large')).toBe(
        'https://cdn.garbage.team/products/my_small_box_large.webp',
      );
    });

    it('safely handles medium_sized_photo_large.png without corrupting "medium"', () => {
      const url = 'https://cdn.garbage.team/products/medium_sized_photo_large.png';
      expect(getResizedImageUrl(url, 'thumbnail')).toBe(
        'https://cdn.garbage.team/products/medium_sized_photo_thumbnail.webp',
      );
    });

    it('safely handles large_thumbnail_image.jpg where suffix words are at the start', () => {
      const url = 'https://cdn.garbage.team/products/large_thumbnail_image.jpg';
      expect(getResizedImageUrl(url, 'small')).toBe(
        'https://cdn.garbage.team/products/large_thumbnail_image_small.webp',
      );
    });

    it('safely handles filenames consisting solely of preset names', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/products/small.png', 'small')).toBe(
        'https://cdn.garbage.team/products/small_small.webp',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/products/medium.jpg', 'large')).toBe(
        'https://cdn.garbage.team/products/medium_large.webp',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/products/thumbnail.webp', 'thumbnail')).toBe(
        'https://cdn.garbage.team/products/thumbnail_thumbnail.webp',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/products/large.jpeg', 'medium')).toBe(
        'https://cdn.garbage.team/products/large_medium.webp',
      );
    });

    it('safely swaps existing variant suffixes regardless of initial extension (.webp, .jpg, .png, .jpeg)', () => {
      const webpSmall = 'https://cdn.garbage.team/products/shoe_small.webp';
      expect(getResizedImageUrl(webpSmall, 'medium')).toBe(
        'https://cdn.garbage.team/products/shoe_medium.webp',
      );

      const jpgMedium = 'https://cdn.garbage.team/products/shoe_medium.jpg';
      expect(getResizedImageUrl(jpgMedium, 'thumbnail')).toBe(
        'https://cdn.garbage.team/products/shoe_thumbnail.webp',
      );

      const pngLarge = 'https://cdn.garbage.team/products/shoe_large.png';
      expect(getResizedImageUrl(pngLarge, 'small')).toBe(
        'https://cdn.garbage.team/products/shoe_small.webp',
      );
    });

    it('handles files with multiple dots correctly', () => {
      const multiDot = 'https://cdn.garbage.team/products/release.v1.2.final.png';
      expect(getResizedImageUrl(multiDot, 'medium')).toBe(
        'https://cdn.garbage.team/products/release.v1.2.final_medium.webp',
      );
    });
  });

  describe('3. Boundary, Malformed, and Non-Standard Protocol Inputs', () => {
    it('returns fallback for null, undefined, empty string, and whitespace', () => {
      expect(getResizedImageUrl(null)).toBe('/placeholder.svg');
      expect(getResizedImageUrl(undefined)).toBe('/placeholder.svg');
      expect(getResizedImageUrl('')).toBe('/placeholder.svg');
      expect(getResizedImageUrl('   \n\t  ')).toBe('/placeholder.svg');
    });

    it('returns fallback for non-string runtime types (safety against JS runtime anomalies)', () => {
      expect(getResizedImageUrl(12345 as unknown as string)).toBe('/placeholder.svg');
      expect(getResizedImageUrl({} as unknown as string)).toBe('/placeholder.svg');
      expect(getResizedImageUrl([] as unknown as string)).toBe('/placeholder.svg');
      expect(getResizedImageUrl(true as unknown as string)).toBe('/placeholder.svg');
    });

    it('returns base64 data URLs verbatim without modification', () => {
      const dataUri = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      expect(getResizedImageUrl(dataUri, 'small')).toBe(dataUri);
      expect(getResizedImageUrl(dataUri, 'large')).toBe(dataUri);
    });

    it('exempts external blob: URLs', () => {
      const blobUrl = 'blob:http://localhost:3000/d7b57b54-dcf1-4560-bfca-45feef4e12e8';
      expect(getResizedImageUrl(blobUrl, 'small')).toBe(
        'blob:http://localhost:3000/d7b57b54-dcf1-4560-bfca-45feef4e12e8_small.webp',
      );
    });

    it('handles protocol-relative URLs properly', () => {
      const protoRelative = '//cdn.garbage.team/products/banner.jpg';
      expect(getResizedImageUrl(protoRelative, 'large')).toBe(
        '//cdn.garbage.team/products/banner_large.webp',
      );
    });

    it('returns original URL as-is when size is "original"', () => {
      const url = 'https://cdn.garbage.team/products/store_1/raw_scan.tiff';
      expect(getResizedImageUrl(url, 'original')).toBe(url);
    });
  });

  describe('4. Exemptions & Domain Whitelisting', () => {
    it('bypasses SVG, animated GIF, and ICO favicons in uppercase and lowercase', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/icons/check.svg', 'small')).toBe(
        'https://cdn.garbage.team/icons/check.svg',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/icons/check.SVG', 'large')).toBe(
        'https://cdn.garbage.team/icons/check.SVG',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/icons/anim.gif', 'medium')).toBe(
        'https://cdn.garbage.team/icons/anim.gif',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/icons/anim.GIF', 'medium')).toBe(
        'https://cdn.garbage.team/icons/anim.GIF',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/favicon.ico', 'thumbnail')).toBe(
        'https://cdn.garbage.team/favicon.ico',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/favicon.ICO', 'thumbnail')).toBe(
        'https://cdn.garbage.team/favicon.ICO',
      );
    });

    it('bypasses branding and logo paths', () => {
      expect(getResizedImageUrl('https://cdn.garbage.team/stores/123/branding/header.png', 'large')).toBe(
        'https://cdn.garbage.team/stores/123/branding/header.png',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/stores/123/brand/logo.jpg', 'small')).toBe(
        'https://cdn.garbage.team/stores/123/brand/logo.jpg',
      );
      expect(getResizedImageUrl('https://cdn.garbage.team/stores/123/logo.png', 'thumbnail')).toBe(
        'https://cdn.garbage.team/stores/123/logo.png',
      );
      expect(getResizedImageUrl('/images/app_logo.png', 'medium')).toBe(
        '/images/app_logo.png',
      );
    });

    it('bypasses external third-party sample image domains', () => {
      const unsplash = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800';
      const picsum = 'https://picsum.photos/id/237/200/300';
      const pexels = 'https://images.pexels.com/photos/1234/pexels-photo.jpg';
      const placeholder = 'https://via.placeholder.com/150';
      const shopify = 'https://cdn.shopify.com/s/files/1/0001/products/sample.jpg';

      expect(getResizedImageUrl(unsplash, 'small')).toBe(unsplash);
      expect(getResizedImageUrl(picsum, 'medium')).toBe(picsum);
      expect(getResizedImageUrl(pexels, 'large')).toBe(pexels);
      expect(getResizedImageUrl(placeholder, 'thumbnail')).toBe(placeholder);
      expect(getResizedImageUrl(shopify, 'small')).toBe(shopify);
    });
  });

  describe('5. Theme Storefront Integration across 20 Storefront Themes', () => {
    const allThemeIds: ThemeId[] = [
      'minimal',
      'classic',
      'modern',
      'boutique',
      'artisan',
      'techhub',
      'flavor',
      'elegance',
      'neon',
      'sahara',
      'medina',
      'coastal',
      'urban',
      'garden',
      'studio',
      'luxe',
      'fresh',
      'craft',
      'digital',
      'kids',
    ];

    const mockProductThumbnail: StoreProduct = {
      id: 'prod_thumb_1',
      title: 'Handcrafted Olive Wood Board',
      price: 65.0,
      thumbnail: 'https://cdn.garbage.team/products/store_1/olive_board.jpg',
    };

    const mockProductImageStringArray: StoreProduct = {
      id: 'prod_str_1',
      title: 'Ceramic Tea Set',
      price: 85.0,
      images: ['https://cdn.garbage.team/products/store_1/tea_set.png'],
    };

    const mockProductImageObjectArray: StoreProduct = {
      id: 'prod_obj_1',
      title: 'Leather Wallet',
      price: 45.0,
      images: [{ url: 'https://cdn.garbage.team/products/store_1/wallet.jpeg' }],
    };

    it('resolves valid 300x300 _small.webp for products with thumbnail', () => {
      expect(getStoreProductImage(mockProductThumbnail)).toBe(
        'https://cdn.garbage.team/products/store_1/olive_board_small.webp',
      );
    });

    it('resolves valid 300x300 _small.webp for products with image string array', () => {
      expect(getStoreProductImage(mockProductImageStringArray)).toBe(
        'https://cdn.garbage.team/products/store_1/tea_set_small.webp',
      );
    });

    it('resolves valid 300x300 _small.webp for products with image object array', () => {
      expect(getStoreProductImage(mockProductImageObjectArray)).toBe(
        'https://cdn.garbage.team/products/store_1/wallet_small.webp',
      );
    });

    it('allows explicit variant size override (thumbnail, medium, large, original)', () => {
      const sizes: ImageVariantSize[] = ['thumbnail', 'small', 'medium', 'large', 'original'];
      const expectedSuffixes: Record<ImageVariantSize, string> = {
        thumbnail: '_thumbnail.webp',
        small: '_small.webp',
        medium: '_medium.webp',
        large: '_large.webp',
        original: '.jpg',
      };

      for (const size of sizes) {
        const resolved = getStoreProductImage(mockProductThumbnail, size);
        expect(resolved).toContain(expectedSuffixes[size]);
      }
    });

    it('returns placeholder fallback when product has neither images nor thumbnail', () => {
      const emptyProduct: StoreProduct = {
        id: 'prod_empty',
        title: 'Empty Product',
        price: 10.0,
      };
      expect(getStoreProductImage(emptyProduct)).toBe('/placeholder.svg');
    });

    // Verify all 20 theme components render product images with _small.webp in the DOM
    allThemeIds.forEach((themeId) => {
      it(`renders valid 300x300 _small.webp product image in theme: ${themeId}`, () => {
        const themeConfig = themes[themeId];
        expect(themeConfig).toBeDefined();

        const ThemeComponent = themeComponents[themeId];
        expect(ThemeComponent).toBeDefined();

        const themeProps: ThemeProps = {
          theme: themeConfig,
          storeName: `Test Store ${themeConfig.name}`,
          products: [
            {
              id: `prod_${themeId}`,
              title: `${themeConfig.name} Featured Item`,
              price: 99.5,
              thumbnail: `https://cdn.garbage.team/products/${themeId}/featured_item.jpg`,
            },
          ],
        };

        const { container } = render(
          <CartProvider>
            <ThemeComponent {...themeProps} />
          </CartProvider>,
        );

        // Check that either an <img> tag or element with style containing the _small.webp URL is rendered
        const expectedSmallWebp = `https://cdn.garbage.team/products/${themeId}/featured_item_small.webp`;
        const renderedHtml = container.innerHTML;

        expect(renderedHtml).toContain(expectedSmallWebp);
      });
    });
  });
});
