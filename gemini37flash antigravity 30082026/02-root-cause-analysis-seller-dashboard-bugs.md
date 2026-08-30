# 02 - Root Cause Analysis: Seller Dashboard Order Bugs

This document details the forensic investigation and root causes for the specific anomalies identified in the PandaMarket Seller Dashboard (`/hub/dashboard/orders`).

---

## 🔍 Bug 1: Order Status Displays "Pending" (En attente) Even When Expedition is "Shipped" (Expédiée)

### 1.1 Symptoms
In the Seller Dashboard order list and order details drawer:
- The **Expédition (Fulfillment)** column/badge updates correctly to **`Expédiée`** (`shipped`).
- The primary **Statut (Order Status)** column and KPI card remains stuck on **`En attente`** (`pending` or `payment_required`).

---

### 1.2 Root Cause Analysis

#### A. Architectural Distinction Between Master Order (`pd_order`) and Suborder Fulfillment (`pd_fulfillment`)
In PandaMarket, orders containing items from multiple stores are split into multiple `pd_fulfillment` records:

```text
pd_order (Master Order) 
  ├── pd_fulfillment (Store A) -> status = 'shipped'
  └── pd_fulfillment (Store B) -> status = 'pending'
```

When Vendor A fulfills their portion via `POST /api/pd/orders/:id/fulfill`, the backend executes `orderService.fulfill` in [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts#L1621-L1646):

```typescript
// 1. Updates Store A's fulfillment record
const { rowCount } = await query(
  `UPDATE pd_fulfillment
   SET status = 'shipped', carrier = $3, tracking_number = $4, shipped_at = NOW()
   WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
  [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
);

// 2. Checks if ALL fulfillments across all stores for this master order are shipped
const { rows } = await query<{ pending: string }>(
  `SELECT COUNT(*)::text AS pending
   FROM pd_fulfillment WHERE order_id = $1 AND status = 'pending'`,
  [opts.order_id],
);
if (rows[0].pending === '0') {
  await query(
    `UPDATE pd_order SET status = 'fulfilled' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
    [opts.order_id],
  );
}
```

- **In Multi-Vendor Orders**: Because Store B's fulfillment is still `pending`, `COUNT(*) WHERE status = 'pending'` is `1` (not `0`). Consequently, the parent `pd_order.status` **remains `'pending'`**.
- **In COD Orders**: The master `pd_order.status` starts at `'payment_required'`. Even if single-vendor, if `payment_status` is not yet captured, the master order status does not reflect a store-level completion.

#### B. Dashboard UI Rendering Flaw
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx#L2752-L2763) and lines 3450-3467:
- The dashboard orders table displays two columns side by side:
  1. `visibleColumns.status`: Renders `statusLabel(order.status, t)` $\rightarrow$ uses **`pd_order.status`** (`pending` $\rightarrow$ "En attente").
  2. `visibleColumns.fulfillment`: Renders `fulfillmentLabel(order.fulfillment_status, t)` $\rightarrow$ uses **`pd_fulfillment.status`** (`shipped` $\rightarrow$ "Expédiée").
- In the drawer modal, the primary Status KPI card directly outputs `selectedOrder.status`.

**Core Defect**: The seller dashboard presents the **Marketplace-wide Master Order Status** as the primary order status, rather than presenting the **Store-Scoped Fulfillment Status** or a composite Store Order Status.

---

## 🔍 Bug 2: Seller Cannot Change or Interact with the "Préparation" (Preparation) Status

### 2.1 Symptoms
- The order timeline displays an icon and step for **"Préparation"** ("Colis préparé" / "En attente de préparation").
- There is **no button**, dropdown, or API endpoint for a merchant to mark an order as "En préparation" or "Prêt à être expédié".
- The timeline step "Préparation" is automatically displayed as completed (`done`) immediately upon order placement.

---

### 2.2 Root Cause Analysis

#### A. Database Schema Limitation
In [`backend/src/migrations/sql/001_initial_schema.sql`](file:///c:/tek/pandamarket/backend/src/migrations/sql/001_initial_schema.sql#L235-L248):
```sql
CREATE TABLE IF NOT EXISTS pd_fulfillment (
  id              VARCHAR(64) PRIMARY KEY,
  order_id        VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id),
  status          VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'shipped' | 'delivered' | 'cancelled'
...
);
```
The table `pd_fulfillment` **does not have a `processing` or `preparing` status**.

#### B. Missing Backend API Route
In [`backend/src/api/order.route.ts`](file:///c:/tek/pandamarket/backend/src/api/order.route.ts), the exposed store fulfillment routes are:
- `POST /:id/fulfill` (transitions `pending` $\rightarrow$ `shipped`)
- `POST /:id/deliver` (transitions `shipped` $\rightarrow$ `delivered`)
- `POST /:id/fulfillment/cancel` (transitions `pending` $\rightarrow$ `cancelled`)

There is **no endpoint** `POST /:id/prepare` or `POST /:id/processing`.

#### C. Flawed Frontend Timeline Logic
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx#L1125-L1158):
```typescript
function buildOrderTimeline(order: Order, t: ...): TimelineStep[] {
  ...
  const isProcessing = ['processing', 'fulfilled', 'delivered'].includes(order.status) ||
                       ['pending', 'shipped', 'delivered'].includes(order.fulfillment_status || '');
  ...
  return [
    { label: t('dashboardPages.orders.timelineOrderCreated'), ... },
    { label: t('dashboardPages.orders.timelinePaymentConfirmed'), ... },
    {
      label: t('dashboardPages.orders.timelinePreparation'),
      description: isProcessing ? t('dashboardPages.orders.timelinePreparationReady') : t('dashboardPages.orders.timelinePreparationWaiting'),
      state: isProcessing ? 'done' : 'pending',
    },
    ...
  ];
}
```
Because `order.fulfillment_status` is initialized to `'pending'`, `['pending', 'shipped', 'delivered'].includes('pending')` evaluates to **`true` immediately upon order creation**.
Thus, "Préparation" is marked as `done` ("Colis préparé") from second zero, with zero seller action.

---

## 🔍 Bug 3: "Articles de la boutique" Displays "Détail des articles indisponible"

### 3.1 Symptoms
When opening the order detail drawer or printing an invoice / delivery slip:
- The section **"Articles de la boutique"** displays a grey placeholder box with the text **"Détail des articles indisponible"**.

---

### 3.2 Root Cause Analysis

#### A. Bypass of Detail Fetch in Secondary Tabs (COD Radar & RTO Returns)
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx):

1. **In COD Radar Tab (Line 2972)**:
   ```tsx
   <button
     type="button"
     onClick={() => { setSelectedOrder(order); }}
     className="font-black text-slate-900 dark:text-white font-mono hover:text-[#B91C1C]"
   >
     #{order.id.slice(-8).toUpperCase()}
   </button>
   ```

2. **In RTO Returns Tab (Line 3205)**:
   ```tsx
   <button
     type="button"
     onClick={() => { setSelectedOrder(order); }}
     className="px-3 py-1.5 rounded-xl border border-slate-200 ... text-xs font-bold"
   >
     Voir Fiche
   </button>
   ```

Both buttons call `setSelectedOrder(order)` **directly**, completely bypassing `openOrderDetail(order)`:
```typescript
const openOrderDetail = async (order: Order) => {
  setSelectedOrder(order);
  setLoadingOrderDetail(true);
  try {
    const res = await fetchWithCsrf(`/api/pd/orders/store/${order.id}`, { credentials: 'include' });
    const data = await res.json();
    const detail = data.order || order;
    setSelectedOrder(detail);
  } ...
};
```

#### B. The Order Listing API (`GET /api/pd/orders/store`) Intentionally Omits `items`
In [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts#L1471-L1509) (`listByStore`), the SQL query returns order header rows, totals, and customer info, but **does not select or join `pd_order_item`**.
Therefore:
- In the frontend `orders` state, every `order.items` property is `undefined`.
- When `setSelectedOrder(order)` is called directly without `openOrderDetail`, `selectedOrder.items` remains `undefined`.
- In the drawer UI (lines 3520-3545):
  ```tsx
  {(selectedOrder.items || []).length > 0 ? (
    selectedOrder.items?.map((item) => ( ... ))
  ) : (
    <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
      {t('dashboardPages.orders.itemsDetailUnavailable')}
    </p>
  )}
  ```
  Because `(undefined || []).length === 0`, it renders `"Détail des articles indisponible"`.

#### C. Stale State Flash During `openOrderDetail`
Even in the "All Orders" tab where `openOrderDetail` is called:
- Line 1597 sets `setSelectedOrder(order)` **synchronously** before initiating the asynchronous network request.
- If `loadingOrderDetail` does not completely mask the items section, or during network latency, the UI renders the empty items fallback before the detailed response arrives.

#### D. Duplicate TypeScript Interface Collision
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx):
- Line 29: defines `interface OrderItem` with item fields (`product_id`, `quantity`, `unit_price`, `thumbnail`, etc.).
- Line 140: accidentally defines a duplicate `interface OrderItem` with note fields (`store_id`, `body`, `created_by`, `updated_by`).
- TypeScript declaration merging merges these conflicting structures, masking compile-time type checking errors.

---

## 📊 Summary of Root Causes Matrix

| Bug | Primary Root Cause File | Line Number(s) | Mechanism |
|---|---|---|---|
| **Status Shows Pending** | `backend/src/services/order.service.ts` | 1633-1644 | `pd_order.status` only becomes `fulfilled` when ALL vendors ship. |
| **Status Shows Pending** | `frontend/src/app/hub/dashboard/orders/page.tsx` | 2754, 3452 | UI renders global `order.status` instead of store fulfillment status. |
| **No "Préparation" Action** | `backend/src/migrations/sql/001_initial_schema.sql` | 239 | `pd_fulfillment` status column lacks `processing` value. |
| **No "Préparation" Action** | `backend/src/api/order.route.ts` | — | Missing `POST /:id/prepare` endpoint. |
| **No "Préparation" Action** | `frontend/src/app/hub/dashboard/orders/page.tsx` | 1129 | Timeline condition auto-completes `isProcessing` on `pending`. |
| **Items Unavailable** | `frontend/src/app/hub/dashboard/orders/page.tsx` | 2972, 3205 | COD Radar & RTO tabs call `setSelectedOrder(order)` bypassing detail fetch. |
| **Items Unavailable** | `backend/src/services/order.service.ts` | 1471-1509 | `listByStore` SQL query omits `pd_order_item` aggregation. |
| **Items Unavailable** | `frontend/src/app/hub/dashboard/orders/page.tsx` | 140 | Duplicate `interface OrderItem` declaration. |
