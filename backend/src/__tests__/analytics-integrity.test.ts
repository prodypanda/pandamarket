import { describe, it, expect, vi } from 'vitest';
import { isBotUserAgent, MarketplaceAnalyticsEventService } from '../services/marketplace-analytics-event.service';

describe('Analytics Integrity & Bot Filtering', () => {
  it('identifies bot and crawler User-Agents', () => {
    expect(isBotUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('axios/1.6.0')).toBe(true);
    expect(isBotUserAgent('python-requests/2.28.1')).toBe(true);
    expect(isBotUserAgent('curl/7.68.0')).toBe(true);
  });

  it('allows genuine human browser User-Agents', () => {
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1')).toBe(false);
  });

  it('validates supported marketplace event taxonomy types', () => {
    expect(MarketplaceAnalyticsEventService.isValidEventType('product_view')).toBe(true);
    expect(MarketplaceAnalyticsEventService.isValidEventType('add_to_cart')).toBe(true);
    expect(MarketplaceAnalyticsEventService.isValidEventType('checkout_payment_completed')).toBe(true);
    expect(MarketplaceAnalyticsEventService.isValidEventType('invalid_spoofed_event')).toBe(false);
  });
});
