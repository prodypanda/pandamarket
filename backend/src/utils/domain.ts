import { PlatformSettings } from '../services/platform-config.service';
import { PdValidationError } from '../errors';

export function normalizeCustomDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

function suffixList(value: PlatformSettings[keyof PlatformSettings]) {
  return String(value || '')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);
}

function matchesSuffix(domain: string, suffix: string) {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

export function assertCustomDomainPolicy(domain: string, settings: PlatformSettings) {
  if (settings.security_custom_domains_enabled === false) {
    throw new PdValidationError('Custom domains are disabled by platform settings');
  }

  const allowedSuffixes = suffixList(settings.security_custom_domain_allowed_suffixes);
  if (allowedSuffixes.length > 0 && !allowedSuffixes.some((suffix) => matchesSuffix(domain, suffix))) {
    throw new PdValidationError('Custom domain is not allowed by platform settings', { domain });
  }

  const blockedSuffixes = suffixList(settings.security_custom_domain_blocked_suffixes);
  if (blockedSuffixes.some((suffix) => matchesSuffix(domain, suffix))) {
    throw new PdValidationError('Custom domain is blocked by platform settings', { domain });
  }

  // Also block system hub domain itself e.g. pandamarket.tn
  if (domain === 'pandamarket.tn' || domain === 'www.pandamarket.tn') {
    throw new PdValidationError('Cannot register the main marketplace domain as a custom domain', { domain });
  }
}
