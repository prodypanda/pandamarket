import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(element: any, options: any) {
      super('fake-image-bytes', {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'x-image-width': String(options?.width || 1200),
          'x-image-height': String(options?.height || 630),
        },
      });
    }
  },
}));

import { GET } from '../app/api/og/product/route';

describe('PLAN-T4-05: Dynamic Edge OpenGraph Social Cards & Automated Sitemaps', () => {
  it('generates a 1200x630 OpenGraph card response for product sharing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/og/product?title=Fouta%20Artisanale&price=35.000%20DT&store=Atelier%20Medina',
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
    expect(res.headers.get('x-image-width')).toBe('1200');
    expect(res.headers.get('x-image-height')).toBe('630');
  });

  it('uses default fallback parameters when none are supplied', async () => {
    const req = new NextRequest('http://localhost:3000/api/og/product');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });
});
