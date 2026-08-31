# 05 - Master Checklist d'Exécution & Vérification (TODO)

> **ÉTAT D'IMPLÉMENTATION — 31/08/2026 (Zhipu GLM 3.7 / opencode)** : phases 1 à 3 **terminées** et déployées ; la phase 4 (QA fonctionnelle) nécessite une commande réelle à deux boutiques. Deux défauts bloquants du code proposé ont été corrigés avant application (SQL `LATERAL` illégal en PostgreSQL, numéro de migration déjà pris) et six omissions de mise à jour des consommateurs de statut ont été rattrapées. Détail complet : **`06-revue-critique-et-corrections-appliquees.md`**.

---

## 📋 Phase 1 : Base de Données & Types

- [x] **DB-01** : Migration créée sous **`102_multi_vendor_order_statuses.sql`** (le numéro 086 était déjà pris ; dernier numéro utilisé = 101) + `.down.sql` réversible. À noter : aucune contrainte `CHECK` n'existait sur `pd_order.status` — la migration en **ajoute** une couvrant les 9 états.
- [x] **TYPES-01** : `OrderStatus` enrichi (`PartiallyShipped`, `PartiallyDelivered`) avec commentaires JSDoc.
- [x] **TYPES-02** : `BuyerOrderPackageItem` et `BuyerOrderPackage` ajoutées dans `packages/types/src/dtos.ts`.

---

## 📋 Phase 2 : Backend - Moteur de Synchronisation & API

- [x] **BE-01** : Échelle de décision multi-colis implémentée. ⚠️ Le SQL de l'audit était **invalide** (`LATERAL` référençant la cible de l'`UPDATE` → `invalid reference to FROM-clause entry for table "o"`, erreur 500 sur les 6 chemins d'expédition). Corrigé : colonnes de paiement remontées via la sous-requête d'agrégat (`JOIN pd_order o2`).
- [x] **BE-02** : `listByCustomer` renvoie `fulfillments` (colis + articles + transporteur + suivi).
- [x] **BE-03** : `listByStorefrontCustomer` enrichi **avec portée boutique** (sinon fuite du colis d'un autre vendeur). `getById` volontairement **non modifié** (utilisé par les gardes paiement/annulation) : nouvelle méthode dédiée `getBuyerOrderDetail(id, { storeId })` branchée sur `GET /orders/:id` et `GET /orders/storefront/:id`.
- [x] **BE-04** : `multi-vendor-status.test.ts` (3 tests de contrat SQL, dont une garde anti-régression interdisant toute référence à `o.` dans le `LATERAL`) + `multi-vendor-status.integration.test.ts` (10 tests sur PostgreSQL réel couvrant toute la table de vérité, le repli COD et la non-résurrection d'une commande remboursée).
- [x] **BE-05** : backend **139 fichiers / 1607 tests verts** ; frontend 68 / 572 verts ; `tsc --noEmit` propre ; ESLint 0 erreur.

---

## 📋 Phase 3 : Frontend - Interface Acheteur (`hub/orders/page.tsx`)

- [x] **FE-01** : couleurs + libellés ajoutés (`partially_shipped` violet, `partially_delivered` émeraude) ; libellés existants harmonisés au féminin.
- [x] **FE-02** : `getCarrierTrackingUrl` implémenté, **UPS ajouté** aux 4 transporteurs prévus.
- [x] **FE-03** : rendu multi-colis + indicateur de progression (« 1/2 expédié ») + **section de repli « Articles numériques (sans expédition) »** (sinon les produits numériques, qui n'ont pas de `pd_fulfillment`, disparaissaient de l'écran) + repli complet si la commande n'a aucun colis.
- [x] **FE-04** : fait, avec en plus les dates d'expédition/livraison et les actions « Message » / « Signaler » rattachées au colis (donc au vendeur) plutôt qu'à chaque ligne d'article.
- [x] **FE-05** : filtres enrichis avec `partially_shipped` **et** `partially_delivered`.

---

## 📋 Phase 3bis : Consommateurs de Statut (ajoutée — omise par l'audit initial)

> Ajouter deux états sans mettre à jour les filtres existants fait **disparaître silencieusement** les commandes concernées des revenus, compteurs et droits.

- [x] **CONS-01** : GMV / commandes payées / commandes expédiées (`analytics.service.ts`, 6 requêtes).
- [x] **CONS-02** : bucket de réconciliation analytique (`analytics-reconciliation.service.ts`).
- [x] **CONS-03** : compteurs de commandes ouvertes vendeur (`store.service.ts` ×2) — `payment_required` + `partially_shipped` ajoutés.
- [x] **CONS-04** : score de confiance vendeur (`seller-trust.service.ts` ×2) + suppression du littéral inexistant `'paid'`.
- [x] **CONS-05** : profil d'intérêt acheteur, acheteur vérifié, attribution des campagnes (3 requêtes).
- [x] **CONS-06** : garde `cancel()` — interdit désormais l'annulation d'une commande `partially_shipped` / `partially_delivered` (remise en stock de marchandise en transit).
- [x] **CONS-07** : `markPaidInTransaction` — même faux positif que la Cause Racine 2 corrigé (capture tardive ne bascule plus une commande partiellement livrée en `delivered`).

---

## 📋 Phase 4 : Tests & Validation QA

- [ ] **QA-01** : Passer une commande multi-boutiques (Boutique 1 + Boutique 2) sur le Hub.
- [ ] **QA-02** : Boutique 1 passe en « En préparation » $\rightarrow$ Vérifier que la commande de l'acheteur passe à « En cours de préparation ».
- [ ] **QA-03** : Boutique 1 expédie avec numéro Aramex $\rightarrow$ Vérifier que la commande passe à « Partiellement expédiée », que le Colis 1 affiche « Expédié » avec lien Aramex cliquable, et que le Colis 2 affiche « En attente ».
- [ ] **QA-04** : Boutique 2 expédie $\rightarrow$ Vérifier que la commande passe à « Expédiée ».
- [ ] **QA-05** : Boutique 1 est livrée $\rightarrow$ Vérifier que la commande passe à « Partiellement livrée ».
- [ ] **QA-06** : Boutique 2 est livrée $\rightarrow$ Vérifier que la commande passe à « Livrée ».

---

## 📋 Phase 5 : Déploiement & Synchronisation Git

- [ ] **GIT-01** : Examiner le diff complet avec `git status` et `git diff`.
- [ ] **GIT-02** : Demander la confirmation explicite de l'utilisateur pour commiter et pousser sur `github/main`.
- [ ] **DEPLOY-01** : Déclencher et valider le déploiement Render Backend.
- [ ] **DEPLOY-02** : Valider le déploiement Vercel Frontend.
- [ ] **DEPLOY-03** : Tester le endpoint santé : `https://pandamarket-backend-fjom.onrender.com/health`.
