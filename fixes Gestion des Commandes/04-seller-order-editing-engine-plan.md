# 04 - Plan d'Implémentation : Moteur d'Édition des Commandes par le Vendeur
> **Révisé et corrigé le 31/08/2026** (Zhipu GLM 3.7 / opencode) — voir `00-revue-critique-et-verifications.md`. **Ce plan contenait le défaut le plus grave de la série : un SQL d'ajustement de portefeuille qui aurait corrompu les soldes vendeurs.** Réécriture substantielle ci-dessous.

---

## 1. Problématique & Cas d'Usage Métier (inchangé)

Les clients tunisiens appellent le vendeur juste après la commande pour : changer la taille/couleur, ajuster une quantité, remplacer un produit épuisé, ajouter un produit pour mutualiser la livraison. Aujourd'hui le vendeur doit annuler toute la commande et perdre la conversion.

**Cas d'usage n° 1 réel** : le changement de variante (taille/couleur). Le plan d'origine le traitait de manière détournée (supprimer la ligne + ajouter une ligne) — ce plan révisé introduit une **opération dédiée de changement de variante**.

---

## 2. 🔴 Corrections fondamentales

### 2.1 Le SQL de portefeuille du plan d'origine est interdit

```sql
-- ❌ INTERDIT (3 erreurs fatales) :
-- 1) somme TOUTES les commandes de la boutique (pas seulement celle modifiée)
-- 2) écrase l'agrégat en contournant le registre pd_wallet_transaction
-- 3) ignore commission, rétention, remboursements, retraits déjà compensés
UPDATE pd_vendor_wallet
SET pending_balance = (SELECT COALESCE(SUM(subtotal), 0) FROM pd_order_item WHERE store_id = $1)
WHERE store_id = $1;
```

**Règle absolue** : `pending_balance` ne s'écrit **jamais** directement. Tout ajustement passe par `walletService` avec une **écriture de registre** (`pd_wallet_transaction`), débit/crédit **net de commission** — exactement la logique éprouvée de `processStoreRefund` (commit `b3b0cc9`) : lecture de la part boutique `(items + shipping)`, commission au taux du plan de la boutique, ajustement au prorata.

### 2.2 Règle métier non résolue par le plan d'origine : les paiements capturés

Que se passe-t-il quand le total change sur une commande **déjà payée en ligne** ?

| Situation | Règle corrigée |
|---|---|
| **Augmentation** (quantité +, article ajouté) sur paiement **capturé** | 🔧 **INTERDIT** — aucun moyen d'encaisser le supplément (pas de second débit gateway). Erreur explicite : « Le montant payé en ligne ne peut pas être augmenté après capture. Annulez les lignes ou créez une nouvelle commande. » |
| **Augmentation** sur paiement **non capturé** (COD, mandat en attente, pending) | Autorisé — le montant à encaisser est mis à jour (COD : bordereau livreur recalculé, `pd_courier_settlement.collected_amount` si déjà créé) |
| **Diminution** sur paiement capturé | Autorisé — génère automatiquement une **demande de remboursement** `pd_store_order_refund` qui passe par la **porte d'approbation existante** (migration 101 : non livré → revue superadmin ; livré ≤ seuil → auto) |
| **Diminution** sur non capturé | Autorisé — simple mise à jour du total |

### 2.3 Codes d'erreur et méthodes manquantes (le code du plan ne compilait pas)

- `PdErrorCode.ORDER_CANNOT_BE_EDITED`, `ORDER_ITEM_NOT_FOUND`, `VARIANT_NOT_FOUND` : **à ajouter** dans `packages/types/src/errors.ts` (ils n'existent pas).
- `this.getByIdWithExecutor(c, …)` : **n'existe pas** — soit l'ajouter (SELECT `pd_order` via le client de transaction), soit retourner l'ordre via un SELECT dans `c`.
- `updateStoreOrderItemQuantity(qty ≤ 0)` appelait `removeStoreOrderItem(opts)` avec une signature incohérente (`opts` contient `newQuantity`) — normaliser les signatures.

### 2.4 Totaux : le recalcul du plan était incomplet

`nouveauTotal = SUM(items) + shipping` ignorait : `discount_total` (les remises par ligne sont déjà déduites de `item.subtotal` — cohérent — mais la remise doit suivre les lignes retirées), `tax_total` (existe sur `pd_order`, doit être reporté), et le **port par boutique** (ajouter un article physique à une boutique qui n'avait que du numérique doit créer un `pd_fulfillment` et recalculer le port ; retirer le dernier article physique annule le colis).

Règle v1 (simple et sûre) : le port de chaque boutique **ne bouge pas** en cas d'ajout (avantage vendeur, vendeur l'assume), mais la **suppression du dernier article physique d'une boutique annule son `pd_fulfillment`** — sinon un colis vide `pending` **bloque l'agrégat** à jamais (jamais `fulfilled`). `total = subtotal + shipping_total + tax_total`, `gross_subtotal = SUM(item.gross_subtotal)` (colonne distincte — ne pas poser `gross = net`).

### 2.5 Types de produits : restriction v1 explicite

Le checkout gère **bundles** (décrément des composants) et **serial** (réservation de clés `FOR UPDATE SKIP LOCKED`). L'édition v1 refuse ces types avec une erreur claire (`ORDER_CANNOT_BE_EDITED`, détail `unsupported_product_type`) — la parité complète est un chantier v2.

---

## 3. Spécifications des Endpoints (tous `requireStore`, tous validés zod)

| # | Endpoint | Corps | Effet |
|---|---|---|---|
| 1 | `POST /orders/store/:id/items` | `{ product_id, variant_id?, quantity }` | Ajout (voir §2.2 pour la garde de capture) |
| 2 | `PATCH /orders/store/:id/items/:itemId` | `{ quantity }` | Quantité (≤ 0 → suppression) |
| 3 | `DELETE /orders/store/:id/items/:itemId` | — | Suppression de ligne |
| 4 | `POST /orders/store/:id/items/:itemId/variant` *(nouveau)* | `{ variant_id }` | **Changement de variante** (taille/couleur) : prix/stock réalignés sur la nouvelle variante, quantité conservée |

**Gardes communes** (dans cet ordre) :
1. `pd_fulfillment` de la boutique à `pending`/`preparing` (`FOR UPDATE`) — sinon `ORDER_CANNOT_BE_EDITED`.
2. `payment_status = 'captured'` + augmentation → refus (§2.2).
3. Produit : `store_id = vendeur` **ET** `status = 'published'` (le plan d'origine vérifiait les deux — correct, conservé).
4. Variante : appartient au produit, stock suffisant (décrément **atomique gardé** `WHERE inventory_quantity >= $delta` — le plan d'origine le faisait bien pour les patches, pas pour l'ajout ; unifier).

---

## 4. Guide d'Implémentation

### 4.1 Méthodes service (`order.service.ts`)

Squelette commun (l'ajout d'article, les autres suivent le même gabarit) :

```typescript
async addStoreOrderItem(opts: {
  orderId: string; storeId: string; userId: string;
  productId: string; variantId?: string | null; quantity: number;
}): Promise<OrderRow> {
  return transaction(async (c) => {
    // 1. Colis modifiable (FOR UPDATE) + garde de capture pour l'augmentation
    const ful = await this.lockEditableFulfillment(c, opts.orderId, opts.storeId);
    await this.assertNotCapturedIncrease(c, opts.orderId, /* deltaAmount */ null); // calculé après prix

    // 2. Produit publié de MA boutique (FOR UPDATE) — bundles/serial refusés (§2.5)
    const prod = await this.lockEditableProduct(c, opts.productId, opts.storeId);

    // 3. Variante éventuelle + prix + stock (décrément atomique gardé, cf. checkout)
    //    → réutiliser le gabarit du checkout : UPDATE … WHERE inventory_quantity >= $2 RETURNING

    // 4. INSERT pd_order_item (gross_subtotal = net, discount 0 pour la ligne ajoutée)

    // 5. Recalcul des totaux (§2.4) + port inchangé + création du colis si 1er article physique

    // 6. 🔧 Ajustement portefeuille PAR REGISTRE si capturé (jamais d'écriture directe)
    //    → walletService.creditPending / debitRefund au prorata net de commission
    //    → ou demande de remboursement via la porte d'approbation (§2.2)

    // 7. 🔧 Audit + notification acheteur (le diagramme du plan d'origine les promettait,
    //    le code les avait oubliés) :
    await this.auditOrderEdit(c, { action: 'order.item_added', orderId, storeId, userId, details: {…} });
    eventBus.emit(PdEvent.ORDER_MODIFIED, { order_id: opts.orderId, store_id: opts.storeId, change: 'item_added' });
    //    → subscriber : notification in-app + email acheteur « Votre commande a été modifiée par le vendeur »

    return this.getOrderInTransaction(c, opts.orderId);
  });
}
```

`recalculateOrderTotals` (version corrigée) :
```sql
-- gross/net/totaux cohérents, port et taxe reportés
UPDATE pd_order o
SET gross_subtotal = agg.gross, subtotal = agg.net,
    discount_total = agg.gross - agg.net,
    total = agg.net + o.shipping_total + o.tax_total,
    updated_at = NOW()
FROM (SELECT COALESCE(SUM(gross_subtotal),0) AS gross, COALESCE(SUM(subtotal),0) AS net
      FROM pd_order_item WHERE order_id = $1) agg
WHERE o.id = $1;
```

### 4.2 Réconciliation portefeuille — gabarit réglementaire

```typescript
// 🔧 Jamais de UPDATE direct de pending_balance.
// Si payment_status = 'captured' et baisse de montant :
//   → requestStoreRefund(...) via la PORTE D'APPROBATION existante (migration 101)
//     (commande non livrée = revue superadmin ; le flux audit/refus/notification existe déjà)
// Si hausse : interdit dès que capturé (§2.2) — donc aucun crédit complémentaire à gérer en v1.
// Si non capturé (COD/mandat/pending) : AUCUNE écriture de portefeuille —
//   le pipeline PAYMENT_CAPTURELED / capture COD créditera le bon montant plus tard.
```
> Ce faisant, v1 n'écrit **jamais** au portefeuille lors de l'édition : les baisses passent par la porte de remboursement, les hausses n'existent que sur non-capturé, et le crédit initial (capture) ou final (COD livré) utilise le montant mis à jour. C'est la variante la plus sûre ; l'écriture directe d'ajustement de registre reste possible en v2 si le besoin apparaît.

### 4.3 Frontend (relié au plan 05)

Éditeur `[- Qte +]` + suppression + modal d'ajout + **sélecteur de variante** dans l'onglet « Articles & Modification » du tiroir (plan 05). Mise à jour optimiste avec rollback sur erreur de stock (message serveur affiché tel quel).

---

## 5. Checklist de Validation (TODO) — 🔧 mise à jour

- [ ] **EDIT-00** *(nouveau)* : Ajouter `ORDER_CANNOT_BE_EDITED`, `ORDER_ITEM_NOT_FOUND`, `VARIANT_NOT_FOUND` à `packages/types/src/errors.ts`.
- [ ] **EDIT-01** : `addStoreOrderItem` — gardes (colis modifiable, capture, produit publié, types v1, stock atomique gardé), recalcul totaux (§2.4), création du colis si 1er article physique, audit + notification.
- [ ] **EDIT-02** : `updateStoreOrderItemQuantity` — delta atomique bidirectionnel, signatures normalisées, ≤ 0 → suppression.
- [ ] **EDIT-03** : `removeStoreOrderItem` — restitution via `restoreOrderItemStock` (variantes + bundles déjà gérés par le helper partagé), **annulation du colis si dernier article physique**.
- [ ] **EDIT-04** *(nouveau)* : `changeStoreOrderItemVariant` — swap propre (prix/stock/titre réalignés, quantité conservée).
- [ ] **EDIT-05** : Routes + validateurs zod (4 endpoints).
- [ ] **EDIT-06** : Baisse sur capturé → demande de remboursement passant par la porte d'approbation (tests d'intégration avec le seuil configuré).
- [ ] **EDIT-07** *(nouveau)* : Tests — isolation multi-boutiques (le vendeur B ne modifie jamais une ligne A), verrous concurrents (2 éditions simultanées → 1 succès + 1 conflit propre), refus bundle/serial, refus hausse sur capturé, colis vide annulé, totaux exacts (gross/net/discount/tax), audit écrit, notification émise.
- [ ] **EDIT-08** *(nouveau)* : Subscriber `ORDER_MODIFIED` — notification in-app + email acheteur.
