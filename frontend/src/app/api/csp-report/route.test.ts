import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

describe('CSP report endpoint', () => {
  it('accepts browser reports without exposing query strings in the log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const request = new Request('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: JSON.stringify({
        'csp-report': {
          'document-uri': 'https://shop.example.test/checkout?token=secret',
          'blocked-uri': 'https://evil.example.test/path?secret=hidden',
          'violated-directive': 'script-src-elem',
        },
      }),
      headers: { 'content-type': 'application/csp-report' },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledWith('[csp-report]', expect.objectContaining({
      document_uri: 'https://shop.example.test/checkout',
      blocked_uri: 'https://evil.example.test/path',
    }));
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret');
    warn.mockRestore();
  });

  it('rejects oversized reports before parsing them', async () => {
    const response = await POST(new Request('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: { 'content-length': '65537' },
    }));
    expect(response.status).toBe(413);
  });

  it('acknowledges malformed reports without throwing', async () => {
    const response = await POST(new Request('http://localhost:3000/api/csp-report', {
      method: 'POST',
      body: '{not-json',
      headers: { 'content-type': 'application/csp-report' },
    }));
    expect(response.status).toBe(204);
  });
});
