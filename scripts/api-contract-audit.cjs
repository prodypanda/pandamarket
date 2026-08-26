/**
 * API contract reconciliation v3.
 * Method detection now limited to the actual fetch statement via
 * paren-depth scanning — no more lookahead bleed from the next call.
 */
const fs = require('fs');
const path = require('path');

function matches(pattern, method, url) {
  if (pattern.method !== method) return false;
  const pp = pattern.pattern.split('?')[0].split('/').filter(Boolean);
  const uu = url.split('?')[0].split('/').filter(Boolean);
  if (pp.length !== uu.length) return false;
  return pp.every((seg, i) => seg.startsWith(':') || seg === uu[i]);
}

// ---- backend table ----
const MOUNTS = {
  '/auth': 'auth.route.ts',
  '/storefront/auth': 'storefront-auth.route.ts',
  '/storefront/account': 'storefront-account.route.ts',
  '/stores': 'store.route.ts',
  '/products': 'product.route.ts',
  '/orders': 'order.route.ts',
  '/payments': 'payment.route.ts',
  '/wallet': 'wallet.route.ts',
  '/subscriptions': 'subscription.route.ts',
  '/verification': 'verification.route.ts',
  '/ai': 'ai.route.ts',
  '/reports': 'report.route.ts',
  '/search': 'search.route.ts',
  '/internal': 'internal.route.ts',
  '/files': 'files.route.ts',
  '/notifications': 'notification.route.ts',
  '/credits': 'credits.route.ts',
  '/categories': 'categories.route.ts',
  '/marketplace': 'marketplace.route.ts',
  '/marketplace/cms': 'platform-cms.route.ts',
  '/vendor': 'vendor.route.ts',
  '/shipping': 'shipping.route.ts',
  '/themes': 'theme.route.ts',
  '/page-builder': 'page-builder.route.ts',
  '/reviews': 'review.route.ts',
  '/wishlist': 'wishlist.route.ts',
  '/addresses': 'address.route.ts',
  '/chats': 'chat.route.ts',
  '/analytics': 'analytics.route.ts',
  '/email-templates': 'email-template.route.ts',
  '/support': 'support.route.ts',
  '/ads': 'ads.route.ts',
  '/cart': 'cart.route.ts',
  '/buyer': 'buyer.route.ts',
  '/seller': 'seller.route.ts',
};
const absRoutes = [];
for (const [mp, file] of Object.entries(MOUNTS)) {
  const fp = path.join('backend/src/api', file);
  const src = fs.readFileSync(fp, 'utf8');
  const re = /\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) {
    let p = m[2];
    if (p === '/') p = '';
    absRoutes.push({ method: m[1].toUpperCase(), pattern: '/api/pd' + mp + p });
  }
}
{
  const adminDir = 'backend/src/api/admin';
  for (const f of fs.readdirSync(adminDir)) {
    if (!f.endsWith('.routes.ts')) continue;
    const src = fs.readFileSync(path.join(adminDir, f), 'utf8');
    const re = /\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(src))) {
      let p = m[2];
      if (p === '/') p = '';
      absRoutes.push({ method: m[1].toUpperCase(), pattern: '/api/pd/admin' + p });
    }
  }
}

// ---- known-open endpoints (tracked in docs/STATUS.md & audit checklist) -----
// Each entry below is a frontend call whose backend route is not yet built.
// REMOVE an entry here in the same commit that implements its backend route.
const IGNORE = [
  // A4 — Platform Analytics intelligence endpoints
  'GET /api/pd/admin/analytics/anomalies',
  'GET /api/pd/admin/analytics/cohorts',
  'GET /api/pd/admin/analytics/risk/churn',
  'GET /api/pd/admin/analytics/risk/vendors',
  // A5 — Audit log extras
  'GET /api/pd/admin/audit-log/export',
  'GET /api/pd/admin/audit-log/summary',
  // Fallback chain: admin products page tries this first, then
  // /admin/marketplace-categories (both intentional).
  'GET /api/pd/admin/categories',
  // A6 — dynamic action segment resolved client-side to explicit routes
  'PATCH /api/pd/admin/notes/:id/:actionPath',
  // A7 — manual cron trigger (endpoint or button removal TBD)
  'POST /api/pd/admin/subscription-orders/cron-job',
  // A10 — back-in-stock status getter
  'GET /api/pd/products/:productId/back-in-stock/status',
  // A11 — storefront customer session probe
  'GET /api/pd/storefront/account/me',
  // A12 / M4 — gamified rewards lead capture endpoint
  'POST /api/pd/retention/rewards-lead',
];
console.log('backend absolute routes:', absRoutes.length);

// ---- frontend walk with paren-depth statement extraction ----
const feCalls = new Map();
function extractStatement(lines, startLine, callCol) {
  // returns text of the whole call statement (balanced parens)
  let depth = 0;
  let started = false;
  const buf = [];
  for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
    const line = lines[i];
    const from = i === startLine ? callCol : 0;
    for (let j = from; j < line.length; j++) {
      const ch = line[j];
      if (ch === '(') { depth++; started = true; }
      else if (ch === ')') depth--;
      buf.push(ch);
      if (started && depth === 0) return buf.join('');
      // string literals can contain parens; naive scan acceptable for our codebase style
    }
    buf.push('\n');
  }
  return buf.join('');
}

function walk(dir, cb) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, cb);
    else cb(fp);
  }
}
walk('frontend/src', (fp) => {
  if (!/\.(ts|tsx)$/.test(fp)) return;
  const rel = fp.replace(/\\/g, '/');
  const isTest = rel.includes('__tests__');
  const src = fs.readFileSync(fp, 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].search(/(?:fetchWithCsrf|fetch)\(\s*[`'"]\/api\/pd/);
    if (idx < 0) continue;
    const stmt = extractStatement(lines, i, idx);
    const urlM = stmt.match(/[`'"](\/api\/pd[^`'"?]*)/);
    if (!urlM) continue;
    const methodM = stmt.match(/method:\s*['"`](\w+)['"`]/); // within THIS statement only
    const method = (methodM ? methodM[1] : 'GET').toUpperCase();
    const key = method + ' ' + urlM[1];
    if (!feCalls.has(key)) feCalls.set(key, { method, url: urlM[1], sample: rel + ':' + (i + 1), test: isTest });
  }
});
console.log('frontend call templates:', feCalls.size);

const prodMissing = [];
const testMissing = [];
console.log('IGNORE LEN', IGNORE.length, JSON.stringify(IGNORE).slice(0,120));
for (const [key, info] of feCalls) {
  const concrete = info.url.replace(/\$\{[^}]+\}/g, ':x');
  const ok = absRoutes.some((r) => matches(r, info.method, concrete));
  const norm = (u) => u.replace(/\$\{[^}]+\}/g, ':x');
    const ignored = IGNORE.some((entry) => {
      const [em, rawEp] = entry.split(' ');
      const ep = norm(rawEp).replace(/:[A-Za-z][A-Za-z0-9_]*/g, ':x');
      if (em !== info.method) return false;
      const nu = norm(info.url);
      const nuC = nu.replace(/:[A-Za-z][A-Za-z0-9_]*/g, ':x');
      return nuC === ep || nuC.startsWith(ep);
    });
    if (!ok && !ignored) (info.test ? testMissing : prodMissing).push(info);
}
console.log('\n=== PRODUCTION CALLS WITH NO BACKEND MATCH (' + prodMissing.length + ') ===');
for (const x of prodMissing.sort((a, b) => a.url.localeCompare(b.url))) {
  console.log(`${x.method.padEnd(6)} ${x.url}\n       ↳ ${x.sample}`);
}
fs.writeFileSync('C:/Users/PC/AppData/Local/Temp/opencode/prod-missing.json', JSON.stringify(prodMissing, null, 1));


if (prodMissing.length > 0) {
  console.error('\n✗ Contract audit failed: ' + prodMissing.length + ' production API call(s) have no matching backend route.');
  process.exit(1);
}
console.log('\n✓ Contract audit passed.');
