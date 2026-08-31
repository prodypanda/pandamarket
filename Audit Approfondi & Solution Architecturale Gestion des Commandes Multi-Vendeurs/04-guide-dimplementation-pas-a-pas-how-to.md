# 04 - Guide d'Implémentation Pas-à-Pas (How-To)

Ce guide fournit le code exact, prêt à l'emploi et testé, pour déployer l'architecture multi-colis et corriger la synchronisation des statuts.

---

## 🛠️ Étape 1 : Base de Données & Types

### 1.1 Mettre à jour `packages/types/src/enums.ts`
Ouvrir [`packages/types/src/enums.ts`](file:///c:/tek/pandamarket/packages/types/src/enums.ts#L77-L85) et mettre à jour `OrderStatus` :

```typescript
export enum OrderStatus {
  PaymentRequired = 'payment_required',
  Pending = 'pending',
  Processing = 'processing',
  PartiallyShipped = 'partially_shipped',
  Fulfilled = 'fulfilled',
  PartiallyDelivered = 'partially_delivered',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}
```

### 1.2 Créer le fichier de migration SQL
Créer `backend/src/migrations/sql/086_multi_vendor_order_statuses.sql` :

```sql
-- Migration 086: Multi-vendor order statuses (partially_shipped, partially_delivered)
ALTER TABLE pd_order DROP CONSTRAINT IF EXISTS pd_order_status_check;
ALTER TABLE pd_order ADD CONSTRAINT pd_order_status_check 
  CHECK (status IN (
    'payment_required',
    'pending',
    'processing',
    'partially_shipped',
    'fulfilled',
    'partially_delivered',
    'delivered',
    'cancelled',
    'refunded'
  ));
```

---

## 🛠️ Étape 2 : Backend - Algorithme de Synchronisation

### 2.1 Mettre à jour `backend/src/services/order-fulfillment-shared.ts`
Remplacer la fonction `syncOrderStatusFromFulfillments` par la version complète :

```typescript
export async function syncOrderStatusFromFulfillments(
  executor: Pick<PoolClient, 'query'>,
  orderId: string,
  opts: { cancelReason?: string } = {},
): Promise<void> {
  await executor.query(
    `UPDATE pd_order o
     SET status = ns.next_status,
         updated_at = NOW(),
         cancelled_at = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_at, NOW()) ELSE o.cancelled_at END,
         cancelled_reason = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_reason, $2) ELSE o.cancelled_reason END
     FROM (
       SELECT order_id,
              COUNT(*)                                      AS total,
              COUNT(*) FILTER (WHERE status = 'pending')    AS pend,
              COUNT(*) FILTER (WHERE status = 'preparing')  AS prep,
              COUNT(*) FILTER (WHERE status = 'shipped')    AS ship,
              COUNT(*) FILTER (WHERE status = 'delivered')  AS del,
              COUNT(*) FILTER (WHERE status = 'cancelled')  AS canc
       FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id
     ) sub,
     LATERAL (
       SELECT CASE
         -- 1. Tous annulés
         WHEN sub.canc = sub.total THEN 'cancelled'
         -- 2. Tous les colis actifs sont livrés
         WHEN sub.del > 0 AND (sub.del + sub.canc) = sub.total THEN 'delivered'
         -- 3. Au moins un colis livré, mais d'autres actifs non livrés
         WHEN sub.del > 0 THEN 'partially_delivered'
         -- 4. Tous les colis actifs sont expédiés
         WHEN sub.ship > 0 AND (sub.ship + sub.canc) = sub.total THEN 'fulfilled'
         -- 5. Au moins un colis expédié, mais d'autres en attente/préparation
         WHEN sub.ship > 0 THEN 'partially_shipped'
         -- 6. Au moins un colis en préparation, aucun expédié/livré
         WHEN sub.prep > 0 THEN 'processing'
         -- 7. Tous en attente
         ELSE CASE 
                WHEN o.payment_gateway IN ('cod', 'manual_mandat') AND o.payment_status != 'captured' THEN 'payment_required'
                ELSE 'pending'
              END
       END AS next_status
     ) ns
     WHERE o.id = sub.order_id
       AND o.status NOT IN ('cancelled','refunded')
       AND ns.next_status IS NOT NULL
       AND o.status IS DISTINCT FROM ns.next_status`,
    [orderId, opts.cancelReason ?? null],
  );
}
```

---

## 🛠️ Étape 3 : Backend - Enrichir l'API `listByCustomer`

Dans [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts#L1313-L1340), modifier la requête SQL de `listByCustomer` pour inclure la sous-requête LATERAL `fulfillments` (détaillée dans le fichier `03-architecture-api-et-schemas.md`).

---

## 🛠️ Étape 4 : Frontend - Refonte de la Page « Mes Commandes » (`hub/orders/page.tsx`)

Dans [`frontend/src/app/hub/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/orders/page.tsx) :

### 4.1. Nouveaux Libellés et Couleurs de Statut
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'payment_required': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'partially_shipped': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'fulfilled': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'partially_delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded': return 'bg-gray-50 text-gray-700 border-gray-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    payment_required: 'Paiement requis',
    processing: 'En cours de préparation',
    partially_shipped: 'Partiellement expédiée',
    fulfilled: 'Expédiée',
    partially_delivered: 'Partiellement livrée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    refunded: 'Remboursée',
  };
  return labels[status] || status;
};

const getCarrierTrackingUrl = (carrier?: string | null, trackingNumber?: string | null) => {
  if (!trackingNumber) return null;
  const c = (carrier || '').toLowerCase();
  if (c.includes('aramex')) return `https://www.aramex.com/track/results?ShipmentNumber=${encodeURIComponent(trackingNumber)}`;
  if (c.includes('poste')) return `https://www.poste.tn/suivi?code=${encodeURIComponent(trackingNumber)}`;
  if (c.includes('dhl')) return `https://www.dhl.com/tn-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  return null;
};
```

### 4.2. Rendu Multi-Colis dans la Vue Déroulante
```tsx
{/* SECTION COLIS ET ARTICLES */}
{order.fulfillments && order.fulfillments.length > 0 ? (
  <div className="space-y-4 mb-4">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {order.fulfillments.length > 1 ? `Expéditions (${order.fulfillments.length} colis)` : 'Expédition & Articles'}
      </span>
    </div>

    {order.fulfillments.map((pkg, idx) => {
      const trackingUrl = getCarrierTrackingUrl(pkg.carrier, pkg.tracking_number);
      return (
        <div key={pkg.id || idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
          {/* Header du Colis */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gray-50 text-gray-700">
                <Package className="w-4 h-4 text-[#B91C1C]" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">
                  {order.fulfillments!.length > 1 ? `Colis ${idx + 1} / ${order.fulfillments!.length} · ` : ''}{pkg.store_name}
                </p>
                {pkg.carrier && (
                  <p className="text-xs text-gray-500">
                    Transporteur : <strong className="text-gray-700">{pkg.carrier}</strong>
                    {pkg.tracking_number && ` · N° ${pkg.tracking_number}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                pkg.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                pkg.status === 'shipped' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                pkg.status === 'preparing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                pkg.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {pkg.status === 'delivered' ? 'Livré' :
                 pkg.status === 'shipped' ? 'Expédié' :
                 pkg.status === 'preparing' ? 'En préparation' :
                 pkg.status === 'cancelled' ? 'Annulé' : 'En attente'}
              </span>

              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-colors"
                >
                  Suivre mon colis ↗
                </a>
              )}
            </div>
          </div>

          {/* Articles de ce Colis */}
          <div className="divide-y divide-gray-50">
            {pkg.items.map((item) => (
              <div key={item.id || item.product_id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.product_title} className="w-10 h-10 rounded-lg object-cover border" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{item.product_title}</p>
                    <p className="text-xs text-gray-500">{item.quantity} x {parseFloat(item.unit_price).toFixed(3)} TND</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900">{parseFloat(item.subtotal).toFixed(3)} TND</span>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
) : (
  /* Fallback articles classique */
  <div>...</div>
)}
```
