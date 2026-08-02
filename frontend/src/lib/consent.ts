/**
 * Cookie Consent Manager for GA4, GTM, and Meta Pixel scripts.
 */

export type ConsentStatus = 'accepted' | 'rejected' | 'pending';

const CONSENT_COOKIE_NAME = 'pd_cookie_consent';

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';

  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
    if (match) {
      const val = decodeURIComponent(match[1]);
      if (val === 'accepted' || val === 'rejected') return val;
    }
    const local = localStorage.getItem(CONSENT_COOKIE_NAME);
    if (local === 'accepted' || local === 'rejected') return local;
  } catch {
    // Ignore storage errors
  }

  return 'pending';
}

export function setConsentStatus(status: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;

  try {
    // Set 1-year cookie
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(status)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    localStorage.setItem(CONSENT_COOKIE_NAME, status);

    // Notify listeners
    window.dispatchEvent(new CustomEvent('pd_consent_updated', { detail: { status } }));
  } catch {
    // Ignore storage errors
  }
}
