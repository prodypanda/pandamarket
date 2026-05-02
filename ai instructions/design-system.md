# PandaMarket — Design System

> **Version :** 1.0 | **Date :** 02 Mai 2026

---

## 1. Identité Visuelle

### 1.1 Palette de Couleurs

#### Couleurs Principales

| Nom | Hex | HSL | Usage |
| :--- | :--- | :--- | :--- |
| **Panda Black** | `#1A1A2E` | `240, 28%, 14%` | Backgrounds principaux, textes |
| **Panda Green** | `#16C784` | `152, 78%, 44%` | CTA primaire, succès, accents |
| **Panda Green Light** | `#1EE69A` | `152, 80%, 51%` | Hover CTA, highlights |
| **Panda White** | `#F8F9FC` | `225, 33%, 97%` | Backgrounds clairs |
| **Panda Blue** | `#3B82F6` | `217, 91%, 60%` | Liens, éléments interactifs |

#### Couleurs Sémantiques

| Nom | Hex | Usage |
| :--- | :--- | :--- |
| **Success** | `#16C784` | Paiement confirmé, vérifié |
| **Warning** | `#F5A623` | Attention, en attente |
| **Error** | `#EA3943` | Erreur, rejeté, suppression |
| **Info** | `#3B82F6` | Information, liens |

#### Couleurs Neutres

| Nom | Hex | Usage |
| :--- | :--- | :--- |
| **Gray 900** | `#111827` | Texte principal |
| **Gray 700** | `#374151` | Texte secondaire |
| **Gray 500** | `#6B7280` | Texte tertiaire, placeholders |
| **Gray 300** | `#D1D5DB` | Bordures, séparateurs |
| **Gray 100** | `#F3F4F6` | Backgrounds légers |
| **Gray 50** | `#F9FAFB` | Backgrounds subtils |

#### Mode Sombre (Dark Mode)

| Élément | Couleur |
| :--- | :--- |
| Background principal | `#0F0F23` |
| Background surface | `#1A1A2E` |
| Background élevé | `#25253D` |
| Texte principal | `#E2E8F0` |
| Texte secondaire | `#94A3B8` |
| Bordures | `#2D2D4A` |

---

### 1.2 Typographie

#### Police Principale : **Inter**

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

#### Échelle Typographique

| Nom | Taille | Poids | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display XL** | 48px / 3rem | 800 | 1.1 | Hero titles |
| **Display** | 36px / 2.25rem | 700 | 1.2 | Page titles |
| **H1** | 30px / 1.875rem | 700 | 1.3 | Section titles |
| **H2** | 24px / 1.5rem | 600 | 1.35 | Card titles |
| **H3** | 20px / 1.25rem | 600 | 1.4 | Sub-sections |
| **Body Large** | 18px / 1.125rem | 400 | 1.6 | Lead paragraphs |
| **Body** | 16px / 1rem | 400 | 1.6 | Texte courant |
| **Body Small** | 14px / 0.875rem | 400 | 1.5 | Légendes, metadata |
| **Caption** | 12px / 0.75rem | 500 | 1.4 | Labels, badges |
| **Overline** | 11px / 0.6875rem | 600 | 1.5 | Catégories, tags (uppercase) |

---

### 1.3 Espacement (Spacing Scale)

Base : **4px**

| Token | Valeur | Usage |
| :--- | :--- | :--- |
| `--space-1` | 4px | Espacement minimal (icône-texte) |
| `--space-2` | 8px | Padding interne compact |
| `--space-3` | 12px | Padding boutons small |
| `--space-4` | 16px | Padding standard |
| `--space-5` | 20px | Gap entre éléments |
| `--space-6` | 24px | Padding cartes |
| `--space-8` | 32px | Espacement sections |
| `--space-10` | 40px | Margin sections |
| `--space-12` | 48px | Espacement large |
| `--space-16` | 64px | Sections majeures |
| `--space-20` | 80px | Hero spacing |

### 1.4 Rayons de Bordure (Border Radius)

| Token | Valeur | Usage |
| :--- | :--- | :--- |
| `--radius-sm` | 6px | Inputs, badges |
| `--radius-md` | 8px | Boutons, dropdowns |
| `--radius-lg` | 12px | Cartes |
| `--radius-xl` | 16px | Modals, large cards |
| `--radius-2xl` | 24px | Containers hero |
| `--radius-full` | 9999px | Avatars, pills |

### 1.5 Ombres (Box Shadows)

| Token | Valeur | Usage |
| :--- | :--- | :--- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Inputs au repos |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cartes |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Modals |
| `--shadow-glow` | `0 0 20px rgba(22,199,132,0.3)` | CTA hover (Panda Green glow) |

---

## 2. Composants UI

### 2.1 Boutons

| Variante | Background | Texte | Border | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | Panda Green | White | — | Actions principales (Acheter, Publier) |
| **Secondary** | Transparent | Panda Green | 1px Panda Green | Actions secondaires |
| **Ghost** | Transparent | Gray 700 | — | Actions tertiaires |
| **Danger** | Error Red | White | — | Supprimer, Rejeter |
| **Disabled** | Gray 100 | Gray 400 | — | État désactivé |

**Tailles :**
- **Small** : 32px height, 12px padding-x, 14px font
- **Medium** : 40px height, 16px padding-x, 14px font
- **Large** : 48px height, 24px padding-x, 16px font

**Animations :**
- Hover : `scale(1.02)` + shadow-glow (150ms ease)
- Active : `scale(0.98)` (100ms)
- Transition : `all 0.15s ease`

### 2.2 Cartes Produit

```
┌─────────────────────────┐
│  ┌───────────────────┐  │
│  │                   │  │  ← Image (aspect-ratio: 1/1)
│  │      IMAGE        │  │
│  │                   │  │
│  └───────────────────┘  │
│  CATÉGORIE               │  ← Overline, Gray 500
│  Nom du Produit          │  ← H3, Gray 900, max 2 lignes
│  ★★★★☆ (42)             │  ← Rating + count
│  85.000 TND              │  ← H2, Panda Green, font-weight 700
│  Boutique Vendeur →      │  ← Body Small, lien bleu
└─────────────────────────┘
```

- Border-radius : `--radius-lg`
- Shadow : `--shadow-md` (hover → `--shadow-lg`)
- Hover : Image scale(1.05) avec overflow hidden
- Transition : `0.3s ease`

### 2.3 Badges

| Type | Background | Texte | Usage |
| :--- | :--- | :--- | :--- |
| **Vérifié** | Green/10% | Green | Vendeur vérifié ✓ |
| **En attente** | Warning/10% | Warning | KYC pending |
| **Suspendu** | Error/10% | Error | Compte suspendu |
| **Plan** | Blue/10% | Blue | Starter, Pro, Platinum... |
| **Nouveau** | Green gradient | White | Nouveau produit |

### 2.4 Inputs & Formulaires

- Height : 44px (medium), 36px (small)
- Border : 1px `Gray 300`
- Border focus : 2px `Panda Green`
- Border-radius : `--radius-sm`
- Transition focus : `box-shadow 0.15s ease` + glow subtil
- Label : Body Small, Gray 700, margin-bottom 4px
- Error state : Border `Error Red` + message en dessous

### 2.5 Navigation

**Navbar (Hub) :**
- Height : 64px
- Background : `Panda Black` (ou `white` en mode clair)
- Logo à gauche, Search bar au centre, User actions à droite
- Sticky top avec backdrop-blur en scroll

**Sidebar (Dashboard) :**
- Width : 260px (desktop), collapsed 72px (tablet)
- Background : `#0F0F23`
- Active item : Left border 3px Panda Green + background alpha

---

## 3. Animations & Micro-interactions

### 3.1 Transitions Globales

```css
/* Transition par défaut */
--transition-fast: 0.15s ease;
--transition-base: 0.25s ease;
--transition-slow: 0.35s ease;
```

### 3.2 Animations Clés

| Élément | Animation | Durée |
| :--- | :--- | :--- |
| Page load | Fade-in + slide-up (20px) | 0.4s |
| Card hover | Scale(1.02) + shadow lift | 0.25s |
| Image hover | Scale(1.05) dans container | 0.3s |
| Button click | Scale(0.98) → Scale(1) | 0.15s |
| Modal open | Fade-in + scale(0.95 → 1) | 0.25s |
| Toast notification | Slide-in from right | 0.3s |
| Skeleton loading | Pulse shimmer gradient | 1.5s loop |
| Search results | Stagger fade-in (50ms delay each) | 0.2s/item |

### 3.3 Loading States

- **Skeleton screens** : Préférés aux spinners pour le contenu (cartes, listes).
- **Spinner** : Uniquement pour les actions (bouton submit, upload).
- Couleur spinner : Panda Green

---

## 4. Responsive Breakpoints

| Nom | Valeur | Cible |
| :--- | :--- | :--- |
| `--mobile` | 0 – 639px | Mobile |
| `--tablet` | 640px – 1023px | Tablette |
| `--desktop` | 1024px – 1279px | Desktop |
| `--wide` | 1280px+ | Large desktop |

**Grille produits :**
- Mobile : 2 colonnes
- Tablet : 3 colonnes
- Desktop : 4 colonnes
- Wide : 5 colonnes

**Container max-width :** 1280px avec padding 16px (mobile) / 24px (desktop)

---

## 5. Iconographie

**Bibliothèque recommandée :** Lucide Icons (open-source, cohérent, léger)

```bash
npm install lucide-react
```

- Taille par défaut : 20px
- Stroke width : 1.75
- Couleur : hérite du texte parent

---

## 6. Logo PandaMarket

- **Format :** SVG (vectoriel)
- **Variantes :** Full (logo + texte), Icon only (icône seule), Monochrome (blanc)
- **Espace de sécurité :** Minimum 1x la hauteur du symbole autour du logo
- **Taille minimale :** 32px height (icône), 120px width (full)
