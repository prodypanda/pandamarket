# Engineering Specification: PLAN-B-23
## Repair Ads Click-Fraud IP Detection Behind Render Proxy

- **Target Bug:** [B-23](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-22-TO-B-26-WORKERS-AND-ADS.md#b-23)
- **Severity:** 🟠 P1 (Entire Platform Ad Delivery Blocked by False Positive)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Ads Tracking Service, Fraud Detection Middleware.

---

### 1. Summary & Business Impact
In `ads.service.ts:651`, `ipHash` uses `req.ip`. Behind Render's reverse proxy, `req.ip` resolves to the internal private router IP (e.g. `10.x.x.x`). The click rate limiter measures total platform clicks against that single internal IP, trips within minutes, and inserts it into `pd_ads_blocked_ip`. Once inserted, **all ad impressions and clicks across the entire marketplace are blocked permanently**.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/services/ads.service.ts`
Use validated client IP resolution from `clientBucketKey` and add 24-hour expiration to blocked IP entries:
```ts
const clientIp = getValidatedClientIp(req);
const ipHash = hashToken(clientIp);
// Time-bounded block instead of permanent lockout:
await query(
  `INSERT INTO pd_ads_blocked_ip (ip_hash, reason, expires_at)
   VALUES ($1, $2, NOW() + INTERVAL '24 hours')
   ON CONFLICT (ip_hash) DO UPDATE SET expires_at = NOW() + INTERVAL '24 hours'`,
  [ipHash, 'high_click_frequency']
);
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/ads-fraud.test.ts
```
