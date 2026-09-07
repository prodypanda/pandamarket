# Seller Section 8: Disputes, Settings, KYC & Developer APIs

> **Operational Objective**: Customer dispute handling, store business identity, merchant KYC dossier verification, developer REST API/webhooks, multi-store switcher, and helpdesk.
> **Application Routes**: `/hub/dashboard/disputes`, `/hub/dashboard/settings`, `/hub/dashboard/kyc`, `/hub/dashboard/security`, `/hub/dashboard/staff`, `/hub/dashboard/notifications`, `/hub/dashboard/help`
> **Pages Covered in this Section**: Page 59, Page 60, Page 61, Page 62, Page 63, Page 64, Page 65, Page 66, Page 67, Page 68

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

### [Page 59] Customer Disputes, Infringement Claims & Resolution Cases

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

