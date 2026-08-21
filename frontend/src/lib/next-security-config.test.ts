import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('Next frontend security boundary', () => {
  it('registers the policy for every route instead of relying only on page middleware', async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.source).toBe('/(.*)');
    const headers = new Map(rules?.[0]?.headers.map((header) => [header.key, header.value]));
    expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });
});
