# PandaMarket — Roadmap de Développement

> **Version :** 1.0 | **Date :** 02 Mai 2026 | **Durée estimée :** 16 semaines

---

## Phase 1 : Core Backend (Semaine 1–3)

> Poser les fondations du backend avec MedusaJS étendu.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Initialiser MedusaJS avec PostgreSQL + Redis | P0 | `[ ]` |
| Configurer l'environnement Docker (dev) | P0 | `[ ]` |
| Étendre le modèle `Store` (status, plan, domain, theme, payment_config) | P0 | `[ ]` |
| Créer la table `Subscription_Limits` + logique quotas | P0 | `[ ]` |
| Créer les tables `Verification_Documents`, `Vendor_Wallet`, `Vendor_Credits`, `Reports` | P0 | `[ ]` |
| Implémenter le processus KYC (vérification manuelle) | P0 | `[ ]` |
| Tests unitaires du core backend | P0 | `[ ]` |

**🎯 Milestone :** API MedusaJS étendue fonctionnelle. Un vendeur peut s'inscrire, choisir un plan, et les quotas sont appliqués.

---

## Phase 2 : Multi-Tenant Frontend (Semaine 4–6)

> Chaque vendeur a son propre site web fonctionnel.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Créer le projet Next.js (App Router) | P0 | `[ ]` |
| Middleware de détection hostname (hub vs boutique) | P0 | `[ ]` |
| Système de thèmes (chargement dynamique par `theme_id`) | P0 | `[ ]` |
| Créer 3 thèmes de base (Minimal, Classic, Modern) | P0 | `[ ]` |
| Dashboard vendeur : Produits, Commandes, Paramètres | P0 | `[ ]` |
| Configurer Caddy wildcard SSL + sous-domaines dynamiques | P0 | `[ ]` |
| Support domaines personnalisés | P1 | `[ ]` |
| Intégrer GrapesJS/Craft.js (Page Builder) | P1 | `[ ]` |
| Personnalisation (couleurs, logo, favicon) | P0 | `[ ]` |

**🎯 Milestone :** 3 boutiques test avec des thèmes différents fonctionnent simultanément sur des sous-domaines.

---

## Phase 3 : Marketplace Hub & Search (Semaine 7–9)

> Le Hub central agrège tous les produits avec recherche instantanée.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Installer et configurer Meilisearch | P0 | `[ ]` |
| Sync automatique : `published` → index Meilisearch | P0 | `[ ]` |
| Page d'accueil Hub (hero, catégories, tendances) | P0 | `[ ]` |
| Recherche instantanée (search-as-you-type) | P0 | `[ ]` |
| Filtres avancés (catégorie, vendeur, prix) | P0 | `[ ]` |
| Panier multi-vendeurs + page checkout | P0 | `[ ]` |
| SEO (meta tags, sitemap, Open Graph) | P1 | `[ ]` |
| Responsive design mobile-first | P0 | `[ ]` |

**🎯 Milestone :** Recherche < 50ms sur 100k produits. Panier multi-vendeurs fonctionnel.

---

## Phase 4 : Paiements Locaux & Shipping (Semaine 10–11)

> Intégration des passerelles tunisiennes et de la logistique.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Plugin Medusa pour **Flouci** | P0 | `[ ]` |
| Plugin Medusa pour **Konnect** | P0 | `[ ]` |
| `PaymentProvider` **manual_mandat** + interface upload preuve | P0 | `[ ]` |
| Interface admin : file de validation Mandat Minute | P0 | `[ ]` |
| Paiement à la Livraison (COD) | P0 | `[ ]` |
| Logique Escrow : wallet vendeur + rétention + retrait | P0 | `[ ]` |
| Logique Paiement Direct (clés API vendeur, plans Pro+) | P1 | `[ ]` |
| Order Splitting : fulfillments séparés par vendeur | P0 | `[ ]` |
| Intégration API Aramex + La Poste TN | P1 | `[ ]` |

**🎯 Milestone :** Parcours complet checkout → paiement sur chaque passerelle.

---

## Phase 5 : IA & Workers (Semaine 12–13)

> Services IA asynchrones pour les vendeurs.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Configurer BullMQ avec workers dédiés | P0 | `[ ]` |
| Worker : compression d'image via `sharp` | P1 | `[ ]` |
| Worker : AI SEO via Gemini Pro API | P1 | `[ ]` |
| Système de tokens (décrément, blocage, achat de packs) | P1 | `[ ]` |
| Notifications temps réel (WebSocket) | P1 | `[ ]` |
| Dashboard vendeur : section IA + historique | P1 | `[ ]` |

**🎯 Milestone :** Compression + SEO auto fonctionnels. Traitement image 10Mo < 5s.

---

## Phase 6 : API, Sync & Polish (Semaine 14–16)

> Intégrations externes et finalisation.

| Tâche | Priorité | Statut |
| :--- | :--- | :--- |
| Gestion clés API vendeur (génération/révocation) | P1 | `[ ]` |
| Import/Export CSV + Excel (stocks) | P0 | `[ ]` |
| Webhooks sortants (`order.placed`, `stock.updated`) | P1 | `[ ]` |
| Produits numériques : téléchargements temporaires + clés de licence | P1 | `[ ]` |
| Documentation API publique (Swagger) | P1 | `[ ]` |
| Audit de sécurité + tests de charge | P0 | `[ ]` |
| Polish UI + correction bugs | P0 | `[ ]` |
| Préparation déploiement production | P0 | `[ ]` |

**🎯 Milestone :** MVP prêt — Parcours complet vendeur (inscription → boutique → vente → paiement → retrait).

---

## Dépendances

```
Phase 1 (Backend) → Phase 2 (Frontend) → Phase 3 (Hub) → Phase 4 (Paiements) → Phase 5 (IA) → Phase 6 (Polish)
```

---

## Risques

| Risque | Impact | Mitigation |
| :--- | :--- | :--- |
| Complexité multi-tenant sous-estimée | Élevé | Prototyper le middleware hostname en Phase 1 |
| API Flouci/Konnect instable | Moyen | Tester les sandbox dès Phase 1 |
| Performance Meilisearch à grande échelle | Moyen | Load test dès Phase 3 |
| Coûts API Gemini Pro | Faible | Système de tokens pour contrôler la consommation |
| Scalabilité MinIO local | Moyen | Plan de migration vers R2/S3 documenté |
