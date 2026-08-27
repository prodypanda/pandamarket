# Engineering Specification: PLAN-B-10
## Verify Real Payment Status on Checkout Success Page & Fix Dead CTA Button

- **Target Bug:** [B-10](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-06-TO-B-10-CORE-FLOWS.md#b-10)
- **Severity:** 🟠 P1 (False Payment Assertions & Dead UI Action)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Hub Checkout Success Page, Storefront Checkout Success Page.

---

### 1. Summary & Business Impact
In `frontend/src/app/hub/checkout/success/page.tsx:15,26-48`, the page reads `order_id` directly from URL query parameters and unconditionally renders:
**"Payment Successful!"**
Hitting `https://www.garbage.team/hub/checkout/success?order_id=FAKE123` returns HTTP 200 with "Payment Successful". A buyer redirected from Flouci after a failed or cancelled transaction is falsely told they paid. In the production DB, 12 of 15 orders are in `payment_required` state. Furthermore, the "View Order Status" button at line 46 is a `<button>` with **no `onClick` handler** (a dead CTA).

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/app/hub/checkout/success/page.tsx`
```diff
--- a/frontend/src/app/hub/checkout/success/page.tsx
+++ b/frontend/src/app/hub/checkout/success/page.tsx
@@ -10,6 +10,7 @@ import { useEffect, useState } from 'react';
 import { useSearchParams } from 'next/navigation';
 import Link from 'next/link';
 import { CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';
+import { fetchWithCsrf } from '@/lib/api';
 
 export default function CheckoutSuccessPage() {
   const searchParams = useSearchParams();
   const orderId = searchParams.get('order_id');
+  const [order, setOrder] = useState<any>(null);
+  const [loading, setLoading] = useState(true);
+
+  useEffect(() => {
+    if (!orderId) { setLoading(false); return; }
+    fetchWithCsrf(`/api/pd/orders/${orderId}`)
+      .then(res => res.ok ? res.json() : null)
+      .then(data => { setOrder(data?.data); setLoading(false); })
+      .catch(() => setLoading(false));
+  }, [orderId]);
 
+  if (loading) return <div>Vérification du statut de la commande...</div>;
+  if (order?.payment_status === 'failed') return <PaymentFailedView orderId={orderId} />;
+  if (order?.payment_status === 'payment_required') return <PaymentPendingView orderId={orderId} />;
+
   return (
     <div>
       <h1>Paiement Confirmé !</h1>
-      <button className="...">Voir ma commande</button>
+      <Link href={`/hub/orders?highlight=${orderId}`} className="...">
+        Voir ma commande
+      </Link>
     </div>
   );
 }
```

---

### 3. Automated Verification Plan
```bash
npm run type-check -w frontend
npm run test -w frontend -- src/__tests__/checkout-success.test.tsx
```
