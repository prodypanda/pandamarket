# 06 - Master Checklist d'Exécution & Déploiement (TODO)
> **Révisé le 31/08/2026** (Zhipu GLM 3.7 / opencode) — renumérotée, tâches déjà livrées cochées, tâches oubliées ajoutées. Voir `00-revue-critique-et-verifications.md`.

---

## 📋 Phase 0 — Statut réel du dépôt (avantage : ne pas refaire)

- [x] **DONE-01** : États multi-vendeurs `partially_shipped`/`partially_delivered` — livrés en migration **`102`** (le `086` du plan d'origine était pris) + enum + CHECK + consommateurs mis à jour (commit `39ee640`).
- [x] **DONE-02** : Types `BuyerOrderPackage`/`BuyerOrderPackageItem` (`packages/types/src/dtos.ts`) + agrégations `fulfillments` dans `listByCustomer`/`listByStorefrontCustomer`/`getBuyerOrderDetail` (commit `39ee640`).
- [x] **DONE-03** : Algorithme `syncOrderStatusFromFulfillments` multi-colis (corrigé : SQL légal, les états partiels) + 13 tests dont table de vérité PostgreSQL réelle (commit `39ee640`).
- [x] **DONE-04** : Page acheteur Hub multi-colis + tracking + repli numérique + filtres partiels (commit `39ee640`).
- [x] **DONE-05** : Page acheteur storefront (statut réel, carte colis, mandat gate) + parcours QA-01→06 automatisé + tests de séparation des canaux (commit `ca0aff1`).

---

## 📋 Phase 1 : Base de Données & Migrations SQL
> 🔧 Règle de numérotation : dernier numéro utilisé = **102**. Prochains : 103, 104, …

- [ ] **DB-02** : Migration **`103`**_buyer_orders_theme_style.sql — table **`pd_platform_config`** (pas `pd_platform_settings`, inexistante), valeur **brute** `'modern_cards'` (pas JSON-quotée).
- [ ] **DB-04** *(nouveau, plan 01)* : Migration **`104`**_store_matricule_fiscal.sql — colonne `pd_store.matricule_fiscal` + clé repli `invoice_platform_matricule_fiscal`.
- [ ] **DB-03** : Exécuter et valider : `npm run migrate -w backend` + vérifier les deux `.down.sql`.

## 📋 Phase 2 : Types TypeScript & Modèles

- [x] ~~TYPES-01 / TYPES-02~~ : livrés (`39ee640`).
- [ ] **TYPES-03** : `MarketplaceThemeSettings.buyer_orders_theme_style` + `types/settings.ts` (admin).
- [ ] **TYPES-04** *(nouveau, plan 04)* : Codes d'erreur `ORDER_CANNOT_BE_EDITED`, `ORDER_ITEM_NOT_FOUND`, `VARIANT_NOT_FOUND` dans `packages/types/src/errors.ts`.

## 📋 Phase 3 : Backend API & Services

### A. Factures Acheteur (plan 01)
- [ ] **BE-INV-00** *(nouveau)* : Corriger `price` → `unit_price` dans `pdf-invoice.service.ts` — **répare la facture vendeur cassée en production**.
- [ ] **BE-INV-01** : Builder PDF — offsets `xref` calculés + assainissement Latin-1 (arabe) + mitigation > 50 lignes.
- [ ] **BE-INV-02** : `generateBuyerInvoicePdf(scope par canal)` — gating `captured`, timbre fiscal COD-only, matricule fiscal réel.
- [ ] **BE-INV-03** : `GET /orders/:id/invoice.pdf` (requireAuth, `customer_id = req.user.id`).
- [ ] **BE-INV-04** : `GET /orders/storefront/:id/invoice.pdf` (requireStorefrontCustomer, portée boutique).
- [ ] **BE-INV-05** *(nouveau)* : Paramètre `search` dans `listByCustomer` (mirror `listByStore`) + COUNT + zod.

### B. Moteur d'Édition Vendeur (plan 04)
- [ ] **BE-EDIT-01..04** : `addStoreOrderItem` / `updateStoreOrderItemQuantity` / `removeStoreOrderItem` / `changeStoreOrderItemVariant` — gardes complètes (colis modifiable, **refus de hausse sur paiement capturé**, types v1 physical+digital seulement, stock atomique gardé), totaux exacts (gross/net/discount/tax), **annulation du colis vide**, audit `pd_audit_log` + notification acheteur.
- [ ] **BE-EDIT-05** *(nouveau)* : 🔴 **Interdiction absolue d'écrire `pending_balance` directement** — les baisses sur capturé passent par la porte de remboursement existante (migration 101), aucune écriture portefeuille sinon.
- [ ] **BE-EDIT-06** *(nouveau)* : Routes + zod des 4 endpoints.
- [ ] **BE-EDIT-07** *(nouveau)* : Subscriber `ORDER_MODIFIED` (notification in-app + email acheteur).

### C. Paramètres Plateforme (plan 03)
- [ ] **BE-ADM-01** : `buyer_orders_theme_style` enregistré aux **6 endroits** (defaults, section marketplace, **`PUBLIC_PLATFORM_SETTING_KEYS`**, type admin, `MarketplaceThemeSettings`, descripteur UI) — sans l'étape 3 la clé **n'atteint jamais le navigateur**.
- [ ] **BE-ADM-02** *(nouveau)* : `invoice_platform_matricule_fiscal` (section finance, SuperAdmin-only).

## 📋 Phase 4 : Frontend — Espace Acheteur

- [ ] **FE-ORD-01** : Recherche (debounce 300 ms) branchée sur le paramètre serveur + reset pagination.
- [ ] **FE-ORD-02/03** : `ModernCardsOrdersView` (extraction de la vue actuelle) / `TimelineLogisticsOrdersView` (stepper corrigé : états terminaux distincts, index borné 0–4).
- [ ] **FE-ORD-04** : Boutons « Télécharger ma Facture » Hub + Storefront (condition `captured`).
- [ ] **FE-ORD-06** *(nouveau)* : Clés de licence masquées/copiables + gestion quota ; chips `payment_required`/`refunded`.

## 📋 Phase 5 : Frontend — Superadmin

- [ ] **FE-ADM-01** : Sélecteur graphique double style (handler réel : **`updateSetting`**) dans l'onglet marketplace.
- [ ] **FE-ADM-02** *(nouveau)* : Champ matricule fiscal plateforme (finance) + saisie vendeur côté réglages boutique.

## 📋 Phase 6 : Frontend — Tiroir Vendeur 2.0 (plan 05)

- [ ] **FE-POP-00** *(nouveau)* : Extraction du tiroir en `drawer/` (refactor sans regression).
- [ ] **FE-POP-01..08** : 5 onglets (handlers existants branchés), éditeur quantité + suppression, modal ajout produit + **sélecteur de variante**, regroupement expédition, carte COD déplacée, **clés i18n fr/en/ar**, accessibilité (rôles onglets, focus trap, Esc), test mobile.
- [x] ~~Notes internes~~ : **existant** — simple déplacement.

## 📋 Phase 7 : Tests & QA

- [ ] **QA-01** : Édition vendeur — ajouts/quantités/suppressions/variante : stocks exacts (`pd_product` + variantes), totaux exacts, **refus hausse sur capturé**, colis vide annulé, isolation multi-boutiques, verrous concurrents.
- [ ] **QA-02** : Facture acheteur — mentions légales (matricule réel, timbre COD-only), gating paiement, cross-canal → 404, PDF valide (offsets).
- [ ] **QA-03** : Bascule style 1 ↔ 2 admin → effet sur `/hub/orders` au rechargement.
- [ ] **QA-04** *(nouveau)* : Recherche serveur — par n°, produit, boutique ; pagination ; séparation des canaux préservée.
- [ ] **QA-05** : `npm test -w backend` et `npm test -w frontend` verts + `tsc --noEmit` + lint 0 erreur.

## 📋 Phase 8 : Déploiement

- [ ] **DEPLOY-01..05** : git status/diff → **confirmation explicite du propriétaire** → push `github/main` → Render (`srv-d9qjrth42hec73efhoa0`) → Vercel auto → smoke `https://pandamarket-backend-fjom.onrender.com/health` + vérifier les migrations 103/104 appliquées (les migrations s'exécutent automatiquement au boot).

---

## 🛡️ Règles d'ingénierie (🔧 enrichies)

1. **Séparation stricte des canaux** (règle du propriétaire) : marketplace = `pd_order.customer_id`, storefront = `pd_order.storefront_customer_id` — espaces d'identifiants **distincts**, jamais de `OR` entre les deux ; chaque liste/route reste cantonnée à son canal.
2. **Atomicité des stocks** : transaction + `FOR UPDATE`, décréments **gardés** (`WHERE inventory_quantity >= $2 RETURNING`).
3. **🔴 Le portefeuille s'écrit uniquement via le registre** (`pd_wallet_transaction` via `walletService`), jamais en UPDATE direct de `pending_balance`.
4. **Conformité fiscale** : matricule fiscal réel (boutique ou repli plateforme), prix TTC (pas de HT inventé), timbre fiscal 1.000 TND uniquement sur paiements en espèces (COD).
5. **i18n** : tout nouveau libellé du tiroir via `t('dashboardPages.orders.*')` en fr/en/ar.
6. **Numérotation des migrations** : vérifier le dernier numéro avant d'en créer (prochain : 103).
7. **Ne pas réimplémenter** : imprimer/statuts/COD/notes existent — les chantiers branchent, ne réécrivent pas.
