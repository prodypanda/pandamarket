# 00 — Revue Critique & Vérifications (Zhipu GLM 3.7 / opencode, 31/08/2026)

> Chaque affirmation des plans 01–06 a été vérifiée par exécution ou lecture directe du code, des migrations et de la base de production (lecture seule). Ce document résume les conclusions ; les plans ont été **corrigés et enrichis en place**.
>
> **Verdict global : les 5 chantiers sont pertinents et bien ciblés, mais les plans contiennent 1 défaut catastrophique, 6 défauts bloquants et plusieurs lacunes de conception qui auraient cassé la production ou livré des fonctionnalités mortes.** De plus, une partie du périmètre est **déjà implémentée** (commits `39ee640`, `ca0aff1`) — les plans ne le savaient pas.

---

## 1. Tableau récapitulatif des vérifications

| # | Plan | Affirmation à vérifier | Verdict | Preuve |
|---|---|---|---|---|
| 1 | 01 | `pdf-invoice.service.ts:103` interroge `price` au lieu de `unit_price` | ✅ **CONFIRMÉ — bug réel en production** | La requête sélectionne `price::text` alors que `pd_order_item` n'a que `unit_price` → l'endpoint vendeur `GET /seller/orders/:id/invoice.pdf` **échoue (500) sur chaque appel** |
| 2 | 01 | `store.matricule_fiscal` existe | ❌ **FAUX** | Aucune migration ne crée cette colonne (recherche sur les ~100 fichiers SQL). Il n'existe nulle part de matricule fiscal structuré — à ajouter |
| 3 | 01 | L'ownership se vérifie par `(o.customer_id = $2 OR o.storefront_customer_id = $2)` | ❌ **BUG : confusion d'espaces d'identifiants** | `customer_id` référence `pd_user`, `storefront_customer_id` référence `pd_storefront_customer` — deux tables distinctes, deux espaces d'ID. Comparer les deux à la même valeur est faux dans tous les cas |
| 4 | 02 | La page « Mes Commandes » affiche les articles à plat, sans colis ni suivi | ⚠️ **OBSOLÈTE** | Implémenté dans `39ee640` + `ca0aff1` : cartes multi-colis, transporteur, n° de suivi, liens de tracking, repli numérique, filtres avec états partiels |
| 5 | 02 | La recherche se fait côté client | ⚠️ **Lacune** | `listByCustomer` n'a **aucun paramètre de recherche** (contrairement à `listByStore` qui en a un). Une recherche client-side ne filtre que la page courante (20 commandes) — UX trompeuse |
| 6 | 03 | Migration `INSERT INTO pd_platform_settings` | ❌ **TABLE INEXISTANTE** | La table réelle est **`pd_platform_config`** (vérifié dans `platform-config.service.ts`). `pd_platform_settings` n'est qu'un préfixe de clé de cache Redis |
| 7 | 03 | Valeur stockée `'"modern_cards"'` (quotée JSON) | ❌ **FORMAT FAUX** | La convention de stockage est une chaîne brute (`'true'`, `'20'`, `'https://…'`) — voir `coerceSettingValue` qui fait `value === 'true'` et `Number(value)` |
| 8 | 03 | Migration `087_…` | ❌ **NUMÉRO DÉJÀ PRIS** | `087_cold_foreign_key_indexes.sql` existe ; dernier numéro utilisé : **102**. Prochain libre : **103** |
| 9 | 03 | Le réglage atteindra la page acheteur | ❌ **CHAÎNE D'EXPOSITION INCOMPLÈTE** | La page lit `/api/pd/marketplace/settings` → `getPublicSettings()` qui ne renvoie **que les clés de `PUBLIC_PLATFORM_SETTING_KEYS`** (liste blanche). Sans ajout à cette liste, le réglage ne sort jamais du backoffice |
| 10 | 03 | `handleUpdateSetting(...)` dans le backoffice | ❌ **MAUVAIS NOM** | La fonction réelle de la page settings est `updateSetting(key, value)` |
| 11 | 04 | Le SQL d'ajustement de portefeuille | 🔴 **CATASTROPHIQUE** | Voir §2 ci-dessous |
| 12 | 04 | `PdErrorCode.ORDER_CANNOT_BE_EDITED`, `ORDER_ITEM_NOT_FOUND`, `VARIANT_NOT_FOUND` | ❌ **CODES INEXISTANTS** | `packages/types/src/errors.ts` ne les définit pas — le code du plan ne compile pas |
| 13 | 04 | `this.getByIdWithExecutor(c, orderId)` | ❌ **MÉTHODE INEXISTANTE** | Seul `getByIdempotencyKeyWithExecutor` existe ; `getById` utilise le pool, pas le client de transaction |
| 14 | 04 | Totaux recalculés = `SUM(items) + shipping` | ⚠️ **INCOMPLET** | Ignore `discount_total`, `tax_total`, le port par boutique (ajouter un article physique à une boutique sans colis doit créer un `pd_fulfillment` + frais de port), et pose `gross_subtotal = subtotal` (faux : `gross_subtotal` existe comme colonne distincte) |
| 15 | 05 | « Pas d'Édition de Notes Internes » | ❌ **FAUX** | L'éditeur de note vendeur existe (`upsertStoreOrderNote` + UI dans le tiroir) — le point 4 du diagnostic est erroné |
| 16 | 06 | DB-01 : migration `086_multi_vendor_order_statuses` | ⚠️ **DÉJÀ FAIT — sous un autre numéro** | Réalisé en `102_multi_vendor_order_statuses.sql` (commit `39ee640`) ; `086` était pris |
| 17 | 06 | TYPES-01/02, BE-ORD-01/02, FE-ORD-05 | ⚠️ **DÉJÀ FAIT** | Commits `39ee640` + `ca0aff1` (états partiels, agrégats multi-colis, cartes colis acheteur, tracking, tests d'intégration) |

---

## 2. 🔴 Le défaut catastrophique (plan 04) — à lire avant toute implémentation

L'« ajustement de portefeuille » proposé (`recalculateOrderTotalsAndWalletInTransaction`, étape 4.2) :

```sql
UPDATE pd_vendor_wallet
SET pending_balance = (
  SELECT COALESCE(SUM(subtotal), 0) FROM pd_order_item WHERE store_id = $1
)
WHERE store_id = $1
```

Trois erreurs indépendantes, chacune fatale :

1. **La sous-requête somme TOUTES les lignes de commandes de la boutique, toutes commandes confondues** — pas seulement la commande modifiée. Le premier appel écraserait le solde en attente du vendeur avec le chiffre d'affaires brut cumulé de toute son histoire.
2. **Elle écrase l'agrégat en contournant le registre** : `pending_balance` est maintenu par `walletService.creditPending`, qui insère une ligne de livre (`pd_wallet_transaction`, type `sale`) à chaque crédit. Réécrire l'agrégat sans ligne de livre casse la réconciliation (le solde ne correspondra plus jamais au registre) et casse `releaseDueFunds` / `debitRefund` qui s'appuient sur les lignes.
3. **Elle ignore la commission, la rétention par passerelle, les remboursements et les retraits** déjà compensés dans ce solde (et le nouveau pipeline de remboursement sensible à la commission déployé le 30/08).

**Approche correcte** (développée dans le plan 04 corrigé) : ne jamais écrire `pending_balance` directement ; passer par le service de portefeuille avec une **écriture d'ajustement dans le registre** (`pd_wallet_transaction`), débit/crédit **net de commission** au prorata — exactement la logique déjà éprouvée dans `processStoreRefund` (commit `b3b0cc9`).

---

## 3. Règles transversales réaffirmées (contraignantes pour les 5 chantiers)

1. **Séparation stricte des canaux** (règle du propriétaire) : commandes **marketplace** (`pd_order.customer_id`) et commandes **storefront** (`pd_order.storefront_customer_id`) sont des flux disjoints — vérifié en production : **0 commande** ne porte les deux identifiants. Toute route acheteur doit vérifier l'appartenance **dans le bon espace d'identifiants** ; toute liste doit rester cantonnée à son canal.
2. **Numérotation des migrations** : dernier numéro utilisé = **102**. Les plans citaient `086`/`087` (tous deux pris). Prochains : `103`, `104`…
3. **Convention de stockage des réglages** : table `pd_platform_config`, valeur **chaîne brute** ; une clé n'atteint le navigateur que si elle figure dans `PUBLIC_PLATFORM_SETTING_KEYS` ; l'admin settings attend `updateSetting` ; le type doit être déclaré dans les **quatre** endroits (defaults backend, section backend, type frontend partagé `types/settings.ts`, descripteur de l'UI admin).
4. **Commandes invité** : 6 commandes de production n'ont **ni** `customer_id` **ni** `storefront_customer_id` (mandat/COD legacy). Elles resteront inaccessibles aux nouvelles routes acheteur — acceptable, à documenter.
5. **i18n** : le tiroir vendeur est désormais intégralement internationalisé (fr/en/ar, ~101 clés par langue ajoutées au fil des passes précédentes). Tout nouvel onglet/composant doit utiliser `t('dashboardPages.orders.*')` — pas de français codé en dur.
6. **Ne pas réimplémenter l'existant** : impression facture/bon (`openOrderPrintDocument`), actions de statut (`markStoreFulfillmentPreparing`, `fulfill`, `markStoreFulfillmentDelivered`, RTO), outils COD (appel, WhatsApp, OTP), notes vendeur — tout existe déjà ; les nouveaux chantiers **branchent** ces capacités, ils ne les remplacent pas.

---

## 4. Ce qui est déjà fait (à ne pas refaire)

| Capacité | Commit | Détail |
|---|---|---|
| États `partially_shipped` / `partially_delivered` (enum, migration 102, CHECK) | `39ee640` | + consommateurs mis à jour (analytics GMV, compteurs, trust, cancel guard…) |
| Agrégat multi-colis (`syncOrderStatusFromFulfillments` corrigé et legal-SQL) | `39ee640` | + 13 tests dont table de vérité sur PostgreSQL réel |
| `fulfillments` dans `listByCustomer` / `listByStorefrontCustomer` / `getBuyerOrderDetail` | `39ee640` | portée boutique pour le canal storefront |
| Page acheteur Hub : cartes multi-colis, tracking, repli numérique, filtres partiels | `39ee640` | |
| Page acheteur storefront : statut réel, carte colis, mandat gate, IDs courts | `ca0aff1` | + correction du badge `isPaid` toujours faux |
| Parcours QA-01→06 automatisé + séparation des canaux testée | `ca0aff1` | 11 tests d'intégration |

Les plans 02 et 06 ont été réécrits pour refléter cet état ; le plan 05 a été recadré sur la réorganisation plutôt que sur la réimplémentation.

---

## 5. Défauts bloquants mineurs corrigés dans les plans

- **Plan 01** : pas de condition d'accès liée au paiement (une facture doit être réservée aux commandes `captured` — ou COD livré) ; builder PDF avec offsets `xref`/`startxref` codés en dur invalides dès que le contenu varie (les visionneuses tolèrent, les validateurs non) ; assainissement qui ne couvre pas l'arabe (produits titrés en arabe → glyphe Helvetica manquant) ; pas de pagination (≈52 lignes max par page A4) ; routes à déclarer **avant** les patrons voisins ; ordre des paramètres SQL du filtre boutique.
- **Plan 03** : stepper — `cancelled`/`refunded` retombent sur l'étape 0 (« Commande reçue ») au lieu d'un état terminal distinct ; la largeur de progression utilise l'**agrégat** de commande alors que la progression réelle est **par colis**.
- **Plan 04** : `updateStoreOrderItemQuantity(qty<=0)` appelle `removeStoreOrderItem(opts)` avec une signature qui ne correspond pas ; suppression du dernier article physique d'une boutique laisse un `pd_fulfillment` vide à `pending` qui **bloque** l'agrégat (jamais `fulfilled`) ; produits **bundle** (décrémenter les composants) et **serial** (réserver des clés de licence) ignorés alors que le checkout les gère ; aucune écriture `pd_audit_log` ni notification acheteur alors que le diagramme les promet ; aucun validateur zod ; aucun test.
- **Plan 05** : le JSX croquis référence `printInvoice`, `handleUpdateQty`, `handleStatusStep`… qui n'existent pas sous ces noms ; il faut brancher les handlers existants.

---

## 6. Décisions de conception imposées par la revue (résumé)

| Sujet | Décision retenue |
|---|---|
| Facture acheteur — porte d'entrée | Deux routes distinctes : `GET /orders/:id/invoice.pdf` (requireAuth, `customer_id = req.user.id`) et `GET /orders/storefront/:id/invoice.pdf` (requireStorefrontCustomer, `storefront_customer_id = …` + portée boutique) |
| Matricule fiscal | Nouvelle colonne `pd_store.matricule_fiscal` (migration 104) alimentée par le vendeur dans ses réglages, avec repli plateforme depuis `pd_platform_config` |
| Timbre fiscal | Uniquement paiements **en espèces** (COD) — les paiements en ligne en sont exemptés ; configurable via clé plateforme |
| Édition vendeur — montants | **Interdire l'augmentation** sur commande à paiement capturé (aucun moyen d'encaisser le supplément) ; la baisse génère une demande de remboursement passant par la **porte d'approbation existante** ; COD non capturé = édition libre |
| Édition vendeur — portefeuille | Ajustement par **écriture de registre** nette de commission (réutiliser la logique de `processStoreRefund`), jamais d'écriture directe de `pending_balance` |
| Édition vendeur — types de produits | v1 : `physical` (+ variantes) et `digital` ; `bundle` et `serial` explicitement refusés avec erreur claire (v2 : répliquer la logique checkout) |
| Changer taille/couleur | Opération dédiée `POST /orders/store/:id/items/:itemId/variant` (swap propre) plutôt que suppression + réajout |
| Style acheteur | Clé `buyer_orders_theme_style` exposée via `PUBLIC_PLATFORM_SETTING_KEYS`, section `marketplace`, migration **104** (ou fusion avec 103) |
