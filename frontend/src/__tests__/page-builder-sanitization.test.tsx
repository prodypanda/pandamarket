import { describe, it, expect } from 'vitest';
import { isUnsafeUrl, sanitizeHtmlInitial } from '../components/page-builder/SafePageRenderer';

describe('PLAN-B-27: Page Builder SSR HTML Sanitization', () => {
  it('detects and strips standard and HTML entity-encoded javascript URLs', () => {
    // Standard javascript
    expect(isUnsafeUrl('javascript:alert(1)')).toBe(true);
    // Entity encoded j
    expect(isUnsafeUrl('&#106;avascript:alert(1)')).toBe(true);
    // Hex encoded j
    expect(isUnsafeUrl('&#x6a;avascript:alert(1)')).toBe(true);
    // Safe URLs
    expect(isUnsafeUrl('https://pandamarket.tn/products')).toBe(false);
    expect(isUnsafeUrl('/cart')).toBe(false);
  });

  it('strips unsafe entity-encoded href from SSR HTML output', () => {
    const maliciousHtml = '<a href="&#106;avascript:alert(document.cookie)">Click here</a>';
    const sanitized = sanitizeHtmlInitial(maliciousHtml);

    expect(sanitized).not.toContain('javascript');
    expect(sanitized).not.toContain('&#106;');
    expect(sanitized).toContain('href=""');
  });
});
