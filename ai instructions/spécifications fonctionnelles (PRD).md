# PandaMarket — Spécifications Fonctionnelles (PRD)

> **Version :** 2.0  
> **Date :** 02 Mai 2026  
> **Produit :** PandaMarket — Plateforme MaaS (Marketplace as a Service)  
> **Statut :** Définition des exigences

---

## 1. Résumé Exécutif

PandaMarket est une plateforme hybride combinant :
- **Un Hub Marketplace central** (type Amazon) regroupant tous les produits de tous les vendeurs.
- **Des boutiques individuelles SaaS** (type Shopify) où chaque vendeur dispose de son propre site personnalisable avec sous-domaine gratuit ou domaine custom.

Le marché cible est le **marché tunisien**, avec support des passerelles de paiement locales (Flouci, Konnect, Mandat Minute, COD).

---

## 2. Personas & Acteurs

### 2.1 Acheteur (Client Final)
- Parcourt le Hub central ou une boutique individuelle.
- Peut acheter des biens physiques, numériques ou des services.
- Peut payer via Flouci, Konnect, Mandat Minute ou à la livraison.
- Peut signaler un vendeur frauduleux.

### 2.2 Vendeur
- Crée et gère sa propre boutique en ligne.
- Gère son catalogue (produits physiques, numériques, services).
- Choisit un plan d'abonnement ou le modèle gratuit avec commission.
- Peut utiliser les outils IA pour optimiser ses fiches produits.
- Peut synchroniser ses stocks via CSV/Excel ou API/Webhooks.

### 2.3 Super Admin (Plateforme)
- Valide les inscriptions vendeurs (processus KYC).
- Approuve les produits des vendeurs non vérifiés.
- Valide les preuves de paiement par Mandat Minute.
- Gère les signalements de fraude.
- Configure le comportement de l'Order Splitting.
- Gère les plans d'abonnement et les tarifs.

---

## 3. Architecture Multi-Tenante & Frontend

### F3.1 — Modèle Hybride
| Fonctionnalité | Description | Priorité |
| :--- | :--- | :--- |
| Hub Central | Portail type Amazon agrégant tous les produits publiés de tous les vendeurs | P0 |
| Boutiques Individuelles | Chaque vendeur possède son propre site web dédié | P0 |

**Critères d'acceptation :**
- Le Hub affiche uniquement les produits avec le statut `published`.
- Chaque boutique n'affiche que les produits du vendeur correspondant.
- La navigation entre le Hub et une boutique est fluide.

### F3.2 — Gestion des Domaines
| Fonctionnalité | Description | Priorité |
| :--- | :--- | :--- |
| Sous-domaine gratuit | Génération automatique : `boutique.pandamarket.tn` | P0 |
| Domaine personnalisé | Le vendeur pointe son propre domaine vers le serveur | P1 |
| SSL automatique | Certificats SSL générés dynamiquement via Caddy | P0 |

**Critères d'acceptation :**
- À la création d'un store, un sous-domaine unique est automatiquement attribué.
- Le vendeur peut configurer un domaine custom via son dashboard.
- Le SSL est provisionné automatiquement sans intervention manuelle.

### F3.3 — Moteur de Rendu des Boutiques
| Fonctionnalité | Description | Priorité |
| :--- | :--- | :--- |
| Bibliothèque de thèmes | Templates pré-construits React/Next.js (gratuits et payants) | P0 |
| Page Builder Drag & Drop | Personnalisation totale via éditeur visuel (GrapesJS/Craft.js) | P1 |
| Personnalisation de base | Couleurs, logo, favicon, textes configurables | P0 |

**Critères d'acceptation :**
- Le vendeur peut sélectionner un thème depuis une galerie.
- Le Page Builder permet de modifier la mise en page sans coder.
- Les modifications sont visibles en preview avant publication.

---

## 4. Gestion des Vendeurs & Abonnements

### F4.1 — Système de Monétisation (Deux Modèles)

#### Modèle 1 — Abonnement Annuel (Sans commission)
Six niveaux d'abonnement disponibles :

| Niveau | Produits Max | Images/Produit | Domaine Custom | AI Tools | Page Builder | Paiement Direct |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter** | 50 | 5 | ✅ | Basique | ❌ | ❌ |
| **Regular** | 100 | 7 | ✅ | Basique | ✅ | ❌ |
| **Agency** | 300 | 10 | ✅ | Avancé | ✅ | ❌ |
| **Pro** | Illimité | 15 | ✅ | Illimité | ✅ | ✅ |
| **Golden** | Illimité | 20 | ✅ | Illimité | ✅ | ✅ |
| **Platinum** | Illimité | 30 | ✅ + White Label | Premium | ✅ | ✅ |

#### Modèle 2 — Gratuit avec Commission
| Niveau | Produits Max | Images/Produit | Commission | AI Tools |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | 10 | 2 | 15% par vente | ❌ |

**Critères d'acceptation :**
- Le système bloque la création de produits au-delà de la limite du plan.
- Le système bloque l'upload d'images au-delà de la limite par produit.
- Le changement de plan est possible à tout moment (upgrade/downgrade).
- La commission est calculée automatiquement à la capture du paiement.

### F4.2 — Options À la Carte (Add-ons)
| Fonctionnalité | Description | Priorité |
| :--- | :--- | :--- |
| Pack de jetons IA | Achat de crédits pour les services IA | P1 |
| Outils de compression | Achat séparé d'outils d'optimisation | P2 |
| Thèmes premium | Achat de templates payants | P2 |

**Critères d'acceptation :**
- Les add-ons sont disponibles indépendamment du plan choisi.
- Le paiement des add-ons utilise les mêmes passerelles que les achats client.

---

## 5. Gestion des Produits & Services

### F5.1 — Types de Produits Supportés

| Type | Caractéristiques | Priorité |
| :--- | :--- | :--- |
| **Biens physiques** | Gestion des stocks, poids, dimensions, variantes | P0 |
| **Produits numériques** | Liens de téléchargement temporaires sécurisés + système de clés de licence | P1 |
| **Services** | Commande classique avec livraison d'un rapport/travail (sans logistique physique) | P1 |

**Critères d'acceptation :**
- Les produits physiques supportent les variantes (taille, couleur, etc.).
- Les liens de téléchargement numériques expirent après un délai configurable.
- Les clés de licence sont générées et attribuées automatiquement à la commande.
- Les services n'ont pas de suivi de livraison physique.

### F5.2 — Synchronisation des Stocks

| Méthode | Description | Priorité |
| :--- | :--- | :--- |
| Import/Export CSV/Excel | Upload/download manuel via le dashboard | P0 |
| API REST | Endpoints authentifiés pour CRUD produits/stocks | P1 |
| Webhooks sortants | Événements envoyés à l'ERP du vendeur (`order.placed`, `stock.updated`) | P1 |

**Critères d'acceptation :**
- L'import CSV supporte le mapping de colonnes flexible.
- Le vendeur peut générer et révoquer ses clés API depuis son dashboard.
- Les webhooks incluent une signature HMAC pour la vérification.

### F5.3 — Workflow d'Approbation des Produits

| Statut Vendeur | Comportement | Priorité |
| :--- | :--- | :--- |
| **Non vérifié** | Produit créé en `draft` → Notification admin → Attente d'approbation | P0 |
| **Vérifié** | Publication instantanée (`published`) | P0 |

**Critères d'acceptation :**
- L'admin reçoit une notification pour chaque produit en attente.
- L'admin peut approuver ou rejeter avec un motif.
- Le vendeur est notifié du résultat.

---

## 6. Système de Paiement

### F6.1 — Passerelles de Paiement

| Passerelle | Type | Marché | Priorité |
| :--- | :--- | :--- | :--- |
| **Flouci** | API en ligne | Tunisie | P0 |
| **Konnect** | API en ligne | Tunisie | P0 |
| **Mandat Minute** | Manuel (upload preuve) | Tunisie | P0 |
| **Paiement à la livraison (COD)** | Manuel | Tunisie | P0 |

### F6.2 — Modes d'Encaissement

#### Mode Escrow (Préconfiguré)
1. L'argent arrive sur le compte PandaMarket.
2. Commission calculée dynamiquement à la capture.
3. Montant net crédité dans le wallet vendeur avec période de rétention.
4. Le vendeur choisit : versement automatique après X jours **ou** retrait sur demande.

**Critères d'acceptation :**
- Le wallet vendeur affiche le solde disponible et le solde en attente.
- La période de rétention dépend du type de compte et du mode de paiement.
- Le vendeur peut consulter l'historique de ses transactions.

#### Mode Paiement Direct (Plans Pro+)
1. Le vendeur entre ses propres clés API Flouci/Konnect dans son dashboard.
2. Le système instancie le `PaymentProvider` avec les credentials du vendeur.
3. L'argent va directement sur le compte du vendeur.

**Critères d'acceptation :**
- Seuls les plans Pro, Golden et Platinum ont accès au paiement direct.
- La configuration des clés API est sécurisée (chiffrement en BDD).
- Le vendeur peut tester sa configuration avant activation.

### F6.3 — Workflow Mandat Minute

**Flux détaillé :**

| Étape | Acteur | Action |
| :--- | :--- | :--- |
| 1 | Client | Choisit « Mandat Minute » au checkout |
| 2 | Système | Crée la commande avec statut `payment_required` |
| 3 | Client/Vendeur | Uploade la photo du reçu via interface dédiée |
| 4 | Système | Envoie une notification à l'admin |
| 5 | Admin | Consulte la file de validation : voit la photo, le montant attendu |
| 6a | Admin | ✅ Approuve → `payment.captured` → Commande débloquée |
| 6b | Admin | ❌ Rejette → Notification au client → Possibilité de ré-upload |

**Critères d'acceptation :**
- L'upload se fait via presigned URL (sécurisé, pas d'upload direct).
- L'admin dispose d'une file d'attente « Validation Manuelle » dédiée.
- Le montant attendu est affiché à côté de la preuve pour faciliter la vérification.
- L'historique des validations est conservé avec horodatage et identité de l'admin.

---

## 7. Logistique & Expédition

### F7.1 — Options de Livraison du Vendeur

| Option | Description | Priorité |
| :--- | :--- | :--- |
| **Self-managed** | Le vendeur gère sa propre livraison | P0 |
| **Plateforme unifiée** | Intégration API : Aramex, La Poste TN, etc. | P1 |

**Critères d'acceptation :**
- Le vendeur sélectionne son mode de livraison dans son dashboard.
- L'intégration unifiée génère automatiquement les bordereaux d'expédition.
- Le client peut suivre sa livraison via un numéro de suivi.

### F7.2 — Order Splitting (Panier Multi-Vendeurs)

| Règle | Description | Priorité |
| :--- | :--- | :--- |
| Fulfillments séparés | Un fulfillment par vendeur dans le panier | P0 |
| Frais de port séparés | Calcul indépendant par vendeur | P0 |
| Notifications séparées | Chaque vendeur reçoit ses propres notifications | P0 |
| Configuration admin | Comportement configurable depuis le panel admin | P1 |

**Critères d'acceptation :**
- Un panier avec des produits de 3 vendeurs génère 3 fulfillments.
- Les frais de port sont clairement détaillés par vendeur au checkout.
- L'admin peut modifier le comportement de l'order splitting.

---

## 8. Intelligence Artificielle

### F8.1 — Services IA Intégrés

| Service | Outil Backend | Description | Priorité |
| :--- | :--- | :--- | :--- |
| **AI Driven SEO** | Gemini Pro API | Génération automatique de titres et méta-descriptions optimisés à partir de la photo produit | P1 |
| **Compression d'image** | `sharp` (Node.js) | Optimisation du poids des photos sans perte de qualité visible | P1 |

### F8.2 — Modèle de Consommation

| Mode | Description | Priorité |
| :--- | :--- | :--- |
| **Illimité** | Inclus dans certains abonnements (Pro, Golden, Platinum) | P1 |
| **Jetons (tokens)** | Compteur décrémenté à chaque action IA. Packs rechargeables achetables | P1 |

**Critères d'acceptation :**
- Le vendeur voit son solde de jetons dans son dashboard.
- L'action IA est bloquée si le solde de jetons est insuffisant (hors plans illimités).
- Le traitement est asynchrone : le vendeur est notifié quand c'est prêt.
- Les packs de jetons sont achetables via les mêmes passerelles de paiement.

### F8.3 — Traitement Asynchrone

- Toutes les tâches IA sont exécutées via **BullMQ** (files d'attente Redis).
- Un **worker Node.js** dédié traite les jobs sans impacter le serveur principal.
- Le vendeur est informé en temps réel via **WebSocket** ou notification.

---

## 9. Vérification & Modération

### F9.1 — Processus KYC (Vérification Vendeur)

| Étape | Description | Priorité |
| :--- | :--- | :--- |
| 1. Documents | Upload du Registre de Commerce (RC) et de la CIN | P0 |
| 2. Téléphone | Vérification par appel téléphonique | P0 |
| 3. Validation | Approbation **100% manuelle** par un Super Admin | P0 |

**Critères d'acceptation :**
- Le vendeur peut uploader ses documents depuis son dashboard.
- L'admin dispose d'une interface de revue avec aperçu des documents.
- Le passage Non-vérifié → Vérifié est **exclusivement manuel**.
- Le vendeur est notifié du résultat de la vérification.

### F9.2 — Système de Signalement (Report)

| Fonctionnalité | Description | Priorité |
| :--- | :--- | :--- |
| Signalement client | Un client peut signaler un vendeur pour fraude | P1 |
| Motif obligatoire | Le client doit fournir un motif détaillé | P1 |
| Suivi admin | File de traitement avec statuts : `open`, `investigating`, `resolved`, `dismissed` | P1 |

**Critères d'acceptation :**
- Le signalement est lié à une commande (optionnel) et à un vendeur.
- L'admin peut suspendre un vendeur suite à un signalement.
- Le vendeur suspendu ne peut plus publier ni vendre.

---

## 10. Exigences Non Fonctionnelles

### 10.1 Performance
- Temps de réponse API < 200ms pour les requêtes standard.
- Recherche Meilisearch < 50ms (search-as-you-type).
- Les tâches IA ne doivent jamais bloquer le serveur principal (traitement asynchrone obligatoire).

### 10.2 Scalabilité
- L'architecture doit supporter des milliers de boutiques simultanées.
- Le moteur de recherche doit supporter des millions de produits indexés.
- Le stockage S3-compatible permet une migration sans changement de code (MinIO → AWS S3 → Cloudflare R2).

### 10.3 Sécurité
- Toutes les API sont authentifiées (JWT).
- Rate limiting sur les endpoints publics.
- Les clés API vendeurs sont chiffrées en base de données.
- Les uploads passent par des presigned URLs (jamais d'upload direct au serveur).
- Préfixe `pd_` sur toutes les entités pour éviter les collisions.

### 10.4 Disponibilité
- La plateforme doit être accessible 24/7 avec un objectif de 99.9% uptime.
- Les workers IA peuvent être redémarrés sans impacter le frontend.

---

## 11. Résumé Technique pour l'Implémentation

| Composant | Technologie | Usage |
| :--- | :--- | :--- |
| Backend Core | MedusaJS (Node.js, TypeScript) | API headless, logique métier |
| Frontend | Next.js (App Router) | Hub + Storefronts multi-tenants |
| Base de données | PostgreSQL | Données relationnelles |
| Cache & Queues | Redis + BullMQ | Sessions, tâches asynchrones |
| Recherche | Meilisearch (auto-hébergé) | Indexation Hub central |
| Stockage | MinIO / Cloudflare R2 (S3-compatible) | Fichiers, images, preuves |
| Page Builder | GrapesJS / Craft.js | Éditeur visuel vendeur |
| SSL dynamique | Caddy / Vercel Platforms | Certificats wildcard |
| IA | Gemini Pro API + sharp | SEO auto + compression |

### Entités à étendre dans MedusaJS :
- `Store` (statut, plan, domaine, config paiement, thème)
- `Subscription_Limits` (quotas par plan)
- `Vendor_Wallet` (solde, rétention, mode de retrait)
- `Vendor_Credits` (jetons IA)
- `Mandat_Proofs` (preuves de paiement manuel)
- `Verification_Documents` (KYC : RC, CIN)
- `Reports` (signalements fraude)
- `API_Keys` (clés API vendeurs pour intégrations ERP)
