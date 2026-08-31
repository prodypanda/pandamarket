# 06 — Revue Critique & Corrections Appliquées (Zhipu GLM 3.7 / opencode, 31/08/2026)

> Document ajouté par l'agent d'implémentation après vérification exécutable de chaque affirmation de cet audit contre le code réel, la base de données de développement (PostgreSQL réel) et la base de production (lecture seule).
>
> **Verdict global : le diagnostic est correct et la direction architecturale est la bonne. Deux défauts bloquants ont été trouvés dans le code proposé, plus six omissions qui auraient cassé des fonctionnalités existantes. Tout a été corrigé et implémenté.**

---

## 1. Ce que l'audit a eu raison de dire (confirmé par exécution)

| Affirmation | Statut | Vérification |
|---|---|---|
| Cause Racine 1 : le verrou `sub.pend = 0` bloque l'agrégat → commande figée à `pending` | ✅ **CONFIRMÉ** | Toutes les branches du `CASE` exigeaient `sub.pend = 0` ; avec un vendeur en attente, `next_status = NULL` et `pd_order` n'était jamais mis à jour. |
| Cause Racine 2 : faux positif `delivered` (livré + expédié → `delivered`) | ✅ **CONFIRMÉ** | Reproduit : `del=1, ship=1, pend=0` satisfaisait `sub.pend = 0 AND sub.del > 0`. Test de non-régression ajouté (`partially_delivered`). |
| Cause Racine 3 : `listByCustomer` n'agrège jamais `pd_fulfillment` | ✅ **CONFIRMÉ** | Aucune jointure sur `pd_fulfillment` : ni statut de colis, ni transporteur, ni numéro de suivi côté acheteur. |
| Cause Racine 4 : UI acheteur monolithique (badge unique, liste plate) | ✅ **CONFIRMÉ** | `hub/orders/page.tsx` n'affichait qu'un badge global et une liste d'articles sans regroupement par colis. |
| Direction : introduire `partially_shipped` / `partially_delivered` + vue multi-colis | ✅ **RETENUE** | Implémentée telle quelle (sémantique de la table de vérité conservée à l'identique). |

La table de vérité de `02-matrice-detats-et-state-machine.md` est **logiquement exacte** : l'échelle de décision a été implémentée sans modification de sa sémantique (ordre des branches, traitement des colis annulés via `T_actif`, repli `payment_required`).

---

## 2. Défauts bloquants dans le code proposé (corrigés)

### 🔴 Défaut 1 — Le SQL proposé est invalide en PostgreSQL : il aurait provoqué une erreur 500 à **chaque** mutation d'expédition

La branche 7 de l'algorithme proposé (fichiers 02 et 04) référence `o.payment_gateway` et `o.payment_status` **à l'intérieur d'un `LATERAL` de la clause `FROM`** :

```sql
LATERAL (
  SELECT CASE
    ...
    ELSE CASE WHEN o.payment_gateway IN ('cod','manual_mandat') AND o.payment_status != 'captured' ...
  END AS next_status
) ns
```

PostgreSQL interdit à un élément de la clause `FROM` de référencer la table cible d'un `UPDATE`. Vérifié par exécution sur PostgreSQL réel :

```
AUDIT-AS-WRITTEN SQL: FAILS -> invalid reference to FROM-clause entry for table "o"
```

Conséquence si le code avait été appliqué tel quel : `syncOrderStatusFromFulfillments` est appelée par **six** chemins (expédition manuelle, création d'étiquette transporteur, synchronisation de suivi, annulation vendeur, RTO, annulation d'expédition). Chacun aurait levé une exception — donc plus aucune expédition possible sur toute la plateforme.

**Correction appliquée** : les colonnes de paiement sont remontées dans la sous-requête d'agrégat (qui joint `pd_order` sous l'alias `o2`), puis consommées par le `LATERAL` via `sub.payment_gateway` / `sub.payment_status` :

```sql
FROM (
  SELECT f.order_id,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE f.status = 'pending')   AS pend,
         ... ,
         MAX(o2.payment_gateway) AS payment_gateway,
         MAX(o2.payment_status)  AS payment_status
  FROM pd_fulfillment f
  JOIN pd_order o2 ON o2.id = f.order_id
  WHERE f.order_id = $1
  GROUP BY f.order_id
) sub,
LATERAL (SELECT CASE ... ELSE CASE
           WHEN sub.payment_gateway IN ('cod','manual_mandat')
                AND sub.payment_status != 'captured' THEN 'payment_required'
           ELSE 'pending' END
         END AS next_status) ns
```

Validé par exécution : `CORRECTED SYNC SQL: VALID`.

### 🔴 Défaut 2 — Numéro de migration déjà utilisé

L'audit prescrit `086_multi_vendor_order_statuses.sql`. Or `086_enable_rls_pd_tables.sql` existe déjà et le dernier numéro utilisé est **101**. Créer un doublon `086` aurait déclenché l'avertissement de préfixe dupliqué du runner (couvert par `migration-integrity.test.ts`) et un ordonnancement non déterministe.

**Correction** : migration créée sous **`102_multi_vendor_order_statuses.sql`** (+ `.down.sql` réversible, absent de l'audit d'origine).

Précision factuelle au passage : l'audit sous-entend qu'une contrainte `pd_order_status_check` existe (`DROP CONSTRAINT IF EXISTS` puis `ADD`). Vérifié : **aucune contrainte `CHECK` n'existait** sur `pd_order.status` (colonne `VARCHAR(30)` nue dans `001_initial_schema.sql`). La migration en **ajoute** une — bénéfice réel, mais il faut savoir que c'est un durcissement, pas un remplacement.

---

## 3. Omissions qui auraient cassé l'existant (corrigées)

L'audit ne traite pas les **consommateurs** des statuts de commande. Ajouter deux états sans mettre à jour les filtres revient à faire disparaître silencieusement les commandes concernées des revenus, des compteurs et des droits.

| # | Omission | Impact si non corrigé | Correction |
|---|---|---|---|
| 1 | **GMV & commandes payées** (`analytics.service.ts`, 6 requêtes) filtraient `status IN ('processing','fulfilled','delivered')` | Une commande `partially_shipped` ou `partially_delivered` **disparaît du chiffre d'affaires** et du compteur de commandes payées | Les deux états ajoutés partout |
| 2 | **Réconciliation analytique** (`analytics-reconciliation.service.ts`) mappait le bucket `delivered` | Commandes partielles non réconciliées | États ajoutés au bucket |
| 3 | **Compteurs de commandes ouvertes** (`store.service.ts` ×2) filtraient `IN ('pending','processing')` | Une commande partiellement expédiée n'apparaît plus comme « ouverte » pour le vendeur | `payment_required` + `partially_shipped` ajoutés |
| 4 | **Score de confiance vendeur** (`seller-trust.service.ts` ×2) filtrait `IN ('delivered','fulfilled','paid')` | Ventes partielles non comptées **et** littéral `'paid'` inexistant dans le domaine | États ajoutés, `'paid'` remplacé par `payment_status = 'captured'` |
| 5 | **Profil d'intérêt acheteur**, **acheteur vérifié** (`store-subscription`), **attribution des campagnes** (`seller-broadcast`) | Signaux d'achat perdus ; un acheteur avec une commande partiellement livrée n'était plus « vérifié » | États ajoutés aux trois requêtes |
| 6 | **Garde d'annulation** `cancel()` n'interdisait que `fulfilled` / `delivered` | Un acheteur pouvait **annuler une commande partiellement expédiée** → remise en stock de marchandise en transit | `partially_shipped` et `partially_delivered` ajoutés à la garde |

Correction supplémentaire non demandée par l'audit mais de la même famille que la Cause Racine 2 : `markPaidInTransaction` faisait le même faux positif (une capture tardive sur une commande `delivered + shipped` la basculait en `delivered`). La condition exige désormais qu'aucun colis ne soit `pending`/`preparing`/`shipped`.

---

## 4. Améliorations apportées au-delà de l'audit

1. **Isolation locative des colis (sécurité)** — l'audit propose une agrégation `fulfillments` non filtrée, réutilisée pour `listByStorefrontCustomer`. Appliquée telle quelle, **un client d'une boutique verrait le colis, le transporteur et le numéro de suivi d'un autre vendeur** de la même commande maître. Implémentation : le SQL d'agrégation est paramétré (`BUYER_FULFILLMENTS_ALL` vs `buyerFulfillmentsForStore($n)`) — portée boutique pour les clients storefront, portée complète pour le Hub.
2. **`getBuyerOrderDetail`** — l'audit demande d'enrichir `getById` (**BE-03**), mais `getById` est utilisé en interne par les gardes de paiement, d'annulation et de compensation : y ajouter deux agrégations JSON aurait alourdi des chemins critiques sans bénéfice. Une méthode dédiée a été créée pour les routes acheteur (`GET /orders/:id`, `GET /orders/storefront/:id`), avec portée boutique pour un vendeur consultant la route.
3. **Repli articles numériques** — un produit numérique ne génère aucun `pd_fulfillment`. Le rendu multi-colis proposé les aurait **fait disparaître de l'écran**. Ajout d'une section « Articles numériques (sans expédition) » listant les articles dont la boutique n'a pas de colis, avec le bouton de téléchargement conservé.
4. **Indicateur de progression** — « 1/2 expédié », « 2/2 livré » en en-tête des colis, en plus des badges par colis.
5. **Actions par colis** — « Message » et « Signaler » sont désormais attachés au colis (donc au vendeur) plutôt qu'à chaque ligne d'article : moins de bruit, et l'action correspond à l'entité réelle.
6. **UPS ajouté** aux liens de suivi transporteur (l'audit couvrait Aramex, La Poste, DHL, FedEx ; UPS était déjà présent dans les options transporteur du tableau de bord vendeur).
7. **Migration réversible** — `102_..._down.sql` ramène `partially_shipped → fulfilled` et `partially_delivered → delivered` avant de retirer la contrainte, pour que le domaine antérieur reste valide.
8. **Contrats de types partagés** — `BuyerOrderPackage` / `BuyerOrderPackageItem` placés dans `packages/types/src/dtos.ts` (l'audit les décrivait sans emplacement), donc réutilisables par le storefront.

---

## 5. Tests ajoutés (l'audit ne prévoyait que **BE-04**, sans code)

| Fichier | Type | Couverture |
|---|---|---|
| `backend/src/__tests__/multi-vendor-status.test.ts` | Contrat SQL (3 tests) | Ordre exact de l'échelle de décision ; **garde anti-régression vérifiant que le `LATERAL` ne référence jamais `o.`** (le défaut 1 ne peut plus revenir) ; comptage des colis annulés |
| `backend/src/__tests__/multi-vendor-status.integration.test.ts` | PostgreSQL réel (10 tests) | Table de vérité complète exécutée : `pending/pending`, `preparing/*`, `shipped/pending`, `shipped/preparing`, `shipped/shipped`, `shipped/cancelled`, `delivered/shipped`, `delivered/pending`, `delivered/delivered`, `delivered/cancelled`, `cancelled/cancelled`, repli COD `payment_required`, progression COD non capturée, non-résurrection d'une commande `refunded` |
| `order-status-sync.test.ts` | Mis à jour | Assertions réalignées sur la nouvelle échelle (les anciennes vérifiaient `sub.pend = 0`) |

État des suites après implémentation : **backend 139 fichiers / 1607 tests verts**, **frontend 68 / 572 verts**, `tsc --noEmit` propre sur les deux workspaces, ESLint 0 erreur.

---

## 6. Points de l'audit délibérément non suivis (avec justification)

| Élément de l'audit | Décision | Raison |
|---|---|---|
| Migration `086` | Renumérotée `102` | `086` déjà pris ; préfixe dupliqué détecté par les tests d'intégrité |
| `LATERAL` référençant `o.` | Réécrit | Illégal en PostgreSQL (prouvé par exécution) |
| **BE-03** « enrichir `getById` » | Méthode dédiée `getBuyerOrderDetail` | `getById` sert les gardes de paiement/annulation ; ne pas l'alourdir |
| Agrégation `fulfillments` unique pour les deux `listBy*` | Version paramétrée par boutique | Sinon fuite d'informations inter-vendeurs côté storefront |
| `<img src>` brut pour les vignettes | Conservé mais avec `eslint-disable` explicite | Cohérent avec le reste de la page ; passage à `next/image` = chantier séparé (domaines, tailles) |
| Libellés en dur en français dans la page acheteur | Conservés tels quels | La page acheteur du Hub n'utilise pas encore `useLocale` ; l'i18n de cette page est un chantier distinct (déjà listé dans l'audit combiné) |

---

## 7. Reste à faire (non bloquant)

- **QA-01 → QA-06** de `05-master-todo-checklist.md` : parcours réel à deux boutiques (nécessite une commande de test en production).
- Page **storefront** « Mes commandes » (`store/[storeHost]/account/orders`) : elle n'affiche aujourd'hui qu'un badge binaire payé/en attente et ne consomme pas encore `fulfillments` (le backend le renvoie déjà, avec portée boutique). Amélioration recommandée, hors périmètre du problème signalé (page acheteur du Hub).
- i18n de la page acheteur du Hub (fr/en/ar).
