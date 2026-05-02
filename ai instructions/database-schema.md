# PandaMarket — Schéma de Base de Données

> **Version :** 1.0 | **Date :** 02 Mai 2026  
> **ORM :** TypeORM (MedusaJS natif) ou Prisma  
> **BDD :** PostgreSQL

---

## Diagramme des Relations

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│    User      │────▶│     Store         │────▶│ Subscription     │
│              │ 1:1 │                   │ N:1 │ _Limits          │
└──────────────┘     └───────┬───────────┘     └──────────────────┘
                             │
          ┌──────────────────┼──────────────────┬─────────────────┐
          │ 1:N              │ 1:1              │ 1:1             │ 1:N
          ▼                  ▼                  ▼                 ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐
│   Product    │  │  Vendor_Wallet   │  │ Vendor       │  │  API_Keys  │
│              │  │                  │  │ _Credits     │  │            │
└──────┬───────┘  └──────────────────┘  └──────────────┘  └────────────┘
       │ 1:N
       ▼                  ┌──────────────────┐
┌──────────────┐          │ Verification     │
│    Order     │          │ _Documents       │
│              │          └──────────────────┘
└──────┬───────┘
       │ 1:1                              ┌──────────────┐
       ▼                                  │   Reports    │
┌──────────────┐                          │ (Signalement)│
│ Mandat_Proofs│                          └──────────────┘
└──────────────┘
```

---

## Tables Détaillées

### 1. `Store` (Extension MedusaJS)

Étend le modèle `Store` natif de MedusaJS.

```sql
ALTER TABLE store ADD COLUMN status VARCHAR(20) DEFAULT 'unverified';
  -- ENUM: 'unverified', 'verified', 'suspended'

ALTER TABLE store ADD COLUMN is_verified BOOLEAN DEFAULT false;

ALTER TABLE store ADD COLUMN subscription_plan VARCHAR(20) DEFAULT 'free';
  -- ENUM: 'free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'

ALTER TABLE store ADD COLUMN subscription_type VARCHAR(20) DEFAULT 'commission';
  -- ENUM: 'commission', 'yearly'

ALTER TABLE store ADD COLUMN subdomain VARCHAR(100) UNIQUE NOT NULL;
ALTER TABLE store ADD COLUMN custom_domain VARCHAR(255) UNIQUE;
ALTER TABLE store ADD COLUMN theme_id VARCHAR(50) DEFAULT 'minimal';
ALTER TABLE store ADD COLUMN settings JSONB DEFAULT '{}';
  -- { "colors": { "primary": "#...", "secondary": "#..." },
  --   "logo_url": "...", "favicon_url": "...", "store_name": "..." }

ALTER TABLE store ADD COLUMN payment_config JSONB;
  -- { "flouci_api_key": "...", "konnect_api_key": "..." }
  -- Chiffré en BDD. Null si mode Escrow.

ALTER TABLE store ADD COLUMN shipping_mode VARCHAR(20) DEFAULT 'self_managed';
  -- ENUM: 'self_managed', 'platform_unified'
```

---

### 2. `subscription_limits`

```sql
CREATE TABLE subscription_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         VARCHAR(20) UNIQUE NOT NULL,
  max_products    INTEGER NOT NULL,
  max_images_per_product INTEGER NOT NULL,
  has_ai_seo      BOOLEAN DEFAULT false,
  has_image_compression BOOLEAN DEFAULT false,
  has_custom_domain BOOLEAN DEFAULT false,
  has_page_builder BOOLEAN DEFAULT false,
  has_direct_payment BOOLEAN DEFAULT false,
  has_white_label BOOLEAN DEFAULT false,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  ai_tokens_included INTEGER DEFAULT 0,
  yearly_price    DECIMAL(10,2),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Seed Data :**

| plan_id | max_products | max_images | commission | ai_seo | custom_domain | page_builder | direct_pay |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| free | 10 | 2 | 15% | ❌ | ❌ | ❌ | ❌ |
| starter | 50 | 5 | 0% | ✅ basic | ✅ | ❌ | ❌ |
| regular | 100 | 7 | 0% | ✅ basic | ✅ | ✅ | ❌ |
| agency | 300 | 10 | 0% | ✅ adv | ✅ | ✅ | ❌ |
| pro | ∞ | 15 | 0% | ✅ ∞ | ✅ | ✅ | ✅ |
| golden | ∞ | 20 | 0% | ✅ ∞ | ✅ | ✅ | ✅ |
| platinum | ∞ | 30 | 0% | ✅ prem | ✅ WL | ✅ | ✅ |

---

### 3. `vendor_wallet`

```sql
CREATE TABLE vendor_wallet (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID UNIQUE NOT NULL REFERENCES store(id),
  balance         DECIMAL(12,3) DEFAULT 0,       -- Solde disponible (TND)
  pending_balance DECIMAL(12,3) DEFAULT 0,       -- En période de rétention
  total_earned    DECIMAL(12,3) DEFAULT 0,       -- Cumul total gagné
  total_withdrawn DECIMAL(12,3) DEFAULT 0,       -- Cumul total retiré
  payout_mode     VARCHAR(20) DEFAULT 'on_demand',
    -- ENUM: 'automatic', 'on_demand'
  retention_days  INTEGER DEFAULT 7,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 4. `vendor_credits`

```sql
CREATE TABLE vendor_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID UNIQUE NOT NULL REFERENCES store(id),
  ai_tokens       INTEGER DEFAULT 0,
  tokens_used     INTEGER DEFAULT 0,
  last_refill     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 5. `mandat_proofs`

```sql
CREATE TABLE mandat_proofs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES "order"(id),
  uploaded_by     VARCHAR(10) NOT NULL,
    -- ENUM: 'buyer', 'vendor'
  image_url       TEXT NOT NULL,             -- Presigned URL S3
  amount_expected DECIMAL(10,3) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
    -- ENUM: 'pending', 'approved', 'rejected'
  reviewed_by     UUID REFERENCES "user"(id),
  reviewed_at     TIMESTAMP,
  rejection_reason TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 6. `verification_documents`

```sql
CREATE TABLE verification_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID UNIQUE NOT NULL REFERENCES store(id),
  rc_document_url TEXT,                      -- Registre de Commerce
  cin_document_url TEXT,                     -- CIN
  phone_number    VARCHAR(20),
  phone_verified  BOOLEAN DEFAULT false,
  status          VARCHAR(20) DEFAULT 'pending',
    -- ENUM: 'pending', 'approved', 'rejected'
  reviewed_by     UUID REFERENCES "user"(id),
  reviewed_at     TIMESTAMP,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 7. `reports`

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES customer(id),
  store_id        UUID NOT NULL REFERENCES store(id),
  order_id        UUID REFERENCES "order"(id),
  reason          TEXT NOT NULL,
  evidence_urls   JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'open',
    -- ENUM: 'open', 'investigating', 'resolved', 'dismissed'
  admin_notes     TEXT,
  resolved_by     UUID REFERENCES "user"(id),
  resolved_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 8. `api_keys`

```sql
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES store(id),
  key_hash        VARCHAR(255) NOT NULL,     -- Hash SHA-256
  key_prefix      VARCHAR(10) NOT NULL,      -- Ex: "pd_sk_a1b2"
  label           VARCHAR(100) NOT NULL,
  scopes          JSONB DEFAULT '["products:read"]',
    -- Ex: ["products:read", "products:write", "orders:read", "stock:write"]
  is_active       BOOLEAN DEFAULT true,
  last_used_at    TIMESTAMP,
  expires_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 9. `wallet_transactions` (Historique)

```sql
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES vendor_wallet(id),
  type            VARCHAR(20) NOT NULL,
    -- ENUM: 'sale', 'commission', 'payout', 'refund', 'addon_purchase'
  amount          DECIMAL(12,3) NOT NULL,
  order_id        UUID REFERENCES "order"(id),
  description     TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 10. `themes`

```sql
CREATE TABLE themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(50) UNIQUE NOT NULL,  -- Ex: 'minimal', 'classic'
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  preview_url     TEXT,
  is_free         BOOLEAN DEFAULT true,
  price           DECIMAL(10,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Index Recommandés

```sql
CREATE INDEX idx_store_subdomain ON store(subdomain);
CREATE INDEX idx_store_custom_domain ON store(custom_domain);
CREATE INDEX idx_store_status ON store(status);
CREATE INDEX idx_mandat_proofs_status ON mandat_proofs(status);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_api_keys_store ON api_keys(store_id);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_verification_status ON verification_documents(status);
```
