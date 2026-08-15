/**
 * Script to insert comprehensive Feature 20 Admin Notes into Superadmin Dashboard.
 * Includes folder creation, rich markdown guides, How-To execution steps, and full checklists.
 */
import { query, closePool } from '../db/pool';
import { pdId } from '../utils/crypto';

export interface ChecklistItemDef {
  content: string;
  is_done?: boolean;
}

export interface AdminNoteDef {
  title: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  color: string;
  tags: string[];
  content: string;
  checklist: ChecklistItemDef[];
}

export const FEATURE_20_FOLDER_ID = 'ff32063c-baff-42ca-ad94-768b20c5e6d4';
export const FEATURE_20_FOLDER_NAME = '⭐ Feature 20: Store Subscriptions, Followed Feed & AI Interest Engine';
export const FEATURE_20_FOLDER_COLOR = '#6366F1';

export const FEATURE_20_NOTES: AdminNoteDef[] = [
  {
    title: '📦 T1: Database Schema Migrations & Store Subscriptions Domain (R1)',
    priority: 'high',
    color: '#3B82F6',
    tags: ['database', 'migrations', 'store-subscriptions', 'feature-20'],
    content: `## Vue d'Ensemble & Spécification Technique
Créer et exécuter la migration PostgreSQL pour introduire le système d'abonnements boutiques, le profilage des centres d'intérêt, les diffusions privées de coupons vendeurs, et les compteurs d'abonnés qualifiés.

### Schémas des Tables & Colonnes à Créer
1. **Table \`pd_store_subscription\`** :
   - \`id\` VARCHAR(64) PRIMARY KEY (format: \`sub_xxxx\`)
   - \`buyer_id\` VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE
   - \`store_id\` VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE
   - \`notify_price_drops\` BOOLEAN NOT NULL DEFAULT TRUE
   - \`notify_new_products\` BOOLEAN NOT NULL DEFAULT TRUE
   - \`is_verified_buyer\` BOOLEAN NOT NULL DEFAULT FALSE (calculé si l'acheteur a >= 1 commande payée/livrée)
   - \`created_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`updated_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`CONSTRAINT uq_buyer_store_subscription UNIQUE (buyer_id, store_id)\`

2. **Table \`pd_buyer_interest_profile\`** :
   - \`buyer_id\` VARCHAR(64) PRIMARY KEY REFERENCES pd_user(id) ON DELETE CASCADE
   - \`tag_weights\` JSONB NOT NULL DEFAULT '{}' (ex: \`{"arduino": 24.5, "electronique": 18.0}\`)
   - \`last_calculated_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`created_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`updated_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()

3. **Table \`pd_seller_broadcast\`** :
   - \`id\` VARCHAR(64) PRIMARY KEY (format: \`sbc_xxxx\`)
   - \`store_id\` VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE
   - \`coupon_code\` VARCHAR(64)
   - \`discount_type\` VARCHAR(32) DEFAULT 'percentage' -- 'percentage' | 'fixed'
   - \`discount_value\` NUMERIC(10,2)
   - \`message\` TEXT NOT NULL
   - \`sent_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`subscribers_count_at_send\` INT NOT NULL DEFAULT 0
   - \`created_at\` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - \`CONSTRAINT chk_seller_broadcast_discount_type CHECK (discount_type IN ('percentage', 'fixed') OR discount_type IS NULL)\`

4. **Extensions sur tables existantes** :
   - \`pd_product\` : ajouter \`interest_tags TEXT[] NOT NULL DEFAULT '{}'\` et \`interest_tags_synced_at TIMESTAMPTZ\`
   - \`pd_store\` : ajouter \`subscribers_count INT NOT NULL DEFAULT 0\` et \`verified_subscribers_count INT NOT NULL DEFAULT 0\`

---

## 🛠️ Guide d'Exécution & How-To
1. Créer le fichier \`backend/src/migrations/sql/073_store_subscriptions_and_ai_interest.sql\`.
2. Créer le fichier de rollback \`backend/src/migrations/sql/073_store_subscriptions_and_ai_interest.down.sql\`.
3. Ajouter des index optimisés :
   - \`idx_store_subscription_buyer_id ON pd_store_subscription(buyer_id);\`
   - \`idx_store_subscription_store_id ON pd_store_subscription(store_id);\`
   - \`idx_store_subscription_buyer_store ON pd_store_subscription(buyer_id, store_id);\`
   - \`idx_store_subscription_store_verified ON pd_store_subscription(store_id, is_verified_buyer);\`
   - \`idx_store_subscription_created_at ON pd_store_subscription(created_at DESC);\`
   - \`idx_store_subscribers_count ON pd_store(subscribers_count DESC);\`
   - \`idx_pd_product_interest_tags_gin ON pd_product USING GIN(interest_tags);\`.
   - \`idx_pd_product_interest_tags_synced ON pd_product(interest_tags_synced_at) WHERE status = 'published';\`
   - \`idx_buyer_interest_profile_tag_weights ON pd_buyer_interest_profile USING GIN(tag_weights);\`.
   - \`idx_seller_broadcast_store_sent ON pd_seller_broadcast(store_id, sent_at DESC);\`.
4. Exécuter le runner de migration : \`npm run migrate\` et vérifier avec \`backend/src/__tests__/migrations.run.test.ts\`.
`,
    checklist: [
      { content: 'Créer le fichier de migration SQL 073_store_subscriptions_and_ai_interest.sql', is_done: false },
      { content: 'Créer le fichier de rollback 073_store_subscriptions_and_ai_interest.down.sql', is_done: false },
      { content: 'Ajouter la table pd_store_subscription avec contrainte UNIQUE (buyer_id, store_id)', is_done: false },
      { content: 'Ajouter la table pd_buyer_interest_profile avec colonne tag_weights JSONB', is_done: false },
      { content: 'Ajouter la table pd_seller_broadcast pour l’historique des diffusions coupons', is_done: false },
      { content: 'Étendre pd_product avec interest_tags TEXT[] et index GIN', is_done: false },
      { content: 'Étendre pd_store avec subscribers_count et verified_subscribers_count', is_done: false },
      { content: 'Valider l’exécution sans régression via migrations.run.test.ts', is_done: false },
    ],
  },
  {
    title: '🔌 T2: Subscription REST APIs, Anti-Bot Verification & Seller Trust Formula (R1 & R5)',
    priority: 'high',
    color: '#10B981',
    tags: ['api', 'service', 'subscription', 'anti-bot', 'trust-score'],
    content: `## Vue d'Ensemble & Spécification Technique
Implémenter la couche service et les routes RESTful pour permettre aux acheteurs de s'abonner/se désabonner des boutiques, de gérer leurs préférences d'alertes, et de calculer automatiquement la qualification anti-bot des abonnés.

### Routes RESTful à implémenter dans \`backend/src/api/store-subscription.route.ts\`
- \`POST /api/pd/stores/:id/subscribe\` (Auth: Buyer/Admin) :
  - Vérifie si l'acheteur a déjà commandé chez PandaMarket (\`SELECT COUNT(*) FROM pd_order WHERE buyer_id = $1 AND status IN ('paid', 'delivered', 'shipped')\`).
  - Si oui, \`is_verified_buyer = TRUE\`.
  - Insère dans \`pd_store_subscription\` et incrémente \`subscribers_count\` (et \`verified_subscribers_count\` si vérifié).
- \`DELETE /api/pd/stores/:id/subscribe\` (Auth: Buyer/Admin) :
  - Supprime l'enregistrement et décrémente les compteurs.
- \`GET /api/pd/stores/:id/subscription-status\` (Auth: Optionnelle/Buyer) :
  - Renvoie \`{ is_subscribed: boolean, notify_price_drops: boolean, notify_new_products: boolean, subscribers_count: number }\`.
- \`GET /api/pd/buyer/subscriptions\` (Auth: Buyer) :
  - Liste paginée de toutes les boutiques suivies par l'acheteur avec dernières nouveautés.

### Formule Logarithmique de Confiance Vendeur (\`Seller Trust Score\`)
\`\`\`typescript
export function computeSellerTrustScore(stats: {
  rating: number; // 0 à 5
  slaHours: number; // ex: 18h
  verifiedSubscribers: number; // ex: 1450
  disputeRatePct: number; // ex: 0.8%
}): number {
  const normalizedRating = Math.min(5, Math.max(0, stats.rating)) / 5; // 0..1
  const normalizedSla = stats.slaHours <= 24 ? 1 : Math.max(0, 1 - (stats.slaHours - 24) / 72); // 0..1
  const subScore = Math.min(1, Math.log10(stats.verifiedSubscribers + 1) / 4); // 0..1 (10,000 subs = 1.0)
  const disputePenalty = Math.min(1, stats.disputeRatePct / 10); // 0..1

  const score = (0.40 * normalizedRating) + (0.30 * normalizedSla) + (0.20 * subScore) - (0.10 * disputePenalty);
  return Number((Math.max(0, score) * 100).toFixed(1)); // Score sur 100
}
\`\`\`

---

## 🛠️ Guide d'Exécution & How-To
1. Créer \`backend/src/services/store-subscription.service.ts\`.
2. Créer \`backend/src/api/store-subscription.route.ts\` avec validation Zod (\`z.object({ store_id: z.string() })\`).
3. Enregistrer la route dans \`backend/src/app.ts\` sous \`/api/pd/stores\` et \`/api/pd/buyer\`.
4. Mettre à jour l'algorithme de classement des vendeurs dans \`backend/src/services/vendor-rating.service.ts\`.
5. Rédiger les tests unitaires et d'intégration dans \`backend/src/__tests__/store-subscription.service.test.ts\`.
`,
    checklist: [
      { content: 'Créer StoreSubscriptionService avec gestion idempotente des abonnements', is_done: false },
      { content: 'Implémenter la détection de commande antérieure pour is_verified_buyer', is_done: false },
      { content: 'Créer les endpoints POST /api/pd/stores/:id/subscribe et DELETE subscribe', is_done: false },
      { content: 'Créer endpoint GET /api/pd/stores/:id/subscription-status avec compteur live', is_done: false },
      { content: 'Créer endpoint GET /api/pd/buyer/subscriptions avec pagination', is_done: false },
      { content: 'Intégrer la formule logarithmique du Seller Trust Score dans le moteur de ranking', is_done: false },
      { content: 'Créer le fichier de test store-subscription.service.test.ts et valider à 100%', is_done: false },
    ],
  },
  {
    title: '⚡ T3: Smart Batched Notifications Engine for Price Drops & New Arrivals (R2)',
    priority: 'high',
    color: '#F59E0B',
    tags: ['notifications', 'smart-batching', 'bullmq', 'websocket', 'email-digest'],
    content: `## Vue d'Ensemble & Spécification Technique
Mettre en place le moteur de notification intelligent avec buffer glissant de 15 minutes pour regrouper les baisses de prix et nouvelles publications par boutique, évitant le spam d'alertes, et générer le condensé quotidien par email à 19h00.

### Architecture du Buffer Glissant (Sliding Window 15 min)
1. **Événements Déclencheurs** :
   - \`product.price_dropped\` : déclenché quand \`new_price < old_price\` ou \`compare_at_price > price\`.
   - \`product.published\` : déclenché quand un nouveau produit passe au statut actif.
2. **Mécanisme Redis / BullMQ Buffer** :
   - Clé Redis : \`notif_buffer:store:{store_id}:type:{price_drop|new_product}\`
   - À chaque modification, push du \`product_id\` dans la liste Redis avec TTL de 15 minutes (900 secondes).
   - Un job BullMQ retardé de 15 minutes (\`delay: 15 * 60 * 1000\`) est planifié.
   - À l'exécution du job, s'il n'y a plus de nouvelle modification récente, on agrège tous les \`product_ids\` et on génère une notification unique :
     > *« 🏷️ {StoreName} a baissé le prix de {N} articles ! »* ou *« ✨ {StoreName} a publié {N} nouveaux produits ! »*
3. **Diffusion In-App & WebSocket** :
   - Sélection de tous les abonnés de la boutique (\`SELECT buyer_id FROM pd_store_subscription WHERE store_id = $1\`).
   - Insertion groupée dans \`pd_notifications\` via \`NotificationService.createMany()\`.
   - Émission temps réel WebSocket via \`socketGateway.emitToUser(buyerId, 'notification', ...)\`.
4. **Digest Email Quotidien (19h00)** :
   - Cronjob BullMQ planifié tous les soirs à 19h00 (\`0 19 * * *\`).
   - Pour chaque abonné ayant l'option activée, envoi d'un email récapitulatif avec les 5 meilleures offres de ses boutiques suivies.

---

## 🛠️ Guide d'Exécution & How-To
1. Créer \`backend/src/workers/smart-notification-batch.worker.ts\`.
2. Créer \`backend/src/workers/daily-digest-email.worker.ts\`.
3. Intercepter les mises à jour de prix dans \`ProductService.update()\` et émettre l'événement outbox.
4. Rédiger les tests de charge et de temporisation dans \`backend/src/__tests__/smart-notification-batch.test.ts\`.
`,
    checklist: [
      { content: 'Créer le worker BullMQ smart-notification-batch.worker.ts avec buffer 15 min', is_done: false },
      { content: 'Intercepter les baisses de prix dans ProductService et enclencher le buffer', is_done: false },
      { content: 'Intercepter la publication de nouveaux articles et enclencher le buffer', is_done: false },
      { content: 'Générer une notification in-app groupée unique par boutique', is_done: false },
      { content: 'Émettre en direct sur WebSocket pour les acheteurs connectés', is_done: false },
      { content: 'Créer le worker daily-digest-email.worker.ts planifié à 19h00', is_done: false },
      { content: 'Rédiger smart-notification-batch.test.ts et valider le dédoublonnage', is_done: false },
    ],
  },
  {
    title: '🧠 T4: AI Product Auto-Tagging (Gemini) & "Centres d’Intérêt" Recommendation Engine (R3)',
    priority: 'high',
    color: '#8B5CF6',
    tags: ['ai', 'gemini', 'recommendation-engine', 'centres-d-interet', 'privacy'],
    content: `## Vue d'Ensemble & Spécification Technique
Intégrer le modèle Gemini Pro pour le diagnostic automatique et l'extraction de tags sémantiques cachés sur chaque produit, et construire le moteur de profilage des centres d'intérêt acheteur.

### Diagnostic IA Automatique (Gemini Pro)
- À la création ou modification d'un produit, un job BullMQ \`ai-product-tagger\` extrait :
  - Titre, description, catégorie, et attributs.
  - Prompt Gemini : *« Extraire 4 à 8 tags sémantiques normalisés en minuscules sans accents pour ce produit e-commerce (ex: arduino, microcontroller, electronique, robotique, diy, outillage) au format JSON { "tags": string[] } »*.
  - Enregistre les tags dans \`pd_product.interest_tags\`.
- Un cronjob nocturne rattrape tout produit n'ayant pas encore de tags (\`WHERE interest_tags IS NULL OR interest_tags = '{}'\`).

### Algorithme de Calcul du Profil Acheteur (\`pd_buyer_interest_profile\`)
\`\`\`typescript
export function calculateBuyerInterestProfile(events: {
  orders: Array<{ tags: string[]; createdAt: Date }>; // Poids 5x
  subscriptions: Array<{ storeTags: string[]; createdAt: Date }>; // Poids 4x
  likes: Array<{ tags: string[]; createdAt: Date }>; // Poids 2x
}): Record<string, number> {
  const weights: Record<string, number> = {};
  const now = Date.now();

  const processSignal = (tags: string[], baseWeight: number, date: Date) => {
    const daysAgo = Math.max(0, (now - date.getTime()) / (1000 * 60 * 60 * 24));
    const timeDecay = Math.exp(-daysAgo / 60); // Demi-vie 60 jours
    tags.forEach((tag) => {
      const normalized = tag.toLowerCase().trim();
      weights[normalized] = (weights[normalized] || 0) + (baseWeight * timeDecay);
    });
  };

  events.orders.forEach(o => processSignal(o.tags, 5.0, o.createdAt));
  events.subscriptions.forEach(s => processSignal(s.storeTags, 4.0, s.createdAt));
  events.likes.forEach(l => processSignal(l.tags, 2.0, l.createdAt));

  return weights;
}
\`\`\`

### Règle d'Isolation Stricte Vendeur
- **Vitrines et Fiches Produits Vendeur (\`store.pandamarket.tn\`)** : **100% dédiées au vendeur**, zéro produit ou boutique concurrente affichée.
- **Marketplace Hub & Fil d'Actualité** : Emplacements exclusifs pour les recommandations croisées par centre d'intérêt.

---

## 🛠️ Guide d'Exécution & How-To
1. Créer \`backend/src/services/ai-product-tagger.service.ts\` utilisant le SDK Gemini existant.
2. Créer \`backend/src/services/interest-recommendation.service.ts\`.
3. Rédiger les tests dans \`backend/src/__tests__/interest-recommendation.service.test.ts\`.
`,
    checklist: [
      { content: 'Créer AiProductTaggerService avec appel structuré Gemini Pro', is_done: false },
      { content: 'Ajouter le worker BullMQ pour le diagnostic immédiat à la publication de produit', is_done: false },
      { content: 'Ajouter le cronjob nocturne de balayage des articles non diagnostiqués', is_done: false },
      { content: 'Implémenter l’algorithme de score d’intérêt avec décroissance sur 60 jours', is_done: false },
      { content: 'Créer InterestRecommendationService pour trouver boutiques et produits similaires', is_done: false },
      { content: 'Garantir le cloisonnement strict des vitrines privées sans fuite concurrente', is_done: false },
      { content: 'Valider via interest-recommendation.service.test.ts avec 100% de succès', is_done: false },
    ],
  },
  {
    title: '🎨 T5: "My Followed Feed" Page (`/my-followed-feed`) & Hub Feed Personalization (R3 & R4)',
    priority: 'high',
    color: '#EC4899',
    tags: ['frontend', 'followed-feed', 'marketplace-hub', 'superadmin-settings'],
    content: `## Vue d'Ensemble & Spécification Technique
Créer la page interactive dédiée \`/my-followed-feed\` pour les acheteurs, intégrer le mécanisme d'injection 30% personnalisé dans le Marketplace Hub, et fournir le panneau de réglage Superadmin.

### 1. Composants de la Page \`/my-followed-feed\`
- **Section 1 : "Mes Boutiques Suivies"** :
  - Carrousel horizontal avec avatars, noms, badges d'offres non lues, et compteur d'abonnés.
- **Section 2 : "Nouveautés & Baisses de Prix"** :
  - Grille responsive chronologique avec filtres rapides (*Tous*, *Baisses de Prix uniquement*, *Nouveaux Arrivages*).
  - Badge dynamique d'économie (*-25%*, *Économisez 15 TND*).
- **Section 3 : "Découvertes & Boutiques Similaires"** :
  - Cartes de boutiques certifiées partageant les mêmes centres d'intérêt avec bouton *S'abonner* instantané.

### 2. Injection 30% Personnalisée dans le Marketplace Hub
- Dans l'API et le composant d'accueil du Hub :
  - Récupère le ratio configuré (par défaut 30%).
  - 70% des articles proviennent du tri de base (Aléatoire / Nouveautés / Meilleures Ventes).
  - 30% des articles sont injectés depuis les tags d'intérêt de l'acheteur connecté.

### 3. Panneau de Contrôle Superadmin (\`/admin/settings\`)
- Carte **"Hub Feed & Algorithm Tuning"** :
  - Sélecteur de Tri de Base : \`Random (Shuffled Session)\` | \`Newest (Date DESC)\` | \`Alphabetical (A-Z)\` | \`Best-Sellers\`.
  - Curseur d'Injection Personnalisée (Slider 0% à 50%, pas de 5%).
  - État de santé du Tagging IA (Nombre de produits taggés / total).

---

## 🛠️ Guide d'Exécution & How-To
1. Créer la page \`frontend/src/app/my-followed-feed/page.tsx\` et composants associés.
2. Ajouter le bouton "S'abonner" et compteur sur \`frontend/src/components/storefront/ProductSellerCard.tsx\` et cartes vendeurs.
3. Ajouter la carte de configuration dans \`frontend/src/app/admin/settings/page.tsx\`.
4. Rédiger les tests de rendu et d'interaction dans \`frontend/src/__tests__/my-followed-feed.test.tsx\`.
`,
    checklist: [
      { content: 'Créer la page frontend/src/app/my-followed-feed/page.tsx', is_done: false },
      { content: 'Créer le carrousel des boutiques suivies avec indicateurs d’actualités', is_done: false },
      { content: 'Créer la grille chronologique nouveautés & baisses de prix avec filtres', is_done: false },
      { content: 'Créer la section de découverte des boutiques et articles similaires', is_done: false },
      { content: 'Intégrer le bouton S’abonner sur la fiche produit et les cartes vendeurs', is_done: false },
      { content: 'Implémenter l’injection 30% d’intérêt dans la page d’accueil du Hub', is_done: false },
      { content: 'Ajouter la carte Hub Feed & Algorithm Tuning dans les paramètres Superadmin', is_done: false },
      { content: 'Rédiger my-followed-feed.test.tsx et valider les tests Vitest', is_done: false },
    ],
  },
  {
    title: '📊 T6: Seller Dashboard "Abonnés & Fidélité" & Private Broadcast Coupons (R5)',
    priority: 'normal',
    color: '#06B6D4',
    tags: ['seller-dashboard', 'subscribers-tab', 'broadcasts', 'private-coupons', 'geo-stats'],
    content: `## Vue d'Ensemble & Spécification Technique
Créer le nouvel espace dédié aux vendeurs dans leur tableau de bord pour analyser leur base d'abonnés et diffuser des coupons de réduction privés avec limitation anti-spam.

### Composants du Dashboard Vendeur (\`/dashboard/subscribers\`)
1. **KPI Cards de Croissance** :
   - Total Abonnés (ex: \`1,450\`)
   - Nouveaux Abonnés cette semaine (ex: \`+42 (+12%)\`)
   - Acheteurs Vérifiés (ex: \`88.5%\`)
   - Taux de Réaction aux Alertes (ex: \`34.2%\`)

2. **Émetteur de Coupons Privés (Subscriber Broadcast Composer)** :
   - Formulaire d'émission : Code Promo (ex: \`VIP-ABONNES-20\`), Type (% ou TND fixe), Valeur, Message d'accompagnement.
   - **Contrainte Anti-Spam** : Maximum **2 diffusions par semaine calendaire** par vendeur.
   - Compteur visible : *« 1 diffusion restante cette semaine »*.
   - Déclenche l'envoi immédiat de notification in-app aux abonnés avec bouton d'activation du coupon.

3. **Historique des Diffusions** :
   - Tableau listant les diffusions passées, nombre d'abonnés ciblés, coupons réclamés, et volume GMV généré.

4. **Répartition Géographique des Abonnés** :
   - Histogramme / Bar chart des gouvernorats tunisiens représentés (Grand Tunis, Sousse, Sfax, Diaspora, etc.).

---

## 🛠️ Guide d'Exécution & How-To
1. Créer \`frontend/src/app/dashboard/subscribers/page.tsx\`.
2. Créer les composants :
   - \`SubscriberKpiCards.tsx\`
   - \`SubscriberBroadcastComposer.tsx\`
   - \`BroadcastHistoryTable.tsx\`
   - \`SubscriberGeoDistribution.tsx\`
3. Connecter aux endpoints backend \`/api/pd/seller/subscribers/analytics\` et \`/api/pd/seller/subscribers/broadcast\`.
4. Rédiger les tests dans \`frontend/src/__tests__/seller-subscribers-dashboard.test.tsx\`.
`,
    checklist: [
      { content: 'Créer la page dashboard/subscribers/page.tsx et l’onglet dans le menu latéral', is_done: false },
      { content: 'Créer SubscriberKpiCards avec Total Abonnés, Croissance et % Vérifiés', is_done: false },
      { content: 'Créer SubscriberBroadcastComposer avec limite stricte de 2 diffusions/semaine', is_done: false },
      { content: 'Créer BroadcastHistoryTable avec suivi du taux de réclamation et GMV', is_done: false },
      { content: 'Créer SubscriberGeoDistribution avec répartition par gouvernorats', is_done: false },
      { content: 'Créer les endpoints backend analytics et broadcast pour le vendeur', is_done: false },
      { content: 'Rédiger seller-subscribers-dashboard.test.tsx et valider à 100%', is_done: false },
    ],
  },
];

export async function seedFeature20AdminNotes(): Promise<{ folderId: string; notesCount: number; checklistCount: number }> {
  console.log('--- Initializing Feature 20 Admin Notes & Folders Insertion ---');
  
  // 1. Find Superadmin or Admin user
  const adminRes = await query<{ id: string }>(
    `SELECT id FROM pd_user WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`
  );
  let adminId = adminRes.rows[0]?.id;
  if (!adminId) {
    const fallback = await query<{ id: string }>(
      `SELECT id FROM pd_user WHERE role = 'admin' ORDER BY created_at LIMIT 1`
    );
    adminId = fallback.rows[0]?.id;
  }

  if (!adminId) {
    throw new Error('No admin user found in pd_user.');
  }
  console.log(`✓ Admin user identified: ${adminId}`);

  // Ensure table admin_note_folders and extensions exist
  await query(`
    CREATE TABLE IF NOT EXISTS admin_note_folders (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      admin_id    VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
      name        VARCHAR(100) NOT NULL,
      color       VARCHAR(20) DEFAULT 'default',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_admin_note_folders_admin_id ON admin_note_folders(admin_id);
    ALTER TABLE admin_notes
      ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) REFERENCES admin_note_folders(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
  `);

  // 2. Create or Find Folder with explicit ID ff32063c-baff-42ca-ad94-768b20c5e6d4
  // If a folder with identical name exists with another id, clean it up
  const existingFolderOtherId = await query<{ id: string }>(
    `SELECT id FROM admin_note_folders WHERE admin_id = $1 AND name = $2 AND id != $3 LIMIT 1`,
    [adminId, FEATURE_20_FOLDER_NAME, FEATURE_20_FOLDER_ID]
  );
  if (existingFolderOtherId.rows.length > 0) {
    const oldId = existingFolderOtherId.rows[0].id;
    await query(`UPDATE admin_notes SET folder_id = NULL WHERE folder_id = $1`, [oldId]);
    await query(`DELETE FROM admin_note_folders WHERE id = $1`, [oldId]);
  }

  const folderRes = await query<{ id: string }>(
    `INSERT INTO admin_note_folders (id, admin_id, name, color, sort_order) 
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       color = EXCLUDED.color,
       sort_order = EXCLUDED.sort_order,
       updated_at = NOW()
     RETURNING id`,
    [FEATURE_20_FOLDER_ID, adminId, FEATURE_20_FOLDER_NAME, FEATURE_20_FOLDER_COLOR]
  );
  const folderId = folderRes.rows[0].id;
  console.log(`✓ Folder confirmed: "${FEATURE_20_FOLDER_NAME}" (ID: ${folderId})`);

  let totalChecklistCount = 0;

  // 3. Insert or Update Note Task Cards
  for (let i = 0; i < FEATURE_20_NOTES.length; i++) {
    const noteDef = FEATURE_20_NOTES[i];
    const sortOrder = i + 1;

    // Check if note already exists by title and folder
    const existingNote = await query<{ id: string }>(
      `SELECT id FROM admin_notes WHERE admin_id = $1 AND folder_id = $2 AND title = $3 LIMIT 1`,
      [adminId, folderId, noteDef.title]
    );

    let noteId = existingNote.rows[0]?.id;
    if (noteId) {
      // Update existing note
      await query(
        `UPDATE admin_notes 
         SET content = $1, content_format = 'markdown', color = $2, priority = $3, 
             tags = $4, sort_order = $5, updated_at = NOW()
         WHERE id = $6`,
        [noteDef.content, noteDef.color, noteDef.priority, noteDef.tags, sortOrder, noteId]
      );
      console.log(`✓ Updated Note ${sortOrder}: "${noteDef.title}"`);
    } else {
      noteId = pdId('note');
      await query(
        `INSERT INTO admin_notes (
          id, admin_id, folder_id, type, title, content, content_format, color, priority, 
          is_pinned, is_completed, tags, status, sort_order, created_at, updated_at
        ) VALUES ($1, $2, $3, 'note', $4, $5, 'markdown', $6, $7, TRUE, FALSE, $8, 'active', $9, NOW(), NOW())`,
        [noteId, adminId, folderId, noteDef.title, noteDef.content, noteDef.color, noteDef.priority, noteDef.tags, sortOrder]
      );
      console.log(`✓ Inserted Note ${sortOrder}: "${noteDef.title}" (ID: ${noteId})`);
    }

    // 4. Insert or Synchronize Checklist Items
    // Clear old items to keep fresh sync
    await query(`DELETE FROM admin_note_checklist_items WHERE note_id = $1`, [noteId]);

    for (let j = 0; j < noteDef.checklist.length; j++) {
      const item = noteDef.checklist[j];
      const itemId = pdId('chk');
      await query(
        `INSERT INTO admin_note_checklist_items (id, note_id, content, is_done, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [itemId, noteId, item.content, item.is_done || false, j + 1]
      );
      totalChecklistCount++;
    }
    console.log(`  ✓ Synced ${noteDef.checklist.length} checklist items for "${noteDef.title}"`);
  }

  console.log('\n🎉 Successfully inserted all 6 Feature 20 Admin Notes and Checklists into the Superadmin Dashboard!');
  return { folderId, notesCount: FEATURE_20_NOTES.length, checklistCount: totalChecklistCount };
}

async function main() {
  try {
    await seedFeature20AdminNotes();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inserting Feature 20 admin notes:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('insert-feature20-admin-notes.ts'))) {
  main();
}
