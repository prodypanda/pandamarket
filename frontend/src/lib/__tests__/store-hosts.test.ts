import { describe, it, expect } from 'vitest';
import { classifyHost, isMarketplaceHost, isAdminHost, extractStoreSubdomain } from '../store-hosts';

describe('Host Classification & Routing Helpers (GAP-P1-011)', () => {
  const cases: Array<{
    host: string;
    expectedType: 'hub' | 'admin' | 'storefront';
    expectedIsMarketplace: boolean;
    expectedIsAdmin: boolean;
    expectedSubdomain: string | null;
  }> = [
    // Local / Dev hosts
    { host: 'localhost:3000', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },
    { host: '127.0.0.1:3000', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },
    { host: 'pandamarket.local:3000', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },
    { host: 'admin.localhost:3000', expectedType: 'admin', expectedIsMarketplace: false, expectedIsAdmin: true, expectedSubdomain: null },
    { host: 'boutique1.pandamarket.local:3000', expectedType: 'storefront', expectedIsMarketplace: false, expectedIsAdmin: false, expectedSubdomain: 'boutique1' },

    // Central Production Hub
    { host: 'pandamarket.tn', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },
    { host: 'www.pandamarket.tn', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },
    { host: 'garbage.team', expectedType: 'hub', expectedIsMarketplace: true, expectedIsAdmin: false, expectedSubdomain: null },

    // Platform Admin Subdomains
    { host: 'admin.pandamarket.tn', expectedType: 'admin', expectedIsMarketplace: false, expectedIsAdmin: true, expectedSubdomain: null },
    { host: 'admin.garbage.team', expectedType: 'admin', expectedIsMarketplace: false, expectedIsAdmin: true, expectedSubdomain: null },

    // Storefront Subdomains
    { host: 'my-store.pandamarket.tn', expectedType: 'storefront', expectedIsMarketplace: false, expectedIsAdmin: false, expectedSubdomain: 'my-store' },
    { host: 'artisans.garbage.team', expectedType: 'storefront', expectedIsMarketplace: false, expectedIsAdmin: false, expectedSubdomain: 'artisans' },

    // Custom Domains
    { host: 'ma-boutique.com', expectedType: 'storefront', expectedIsMarketplace: false, expectedIsAdmin: false, expectedSubdomain: null },
    { host: 'boutique-top.fr', expectedType: 'storefront', expectedIsMarketplace: false, expectedIsAdmin: false, expectedSubdomain: null },
  ];

  for (const c of cases) {
    it(`classifies ${c.host} correctly`, () => {
      expect(classifyHost(c.host)).toBe(c.expectedType);
      expect(isMarketplaceHost(c.host)).toBe(c.expectedIsMarketplace);
      expect(isAdminHost(c.host)).toBe(c.expectedIsAdmin);
      expect(extractStoreSubdomain(c.host)).toBe(c.expectedSubdomain);
    });
  }
});
