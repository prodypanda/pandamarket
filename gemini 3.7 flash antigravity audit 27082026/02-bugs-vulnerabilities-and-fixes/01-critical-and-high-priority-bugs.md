# 01 — Critical & High Priority Bugs & Fix Blueprints

This document catalogs every critical and high-priority code bug, architectural vulnerability, and potential financial risk detected during the code audit, along with exact code diffs and step-by-step resolution blueprints.

---

## 🔴 Bug 1: Environment Variable Check Inconsistency (`PD_NODE_ENV` vs `NODE_ENV`)

### Vulnerability Analysis
- **Location:** [`backend/src/api/auth.route.ts`](file:///c:/tek/pandamarket/backend/src/api/auth.route.ts#L121), [`backend/src/api/storefront-auth.route.ts`](file:///c:/tek/pandamarket/backend/src/api/storefront-auth.route.ts#L88), [`backend/src/middlewares/auth.middleware.ts`](file:///c:/tek/pandamarket/backend/src/middlewares/auth.middleware.ts)
- **Code Inspection:**
  ```typescript
  // backend/src/api/auth.route.ts:121
  function setAccessCookie(res: Response, accessToken: string) {
    res.cookie('pd_at', accessToken, {
      httpOnly: true,
      secure: process.env.PD_NODE_ENV === 'production', // ⚠️ BUG!
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
  }
  ```
- **Risk:** Standard deployment platforms (Render, Vercel, Docker, Fly.io) set `NODE_ENV=production`. If `PD_NODE_ENV` is omitted, `process.env.PD_NODE_ENV === 'production'` evaluates to `false`. Authentication cookies are transmitted over plaintext HTTP without the `Secure` flag, enabling man-in-the-middle session token theft.
- **How-To Fix:**
  Replace direct `process.env.PD_NODE_ENV` checks with centralized `config.env === 'production'`:
  ```typescript
  // Fix Blueprint:
  import { config } from '../config';

  function setAccessCookie(res: Response, accessToken: string) {
    res.cookie('pd_at', accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
  }
  ```

---

## 🔴 Bug 2: Experimental Payment Gateway Auto-Capture Stubs (D17 & Sobflous)

### Vulnerability Analysis
- **Location:** [`backend/src/plugins/payment/d17.provider.ts`](file:///c:/tek/pandamarket/backend/src/plugins/payment/d17.provider.ts#L41-L52), [`backend/src/plugins/payment/sobflous.provider.ts`](file:///c:/tek/pandamarket/backend/src/plugins/payment/sobflous.provider.ts#L42-L53)
- **Code Inspection:**
  ```typescript
  // backend/src/plugins/payment/d17.provider.ts:41
  async verify(reference: string): Promise<PaymentVerifyResult> {
    logger.info({ reference }, 'Verifying D17 payment reference');
    // In production, queries Poste Tunisienne SOAP/REST verification API
    return {
      status: 'captured', // ⚠️ CRITICAL RISK: Unconditional capture!
      metadata: { reference, verified_at: new Date().toISOString() },
    };
  }
  ```
- **Risk:** If a seller or customer triggers checkout with `d17` or `sobflous` (or if capability flags are misconfigured), orders will immediately transition to `status: 'processing'` and `payment_status: 'captured'`, crediting the seller's escrow wallet without any real financial transaction.
- **How-To Fix:**
  Add a strict environment guard that throws `PdValidationError` if live API credentials are missing:
  ```typescript
  // Fix Blueprint:
  export class D17PaymentProvider implements PaymentProvider {
    async verify(reference: string): Promise<PaymentVerifyResult> {
      const isLive = Boolean(process.env.PD_D17_MERCHANT_KEY);
      if (!isLive) {
        throw new PdError(
          PdErrorCode.PAY_GATEWAY_UNAVAILABLE,
          'D17 Poste Tunisienne integration is pending live banking credentials.',
          503,
        );
      }
      // Real SOAP/REST call implementation here
      return { status: 'failed', metadata: { reason: 'not_configured' } };
    }
  }
  ```

---

## 🔴 Bug 3: Ads Auto-Refill Card Tokenization Safety Guard

### Vulnerability Analysis
- **Location:** [`backend/src/services/ads.service.ts`](file:///c:/tek/pandamarket/backend/src/services/ads.service.ts#L176-L190)
- **Code Inspection:**
  ```typescript
  // backend/src/services/ads.service.ts:184
  if (account && account.auto_refill_enabled && Number(account.balance) < Number(account.auto_refill_threshold)) {
    logger.warn(
      { accountId, storeId, balance: account.balance, threshold: account.auto_refill_threshold },
      '[AdsService] Auto-refill requested but automated payment card charging is not configured. Balance update skipped to prevent unauthorized minting.',
    );
  }
  ```
- **Analysis:** While the safety guard prevents balance minting, sellers who toggle "Enable Auto-Refill" in their dashboard receive no feedback that recurring card tokenization requires Konnect Recurring Token integration.
- **How-To Fix:**
  In `frontend/src/app/hub/dashboard/ads/page.tsx`, add a disabled badge or helper tooltip explaining: *"Auto-refill via saved bank card is currently in pre-production testing. Manual refill via Flouci/Konnect is available."*

---

## 🔴 Checklist: Critical Bugs Remediation

- [ ] Refactor cookie setting functions across all auth routes to use `config.env === 'production'`.
- [ ] Add strict credentials check to D17 & Sobflous providers to prevent fake captured transactions.
- [ ] Add explicit UI warning for Auto-Refill in the seller Ads dashboard.
- [ ] Run full security regression test suite.
