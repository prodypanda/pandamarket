# PandaMarket — Modèle Économique (Business Model)

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Proposition de Valeur

PandaMarket offre une solution tout-en-un pour les vendeurs tunisiens :
- **Boutique individuelle** avec sous-domaine gratuit et domaine personnalisable.
- **Visibilité sur le Hub central** (effet marketplace).
- **Passerelles de paiement locales** (Flouci, Konnect, Mandat Minute, COD).
- **Outils IA** pour optimiser les fiches produits.
- **Intégrations ERP** via API et Webhooks.

---

## 2. Sources de Revenus

### 2.1 Commissions (Modèle Free)

| Événement | Taux | Détail |
| :--- | :--- | :--- |
| Vente sur le Hub | 15% | Prélevé automatiquement à la capture du paiement |
| Vente sur la boutique individuelle | 15% | Même taux |

### 2.2 Abonnements Annuels (0% commission)

| Plan | Prix Estimé (TND/an) | Cible |
| :--- | :--- | :--- |
| **Starter** | 300 | Petit vendeur débutant |
| **Regular** | 600 | Vendeur établi |
| **Agency** | 1 200 | Agence / multi-marques |
| **Pro** | 2 400 | Commerce sérieux |
| **Golden** | 4 800 | Grande enseigne |
| **Platinum** | 9 600 | Entreprise / White Label |

> ⚠️ Les prix ci-dessus sont des estimations à valider selon l'étude de marché tunisien.

### 2.3 Add-ons (Options à la carte)

| Option | Prix Estimé | Description |
| :--- | :--- | :--- |
| Pack 100 tokens IA | 15 TND | Crédits pour compression + SEO |
| Pack 500 tokens IA | 60 TND | Volume discount |
| Thème Premium | 50-200 TND | Templates haut de gamme |
| Domaine Custom Setup | Gratuit (inclus Starter+) | Configuration SSL automatique |

### 2.4 Marketplace de Thèmes

Les développeurs tiers pourront proposer des thèmes payants. PandaMarket prendra une commission (ex: 30%) sur chaque vente de thème.

---

## 3. Flux Financier Détaillé

### 3.1 Mode Escrow (Free + Plans Standards)

```
Client paie 100 TND (via Flouci)
    │
    ├── Frais passerelle Flouci : ~2 TND (2%)
    │
    ├── Si plan Free : Commission PandaMarket = 15 TND (15%)
    │   └── Vendeur reçoit : 83 TND → Wallet (après rétention)
    │
    └── Si plan Yearly : Commission PandaMarket = 0 TND
        └── Vendeur reçoit : 98 TND → Wallet (après rétention)
```

### 3.2 Périodes de Rétention

| Type de paiement | Rétention |
| :--- | :--- |
| Flouci / Konnect | 7 jours |
| Mandat Minute | 14 jours (validation manuelle) |
| COD | Après confirmation de livraison |

### 3.3 Mode Direct (Pro+)

```
Client paie 100 TND (via Flouci du vendeur)
    │
    └── 100 TND → Directement sur le compte du vendeur
        (frais de passerelle à la charge du vendeur)
```

---

## 4. Comparaison des Plans

| Fonctionnalité | Free | Starter | Regular | Agency | Pro | Golden | Platinum |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Prix** | 0 | 300/an | 600/an | 1200/an | 2400/an | 4800/an | 9600/an |
| **Commission** | 15% | 0% | 0% | 0% | 0% | 0% | 0% |
| **Produits** | 10 | 50 | 100 | 300 | ∞ | ∞ | ∞ |
| **Images/produit** | 2 | 5 | 7 | 10 | 15 | 20 | 30 |
| **Sous-domaine** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Domaine custom** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ WL |
| **Page Builder** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI SEO** | ❌ | Basique | Basique | Avancé | Illimité | Illimité | Premium |
| **Compression** | ❌ | Basique | Basique | Avancé | Illimité | Illimité | Premium |
| **Paiement Direct** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **API/Webhooks** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Support** | Forum | Email | Email | Prioritaire | Dédié | Dédié | Dédié |

---

## 5. Métriques Clés (KPIs)

| KPI | Description | Cible Année 1 |
| :--- | :--- | :--- |
| **GMV** | Gross Merchandise Value (volume de ventes total) | 500K TND |
| **Nombre de vendeurs** | Vendeurs actifs sur la plateforme | 200 |
| **Taux de conversion** | Free → Payant | 15% |
| **ARPU** | Average Revenue Per User (vendeur) | 100 TND/mois |
| **Churn** | Taux de désabonnement mensuel | < 5% |
| **NPS** | Net Promoter Score | > 50 |

---

## 6. Avantage Concurrentiel

| Avantage | Détail |
| :--- | :--- |
| **Local-first** | Passerelles tunisiennes natives (Flouci, Konnect, Mandat Minute) |
| **Hybride SaaS + Marketplace** | Boutique propre + visibilité Hub (aucun concurrent local offre les deux) |
| **IA intégrée** | SEO et compression automatiques (différenciant fort) |
| **Flexible** | 7 niveaux d'abonnement pour tous les budgets |
| **Open Architecture** | API/Webhooks pour les vendeurs tech-savvy |
