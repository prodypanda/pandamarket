import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, getFrontendSecurityHeaders } from './security-headers';

describe('frontend security headers', () => {
  it('builds an enforced production policy with the known runtime sources', () => {
    const environment = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_BACKEND_URL: 'https://api.example.test/',
      PD_S3_PUBLIC_PROXY_URL: 'https://cdn.example.test/assets',
    };
    const policy = buildContentSecurityPolicy(environment);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain('https://api.example.test');
    expect(policy).toContain('wss://api.example.test');
    expect(policy).toContain('https://cdn.example.test');
    expect(policy).toContain('https://www.google.com');
    expect(policy).toContain('report-uri /api/csp-report');
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain("'unsafe-eval'");
    const imageDirective = policy.split('; ').find((directive) => directive.startsWith('img-src '));
    expect(imageDirective?.split(' ')).not.toContain('https:');
  });

  it('keeps local development usable and does not emit HSTS on localhost', () => {
    const headers = getFrontendSecurityHeaders({ NODE_ENV: 'development', VERCEL_ENV: 'development' });
    const byName = new Map(headers.map((header) => [header.key, header.value]));

    expect(byName.get('Content-Security-Policy')).toContain("'unsafe-eval'");
    expect(byName.get('Content-Security-Policy')).toContain('http://localhost:*');
    expect(byName.get('Content-Security-Policy')).toContain('http://127.0.0.1:*');
    expect(byName.has('Strict-Transport-Security')).toBe(false);
  });

  it('emits HSTS for non-Vercel production deployments while excluding previews', () => {
    expect(getFrontendSecurityHeaders({ NODE_ENV: 'production' })
      .some((header) => header.key === 'Strict-Transport-Security')).toBe(true);
    expect(getFrontendSecurityHeaders({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })
      .some((header) => header.key === 'Strict-Transport-Security')).toBe(false);
  });

  it('supports report-only rollout without changing the policy contents', () => {
    const headers = getFrontendSecurityHeaders({ NODE_ENV: 'production', PD_CSP_REPORT_ONLY: 'true' });
    expect(headers.some((header) => header.key === 'Content-Security-Policy-Report-Only')).toBe(true);
    expect(headers.some((header) => header.key === 'Content-Security-Policy')).toBe(false);
  });

  it('accepts explicitly configured image and media origins without opening all HTTPS', () => {
    const policy = buildContentSecurityPolicy({
      NODE_ENV: 'production',
      PD_CSP_IMAGE_SOURCES: 'https://images.example.test/catalog,https://images.example.test/catalog',
      PD_CSP_MEDIA_SOURCES: 'https://video.example.test',
    });
    expect(policy).toContain('https://images.example.test');
    expect(policy).toContain('https://video.example.test');
    const imageDirective = policy.split('; ').find((directive) => directive.startsWith('img-src '));
    expect(imageDirective?.split(' ')).not.toContain('https:');
  });

  it('includes the baseline browser hardening headers', () => {
    const names = getFrontendSecurityHeaders({ NODE_ENV: 'production', PD_ENABLE_HSTS: 'true' })
      .map((header) => header.key);
    expect(names).toEqual(expect.arrayContaining([
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ]));
  });
});
