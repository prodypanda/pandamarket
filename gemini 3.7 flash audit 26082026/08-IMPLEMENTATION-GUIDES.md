# 08 — Step-by-Step Implementation Guides

> **Purpose:** Detailed, copy-pasteable implementation blueprints for developers and autonomous coding agents to execute Tier 0 and Tier 1 fixes safely without guesswork.

---

## Guide 1: Fix Backend Compile Error in `main.ts` & `retention.route.ts` (P0-4)

### Target File: `backend/src/main.ts`
At line ~58, add the missing import:
```typescript
import retentionRouter from './api/retention.route';
```

### Target File: `backend/src/api/retention.route.ts`
Update the route definition to apply the Zod schema:
```typescript
router.post(
  '/rewards-lead',
  validate(rewardsLeadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.recordGamifiedLead({
      store_id: req.body.store_id,
      phone: req.body.phone,
      email: req.body.email,
      game_type: req.body.game_type,
      device_fingerprint: req.body.device_fingerprint,
    });
    res.status(201).json({ data: result });
  }),
);
```

### Verification:
```bash
npm run type-check -w backend
```
Expected output: Exit code 0 (clean build).

---

## Guide 2: Emit `PAYMENT_CAPTURED` in Webhook & Reconciliation (P0-1)

### Target File: `backend/src/services/payment.service.ts`
1. Ensure `PdEvent` is imported:
   ```typescript
   import { PdEvent } from '../subscribers';
   ```
2. Locate `processPaymentWebhook` at line ~992, immediately following `await adsService.recognizeOrderConversion(boundOrderId);`:
   ```typescript
   // Emit domain event for vendor wallet crediting, commission, and digital serial keys
   await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
     order_id: boundOrderId,
     gateway: opts.gateway,
     amount: verifyResult.amount,
     currency: 'TND',
     source: 'webhook',
   });
   ```

### Target File: `backend/src/services/payment-reconciliation.service.ts`
In `markCaptured` around line 325, add the identical call:
```typescript
await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
  order_id: orderId,
  gateway,
  amount: parseFloat(order.total),
  currency: 'TND',
  source: 'reconciliation',
});
```

### Target File: `backend/src/subscribers/order.subscriber.ts`
In `onPaymentCaptured`, add an idempotency check before crediting:
```typescript
const { rows: existingTx } = await query(
  `SELECT id FROM pd_wallet_transaction WHERE order_id = $1 AND type = 'sale' LIMIT 1`,
  [orderId]
);
if (existingTx[0]) {
  logger.info({ order_id: orderId }, 'Wallet credit already applied for this order, skipping duplicate');
  return;
}
```

---

## Guide 3: Fix Storefront Mandat Receipt Review (P0-2)

### Target File: `backend/src/api/payment.route.ts`
Replace the handler for `POST /receipts/:receiptId/review` (~lines 466-532) with:

```typescript
router.post(
  '/receipts/:receiptId/review',
  requireAuth,
  validate(reviewReceiptSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { receiptId } = req.params;
    const { action, notes } = req.body;

    const result = await transaction(async (client) => {
      const { rows: receiptRows } = await client.query<{
        id: string;
        order_id: string;
        store_id: string;
        status: string;
        amount_expected: string;
      }>(
        `SELECT r.id, r.order_id, r.store_id, r.status, r.amount_expected
         FROM pd_payment_receipt r
         WHERE r.id = $1 FOR UPDATE`,
        [receiptId],
      );
      const receipt = receiptRows[0];
      if (!receipt) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Receipt not found');
      if (receipt.status !== 'pending') {
        throw new PdConflictError(PdErrorCode.PAY_ALREADY_CAPTURED, 'Receipt already reviewed');
      }

      const isAdmin = req.user!.role === UserRole.Admin || req.user!.role === UserRole.SuperAdmin;
      if (!isAdmin && req.user!.store_id !== receipt.store_id) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Forbidden');
      }

      const { rows: orderRows } = await client.query<{ id: string; payment_gateway: string; payment_status: string }>(
        `SELECT id, payment_gateway, payment_status FROM pd_order WHERE id = $1 FOR UPDATE`,
        [receipt.order_id]
      );
      const order = orderRows[0];
      if (!order || order.payment_gateway !== PaymentGateway.ManualMandat) {
        throw new PdValidationError('Order does not use manual mandat payment gateway');
      }

      if (action === 'approve') {
        await orderService.markPaidInTransaction(client, receipt.order_id, PaymentGateway.ManualMandat, receiptId);
        await client.query(
          `UPDATE pd_payment_receipt SET status = 'approved', review_notes = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3`,
          [notes ?? null, req.user!.id, receiptId]
        );
        return { action: 'approve', receipt, orderId: receipt.order_id, amount: parseFloat(receipt.amount_expected) };
      } else {
        await client.query(
          `UPDATE pd_payment_receipt SET status = 'rejected', review_notes = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3`,
          [notes ?? null, req.user!.id, receiptId]
        );
        await client.query(
          `UPDATE pd_order SET payment_status = 'payment_required', updated_at = NOW() WHERE id = $1`,
          [receipt.order_id]
        );
        return { action: 'reject', receipt, orderId: receipt.order_id };
      }
    });

    if (result.action === 'approve') {
      await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
        order_id: result.orderId,
        gateway: PaymentGateway.ManualMandat,
        amount: result.amount,
        currency: 'TND',
        source: 'receipt_review',
      });
    }

    res.status(200).json({ success: true, data: result.receipt });
  }),
);
```

---

## Guide 4: Fix COD Delivery Capture (P0-3)

### Target File: `backend/src/services/order.service.ts`
Locate `confirmStoreFulfillmentDelivery` around line 1748. Immediately after updating `pd_order`:

```typescript
if (rows[0].active === '0' && rows[0].delivered !== '0') {
  await c.query(
    `UPDATE pd_order SET status = 'delivered',
       payment_status=CASE WHEN payment_gateway=$2 THEN 'captured' ELSE payment_status END,
       updated_at=NOW() WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
    [opts.order_id, PaymentGateway.Cod],
  );

  // Emit event to credit vendor wallet for COD delivery
  await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
    order_id: opts.order_id,
    gateway: PaymentGateway.Cod,
    source: 'cod_delivery',
  });
}
```

---

## Guide 5: Sanitize AI HTML XSS Sinks (P0-7)

### Target File: `frontend/src/app/hub/dashboard/products/page.tsx`
Import DOMPurify and sanitize at line 6923:
```tsx
import DOMPurify from 'dompurify';

// ...
<div
  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-slate-700 max-h-48 overflow-y-auto leading-relaxed prose prose-sm dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(smartFillSuggestions.suggested_description || '') }}
/>
```

### Target File: `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx`
Sanitize at line 3080:
```tsx
import DOMPurify from 'dompurify';

// ...
<div
  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 prose prose-xs dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String((selectedJob.output as any)?.description_html || '')) }}
/>
```

---

## Guide 6: Socket.IO Connection & Listener Lifecycle (P1-2 & P1-3)

### Target File: `frontend/src/hooks/useSocket.ts`
Implement listener buffering before connection:
```typescript
const pendingListenersRef = useRef<Array<{ event: string; handler: (payload: unknown) => void }>>([]);

useEffect(() => {
  if (!socket) return;
  
  const handleConnect = () => {
    // Flush buffered listeners upon connection
    for (const { event, handler } of pendingListenersRef.current) {
      socket.on(event, handler);
    }
  };

  socket.on('connect', handleConnect);
  return () => {
    socket.off('connect', handleConnect);
  };
}, [socket]);

const on = useCallback((event: string, handler: (payload: unknown) => void) => {
  if (socketRef.current) {
    socketRef.current.on(event, handler);
  } else {
    pendingListenersRef.current.push({ event, handler });
  }

  return () => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
    pendingListenersRef.current = pendingListenersRef.current.filter(
      (item) => !(item.event === event && item.handler === handler)
    );
  };
}, []);
```
