# 02 - Plan d'Implémentation : Refonte & Amélioration de la Page « Mes Commandes » (`/hub/orders`)
> **Révisé et corrigé le 31/08/2026** (Zhipu GLM 3.7 / opencode) — voir `00-revue-critique-et-verifications.md`.

---

## 0. 🔧 État des lieux corrigé — ce qui est DÉJÀ FAIT

Le plan d'origine a été écrit avant les commits `39ee640` et `ca0aff1`. Sont **implémentés et déployés** :

| Capacité du plan d'origine | État | Commit |
|---|---|---|
| Découpage multi-colis par boutique, badge par colis, transporteur + n° de suivi, « Suivre mon colis ↗ » (Aramex, La Poste, DHL, FedEx, UPS) | ✅ **FAIT** | `39ee640` |
| Articles regroupés par colis avec vignettes | ✅ **FAIT** | `39ee640` |
| Repli « Articles numériques (sans expédition) » avec bouton de téléchargement | ✅ **FAIT** | `39ee640` |
| Filtres par statut incluant les états partiels (`partially_shipped`, `partially_delivered`) | ✅ **FAIT** | `39ee640` |
| Indicateur de progression « 1/2 expédié » | ✅ **FAIT** | `39ee640` |
| Messagerie vendeur + signalement rattachés au colis | ✅ **FAIT** | `39ee640` |

**Restent donc réellement à faire** (périmètre de ce plan révisé) : la **recherche**, les **filtres manquants**, l'affichage des **clés de licence copiables**, et l'**audit accessibilité/mobile**. Le plan 03 (double style) couvre par ailleurs la refonte visuelle.

---

## 1. Périmètre restant

### 1.1 🔧 Recherche — le point crucial corrigé

**Le plan d'origine proposait une recherche client-side. C'est trompeur** : `listByCustomer` est paginée (20/page) ; filtrer côté client ne cherche que dans la page courante. Une recherche « Vase » qui ne trouve rien parce que la commande est en page 3 est un bug UX, pas une fonctionnalité.

**Correction** : ajouter un paramètre `search` côté backend, en **mirror de l'implémentation existante de `listByStore`** (qui recherche sur n° de commande, e-mail, nom, téléphone, référence de paiement, n° de suivi) :

```typescript
// order.service.ts — listByCustomer, après le filtre de statut
if (search) {
  params.push(`%${search.toLowerCase()}%`);
  where += ` AND (
    LOWER(o.id) LIKE $${params.length}
    OR LOWER(COALESCE(u.email, '')) LIKE $${params.length}
    OR LOWER(COALESCE(u.first_name, '')) LIKE $${params.length}
    OR LOWER(COALESCE(u.last_name, '')) LIKE $${params.length}
    OR EXISTS (SELECT 1 FROM pd_order_item si
               LEFT JOIN pd_store ss ON ss.id = si.store_id
               LEFT JOIN pd_product sp ON sp.id = si.product_id
               WHERE si.order_id = o.id
                 AND (LOWER(si.title) LIKE $${params.length}
                      OR LOWER(COALESCE(ss.name, '')) LIKE $${params.length}
                      OR LOWER(COALESCE(sp.slug, '')) LIKE $${params.length}))
  )`;
}
```
+ jointure `LEFT JOIN pd_user u` à ajouter au SELECT principal et au COUNT (comme `listByStore` le fait déjà). Ne pas oublier le paramètre dans le zod du route handler `GET /orders/me`.

Le composant `OrdersSearchBar` du plan d'origine reste valable (debounce 300 ms côté client, reset ✕) — il pilote désormais un paramètre serveur qui réinitialise la pagination.

> Règle de séparation des canaux : cette recherche est **marketplace uniquement** (`customer_id`). La page storefront garde sa liste scopée — pas de recherche à ajouter là bas v1 (volume faible).

### 1.2 🔧 Filtres de statut complétés

La liste actuelle omet `payment_required` (pertinent : commande mandat en attente de preuve) et `refunded`. Liste finale : `all, payment_required, pending, processing, partially_shipped, fulfilled, partially_delivered, delivered, cancelled, refunded`.

### 1.3 Clés de licence copiables (produits `serial`)

L'endpoint `GET /products/:id/download` retourne déjà `data.license_keys[]`. Il reste l'UI :
- Dans le repli numérique et les lignes de colis d'un produit `serial` payé : bloc « Clés de licence » listant chaque clé avec bouton **Copier** (`navigator.clipboard.writeText` + feedback inline « Copié ✓ » 1,5 s — pas d'`alert`).
- Masquer les clés par défaut (`•••••-••••`) avec révélation au clic, pour éviter l'exposition « shoulder-surfing ».
- Respecter le quota : si l'API renvoie une erreur de quota (`download_count` max atteint), afficher le message serveur tel quel.

### 1.4 Récapitulatif financier
Déjà présent (sous-total / livraison / paiement / total dans le panneau déplié). Rien à faire — retiré du périmètre.

### 1.5 Accessibilité & mobile (audit)
- Cibles tactiles ≥ 44 px sur les chips de filtre et boutons d'action de colis.
- Contrastes WCAG AA sur les badges pastel (vérifier `amber-50/amber-700` ≥ 4.5:1 — ajuster en `amber-100/amber-800` si nécessaire).
- Navigation clavier : accordéons opérables au clavier (`role="button"`, `aria-expanded`), focus visible.
- `aria-label` sur les boutons icône seule (copie, suivi ↗, œil).

---

## 2. Architecture des Composants (🔧 recadrée)

La page actuelle (~660 lignes) fonctionne. L'extraction en composants n'est **pas** une fin en soi ; la faire uniquement si l'un des deux cas suivants se présente : (a) le plan 03 ajoute une seconde vue complète → extraire alors `OrderPackageCard` et `OrdersSearchBar` pour partage entre les deux vues ; (b) la page dépasse ~900 lignes. Sinon, rester monofichier (cohérent avec le reste du codebase).

```
hub/orders/
├── page.tsx                      # état, fetch (search + status + page), rendu
├── components/                   # à créer uniquement avec le plan 03
│   ├── OrdersSearchBar.tsx       # recherche (debounce) + chips de statut
│   └── OrderPackageCard.tsx      # carte colis (partagée entre les 2 vues du plan 03)
```

---

## 3. Guide d'Implémentation (résumé)

1. **Backend** : paramètre `search` dans `listByCustomer` (mirror `listByStore`) + zod `GET /orders/me` + COUNT aligné. Tests : recherche par suffixe d'ID, par titre d'article, par nom de boutique ; insensible à la casse ; pagination réinitialisée.
2. **Frontend** : `search` en état local + debounce 300 ms → refetch page 1 ; chips complétées (`payment_required`, `refunded`).
3. **Clés de licence** : composant `LicenseKeyRow` (masqué/révélé/copie), branché sur la réponse existante du endpoint download.
4. **A11y** : passe sur les points 1.5.

Le JSX des composants `OrdersSearchBar` et `OrderPackageCard` du plan d'origine reste utilisable quasi tel quel (remplacer l'emoji ✕ par l'icône `X` de lucide pour la cohérence).

---

## 4. Checklist de Validation (TODO) — 🔧 mise à jour

- [ ] **ORD-BE-01** *(nouveau)* : Paramètre `search` serveur dans `listByCustomer` (+ COUNT + zod), tests unitaires.
- [ ] **ORD-UI-01** : Barre de recherche avec debounce branchée sur le paramètre serveur (reset pagination).
- [ ] **ORD-UI-02** : Chips de statut complétées (`payment_required`, `refunded`).
- [ ] **ORD-UI-03** : Clés de licence masquées/révélées/copiables + gestion d'erreur de quota.
- [ ] **ORD-UI-04** : Passe accessibilité (cibles, contrastes, clavier, aria) + vérification mobile 375 px.
- [x] ~~ORD-UI-05 / ORD-UI-06~~ : multi-colis + tracking + messagerie — **déjà livrés** (`39ee640`).
