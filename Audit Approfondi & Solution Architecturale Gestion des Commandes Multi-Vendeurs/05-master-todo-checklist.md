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

> **Couverture automatisée (31/08/2026)** : `backend/src/__tests__/multi-vendor-qa-walkthrough.integration.test.ts` exécute QA-01 → QA-06 en intégralité sur un PostgreSQL réel via la couche service, en vérifiant à chaque étape l'agrégat de la commande maître **et** la charge utile acheteur (`fulfillments` : statut, transporteur, n° de suivi, dates, articles par colis). 5 tests supplémentaires verrouillent la séparation des canaux marketplace/storefront.

- [x] **QA-01** : Passer une commande multi-boutiques (Boutique 1 + Boutique 2) sur le Hub. *(automatisé : `pending`, 2 colis, articles bien séparés)*
- [x] **QA-02** : Boutique 1 passe en « En préparation » $\rightarrow$ Vérifier que la commande de l'acheteur passe à « En cours de préparation ». *(automatisé : `processing`)*
- [x] **QA-03** : Boutique 1 expédie avec numéro Aramex $\rightarrow$ Vérifier que la commande passe à « Partiellement expédiée », que le Colis 1 affiche « Expédié » avec lien Aramex cliquable, et que le Colis 2 affiche « En attente ». *(automatisé : `partially_shipped`, transporteur + n° de suivi + date dans la charge utile acheteur, colis 2 intact)*
- [x] **QA-04** : Boutique 2 expédie $\rightarrow$ Vérifier que la commande passe à « Expédiée ». *(automatisé : `fulfilled`)*
- [x] **QA-05** : Boutique 1 est livrée $\rightarrow$ Vérifier que la commande passe à « Partiellement livrée ». *(automatisé : `partially_delivered`)*
- [x] **QA-06** : Boutique 2 est livrée $\rightarrow$ Vérifier que la commande passe à « Livrée ». *(automatisé : `delivered`)*
- [ ] **QA-MANUEL** : le même parcours dans le navigateur (rendu des cartes colis + clic sur les boutons du tableau de bord vendeur) — nécessite une session acheteur et deux sessions vendeur.

### Phase 4bis : page storefront « Mes commandes » (ajoutée le 31/08/2026)

- [x] Correction du badge **toujours « En attente »** (`payment_status === 'paid'` / `status === 'completed'` : littéraux inexistants) → statut réel sur les 9 états + badge de paiement distinct.
- [x] Carte d'expédition par commande (statut du colis, transporteur, n° de suivi, dates, « Suivre mon colis ↗ »).
- [x] Lien « Gérer le reçu Mandat » affiché uniquement pour les commandes `manual_mandat` non capturées.
- [x] Consommation de `fulfillments` (portée boutique — une commande storefront étant toujours mono-boutique, un seul colis).

---

## 📋 Phase 5 : Déploiement & Synchronisation Git

- [x] **GIT-01** : Examiner le diff complet avec `git status` et `git diff`.
- [x] **GIT-02** : Commit et pousser sur `github/main` avec la confirmation du propriétaire (commits `39ee640` puis 2e passe 31/08).
- [x] **DEPLOY-01** : Déploiement Render Backend validé (`39ee640` live ; migration 102 appliquée et vérifiée).
- [x] **DEPLOY-02** : Vercel déploie automatiquement depuis `main`.
- [x] **DEPLOY-03** : Endpoint santé testé : `{"status":"ok"}`.
