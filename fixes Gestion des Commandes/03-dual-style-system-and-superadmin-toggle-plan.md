# 03 - Plan d'Implémentation : Système Double Style & Bascule Superadmin
> **Révisé et corrigé le 31/08/2026** (Zhipu GLM 3.7 / opencode) — voir `00-revue-critique-et-verifications.md`. Ce plan contenait **4 défauts bloquants** (table inexistante, format de valeur faux, numéro de migration pris, chaîne d'exposition incomplète) — tous corrigés ci-dessous.

---

## 1. Problématique & Objectifs

Offrir deux styles d'interface pour « Mes Commandes » (`/hub/orders`), pilotés par le Superadmin depuis `/admin/settings`, persistés en base, servis au navigateur via l'endpoint public des réglages marketplace.

---

## 2. Définition des Deux Styles

*(Inchangé par rapport au plan d'origine — les deux directions restent valides.)*

| | Style 1 : `modern_cards` | Style 2 : `timeline_logistics` |
|---|---|---|
| Direction | Minimalisme SaaS premium (Panda Emerald) | Haute densité logistique (AliExpress / Amazon) |
| En-tête | `#ORD-123` gras, date longue, badge pastel, total en émeraude `#16C784` | Identifiant + stepper horizontal 5 jalons |
| Contenu | 4 métriques clés, cartes colis `border-gray-100`, boutons `rounded-full` | Cartes colis compactes, puces transporteur vives, « Suivre mon colis ↗ » en action principale |
| Stepper | Non | 5 jalons : Commande reçue → Paiement validé → Préparation → Expédiée → Livrée |

---

## 3. 🔧 Corrections apportées au plan d'origine

### 3.1 Migration — table, format, numéro (3 corrections)

Le plan d'origine :
```sql
-- ❌ FAUX ×3 : table inexistante, valeur JSON-quotée, numéro pris
INSERT INTO pd_platform_settings (key, value, description) VALUES ('buyer_orders_theme_style', '"modern_cards"', …)
```

**Corrigé** — la table réelle est **`pd_platform_config`**, la convention de stockage est une **chaîne brute** (cf. `coerceSettingValue` : `value === 'true'`, `Number(value)`…), et les migrations 086–102 sont prises :

```sql
-- 103_buyer_orders_theme_style.sql
INSERT INTO pd_platform_config (key, value, updated_at)
VALUES ('buyer_orders_theme_style', 'modern_cards', NOW())
ON CONFLICT (key) DO UPDATE SET updated_at = NOW();
```
(+ `.down.sql` : `DELETE FROM pd_platform_config WHERE key = 'buyer_orders_theme_style';`)

### 3.2 La chaîne d'exposition complète (le plan d'origine s'arrêtait à mi-chemin)

Une clé de réglage n'existe pour l'UI que si elle est déclarée **aux 6 endroits** suivants — le plan d'origine n'en couvrait que 2 :

| # | Endroit | Fichier | Sans quoi |
|---|---|---|---|
| 1 | Valeur par défaut | `backend/src/services/platform-config.service.ts` → `PLATFORM_SETTING_DEFAULTS` | la clé n'existe pas côté backend |
| 2 | Clés de section | `PLATFORM_SETTING_SECTION_KEYS.marketplace` | n'apparaît pas dans le backoffice |
| 3 | **Exposition publique** | `PUBLIC_PLATFORM_SETTING_KEYS` | **la page acheteur ne la reçoit jamais** (elle lit `/api/pd/marketplace/settings` → `getPublicSettings()` qui filtre sur cette liste blanche) |
| 4 | Type frontend partagé | `frontend/src/types/settings.ts` | TypeScript ne compile pas dans l'admin |
| 5 | Interface consommatrice | `frontend/src/lib/marketplace-theme.ts` → `MarketplaceThemeSettings` | la page acheteur ne peut pas la typer |
| 6 | Descripteur UI admin | tableau des descripteurs de `(admin)/settings/page.tsx` (`{ key, tab: 'marketplace', label, description, keywords }`) | pas d'entrée dans le panneau de réglages |

### 3.3 Le sélecteur admin — handler et emplacement

- Fonction réelle : **`updateSetting(key, value)`** (le plan appelait `handleUpdateSetting`, inexistant).
- Emplacement : onglet **marketplace** du panneau settings (la clé est en section `marketplace`, pas de restriction SuperAdmin — seules `finance`/`security` la requièrent ; à débattre : le style visuel n'a pas d'impact financier, l'accès admin suffit).
- Le JSX des cartes de sélection du plan d'origine est réutilisable tel quel (miniatures comprises) après remplacement du handler.

### 3.4 Stepper — 2 bugs de mappage corrigés

```typescript
// ❌ Plan d'origine : cancelled/refunded retombent sur l'étape 0 (« Commande reçue »)
// ❌ delivered → 5 alors que steps.length - 1 = 4 (la largeur est sauvée par Math.min, mais l'index est faux)
const getStepIndex = (st: string): number | null => {
  switch (st) {
    case 'pending': return 0;
    case 'payment_required': return 0;   // reçu, paiement non validé — l'étape 1 reste grise
    case 'processing': return 2;
    case 'partially_shipped': return 3;
    case 'fulfilled': return 3;
    case 'partially_delivered': return 4;
    case 'delivered': return 4;
    case 'cancelled':
    case 'refunded': return null;        // 🔧 état terminal distinct : ne pas rendre le stepper
    default: return 0;
  }
};
```
Rendu : si `null` → bandeau terminal rouge/gris (« Commande annulée / remboursée ») à la place du stepper.

**Note multi-colis** : le stepper reflète l'**agrégat** de commande. Pour une commande `partially_shipped`, l'étape 3 s'allume alors qu'un colis est encore en préparation — acceptable et honnête (le badge global dit « Partiellement expédiée ») ; l'amélioration v2 serait un stepper **par colis** dans chaque carte.

### 3.5 Cache
Les réglages sont mis en cache Redis par section (clés `pd_platform_settings:{section}` — préfixe de cache, pas une table) et invalidés par `updateSettings`. Aucune action supplémentaire : le changement est visible au prochain chargement de page côté acheteur (pas de cache navigateur sur `/api/pd/marketplace/settings`). Le « instantané » du plan d'origine = rechargement de page, pas de hot-swap — à documenter tel quel.

---

## 4. Architecture des vues

```
hub/orders/page.tsx
├── const style = settings.buyer_orders_theme_style (via useMarketplaceTheme)
├── <OrdersSearchBar />            (commun — plan 02)
├── style === 'timeline_logistics'
│     ? <TimelineLogisticsOrdersView orders={…} />   // stepper + cartes denses
│     : <ModernCardsOrdersView orders={…} />          // cartes épurées (vue actuelle refactorisée)
└── <OrderPackageCard variant={style} … />            // carte colis partagée, variant="dense"|"airy"
```

La vue actuelle (commit `39ee640`) devient `ModernCardsOrdersView` par extraction — pas de réécriture. `TimelineLogisticsOrdersView` ajoute le stepper en tête de commande et passe `variant="dense"` aux cartes.

**i18n** : tous les libellés des deux vues via `t('dashboardPages.orders.*')`… sauf que la page acheteur Hub n'utilise **pas encore** `useLocale` (libellés FR codés — chantier i18n déjà listé). En attendant : libellés FR codés **à l'identique de l'existant**, et l'i18n de la page traitera les deux vues d'un coup.

---

## 5. Checklist de Validation (TODO) — 🔧 mise à jour

- [ ] **STYLE-01** : Migration **`103`**_buyer_orders_theme_style.sql (+ down) — table `pd_platform_config`, valeur brute `'modern_cards'`.
- [ ] **STYLE-02** : Enregistrement aux **6 endroits** (defaults, section marketplace, `PUBLIC_PLATFORM_SETTING_KEYS`, `types/settings.ts`, `MarketplaceThemeSettings`, descripteur admin).
- [ ] **STYLE-03** : Sélecteur graphique dans l'onglet marketplace du backoffice (handler `updateSetting`).
- [ ] **STYLE-04** : Extraction de la vue actuelle en `ModernCardsOrdersView` (refactor sans changement visuel).
- [ ] **STYLE-05** : `TimelineLogisticsOrdersView` + stepper 5 jalons **corrigé** (états terminaux distincts, index borné).
- [ ] **STYLE-06** : Bascule admin → rechargement `/hub/orders` → style appliqué ; cache Redis invalidé (vérifier `updated_at` de section).
- [ ] **STYLE-07** *(nouveau)* : Tests — valeur par défaut servie ; bascule persistée ; clé absente de `PUBLIC_PLATFORM_SETTING_KEYS` → non exposée (test négatif).
