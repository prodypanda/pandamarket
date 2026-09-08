# Seller Section 8: Disputes, Settings, KYC & Developer APIs

> **Operational Objective**: Customer dispute handling, store business identity, merchant KYC dossier verification, developer REST API/webhooks, multi-store switcher, and helpdesk.
> **Application Routes**: `/hub/dashboard/disputes`, `/hub/dashboard/settings`, `/hub/dashboard/kyc`, `/hub/dashboard/security`, `/hub/dashboard/staff`, `/hub/dashboard/notifications`, `/hub/dashboard/help`
> **Pages Covered in this Section**: Page 59, Page 60, Page 61, Page 62, Page 63, Page 64, Page 65, Page 66, Page 67, Page 68

---

## 1. Section Navigation & Menu Placement

| Page # | Menu Label | Sidebar Group | Route Path | Assigned Icon | Breadcrumb Trail |
|---|---|---|---|---|---|
| Page 59 | **Litiges & Réclamations** | `Group 7: Studio IA & Support` | `/hub/dashboard/disputes` | `Flag` | `Accueil > Outils & Support > Litiges & Réclamations` |
| Page 60 | **Dossier Litige & Preuves** | `Group 7: Studio IA & Support` | `/hub/dashboard/disputes/[id]` | `FileText` | `Accueil > Outils & Support > Dossier Litige` |
| Page 61 | **Profil & Identité Boutique** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/settings` | `Settings` | `Accueil > Paramètres > Profil Boutique` |
| Page 62 | **Dossier KYC Vendeur** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/kyc` | `Shield` | `Accueil > Paramètres > Vérification KYC` |
| Page 63 | **Clés API REST Développeur** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/api-keys` | `Key` | `Accueil > Paramètres > Clés d'API` |
| Page 64 | **Webhooks en Temps Réel** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/webhooks` | `Webhook` | `Accueil > Paramètres > Webhooks` |
| Page 65 | **Centre de Notifications** | `Group 7: Studio IA & Support` | `/hub/dashboard/notifications` | `Bell` | `Accueil > Outils & Support > Notifications` |
| Page 66 | **Centre d'Assistance Vendeur** | `Group 7: Studio IA & Support` | `/hub/dashboard/help` | `HelpCircle` | `Accueil > Outils & Support > Centre d'Aide` |
| Page 67 | **Créer Nouvelle Boutique** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/create-store` | `PlusCircle` | `Accueil > Paramètres > Nouvelle Boutique` |
| Page 68 | **Sélecteur Multi-Boutiques** | `Group 8: Paramètres & Organisation` | `/hub/dashboard/select-store` | `Store` | `Accueil > Paramètres > Mes Boutiques` |

---

## 2. Standardized 8-Layer Anatomical Layout Order

Every page in this section strictly respects the universal top-to-bottom layout sequence:
1. **Layer 1 (Breadcrumb)**: Clear clickable trail indicating exact location.
2. **Layer 2 (Header Bar)**: Domain icon, page title, status tags, and primary action cluster.
3. **Layer 3 (Operational Alert)**: Conditional alert banner (warnings, critical KYC/stock/COD alerts).
4. **Layer 4 (Telemetry & KPI Strip)**: 3 to 5 standardized cards formatted in `TND 0.000` with comparative deltas.
5. **Layer 5 (Control Toolbar)**: Full-text search, filter pills/dropdowns, date range picker, and batch actions.
6. **Layer 6 (Main Working Area)**: Primary tabular data, interactive bento widgets, or configuration form.
7. **Layer 7 (Inspection Drawer)**: Slide-out panel for fast record inspection without leaving page context.
8. **Layer 8 (Modals & Dialogs)**: Focus-trapped confirmation or creation dialogs.

---

## 3. High-Fidelity Page Specifications & Raw Content

### [Page 59] Customer Disputes, Infringement Claims & Resolution Cases

- **Navigation Placement**: `Group 7: Studio IA & Support` > **Litiges & Réclamations**
- **Primary Route**: `/hub/dashboard/disputes`
- **Breadcrumb Hierarchy**: `Accueil > Outils & Support > Litiges & Réclamations`
- **Layer 6 Archetype**: `Dispute Claims Table with SLA Timers & Response Triggers`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Outils & Support > Litiges & Réclamations`
2. **Header Bar**: Title `Customer Disputes, Infringement Claims & Resolution Cases` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Dispute Claims Table with SLA Timers & Response Triggers.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 59. Customer Disputes, Infringement Claims & Resolution Cases
- **Route Path**: `/hub/dashboard/reports`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Registre des réclamations clients, contestations de livraison ou signalements concernant la boutique marchande, suivi des délais de réponse et préservation du score de conformité.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Signalements & Litiges Clients`
- **Page Heading**: "Gestion des Litiges & Réclamations Clients"
- **Subtitle / Description**: "Traitez les réclamations de vos acheteurs, fournissez vos justificatifs de livraison et trouvez des résolutions amiables."

#### B. Key Performance Indicators (KPIs)
- **Litiges en Cours**: `1 dossier nécessitant une réponse`
- **Taux de Résolution Amiable**: `92.4%`
- **Délai Moyen de Réponse Marchand**: `6 heures`

#### C. Data Collection — Tableau des Réclamations
- **En-têtes de colonnes**:
  1. `Réf. Litige` (e.g. `CASE-2026-031`)
  2. `Commande Concernee` (Numéro de commande, Date de livraison)
  3. `Acheteur Plaignant` (Nom complet du client)
  4. `Motif Déclaré` (Non-réception de colis, Article cassé, Article différent de la photo)
  5. `Date Limite de Réponse` (Délai de 48h accordé au vendeur avant arbitrage admin)
  6. `Statut` (Badge: Réponse attendue du vendeur, En cours d'analyse, Résolu)
  7. `Actions` (`Ouvrir le dossier d'arbitrage`, `Proposer un échange ou remboursement`)

---

### [Page 60] Dispute Dossier View, Proof Upload & Resolution Response Submission

- **Navigation Placement**: `Group 7: Studio IA & Support` > **Dossier Litige & Preuves**
- **Primary Route**: `/hub/dashboard/disputes/[id]`
- **Breadcrumb Hierarchy**: `Accueil > Outils & Support > Dossier Litige`
- **Layer 6 Archetype**: `Evidence Uploader (Receipts, Photos) & Defense Statement Form`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Outils & Support > Dossier Litige`
2. **Header Bar**: Title `Dispute Dossier View, Proof Upload & Resolution Response Submission` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Evidence Uploader (Receipts, Photos) & Defense Statement Form.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 60. Dispute Dossier View, Proof Upload & Resolution Response Submission
- **Route Path**: `/hub/dashboard/reports/[id]`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Dossier d'arbitrage d'un litige client spécifique : consultation des photos déposées par l'acheteur, téléversement du bordereau d'expédition signé par le transporteur et soumission de la proposition de résolution.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Litiges > Dossier #[id]`
- **Page Heading**: "Arbitrage Litige Commande #[Numéro]"
- **Subtitle / Description**: "Examinez les faits reprochés par le client et apportez vos justificatifs contradictoires."

#### B. Contenu du Dossier de Litige
- **Détails de la Réclamation**: Description rédigée par l'acheteur, photos du colis ou du produit endommagé jointes par l'acheteur
- **Formulaire de Réponse du Marchand**:
  - Téléversement du bordereau de livraison signé avec tampon du transporteur (Aramex / La Poste)
  - Explications factuelles du vendeur (Zone de texte)
  - Proposition de règlement amiable : `[Renvoyer un article neuf sans frais, Rembourser intégralement, Rembourser partiellement à hauteur de 50%, Contester la réclamation (Preuve de livraison irréfutable)]`
  - Bouton : `Transmettre la réponse officielle à l'administration et au client`

---

### [Page 61] Store Identity, Business Profile & Operational Settings

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Profil & Identité Boutique**
- **Primary Route**: `/hub/dashboard/settings`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Profil Boutique`
- **Layer 6 Archetype**: `Store Identity Form (Branding, Legal Info, Working Hours)`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Profil Boutique`
2. **Header Bar**: Title `Store Identity, Business Profile & Operational Settings` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Store Identity Form (Branding, Legal Info, Working Hours).
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 61. Store Identity, Business Profile & Operational Settings
- **Route Path**: `/hub/dashboard/settings`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Paramètres complets d'identité de la boutique : raison sociale, logo, bannière, coordonnées physiques en Tunisie, horaires d'ouverture, politique de retour personnalisée et sous-domaine.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Paramètres de la Boutique`
- **Page Heading**: "Paramètres Généraux de la Boutique"
- **Subtitle / Description**: "Mettez à jour les informations légales, les visuels de marque et les coordonnées de contact de votre boutique."

#### B. Formulaire des Paramètres Marchand

##### Section 1 : Identité & Image de Marque
- Nom public de la boutique (Champ texte : e.g. `Atelier Artisanal de Carthage`)
- Sous-domaine réservé (Champ texte : `atelier-carthage.pandamarket.tn`)
- Slogan / Accroche courte (Champ texte : `Créations authentiques en céramique et mosaïque tunisienne`)
- Description de l'histoire de la boutique (Zone de texte enrichie)
- Téléversement du Logo Officiel (Image carrée recommandée 512x512 px)
- Téléversement de la Bannière de Vitrine (Image panoramique recommandée 1920x600 px)

##### Section 2 : Coordonnées de Contact & Localisation
- Adresse email de contact public de la boutique
- Numéro de téléphone / WhatsApp professionnel tunisien (`+216 XX XXX XXX`)
- Adresse physique de l'atelier / magasin
- Ville et Gouvernorat tunisien (Menu déroulant des 24 gouvernorats)
- Code postal tunisien (Champ 4 chiffres)
- Coordonnées GPS / Lien Google Maps (optionnel)

##### Section 3 : Politiques Commerciales & Horaires
- Horaires d'ouverture / Service client (e.g. `Du Lundi au Vendredi de 9h à 18h, Samedi de 9h à 14h`)
- Délai moyen de préparation des commandes (Menu déroulant : `Expédié sous 24h, 1 à 2 jours ouvrés, Sur-mesure (3-5 jours)`)
- Politique de retour & échange de la boutique (Zone de texte : e.g. "Échange possible sous 10 jours ouvrables en emballage d'origine")

##### Section 4 : Sécurité & Collaborateurs
- Activation de la double authentification 2FA pour la connexion au tableau de bord
- Bouton : `Enregistrer l'ensemble des paramètres de la boutique`

---

### [Page 62] Merchant KYC Verification Portal & Documents Upload

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Dossier KYC Vendeur**
- **Primary Route**: `/hub/dashboard/kyc`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Vérification KYC`
- **Layer 6 Archetype**: `KYC Verification Dossier Upload (CIN, RNE, RIB Certificate)`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Vérification KYC`
2. **Header Bar**: Title `Merchant KYC Verification Portal & Documents Upload` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: KYC Verification Dossier Upload (CIN, RNE, RIB Certificate).
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 62. Merchant KYC Verification Portal & Documents Upload
- **Route Path**: `/hub/dashboard/kyc`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Espace de certification légale du marchand, téléversement sécurisé de la Carte d'Identité Nationale (CIN) ou de l'extrait RNE tunisien, et suivi du statut de validation pour débloquer les paiements.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Vérification KYC`
- **Page Heading**: "Vérification d'Identité Marchande (KYC)"
- **Subtitle / Description**: "Conformément à la réglementation bancaire tunisienne, certifiez votre identité ou votre immatriculation d'entreprise pour activer vos virements."
- **Statut Actuel de Vérification**: `Badge Vert : Boutique Certifiée & Vérifiée` (ou `Badge Jaune : En cours d'analyse sous 24h` / `Non Soumis`)

#### B. Formulaire de Dépôt des Documents Légaux
- **Type d'Activité Déclarée**: `[Artisan Particulier / Créateur Indépendant | Commerçant Enregistré (Personne Physique) | Société (SARL / SU / SA)]`
- **Pour les Artisans & Particuliers**:
  - Numéro de Carte d'Identité Nationale (CIN tunisienne à 8 chiffres)
  - Téléversement CIN Recto (Photo nette et lisible)
  - Téléversement CIN Verso
  - Date de délivrance de la CIN
- **Pour les Sociétés & Entreprises**:
  - Matricule Fiscal Tunisien (Format `0000000X/A/M/000`)
  - Numéro de Registre National des Entreprises (Extrait RNE datant de moins de 3 mois)
  - Téléversement du document RNE officiel (Fichier PDF)
  - Nom légal du gérant ou mandataire social
- **Relevé d'Identité Bancaire (RIB)**:
  - Fichier de Relevé de Compte ou Attestation de Domiciliation Bancaire portant le cachet de la banque
- **Bouton d'Action**: `Transmettre mon dossier pour certification officielle`

---

### [Page 63] Developer REST API Credentials & Permission Scopes

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Clés API REST Développeur**
- **Primary Route**: `/hub/dashboard/api-keys`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Clés d'API`
- **Layer 6 Archetype**: `API Key Generator with Permission Scopes & Masked Secret`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Clés d'API`
2. **Header Bar**: Title `Developer REST API Credentials & Permission Scopes` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: API Key Generator with Permission Scopes & Masked Secret.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 63. Developer REST API Credentials & Permission Scopes
- **Route Path**: `/hub/dashboard/api-keys`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Génération de clés d'API REST sécurisées pour connecter la boutique aux logiciels de caisse (ERP, Odoo), gestionnaires de stocks externes ou applications mobiles.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Développeurs > Clés d'API`
- **Page Heading**: "Clés d'API REST & Accès Développeur"
- **Subtitle / Description**: "Générez des identifiants sécurisés pour synchroniser vos commandes et votre catalogue avec vos outils externes."

#### B. Formulaire de Création d'une Clé d'API
- Nom de l'application / Description de la clé (e.g. "Synchronisation Caisse Magasin Tunis")
- Permissions accordées (Cases à cocher : `Lecture du catalogue`, `Mise à jour des stocks`, `Lecture des commandes`, `Modification du statut d'expédition`, `Accès aux fiches clients`)
- Date d'expiration (Menu déroulant : `30 jours, 90 jours, 1 an, Jamais`)
- Bouton : `Générer la clé d'API`

#### C. Data Collection — Tableau des Clés d'API Actives
- **En-têtes de colonnes**:
  1. `Nom de la Clé` (Description)
  2. `Préfixe Public` (e.g. `pk_live_84f9...`)
  3. `Permissions (Scopes)` (Badges des droits accordés)
  4. `Dernière Utilisation` (Date et adresse IP de l'appel)
  5. `Date de Création & Expiration`
  6. `Actions` (`Régénérer`, `Révoquer / Supprimer définitivement`)

---

### [Page 64] Real-time Webhook Subscriptions & Delivery Logs

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Webhooks en Temps Réel**
- **Primary Route**: `/hub/dashboard/webhooks`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Webhooks`
- **Layer 6 Archetype**: `Webhook Endpoint Subscriptions & Delivery Log Viewer`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Webhooks`
2. **Header Bar**: Title `Real-time Webhook Subscriptions & Delivery Logs` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Webhook Endpoint Subscriptions & Delivery Log Viewer.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 64. Real-time Webhook Subscriptions & Delivery Logs
- **Route Path**: `/hub/dashboard/webhooks`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Enregistrement d'URLs de webhooks pour recevoir des notifications HTTPS en temps réel lors de nouveaux événements (nouvelle commande passée, paiement confirmé, colis livré, stock épuisé).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Développeurs > Webhooks`
- **Page Heading**: "Abonnements Webhooks en Temps Réel"
- **Subtitle / Description**: "Recevez automatiquement les notifications de nouvelles commandes sur votre serveur externe via requêtes HTTPS sécurisées."

#### B. Formulaire d'Enregistrement de Webhook
- URL de votre serveur d'écoute (Champ HTTPS obligatoire : e.g. `https://mon-serveur.tn/webhooks/pandamarket`)
- Clé secrète de signature HMAC (Générée automatiquement pour authentifier les requêtes)
- Événements déclencheurs (Cases à cocher : `order.created`, `order.paid`, `order.fulfilled`, `product.stock_low`, `customer.registered`)
- Bouton : `Enregistrer le Webhook & Envoyer un Événement Ping de Test`

#### C. Data Collection — Journal des Déclarations & Tentatives d'Envoi
- **En-têtes de colonnes**:
  1. `Événement` (e.g. `order.created #ORD-882194`)
  2. `Horodatage` (Date et seconde de déclenchement)
  3. `URL Cible` (Endpoint destinataire)
  4. `Statut HTTP` (Badge Vert `200 OK` ou Rouge `500 Server Error`)
  5. `Durée de Réponse` (e.g. `124 ms`)
  6. `Actions` (`Inspecter la charge utile JSON (Payload)`, `Ré-émettre la requête`)

---

### [Page 65] Store Notification Center & Channel Alert Preferences

- **Navigation Placement**: `Group 7: Studio IA & Support` > **Centre de Notifications**
- **Primary Route**: `/hub/dashboard/notifications`
- **Breadcrumb Hierarchy**: `Accueil > Outils & Support > Notifications`
- **Layer 6 Archetype**: `Alert Switchboard across Web, Email & SMS Channels`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Outils & Support > Notifications`
2. **Header Bar**: Title `Store Notification Center & Channel Alert Preferences` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Alert Switchboard across Web, Email & SMS Channels.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 65. Store Notification Center & Channel Alert Preferences
- **Route Path**: `/hub/dashboard/notifications`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Centre de notifications de la boutique, alertes de commandes passées, messages clients, validations de paiements et paramétrage des canaux (Email, SMS, WhatsApp).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Notifications`
- **Page Heading**: "Centre de Notifications & Alertes"
- **Subtitle / Description**: "Consultez le fil de vos alertes récentes et personnalisez les canaux de notification pour ne manquer aucune vente."

#### B. Préférences des Canaux de Notification (Formulaire de réglages)
- Notification par Email (Cases à cocher : Nouvelle commande reçue, Message client, Virement bancaire validé, Stock critique)
- Notification par SMS / WhatsApp sur numéro tunisien (Cases à cocher pour les alertes urgentes de commandes COD)
- Notification sonore sur le tableau de bord (Interrupteur Oui/Non lors de l'arrivée d'une nouvelle commande)
- Bouton : `Enregistrer mes préférences d'alerte`

#### C. Data Collection — Flux Chronologique des Notifications
- **Fiche Notification (Structure unitaire)**:
  - Icône selon typologie (Panier pour commande, Cloche pour virement, Triangle pour alerte de stock)
  - Titre de l'alerte : e.g. "Nouvelle commande #ORD-882195 reçue !"
  - Corps du message : "Fatma Ben Ali a commandé 2 articles pour un total de 140.000 TND (Paiement COD à Ariana)."
  - Heure relative : "Il y a 12 minutes"
  - État : `Non lu (Point indicateur)` ou `Lu`
  - Bouton d'action direct : `Traiter la commande →`
- Bouton global : `Marquer toutes les notifications comme lues`

---

### [Page 66] Merchant Support Desk & Help Ticket Submission

- **Navigation Placement**: `Group 7: Studio IA & Support` > **Centre d'Assistance Vendeur**
- **Primary Route**: `/hub/dashboard/help`
- **Breadcrumb Hierarchy**: `Accueil > Outils & Support > Centre d'Aide`
- **Layer 6 Archetype**: `Knowledge Base Search & Support Ticket Creator`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Outils & Support > Centre d'Aide`
2. **Header Bar**: Title `Merchant Support Desk & Help Ticket Submission` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Knowledge Base Search & Support Ticket Creator.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 66. Merchant Support Desk & Help Ticket Submission
- **Route Path**: `/hub/dashboard/support`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Guichet d'assistance dédié aux marchands PandaMarket, base de connaissances des vendeurs, foire aux questions (FAQ logistique/paiement) et ouverture de tickets de support.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Assistance & Support`
- **Page Heading**: "Centre d'Assistance & Support Vendeur"
- **Subtitle / Description**: "Trouvez des réponses rapides à vos questions logistiques, financières ou techniques et contactez l'équipe support PandaMarket."

#### B. Foire Aux Questions Rapide (FAQ Vendeurs)
- Accordeon 1 : "Comment fonctionnent les délais de virement vers ma banque tunisienne ?"
- Accordeon 2 : "Que faire si un client refuse son colis contre remboursement (COD) ?"
- Accordeon 3 : "Comment imprimer mes bordereaux d'expédition au format thermique ?"
- Accordeon 4 : "Comment connecter mon domaine personnalisé .tn ?"

#### C. Formulaire d'Ouverture d'un Ticket de Support
- Objet de la demande (Champ texte : e.g. "Question sur le virement du 02 Septembre")
- Catégorie de la requête : `[Paiements & Retraits de solde, Transporteurs & Logistique, Problème technique sur la vitrine, Abonnements & Factures, Autre]`
- Niveau d'urgence : `[Normale, Urgente (Bloque les ventes)]`
- Description détaillée du problème rencontré (Zone de texte)
- Pièces jointes / Captures d'écran (Téléversement de fichiers)
- Bouton : `Transmettre le ticket à l'assistance vendeur`

#### D. Historique de Vos Tickets Ouverts
- Tableau des tickets soumis avec référence, sujet, date, statut (`En cours de traitement par l'équipe support`, `Résolu`) et lien de conversation.

---

### [Page 67] Create New Secondary Store Wizard

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Créer Nouvelle Boutique**
- **Primary Route**: `/hub/dashboard/create-store`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Nouvelle Boutique`
- **Layer 6 Archetype**: `Secondary Store Creation Multi-Step Wizard`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Nouvelle Boutique`
2. **Header Bar**: Title `Create New Secondary Store Wizard` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Secondary Store Creation Multi-Step Wizard.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 67. Create New Secondary Store Wizard
- **Route Path**: `/hub/dashboard/create-store`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Assistant de création d'une nouvelle boutique (pour les marchands disposant d'un compte multi-boutiques ou lançant une seconde marque spécialisée).

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Créer une Boutique`
- **Page Heading**: "Création d'une Nouvelle Boutique"
- **Subtitle / Description**: "Lancez une nouvelle marque ou un second point de vente en ligne rattaché à votre compte marchand."

#### B. Formulaire de Création de Boutique
- Nom commercial de la nouvelle boutique (Champ texte : e.g. "Bijoux Berbères du Sud")
- Sous-domaine souhaité (Champ texte avec vérification de disponibilité en temps réel : `https://[votre-choix].pandamarket.tn`)
- Catégorie d'activité principale (Menu déroulant : Artisanat, Mode, Terroir, Décoration, etc.)
- Devise par défaut de la boutique : `Dinar Tunisien (TND)`
- Description succincte de l'offre
- Boutons d'action : `Créer ma boutique maintenant & Accéder au tableau de bord`, `Annuler`

---

### [Page 68] Multi-Store Switcher & Organization Selector

- **Navigation Placement**: `Group 8: Paramètres & Organisation` > **Sélecteur Multi-Boutiques**
- **Primary Route**: `/hub/dashboard/select-store`
- **Breadcrumb Hierarchy**: `Accueil > Paramètres > Mes Boutiques`
- **Layer 6 Archetype**: `Organization & Multi-Store Grid Card Switcher`

#### Element Hierarchy & Exact Ordering on Page:
1. **Breadcrumb**: `Accueil > Paramètres > Mes Boutiques`
2. **Header Bar**: Title `Multi-Store Switcher & Organization Selector` + Quick Action buttons.
3. **Operational Banner**: Critical alert banner (active on operational alerts).
4. **KPI Cards**: Summary telemetry cards with millimes precision.
5. **Control Bar**: Filter, search, and view controls.
6. **Primary Surface**: Organization & Multi-Store Grid Card Switcher.
7. **Detail Drawer**: Slide-out inspection drawer.
8. **Action Modals**: Dialog triggers for batch operations.

#### Raw Content Contract:

### 68. Multi-Store Switcher & Organization Selector
- **Route Path**: `/hub/dashboard/select-store`
- **Dashboard Realm**: Seller Dashboard
- **Operational Objective**: Sélecteur d'organisation et de boutique pour les marchands ou agences gérant plusieurs enseignes depuis un compte unique.

#### A. Header & Breadcrumbs
- **Breadcrumb Hierarchy**: `Tableau de Bord Vendeur > Mes Boutiques`
- **Page Heading**: "Sélectionnez Votre Boutique"
- **Subtitle / Description**: "Choisissez la boutique que vous souhaitez administrer parmi vos points de vente actifs."

#### B. Grille des Boutiques Rattachées au Compte
- **Carte Boutique (Structure unitaire)**:
  - Logo de la boutique
  - Nom commercial : `Atelier Artisanal de Carthage`
  - URL : `atelier-carthage.pandamarket.tn`
  - Formule souscrite : `Plan Pro`
  - Statistiques rapides : `148 produits · 12 commandes ce mois`
  - Statut : `Boutique Active (Badge vérifié)`
  - Bouton d'action : `Gérer cette boutique → (Bascule immédiate de contexte)`
- **Carte de Création**:
  - Icône `+`
  - Libellé : "Créer une boutique supplémentaire"
  - Bouton : `Lancer l'assistant de création`

---

