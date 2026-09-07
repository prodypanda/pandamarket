# Superadmin Section 7: Telemetry, AI Costs & Audit Trails

> **Operational Objective**: Gemini/LLM AI usage token quotas and costs, admin/merchant/buyer security audit trails, and server infrastructure health logs.
> **Application Routes**: `/(admin)/ai-costs`, `/(admin)/audit/admin`, `/(admin)/audit/merchants`, `/(admin)/audit/buyers`, `/(admin)/system`
> **Pages Covered in this Section**: Page 21, Page 22, Page 23, Page 24, Page 25

---

## Section Architectural & Theme Selection Notes

1. **Multi-Theme Adaptability**:
   - This section's data and forms must render across all enabled themes without hardcoded inline CSS.
   - Elements should leverage semantic tokens (e.g., surface, border, text-primary, accent) defined by the active theme.

2. **Strict Raw Content Separation**:
   - All headings, inputs, tables, action buttons, and modal dialogs documented below represent the semantic contract.
   - When applying the new OpenDesign design, match every data field and action item without dropping operational capabilities.

3. **Tunisian Commerce Specifics**:
   - Currency formatting: `0.000 TND` (3 decimal places / millimes).
   - Banking: 20-digit RIB with Modulo 97 verification.
   - Geographic Coverage: 24 Tunisian Governorates across national hubs.
   - COD Verification: Cash on Delivery verification with SMS OTP and RTO risk scores.

---

## Raw Content Specifications by Page

### [Page 21] AI Usage Costs, Quotas & Token Consumption

### 21. AI Usage Costs, Quotas & Token Consumption
- **Route Path**: `/ai-costs`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Tableau de bord de supervision des dépenses d'intelligence artificielle (Gemini API, génération de descriptions, retouche photo), audit de consommation des jetons par boutique et limitation des quotas.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Croissance & Monétisation > Coûts & Quotas IA`
- **Page Heading**: "Supervision des Dépenses & Consommation IA"
- **Subtitle / Description**: "Analysez l'utilisation des modèles d'intelligence artificielle par les marchands, suivez les coûts en temps réel et contrôlez les quotas d'appels API."

#### B. Key Performance Indicators (KPIs)
- **Jetons Consommés ce Mois**: `48,520,000 Tokens`
- **Coût Estimé Plateforme (USD / TND)**: `$84.20 (~265.000 TND)`
- **Nombre Total de Requêtes IA Exécutées**: `14,210 générations`
- **Boutique la Plus Consommatrice**: `Artisanat & Décoration Tunis (1.2M tokens)`
- **Taux d'Erreurs / Échecs d'Appel**: `0.12%`

#### C. Control Bar, Search & Filter Matrix
- **Sélecteur de Modèle d'IA**: `[Tous les modèles, Gemini 1.5 Flash, Gemini 1.5 Pro, Text Embeddings]`
- **Sélecteur de Type de Tâche**: `[Tous, Génération de fiche produit, Optimisation SEO, Traduction bilingue, Retouche d'image]`
- **Champ de Recherche**: "Rechercher par boutique, nom d'utilisateur ou ID de tâche..."
- **Bouton d'Action**: `Paramétrer les Quotas Quotidiens d'IA`

#### D. Data Collection — Tableau du Journal des Jobs IA
- **En-têtes de colonnes**:
  1. `ID Tâche` (Identifiant BullMQ)
  2. `Boutique & Demandeur` (Nom de la boutique, Email du gérant)
  3. `Type de Génération` (Description produit, Mots-clés SEO, Traduction arabe)
  4. `Modèle Employé` (e.g. `gemini-1.5-flash`)
  5. `Jetons Utilisés (Prompt / Output)` (e.g. `1,240 / 480 tokens`)
  6. `Durée d'Exécution` (e.g. `1.2s`)
  7. `Statut` (Badge: Complété, Échoué, En file d'attente)
  8. `Horodatage` (Date et seconde précise)
  9. `Actions` (`Inspecter le prompt et la réponse`, `Relancer le job`)

---

### [Page 22] Administrator Security Audit Trail

### 22. Administrator Security Audit Trail
- **Route Path**: `/audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Registre immuable d'audit de sécurité des actions administrateurs (modifications de configuration, approbations de KYC, sanctions, ajustements de solde) pour conformité et traçabilité interne.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal d'Audit Administrateurs`
- **Page Heading**: "Journal d'Audit des Administrateurs"
- **Subtitle / Description**: "Traçabilité intégrale et inaltérable de chaque action, modification de politique et intervention administrative effectuée sur la plateforme."

#### B. Control Bar, Search & Filter Matrix
- **Champ de Recherche**: "Filtrer les actions par mot-clé, cible ou adresse IP..."
- **Filtre par Type d'Action**: `[Toutes les actions, Connexion / Déconnexion, Approbation KYC, Modification Paramètres, Suspension Boutique, Déblocage Paiement]`
- **Filtre par Administrateur**: Sélecteur des comptes administrateurs
- **Bouton d'Action**: `Exporter le Registre d'Audit (CSV Signé)`

#### C. Data Collection — Tableau des Événements d'Audit Admin
- **En-têtes de colonnes**:
  1. `Horodatage` (Date, heure, minute, seconde précise UTC+1)
  2. `Administrateur` (Nom, Email, Rôle de sécurité)
  3. `Catégorie d'Action` (Sécurité, Finance, Modération, Configuration)
  4. `Événement Réalisé` (Description claire: e.g. "Approbation du KYC boutique #842")
  5. `Entité Cible` (ID et type de l'objet modifié)
  6. `Adresse IP & Machine` (IP source, User-Agent)
  7. `Détails & Diff` (Bouton pour inspecter les valeurs Avant / Après au format JSON)
- **Pagination**: "Affichage de 1 à 25 sur 8,420 événements | Navigation chronologique"

---

### [Page 23] Merchant & Vendor Administrative Audit Trail

### 23. Merchant & Vendor Administrative Audit Trail
- **Route Path**: `/seller-audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Suivi des actions des vendeurs dans leurs espaces respectifs (création de produits, modifications de prix massives, ajouts de transporteurs, changements de RIB).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal des Vendeurs`
- **Page Heading**: "Journal d'Activité des Vendeurs"
- **Subtitle / Description**: "Consultez l'historique des opérations sensibles réalisées par les marchands au sein de leurs tableaux de bord respectifs."

#### B. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher par boutique, action ou identifiant..."
- **Filtre par Type d'Opération**: `[Toutes, Mise à jour de RIB bancaire, Changement de prix massif, Suppression de produits, Export de base clients, Modification DNS]`
- **Filtre par Période**: Sélecteur de date

#### C. Data Collection — Tableau d'Activité Marchande
- **En-têtes de colonnes**:
  1. `Date & Heure` (Horodatage précis)
  2. `Boutique Vendeuse` (Nom, ID Store)
  3. `Utilisateur Responsable` (Nom et rôle dans la boutique: Propriétaire / Collaborateur)
  4. `Action Opérée` (e.g. "Mise à jour du compte bancaire pour virement")
  5. `Gravité / Sensibilité` (Badge: Standard, Sensible, Critique)
  6. `Adresse IP` (IP de connexion du marchand)
  7. `Actions` (`Inspecter les détails`)

---

### [Page 24] Buyer Account Actions & Order Audit Trail

### 24. Buyer Account Actions & Order Audit Trail
- **Route Path**: `/buyer-audit-log`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Traçabilité des actions des acheteurs, connexions, réinitialisations de mot de passe, annulations de commande et changements d'adresses de livraison.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journal des Acheteurs`
- **Page Heading**: "Journal d'Activité des Acheteurs"
- **Subtitle / Description**: "Surveillez les comportements des clients, les tentatives d'authentification et les modifications d'adresses."

#### B. Control Bar & Filter Matrix
- **Champ de Recherche**: "Rechercher par nom d'acheteur, email ou numéro de commande..."
- **Filtre par Action**: `[Connexion réussie, Échec de mot de passe, Commande passée, Commande annulée, Avis déposé]`

#### C. Data Collection — Tableau d'Activité Acheteur
- **En-têtes de colonnes**:
  1. `Date & Heure`
  2. `Acheteur` (Nom, Email)
  3. `Événement` (e.g. "Annulation de la commande #ORD-882194 avant expédition")
  4. `Adresse IP & Géolocalisation`
  5. `Détails`

---

### [Page 25] Server Infrastructure, API Errors & Performance Logs

### 25. Server Infrastructure, API Errors & Performance Logs
- **Route Path**: `/system-logs`
- **Dashboard Realm**: Superadmin
- **Operational Objective**: Supervision technique des journaux d'erreurs du serveur (Node.js / Next.js / Express / PostgreSQL), monitoring des exceptions non interceptées, latences de base de données et état de la mémoire.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Administration > Système & Journaux > Journaux Système`
- **Page Heading**: "Journaux Système & Erreurs Serveur"
- **Subtitle / Description**: "Console d'inspection technique des flux de logs de production, exceptions applicatives, erreurs 500 et alertes de performance."
- **Badges d'État**: `Node Runtime : Healthy`, `Base de Données PostgreSQL : Connectée (Latence 2ms)`, `Redis Cache : Actif`

#### B. Control Bar & Filter Matrix
- **Filtre par Niveau de Log**: `[Tous, ERROR (Erreurs critiques), WARN (Avertissements), INFO, DEBUG]`
- **Filtre par Service**: `[Tous les services, API Auth, Passerelles de Paiement, Moteur de Recherche, File BullMQ]`
- **Champ de Recherche**: "Filtrer dans la trace de pile (Stacktrace) ou message d'erreur..."
- **Boutons d'Action**: `Actualiser le flux en direct`, `Purger les anciens logs`, `Télécharger le fichier de log brut (.log)`

#### C. Data Collection — Console des Logs Système
- **En-têtes de colonnes**:
  1. `Niveau` (Badge: ERROR, WARN, INFO)
  2. `Horodatage` (Heure:Minute:Seconde:Milliseconde)
  3. `Service Source` (e.g. `PaymentsController`, `CarrierWebhookDispatcher`)
  4. `Message d'Erreur` (Extrait clair du message)
  5. `Route / Endpoint Concerne` (e.g. `POST /api/pd/orders/checkout`)
  6. `Code Statut HTTP` (e.g. `500 Internal Server Error`)
  7. `Actions` (`Déplier la trace complète d'erreur (Stacktrace)`)

---

