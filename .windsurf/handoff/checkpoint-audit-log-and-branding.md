# Handoff Checkpoint — Superadmin Audit Log & Dynamic Branding

**Date:** 2026-05-12 | **Project:** PandaMarket (`prodypanda1/pandamarket`) | **Repo:** `c:\tek\pandamarket`
**Completed by:** Previous AI agent (Cascade)
**Purpose:** Full knowledge transfer for a new AI agent to resume work seamlessly.

---

## 1. Project Overview

PandaMarket is a multi-vendor marketplace platform (Tunisian Dinar — TND).

| Layer | Technology | Directory |
|-------|-----------|-----------|
| Backend | Express.js + TypeScript + PostgreSQL (raw SQL, no ORM) | `c:\tek\pandamarket\backend` |
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 | `c:\tek\pandamarket\frontend` |
| Database | PostgreSQL, migrations in `backend/src/migrations/sql/` | — |
| Auth | JWT, `req.user` from `requireAuth` middleware | `backend/src/middlewares/` |
| Admin UI | Route group `frontend/src/app/(admin)/` with shared sidebar | `frontend/src/app/(admin)/layout.tsx` |

**Key facts:**
- Backend uses raw parameterized SQL via `query()` from `backend/src/db/pool.ts` — NOT an ORM
- Frontend uses `fetchWithCsrf` from `@/lib/api` for all authenticated API calls
- Backend validation uses `zod` schemas with a custom `validate()` middleware
- Route handlers wrapped in `asyncHandler` for error propagation
- IDs generated with `pdId(prefix)` → e.g. `pdId('audit')` → `audit_xxxxxxxxxx`
- Admin layout wraps all pages with sidebar, header, marketplace branding

---

## 2. Completed Work Streams

### 2.1 Dynamic Marketplace Branding (Completed)

**Goal:** Replace hardcoded "PandaMarket" branding across all storefront themes with dynamic marketplace settings.

**Created:** `frontend/src/components/themes/PoweredByMarketplace.tsx`
- Uses `next/image` for optimized logo rendering
- Falls back to marketplace name text when no logo URL
- Props: `branding`, `className`, `linkClassName`, `linkStyle`, `imageClassName`
- Default fallback name: `'PandaMarket'`
- French text: "Propulsé par"

**Extended `StoreBranding` interface** in `frontend/src/components/themes/shared.ts`:
```ts
export interface StoreBranding {
  store_id?: string;
  store_host?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
  themeCustomization?: ThemeCustomization;
  store_path_base?: string;
  marketplace_name?: string;       // NEW
  marketplace_logo_url?: string;   // NEW
}
```

**Patched 9 theme footers** to use `PoweredByMarketplace`:
- `FreshTheme.tsx`, `FlavorTheme.tsx`, `EleganceTheme.tsx`, `DigitalTheme.tsx`
- `CraftTheme.tsx`, `CoastalTheme.tsx`, `BoutiqueTheme.tsx`, `ArtisanTheme.tsx`
- `TechHubTheme.tsx`

**Updated store SEO** in `frontend/src/app/store/[storeHost]/page.tsx` — dynamic `marketplaceName` from `getMarketplaceSettings()`.

**Removed hardcoded branding** from `frontend/src/components/page-builder/PageBuilderEditor.tsx` — changed `'🐼 PandaMarket'` to generic `'votre marketplace'`.

---

### 2.2 Superadmin Audit Log Page (Completed)

**Goal:** Repair API data contract mismatch between frontend and backend, then build a full-featured audit log dashboard.

#### Problem Identified

The frontend `AuditEntry` interface expected fields that did NOT match the `pd_audit_log` schema:

| Frontend expected (old, wrong) | Database actual |
|---|---|
| `admin_id` | `actor_id` |
| `admin_email` | joined from `pd_user` via `actor_id` |
| `details` | `metadata` (JSONB) |
| `ip_address` | `ip` |

The middleware logs correctly, but the API endpoint queried with wrong column aliases.

#### Backend Changes — `backend/src/api/admin.route.ts`

**Zod schemas added (lines ~1283-1296):**

```ts
const auditLogListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().max(160).optional(),
  resource_type: z.string().trim().max(80).optional(),
  actor_role: z.string().trim().max(40).optional(),
  method: z.string().trim().max(12).optional(),
  status_code: z.coerce.number().int().min(100).max(599).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
});

const auditLogSummarySchema = auditLogListSchema.omit({ page: true, limit: true });
```

**Shared filter builder `buildAuditLogWhere()` (lines ~1309-1367):**

Builds dynamic WHERE clause with parameterized `$1`, `$2`, etc. Key expressions:
```ts
const statusExpr = "CASE WHEN a.metadata->>'status_code' ~ '^[0-9]+$' THEN (a.metadata->>'status_code')::int ELSE NULL END";
const methodExpr = "UPPER(COALESCE(a.metadata->>'method', split_part(a.action, ' ', 1)))";
```

Search covers 8 columns: `action`, `resource_type`, `resource_id`, `actor_id`, `actor_role`, `email`, `ip::text`, `metadata::text` — all with `ILIKE %term%`.

**`GET /audit-log` endpoint (lines ~1610-1682):**

Full SQL:
```sql
SELECT a.id, a.actor_id, u.email AS actor_email, a.actor_role, a.action,
       a.resource_type, a.resource_id,
       ${methodExpr} AS method,
       ${statusExpr} AS status_code,
       CASE WHEN a.metadata->>'duration_ms' ~ '^\d+$' THEN (a.metadata->>'duration_ms')::int ELSE NULL END AS duration_ms,
       COALESCE(a.metadata->>'path', a.action) AS path,
       a.ip::text AS ip, a.user_agent, a.metadata, a.created_at
FROM pd_audit_log a
LEFT JOIN pd_user u ON u.id = a.actor_id
${whereClause}
ORDER BY a.created_at DESC
LIMIT $N OFFSET $M
```

Response maps `created_at` to ISO string, `metadata` defaults to `{}`, and returns both `total_pages` and `totalPages` in meta for frontend compatibility.

**`GET /audit-log/summary` endpoint (lines ~1555-1608):**

Returns 3 result sets in one response:
1. `summary` — aggregate counts (total, last_24h, failed, actors, writes) using `COUNT(*) FILTER (WHERE ...)`
2. `actions` — top 50 actions by count
3. `resources` — top 50 resource types by count

All three queries share the same `buildAuditLogWhere()` filter.

#### Frontend Changes — `frontend/src/app/(admin)/audit-log/page.tsx`

Complete rewrite: 676 lines, single `'use client'` component.

**TypeScript interfaces:**
```ts
interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditSummary {
  total: number;
  last_24h: number;
  failed: number;
  actors: number;
  writes: number;
}

interface CounterRow {
  action?: string;
  resource_type?: string | null;
  count: string | number;
}
```

**Utility functions:**
- `getErrorMessage(res, fallback)` — extracts error from JSON response
- `toNumber(value)` — safe number coercion, returns 0 for invalid
- `normalizeSummary(raw)` — converts string counts from API to numbers
- `formatDate(value)` — `new Date(value).toLocaleString('fr-TN')`
- `formatMetadata(value)` — `JSON.stringify(value, null, 2)` or `'-'`
- `compactId(value)` — truncates IDs > 18 chars: `first10…last8`
- `actionTone(entry)` — color-codes by action type (approve=green, reject=red, update=amber, create=blue)
- `methodTone(method)` — DELETE=dark red, PATCH/PUT=amber, POST=blue
- `statusTone(status)` — 5xx=dark red, 4xx=red, 3xx=amber, 2xx=green
- `uniqueOptions(values)` — deduplicated sorted array

**State management (15 state variables):**
```ts
const [entries, setEntries] = useState<AuditEntry[]>([]);
const [summary, setSummary] = useState<AuditSummary>(defaultSummary);
const [actions, setActions] = useState<CounterRow[]>([]);
const [resources, setResources] = useState<CounterRow[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [total, setTotal] = useState(0);
const [searchInput, setSearchInput] = useState('');    // input value
const [search, setSearch] = useState('');               // committed value
const [actionFilter, setActionFilter] = useState('all');
const [resourceType, setResourceType] = useState('');
const [actorRole, setActorRole] = useState('all');
const [method, setMethod] = useState('all');
const [statusCode, setStatusCode] = useState('');
const [fromDate, setFromDate] = useState('');
const [toDate, setToDate] = useState('');
const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
```

**Data fetching pattern:**
```ts
const fetchAuditLog = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const listParams = new URLSearchParams({ page: String(page), limit: '25' });
    const summaryParams = new URLSearchParams();
    applyFiltersToParams(listParams);
    applyFiltersToParams(summaryParams);

    const summaryQuery = summaryParams.toString();
    const [summaryRes, listRes] = await Promise.all([
      fetchWithCsrf(`/api/pd/admin/audit-log/summary${summaryQuery ? `?${summaryQuery}` : ''}`, { credentials: 'include' }),
      fetchWithCsrf(`/api/pd/admin/audit-log?${listParams.toString()}`, { credentials: 'include' }),
    ]);

    if (!summaryRes.ok) throw new Error(await getErrorMessage(summaryRes, 'Failed to load audit summary'));
    if (!listRes.ok) throw new Error(await getErrorMessage(listRes, 'Failed to load audit log'));

    const summaryData = await summaryRes.json();
    const listData = await listRes.json();
    setSummary(normalizeSummary(summaryData.summary));
    setActions(summaryData.actions || []);
    setResources(summaryData.resources || []);
    setEntries(listData.data || []);
    setTotalPages(Math.max(1, listData.meta?.total_pages || listData.meta?.totalPages || 1));
    setTotal(toNumber(listData.meta?.total));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load audit log');
    // Reset all data on error
    setEntries([]);
    setSummary(defaultSummary);
    setActions([]);
    setResources([]);
    setTotalPages(1);
    setTotal(0);
  } finally {
    setLoading(false);
  }
}, [applyFiltersToParams, page]);

useEffect(() => { void fetchAuditLog(); }, [fetchAuditLog]);
```

**UI sections (in render order):**

1. **Hero header** — dark gradient (`bg-slate-950`), radial emerald glow, compliance badge, refresh button with spin animation
2. **5 summary cards** — gradient backgrounds, icon + label + formatted count, responsive grid (`sm:grid-cols-2 xl:grid-cols-5`)
3. **Filter panel** — 12-column grid form with:
   - Search input (col-span-4) with search icon
   - Action dropdown (col-span-2) — dynamic options from API + current entries
   - Resource type text input (col-span-2)
   - Method dropdown (col-span-2): all/POST/PUT/PATCH/DELETE
   - Search submit button (col-span-2) — brand green `bg-[#16C784]`
   - Actor role dropdown (col-span-2): all/admin/super_admin
   - HTTP status number input (col-span-2)
   - From datetime-local (col-span-2)
   - To datetime-local (col-span-2)
   - Conditional reset button when filters active
4. **Error banner** — red background with AlertTriangle icon
5. **Main grid** — `xl:grid-cols-[1fr_320px]`:
   - **Table** (left): 7 columns, loading skeletons (6 rows, varied widths), empty state, data rows with badges
   - **Sidebar** (right): Top actions (clickable), Top resources (clickable), Audit coverage info card
6. **Pagination** — Previous/Next buttons, page indicator, disabled states
7. **Details modal** — fixed overlay with backdrop blur, 2-column grid of fields with copy buttons, request path code block, metadata JSON viewer with copy

**Filter interaction pattern:**
- `searchInput` is the live input value; `search` is committed on form submit
- All other filters commit immediately on change (set state + reset page to 1)
- `useEffect` triggers `fetchAuditLog` whenever `fetchAuditLog` reference changes (which depends on `page` and `applyFiltersToParams`)
- `applyFiltersToParams` depends on all filter states

---

## 3. Database Schema: `pd_audit_log`

Defined in `backend/src/migrations/sql/002_payment_idempotency_and_webhooks.sql`:

```sql
CREATE TABLE pd_audit_log (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64),
  actor_role VARCHAR(40),
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80),
  resource_id VARCHAR(64),
  ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:** on `actor_id`, `action`, `resource_type`, `created_at`

**Middleware:** `backend/src/middlewares/audit-log.middleware.ts` (138 lines)
- Applied to all admin routes via `router.use(auditLog)` in `admin.route.ts`
- Skips GET/HEAD/OPTIONS (safe methods)
- Skips unauthenticated requests
- Monkey-patches `res.end` to capture response after it finishes
- Logs entry with `pdId('audit')`, redacted body, status code, duration
- Fire-and-forget insert (errors logged but don't block response)
- Redacts: password, password_hash, token, secret, api_key, flouci_app_secret, konnect_api_key, access_token, refresh_token
- `extractResourceType(url)`: strips `/api/pd/admin/`, returns first path segment
- `extractResourceId(url)`: finds first `pd_` prefixed segment, or falls back to second path segment

---

## 4. API Contract (Full)

### `GET /api/pd/admin/audit-log`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (≥1) |
| `limit` | int | 50 | Items per page (1-100) |
| `action` | string | — | Exact match on `pd_audit_log.action` |
| `resource_type` | string | — | Exact match on `resource_type` |
| `actor_role` | string | — | Exact match on `actor_role` |
| `method` | string | — | HTTP method extracted from metadata JSONB |
| `status_code` | int | — | Status code extracted from metadata JSONB (100-599) |
| `from` | ISO date | — | `created_at >= from` |
| `to` | ISO date | — | `created_at <= to` |
| `search` | string | — | ILIKE across 8 columns |

**Response 200:**
```json
{
  "data": [
    {
      "id": "audit_xxx",
      "actor_id": "user_xxx",
      "actor_email": "admin@example.com",
      "actor_role": "super_admin",
      "action": "POST /api/pd/admin/stores/xxx/suspend",
      "resource_type": "store",
      "resource_id": "store_xxx",
      "method": "POST",
      "status_code": 200,
      "duration_ms": 145,
      "path": "/api/pd/admin/stores/xxx/suspend",
      "ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "metadata": { "method": "POST", "path": "...", "body": {...}, "status_code": 200, "duration_ms": 145 },
      "created_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 150, "total_pages": 6, "totalPages": 6 }
}
```

### `GET /api/pd/admin/audit-log/summary`

Same filter params as above (no `page`/`limit`).

**Response 200:**
```json
{
  "summary": { "total": "150", "last_24h": "12", "failed": "3", "actors": "5", "writes": "140" },
  "actions": [ { "action": "POST /api/pd/admin/stores/xxx/suspend", "count": "25" } ],
  "resources": [ { "resource_type": "store", "count": "80" } ]
}
```

Note: all count values are strings from PostgreSQL `COUNT(*)::text`. Frontend converts with `toNumber()`.

---

## 5. Frontend Component Architecture

### Audit Log Page Component Tree

```
AuditLogPage (default export, 'use client')
├── Hero Header
│   ├── Compliance badge (Shield icon)
│   ├── Title + description
│   └── Refresh button (RefreshCw icon, spin on loading)
├── Summary Cards Grid (5 cards)
│   └── Each: gradient bg, icon, label, formatted count
├── Filter Form
│   ├── Search input (Search icon)
│   ├── Action dropdown (dynamic options)
│   ├── Resource type input
│   ├── Method dropdown
│   ├── Search submit button
│   ├── Actor role dropdown
│   ├── Status code input
│   ├── From date input
│   ├── To date input
│   └── Reset button (conditional)
├── Error Banner (conditional)
├── Main Grid [table | sidebar]
│   ├── Events Table
│   │   ├── Header (7 columns)
│   │   ├── Loading skeletons (6 rows × 7 cells)
│   │   ├── Empty state (Shield icon + message)
│   │   └── Data rows with badges
│   └── Sidebar
│       ├── Top Actions panel (clickable buttons)
│       ├── Top Resources panel (clickable buttons)
│       └── Audit Coverage info card
├── Pagination (Previous / Page X of Y / Next)
└── Details Modal (conditional, fixed overlay)
    ├── Header (action name, date, close button)
    ├── Field grid (10 fields with copy buttons)
    ├── Request path code block
    └── Metadata JSON viewer
```

### Data Flow

```
User action (filter change / page change / refresh click)
  → setState (filter values / page)
  → useEffect detects fetchAuditLog dependency change
  → fetchAuditLog()
    → Promise.all([summary fetch, list fetch])
    → setState for all data + loading/error
  → Re-render with new data
```

---

## 6. Project Conventions & Patterns

### Backend Patterns

- **Route handler signature:** `router.get('/path', validate(schema, 'query'), asyncHandler(async (req, res) => { ... }))`
- **Query execution:** `const { rows } = await query<RowType>(sql, params)`
- **Error handling:** `asyncHandler` catches rejected promises and forwards to Express error handler
- **Response format:** Always `res.status(200).json({ ... })` for success
- **Pagination:** `LIMIT $N OFFSET $M` with separate COUNT query
- **ID generation:** `pdId('prefix')` from `backend/src/utils/crypto.ts`
- **Logging:** `logger.info(...)`, `logger.warn(...)`, `logger.error(...)` from `backend/src/utils/logger.ts`

### Frontend Patterns

- **Client components:** All admin pages use `'use client'` directive
- **API calls:** `fetchWithCsrf(url, { credentials: 'include' })` — handles CSRF token automatically
- **Loading states:** Boolean `loading` state, conditional rendering
- **Error states:** String `error` state, conditional banner
- **Empty states:** Dedicated UI with icon + message when data array is empty
- **Date formatting:** `toLocaleString('fr-TN')` for Tunisian locale
- **Styling:** Tailwind CSS 4 utility classes, brand color `[#16C784]`, rounded corners `rounded-[1.5rem]` to `rounded-[2rem]`
- **Icons:** `lucide-react` exclusively
- **No external UI library:** All components are custom-built with Tailwind

---

## 7. Rules and Constraints

These were strictly followed. A new agent MUST continue following them:

1. **No comments or documentation** unless explicitly requested — code is self-documenting
2. **No emojis** in code unless user explicitly requested
3. **Minimal, focused edits** — single-line changes when sufficient
4. **Prefer upstream fixes** over downstream workarounds
5. **No breaking existing functionality** — changes are additive or corrective
6. **Preserve existing code style** — match surrounding patterns, indentation, naming
7. **Use `next/image`** for images, not raw `<img>`
8. **Use `fetchWithCsrf`** from `@/lib/api` for authenticated requests
9. **Use `zod`** for backend validation
10. **Use `asyncHandler`** for Express route handlers
11. **Use `pdId()`** for ID generation
12. **French locale** (`fr-TN`) for UI dates
13. **Tailwind CSS 4** with brand green `[#16C784]`
14. **Never use `cd`** in commands — use the `Cwd` parameter instead
15. **Never auto-run unsafe commands** — destructive operations require user approval
16. **Do not create random files** that clutter the workspace

---

## 8. Required Skills

- **TypeScript** — strict mode, generics, zod inference, type guards
- **React 19** — client components, useState, useEffect, useCallback, useMemo
- **Next.js 16** — App Router, route groups, `'use client'` directive, `next/image`
- **Express.js** — middleware chain, RequestHandler, monkey-patching `res.end`
- **PostgreSQL** — JSONB operators (`->`, `->>`), `COUNT(*) FILTER (WHERE ...)`, `ILIKE`, `COALESCE`, `split_part`, CTEs, parameterized queries
- **Tailwind CSS 4** — utility classes, arbitrary values, gradients, responsive grids, animations
- **Zod** — `z.object()`, `z.coerce`, `.optional()`, `.default()`, `.omit()`, `.refine()`
- **Lucide React** — icon component library

---

## 9. Validation Commands

Run these to verify code health before and after any changes:

| Check | Working Directory | Command |
|-------|-------------------|---------|
| Backend type-check | `c:\tek\pandamarket\backend` | `npm run type-check` |
| Backend lint (all) | `c:\tek\pandamarket\backend` | `npm run lint` |
| Backend lint (single file) | `c:\tek\pandamarket\backend` | `npm run lint -- src/api/admin.route.ts` |
| Frontend type-check (with vitest) | `c:\tek\pandamarket\frontend` | `.\node_modules\.bin\tsc.cmd --noEmit --types vitest/globals,node` |
| Frontend lint (single file) | `c:\tek\pandamarket\frontend` | `npm run lint -- "src/app/(admin)/audit-log/page.tsx"` |
| Whitespace diff check | `c:\tek\pandamarket` | `git diff --check -- <files>` |

**All 5 checks passed** at the time of this handoff.

---

## 10. Known Issues & Pitfalls

1. **Frontend `tsc --noEmit` fails without vitest globals** — `src/__tests__/setup.ts` references `describe`, `it`, `expect` without importing from vitest. Workaround: add `--types vitest/globals,node`. This is pre-existing and unrelated to audit-log work.

2. **Backend ESLint TypeScript version warning** — `@typescript-eslint` warns about TS 5.9.3 (supported: 4.7.4–5.6.0). Non-blocking, lint still passes.

3. **Summary counts are strings** — PostgreSQL returns `COUNT(*)::text`, so frontend must convert with `toNumber()`. Do NOT change the backend to return integers without updating the frontend `normalizeSummary`.

4. **`totalPages` vs `total_pages`** — Backend returns both for compatibility. Frontend reads `total_pages` first, falls back to `totalPages`.

5. **Search is two-phase** — `searchInput` is the live input value; `search` is committed on form submit. This prevents excessive API calls while typing.

6. **Filter changes reset page to 1** — every filter onChange handler calls `setPage(1)`. This is intentional to avoid showing empty pages.

7. **`fetchWithCsrf` is mandatory** — do NOT use raw `fetch()` for admin API calls. CSRF protection is enforced.

8. **Do NOT add an ORM** — the project uses raw SQL intentionally. Adding Sequelize/TypeORM/etc would break conventions.

---

## 11. Files You Must NOT Modify

Unless explicitly directed by the user:

- `backend/src/middlewares/audit-log.middleware.ts` — logging logic is correct and tested
- `backend/src/migrations/sql/002_payment_idempotency_and_webhooks.sql` — schema migration, do not alter existing tables
- `frontend/src/app/(admin)/layout.tsx` — admin layout, shared across all admin pages
- `frontend/src/lib/api.ts` — `fetchWithCsrf` implementation
- `backend/src/db/pool.ts` — database connection pool
- `backend/src/utils/crypto.ts` — `pdId` implementation

---

## 12. Potential Next Steps

### High Priority
- **Audit log retention/purging** — add endpoint to delete entries older than N days, with confirmation
- **Audit log export** — CSV/JSON download of filtered results

### Medium Priority
- **Real-time audit feed** — WebSocket or SSE for live monitoring
- **Audit log alerts** — notifications on failed actions (status ≥ 400)
- **Actor detail drill-down** — clicking an actor filters to show all their actions
- **Frontend test coverage** — add tests for the audit-log page

### Low Priority
- **Diff viewer** — compare `metadata.body` between sequential updates to same resource
- **Fix Vitest globals** — add `/// <reference types="vitest/globals" />` to test setup
- **Audit log statistics page** — charts for action frequency, error rates over time, actor activity

---

## 13. How to Resume Work

### First-time setup (if environment is fresh):

```pwsh
# Backend
cd c:\tek\pandamarket\backend
npm install
npm run type-check
npm run lint

# Frontend
cd c:\tek\pandamarket\frontend
npm install
.\node_modules\.bin\tsc.cmd --noEmit --types vitest/globals,node
npm run lint
```

### Verify current state:

```pwsh
# Check what files were modified
git diff --stat -- backend/src/api/admin.route.ts "frontend/src/app/(admin)/audit-log/page.tsx" frontend/src/components/themes/PoweredByMarketplace.tsx frontend/src/components/themes/shared.ts

# Run all validations
cd c:\tek\pandamarket\backend && npm run type-check && npm run lint
cd c:\tek\pandamarket\frontend && .\node_modules\.bin\tsc.cmd --noEmit --types vitest/globals,node && npm run lint
```

### Start dev servers:

```pwsh
# Terminal 1 — Backend
cd c:\tek\pandamarket\backend && npm run dev

# Terminal 2 — Frontend
cd c:\tek\pandamarket\frontend && npm run dev
```

### Key files to review before making changes:

1. `backend/src/api/admin.route.ts` — lines ~1279-1682 (audit-log section)
2. `frontend/src/app/(admin)/audit-log/page.tsx` — full file (676 lines)
3. `backend/src/middlewares/audit-log.middleware.ts` — full file (138 lines)
4. `frontend/src/components/themes/PoweredByMarketplace.tsx` — full file (43 lines)
5. `frontend/src/components/themes/shared.ts` — lines 69-80 (StoreBranding interface)

### Navigation in the running app:

- Admin panel: `http://localhost:3000/admin`
- Audit log page: `http://localhost:3000/admin/audit-log`
- Storefront themes: any store page, check footer for "Propulsé par [marketplace name]"
