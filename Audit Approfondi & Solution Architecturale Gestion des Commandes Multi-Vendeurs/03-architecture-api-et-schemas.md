# 03 - Architecture API, Schémas & Requêtes d'Agrégation

---

## 1. Mise à Jour des Types & Schémas

### 1.1 Énumération TypeScript (`packages/types/src/enums.ts`)
Ajout de `PartiallyShipped` et `PartiallyDelivered` dans `OrderStatus` :

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

### 1.2 Migration SQL (`086_multi_vendor_order_statuses.sql`)
```sql
-- Migration: Add partially_shipped and partially_delivered to pd_order status
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

## 2. Contrat d'Interface Colis pour l'Acheteur

Interface représentant un colis (`BuyerFulfillmentPackage`) renvoyé à l'acheteur :

```typescript
export interface BuyerOrderPackageItem {
  id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  product_type?: string;
  thumbnail?: string | null;
  has_digital_file?: boolean;
}

export interface BuyerOrderPackage {
  id: string;
  store_id: string;
  store_name: string;
  store_subdomain?: string | null;
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  shipping_total: string;
  items: BuyerOrderPackageItem[];
}

export interface BuyerOrder {
  id: string;
  status: OrderStatus | string;
  payment_gateway: string;
  payment_status: string;
  subtotal: string;
  shipping_total: string;
  total: string;
  currency: string;
  created_at: string;
  items?: BuyerOrderPackageItem[];
  fulfillments?: BuyerOrderPackage[];
}
```

---

## 3. Requête SQL d'Agrégation Multi-Colis (`listByCustomer`)

Dans [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts), `listByCustomer` et `listByStorefrontCustomer` sont enrichis pour aggréger les colis avec leurs articles respectifs :

```sql
SELECT o.*,
       COALESCE(items.items, '[]'::json) AS items,
       COALESCE(fulfillments.fulfillments, '[]'::json) AS fulfillments
FROM pd_order o
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'product_id', i.product_id,
      'product_title', i.title,
      'quantity', i.quantity,
      'unit_price', i.unit_price,
      'subtotal', i.subtotal,
      'store_id', i.store_id,
      'store_name', s.name,
      'product_type', p.type,
      'thumbnail', p.thumbnail,
      'has_digital_file', p.digital_file_key IS NOT NULL
    )
    ORDER BY i.created_at ASC
  ) AS items
  FROM pd_order_item i
  LEFT JOIN pd_store s ON s.id = i.store_id
  LEFT JOIN pd_product p ON p.id = i.product_id
  WHERE i.order_id = o.id
) items ON true
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'id', f.id,
      'store_id', f.store_id,
      'store_name', s.name,
      'store_subdomain', s.subdomain,
      'status', f.status,
      'carrier', f.carrier,
      'tracking_number', f.tracking_number,
      'shipped_at', f.shipped_at,
      'delivered_at', f.delivered_at,
      'shipping_total', f.shipping_total,
      'items', (
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_title', oi.title,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal,
            'product_type', op.type,
            'thumbnail', op.thumbnail,
            'has_digital_file', op.digital_file_key IS NOT NULL
          )
          ORDER BY oi.created_at ASC
        )
        FROM pd_order_item oi
        LEFT JOIN pd_product op ON op.id = oi.product_id
        WHERE oi.order_id = o.id AND oi.store_id = f.store_id
      )
    )
    ORDER BY f.created_at ASC
  ) AS fulfillments
  FROM pd_fulfillment f
  LEFT JOIN pd_store s ON s.id = f.store_id
  WHERE f.order_id = o.id
) fulfillments ON true
WHERE o.customer_id = $1
ORDER BY o.created_at DESC
LIMIT $2 OFFSET $3;
```
