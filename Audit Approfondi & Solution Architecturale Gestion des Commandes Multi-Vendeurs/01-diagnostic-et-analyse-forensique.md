# 01 - Diagnostic Médicolégal & Analyse Forensique du Problème

---

## 1. Description du Problème

### Scénario Reproductible
1. Un acheteur passe une commande sur le Hub Marketplace contenant des produits issus de deux vendeurs distincts (**Vendeur 1** et **Vendeur 2**).
2. La commande est enregistrée dans `pd_order` (avec `status = 'pending'` ou `status = 'payment_required'` en cas de COD/Mandat).
3. Deux enregistrements d'expédition sont créés dans `pd_fulfillment` :
   - Fulfillment 1 (Vendeur 1) : `status = 'pending'`
   - Fulfillment 2 (Vendeur 2) : `status = 'pending'`
4. Le **Vendeur 1** ouvre son tableau de bord vendeur et effectue une action :
   - Il passe la commande en préparation (`status = 'preparing'`).
   - OU il saisit un numéro de suivi et marque l'expédition comme expédiée (`status = 'shipped'`).
   - OU le colis est livré (`status = 'delivered'`).
5. L'acheteur se rend sur sa page **« Mes Commandes »** (`/hub/orders`).
6. **Résultat Anormal** : La commande s'affiche toujours comme **« En attente »** (`pending`). Aucun numéro de suivi n'est visible, aucun nom de transporteur n'apparaît, et rien n'indique à l'acheteur que le Vendeur 1 a déjà expédié son colis.

---

## 2. Analyse Médico-Légale du Code Source

### Cause Racine 1 : Le Verrou Strict `sub.pend = 0` dans la Synchronisation d'États
Dans [`backend/src/services/order-fulfillment-shared.ts`](file:///c:/tek/pandamarket/backend/src/services/order-fulfillment-shared.ts#L41-L59), la fonction `syncOrderStatusFromFulfillments` s'exécute à chaque mutation d'expédition :

```sql
UPDATE pd_order o
SET status = ns.next_status,
    updated_at = NOW(),
    cancelled_at = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_at, NOW()) ELSE o.cancelled_at END,
    cancelled_reason = CASE WHEN ns.next_status = 'cancelled' THEN COALESCE(o.cancelled_reason, $2) ELSE o.cancelled_reason END
FROM (
  SELECT order_id,
         COUNT(*) FILTER (WHERE status = 'pending')    AS pend,
         COUNT(*) FILTER (WHERE status = 'preparing')  AS prep,
         COUNT(*) FILTER (WHERE status = 'shipped')    AS ship,
         COUNT(*) FILTER (WHERE status = 'delivered')  AS del
  FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id
) sub,
LATERAL (SELECT CASE
           WHEN sub.pend = 0 AND sub.del > 0 THEN 'delivered'
           WHEN sub.pend = 0 AND sub.ship > 0 THEN 'fulfilled'
           WHEN sub.pend = 0 AND sub.ship = 0 AND sub.del = 0 AND sub.prep > 0 THEN 'processing'
           WHEN sub.pend = 0 AND sub.ship = 0 AND sub.del = 0 AND sub.prep = 0 THEN 'cancelled'
           ELSE NULL
         END AS next_status) ns
WHERE o.id = sub.order_id
  AND o.status NOT IN ('cancelled','refunded')
  AND ns.next_status IS NOT NULL
  AND o.status IS DISTINCT FROM ns.next_status
```

#### Démonstration de l'échec :
- Comme le Vendeur 2 n'a pas encore traité sa part, `sub.pend` vaut `1`.
- Toutes les branches du `CASE` exigent expressément `sub.pend = 0`.
- Par conséquent, la sous-requête `LATERAL` retourne `next_status = NULL`.
- La clause `AND ns.next_status IS NOT NULL` n'est pas satisfaite.
- **La commande `pd_order.status` n'est jamais mise à jour et reste bloquée à `'pending'`.**

---

### Cause Racine 2 : Faux Positif de Livraison Prématurée
Observez la ligne 50 de [`backend/src/services/order-fulfillment-shared.ts`](file:///c:/tek/pandamarket/backend/src/services/order-fulfillment-shared.ts#L50) :
```sql
WHEN sub.pend = 0 AND sub.del > 0 THEN 'delivered'
```
Si le Vendeur 1 a livré son colis (`sub.del = 1`) et le Vendeur 2 a expédié le sien (`sub.ship = 1`, `sub.pend = 0`), cette condition s'évalue à `true` !
La commande globale bascule immédiatement en `'delivered'` (« Livrée »), alors que le colis du Vendeur 2 est encore en cours d'acheminement par le transporteur.

---

### Cause Racine 3 : Omission Complète des Données de Colis dans l'API Client
Dans [`backend/src/services/order.service.ts`](file:///c:/tek/pandamarket/backend/src/services/order.service.ts#L1313-L1335), la méthode `listByCustomer` (utilisée par la route `GET /api/pd/orders/me`) sélectionne :

```sql
SELECT o.*, COALESCE(items.items, '[]'::json) AS items
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
      'has_digital_file', p.digital_file_key IS NOT NULL
    )
    ORDER BY i.created_at ASC
  ) AS items
  FROM pd_order_item i
  LEFT JOIN pd_store s ON s.id = i.store_id
  LEFT JOIN pd_product p ON p.id = i.product_id
  WHERE i.order_id = o.id
) items ON true
WHERE o.customer_id = $1
```

- **Constat** : La table `pd_fulfillment` n'est **jamais jointe ni agrégée**.
- **Conséquence** : L'objet commande renvoyé à l'acheteur ne contient ni les statuts individuels des colis, ni les transporteurs, ni les numéros de suivi, ni les dates d'expédition.

---

### Cause Racine 4 : Interface Acheteur Monolithique
Dans [`frontend/src/app/hub/orders/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/orders/page.tsx#L253-L375) :
- L'interface affiche un unique badge global basé sur `order.status`.
- Le contenu déroulant affiche une liste plate d'articles sans regroupement par vendeur ni carte d'expédition.
- Même si un vendeur renseigne un lien de suivi Aramex ou La Poste, l'acheteur n'y a aucun accès depuis son espace client.
