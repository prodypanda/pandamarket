import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WatermarkOverlay,
  isWatermarkVisible,
  resolveWatermarkText,
  type WatermarkConfig,
} from '../components/watermark/MarketplaceWatermark';
import { ProductGallery } from '../components/product/ProductGallery';

describe('Marketplace Watermark Suite', () => {
  describe('Helper functions', () => {
    it('isWatermarkVisible returns true only when enabled and matching view type', () => {
      expect(isWatermarkVisible(null, 'card')).toBe(false);
      expect(isWatermarkVisible({ watermark_enabled: false }, 'card')).toBe(false);
      expect(isWatermarkVisible({ watermark_enabled: 'false' }, 'card')).toBe(false);

      const enabledConfig: WatermarkConfig = {
        watermark_enabled: true,
        watermark_show_on_cards: true,
        watermark_show_on_gallery: true,
        watermark_show_on_lightbox: false,
      };

      expect(isWatermarkVisible(enabledConfig, 'card')).toBe(true);
      expect(isWatermarkVisible(enabledConfig, 'gallery')).toBe(true);
      expect(isWatermarkVisible(enabledConfig, 'lightbox')).toBe(false);
      expect(isWatermarkVisible(enabledConfig, 'preview')).toBe(true);
    });

    it('resolveWatermarkText interpolates {marketplace_name} and {store_name} tokens', () => {
      expect(resolveWatermarkText('', 'PandaMarket', 'TechStore')).toBe('PandaMarket');
      expect(
        resolveWatermarkText('{marketplace_name} • {store_name}', 'PandaMarket', 'TechStore'),
      ).toBe('PandaMarket • TechStore');
      expect(
        resolveWatermarkText('Propriété de {store_name}', 'PandaMarket', 'Boutique Alpha'),
      ).toBe('Propriété de Boutique Alpha');
    });
  });

  describe('WatermarkOverlay rendering', () => {
    it('renders text watermark when enabled', () => {
      const config: WatermarkConfig = {
        watermark_enabled: true,
        watermark_type: 'text',
        watermark_text: 'PandaOfficial',
        watermark_position: 'bottom-right',
        watermark_opacity: 50,
        watermark_scale: 'medium',
        watermark_style: 'subtle',
      };

      render(<WatermarkOverlay settings={config} viewType="card" />);
      expect(screen.getByText('PandaOfficial')).toBeInTheDocument();
    });

    it('renders image watermark when configured', () => {
      const config: WatermarkConfig = {
        watermark_enabled: true,
        watermark_type: 'image',
        watermark_image_url: 'https://garbage.team/watermark.png',
        watermark_position: 'top-left',
        watermark_opacity: 60,
      };

      const { container } = render(<WatermarkOverlay settings={config} viewType="card" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://garbage.team/watermark.png');
    });

    it('renders diagonal repeated pattern when position is diagonal_repeat', () => {
      const config: WatermarkConfig = {
        watermark_enabled: true,
        watermark_type: 'text',
        watermark_text: 'PandaRepeat',
        watermark_position: 'diagonal_repeat',
      };

      render(<WatermarkOverlay settings={config} viewType="card" />);
      const elements = screen.getAllByText('PandaRepeat');
      expect(elements.length).toBeGreaterThan(1);
    });

    it('does not render when disabled', () => {
      const config: WatermarkConfig = {
        watermark_enabled: false,
        watermark_text: 'HiddenWatermark',
      };

      const { container } = render(<WatermarkOverlay settings={config} viewType="card" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ProductGallery Storefront Isolation & Watermark Behavior', () => {
    it('does NOT render any watermark when watermarkSettings is omitted (Storefront invariant)', () => {
      const { container } = render(
        <ProductGallery
          title="Storefront Sneaker"
          thumbnail="https://images.unsplash.com/photo-1542291026-7eec264c27ff"
        />,
      );

      // Watermark text or elements should not exist
      expect(screen.queryByText('PandaMarket')).not.toBeInTheDocument();
      const watermarkPill = container.querySelector('[data-watermark="true"]');
      expect(watermarkPill).toBeNull();
    });

    it('renders watermark in ProductGallery when watermarkSettings is passed (Marketplace view)', () => {
      const marketplaceConfig: WatermarkConfig = {
        watermark_enabled: true,
        watermark_type: 'text',
        watermark_text: 'MarketplaceProtected',
        watermark_show_on_gallery: true,
      };

      const { container } = render(
        <ProductGallery
          title="Marketplace Smartwatch"
          thumbnail="https://images.unsplash.com/photo-1523275335684-37898b6baf30"
          watermarkSettings={marketplaceConfig}
          storeName="AlphaSeller"
        />,
      );

      expect(screen.getByText('MarketplaceProtected')).toBeInTheDocument();
      const watermarkPill = container.querySelector('[data-watermark="true"]');
      expect(watermarkPill).not.toBeNull();
    });

    it('enforces copy protection handlers when watermark_copy_protection is enabled', () => {
      const marketplaceConfig: WatermarkConfig = {
        watermark_enabled: true,
        watermark_copy_protection: true,
        watermark_text: 'CopyProtected',
      };

      render(
        <ProductGallery
          title="Protected Watch"
          thumbnail="https://images.unsplash.com/photo-1523275335684-37898b6baf30"
          watermarkSettings={marketplaceConfig}
        />,
      );

      const mainBtn = screen.getByRole('button', { name: /Open Protected Watch/i });
      const eventNotPrevented = fireEvent.contextMenu(mainBtn);
      // fireEvent returns false when e.preventDefault() was called by the handler
      expect(eventNotPrevented).toBe(false);
    });
  });
});
