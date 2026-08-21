import { describe, expect, it } from 'vitest';
import { safeGoogleMapEmbedUrl } from './MarketplaceStorefront';

describe('safeGoogleMapEmbedUrl', () => {
  it('accepts only HTTPS map embeds from CSP-approved Google hosts', () => {
    expect(safeGoogleMapEmbedUrl('https://www.google.com/maps/embed?pb=abc'))
      .toBe('https://www.google.com/maps/embed?pb=abc');
    expect(safeGoogleMapEmbedUrl('https://maps.google.com/maps/embed?pb=abc'))
      .toBe('https://maps.google.com/maps/embed?pb=abc');
    expect(safeGoogleMapEmbedUrl('https://maps.googleapis.com/maps/embed?pb=abc'))
      .toBe('https://maps.googleapis.com/maps/embed?pb=abc');
  });

  it('rejects regional, non-HTTPS, and non-embed URLs', () => {
    expect(safeGoogleMapEmbedUrl('https://www.google.tn/maps/embed?pb=abc')).toBe('');
    expect(safeGoogleMapEmbedUrl('http://www.google.com/maps/embed?pb=abc')).toBe('');
    expect(safeGoogleMapEmbedUrl('https://www.google.com/maps/place/Tunis')).toBe('');
    expect(safeGoogleMapEmbedUrl('https://evil.example.test/maps/embed?pb=abc')).toBe('');
  });
});
