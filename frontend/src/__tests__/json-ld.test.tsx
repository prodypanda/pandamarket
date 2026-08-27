import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { JsonLd } from '../components/seo/JsonLd';
import { serializeJsonLd } from '../lib/storefront-seo';

describe('PLAN-B-08: JSON-LD Structured Data Safe Escaping', () => {
  it('escapes closing script tags and HTML injection payload via serializeJsonLd', () => {
    const malicious = {
      name: '</script><script>alert("xss")</script>',
      bio: '<b>bold</b> & "quotes"',
    };

    const serialized = serializeJsonLd(malicious);

    // Verify < and > are converted to unicode escape sequences
    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u003cscript\\u003e');
    expect(serialized).toContain('\\u0026');
  });

  it('renders script tag of type application/ld+json with escaped content', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PandaMarket</script><script>window.__xss=1</script>',
    };

    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    expect(script?.innerHTML).not.toContain('</script><script>');
    expect(script?.innerHTML).toContain('\\u003c/script\\u003e');
  });
});
