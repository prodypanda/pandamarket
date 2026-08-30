# 04 - Step-by-Step Remediation & Implementation Guide (How-To)

This guide provides concrete, copy-paste ready blueprints and architectural instructions to remediate the identified order process and seller dashboard issues.

---

## 🛠️ Fix 1: Resolve "Détail des articles indisponible"

### Step 1.1: Fix Click Handlers in Secondary Tabs (`page.tsx`)
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx):

**A. In COD Radar Tab (Line 2972)**:
```tsx
// REPLACE THIS:
<button
  type="button"
  onClick={() => { setSelectedOrder(order); }}
  className="font-black text-slate-900 dark:text-white font-mono hover:text-[#B91C1C]"
>
  #{order.id.slice(-8).toUpperCase()}
</button>

// WITH THIS:
<button
  type="button"
  onClick={() => { void openOrderDetail(order); }}
  className="font-black text-slate-900 dark:text-white font-mono hover:text-[#B91C1C]"
>
  #{order.id.slice(-8).toUpperCase()}
</button>
```

**B. In RTO Returns Tab (Line 3205)**:
```tsx
// REPLACE THIS:
<button
  type="button"
  onClick={() => { setSelectedOrder(order); }}
  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
>
  Voir Fiche
</button>

// WITH THIS:
<button
  type="button"
  onClick={() => { void openOrderDetail(order); }}
  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
>
  Voir Fiche
</button>
```

### Step 1.2: Remove Duplicate TypeScript Interface (`page.tsx`)
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx#L140-L148):
Delete the erroneous duplicate declaration:
```typescript
// DELETE THIS BLOCK (Lines 140-148):
interface OrderItem {
  id?: string;
  store_id: string;
  body: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}
```

### Step 1.3: Prevent Stale Flash in Drawer (`page.tsx`)
In `openOrderDetail` (line 1596), ensure `loadingOrderDetail` is set and items are conditionally rendered with a loading skeleton:
```tsx
{loadingOrderDetail ? (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-[#B91C1C]" />
    <span className="ml-2 text-sm text-gray-500">{t('dashboardPages.orders.loadingDetail')}</span>
  </div>
) : (selectedOrder.items || []).length > 0 ? (
  selectedOrder.items?.map((item) => ( ... ))
) : (
  <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
    {t('dashboardPages.orders.itemsDetailUnavailable')}
  </p>
)}
```

---

## 🛠️ Fix 2: Resolve Status Confusion (Expédiée vs En attente)

### Step 2.1: Add Contextual Store Order Status Helper
In [`frontend/src/app/hub/dashboard/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/dashboard/orders/page.tsx):
Add a helper that returns the seller's contextual order status:

```typescript
function getStoreOrderStatus(order: Order): { label: string; color: string; badge: string } {
  // If the store portion is cancelled
  if (order.fulfillment_status === 'cancelled') {
    return { label: 'Annulée', color: 'bg-red-50 text-red-700 border-red-200', badge: 'cancelled' };
  }
  // If the store portion is delivered
  if (order.fulfillment_status === 'delivered') {
    return { label: 'Livrée', color: 'bg-green-50 text-green-700 border-green-200', badge: 'delivered' };
  }
  // If the store portion is shipped
  if (order.fulfillment_status === 'shipped') {
    return { label: 'Expédiée', color: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'shipped' };
  }
  // If in preparation
  if (order.fulfillment_status === 'processing') {
    return { label: 'En préparation', color: 'bg-blue-50 text-blue-700 border-blue-200', badge: 'processing' };
  }
  // If payment required (Mandat / COD)
  if (order.status === 'payment_required') {
    return { label: 'Paiement requis', color: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'payment_required' };
  }
  return { label: 'À expédier', color: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'pending' };
}
```

### Step 2.2: Update Table and Drawer Badges
In the main orders table and drawer modal, render the store-scoped status prominently while clearly designating marketplace global status as a secondary indicator.

---

## 🛠️ Fix 3: Implement "Préparation" (Preparation/Processing) Status

### Step 3.1: Create SQL Migration (`085_fulfillment_processing_status.sql`)
Create file `backend/src/migrations/sql/085_fulfillment_processing_status.sql`:
```sql
-- Migration: Add 'processing' status to pd_fulfillment table
DO $$
BEGIN
  -- If pd_fulfillment has a check constraint, update it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%pd_fulfillment%status%'
  ) THEN
    ALTER TABLE pd_fulfillment DROP CONSTRAINT IF EXISTS pd_fulfillment_status_check;
    ALTER TABLE pd_fulfillment ADD CONSTRAINT pd_fulfillment_status_check 
      CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));
  END IF;
END $$;
```

### Step 3.2: Add Backend Method in `order.service.ts`
In [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts):
```typescript
/**
 * Mark a store fulfillment as in preparation (processing).
 */
async markStoreFulfillmentProcessing(opts: {
  order_id: string;
  store_id: string;
  user_id?: string;
}): Promise<void> {
  const { rowCount } = await query(
    `UPDATE pd_fulfillment
     SET status = 'processing', updated_at = NOW()
     WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
    [opts.order_id, opts.store_id],
  );
  if (!rowCount) {
    throw new PdConflictError(
      PdErrorCode.ORDER_ALREADY_FULFILLED,
      'Fulfillment not found or already processing/shipped',
    );
  }
  
  // Optionally update master order status to processing if not cancelled
  await query(
    `UPDATE pd_order SET status = 'processing' WHERE id = $1 AND status = 'pending'`,
    [opts.order_id],
  );
  
  logger.info(opts, 'Fulfillment marked as processing');
}
```

### Step 3.3: Expose API Route in `order.route.ts`
In [`backend/src/api/order.route.ts`](file:///c:/tek/pandamarket/backend/src/api/order.route.ts):
```typescript
// Vendor: Start preparation of their portion of the order
router.post(
  '/:id/prepare',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await orderService.markStoreFulfillmentProcessing({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
    });
    res.status(200).json({ success: true, message: 'Fulfillment marked as in preparation' });
  }),
);
```

### Step 3.4: Add "Commencer la préparation" Button & Update Timeline in `page.tsx`
In `frontend/src/app/hub/dashboard/orders/page.tsx`:
1. Add button in row actions and drawer header:
   ```tsx
   {order.fulfillment_status === 'pending' && (
     <button
       type="button"
       onClick={() => void startPreparation(order)}
       className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
       title="Commencer la préparation"
     >
       <Package className="w-4 h-4" />
     </button>
   )}
   ```
2. Update `buildOrderTimeline`:
   ```typescript
   const isPreparationActive = ['processing', 'shipped', 'delivered'].includes(order.fulfillment_status || '') ||
                               ['processing', 'fulfilled', 'delivered'].includes(order.status);
   ```

---

## 🛠️ Fix 4: Correct Wallet Credit for Shipping Fees

### Step 4.1: Update `order.subscriber.ts`
In [`backend/src/subscribers/order.subscriber.ts`](file:///c:/tek/pandamarket/backend/src/subscribers/order.subscriber.ts#L200-L236):

```typescript
// Per-store totals INCLUDING shipping_total from pd_fulfillment
const { rows: storeRows } = await query<{
  store_id: string;
  owner_id: string;
  owner_email: string;
  plan: string;
  item_subtotal: string;
  shipping_total: string;
}>(
  `SELECT i.store_id, s.owner_id, u.email AS owner_email,
          s.subscription_plan AS plan,
          SUM(i.subtotal)::text AS item_subtotal,
          COALESCE(MAX(f.shipping_total), 0)::text AS shipping_total
   FROM pd_order_item i
   JOIN pd_store s ON s.id = i.store_id
   JOIN pd_user u ON u.id = s.owner_id
   LEFT JOIN pd_fulfillment f ON f.order_id = $1 AND f.store_id = i.store_id
   WHERE i.order_id = $1
   GROUP BY i.store_id, s.owner_id, u.email, s.subscription_plan`,
  [orderId],
);

for (const row of storeRows) {
  const itemSubtotal = parseFloat(row.item_subtotal);
  const shippingTotal = parseFloat(row.shipping_total);
  const limits = await subscriptionService.getLimits(row.plan);
  
  // Commission is applied ONLY to item subtotal (not shipping)
  const commission = calculateCommission(itemSubtotal, limits.commission_rate);
  const netItems = calculateVendorNet(itemSubtotal, limits.commission_rate);
  
  // Total credited to vendor wallet = net items + 100% of shipping collected
  const totalVendorCredit = roundTnd(netItems + shippingTotal);

  if (totalVendorCredit > 0) {
    await walletService.creditPending({
      store_id: row.store_id,
      amount: totalVendorCredit,
      order_id: orderId,
      retention_days: retentionDays,
      description: commission > 0
        ? `Sale (${itemSubtotal} TND) + Shipping (${shippingTotal} TND) − commission (${commission} TND)`
        : `Sale (${itemSubtotal} TND) + Shipping (${shippingTotal} TND)`,
    });
  }
}
```
