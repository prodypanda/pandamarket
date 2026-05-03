-- Migration 003: Shipping tables and digital product support
--
-- Adds:
--   1. pd_shipment — tracks shipments created via Aramex / La Poste / manual
--   2. pd_pickup_request — pickup scheduling for vendors
--   3. pd_license_key — license keys for digital products

-- =====================================================
-- Shipment tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS pd_shipment (
  id                  VARCHAR(50) PRIMARY KEY,
  order_id            VARCHAR(50) NOT NULL REFERENCES pd_order(id),
  fulfillment_id      VARCHAR(50) REFERENCES pd_fulfillment(id),
  store_id            VARCHAR(50) NOT NULL REFERENCES pd_store(id),
  provider            VARCHAR(20) NOT NULL DEFAULT 'manual',
    -- 'aramex', 'laposte', 'manual'
  tracking_number     VARCHAR(100) NOT NULL,
  label_url           TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'created',
    -- 'created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned'
  estimated_delivery  TIMESTAMP,
  delivered_at        TIMESTAMP,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_order ON pd_shipment(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_store ON pd_shipment(store_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking ON pd_shipment(tracking_number);

-- =====================================================
-- Pickup requests
-- =====================================================

CREATE TABLE IF NOT EXISTS pd_pickup_request (
  id                  VARCHAR(50) PRIMARY KEY,
  store_id            VARCHAR(50) NOT NULL REFERENCES pd_store(id),
  shipment_ids        JSONB NOT NULL DEFAULT '[]',
  pickup_date         DATE NOT NULL,
  pickup_address      JSONB NOT NULL,
  contact_name        VARCHAR(200) NOT NULL,
  contact_phone       VARCHAR(30) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'requested',
    -- 'requested', 'confirmed', 'completed', 'cancelled'
  provider_reference  VARCHAR(100),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_store ON pd_pickup_request(store_id);

-- =====================================================
-- License keys for digital products
-- =====================================================

CREATE TABLE IF NOT EXISTS pd_license_key (
  id                  VARCHAR(50) PRIMARY KEY,
  product_id          VARCHAR(50) NOT NULL REFERENCES pd_product(id),
  store_id            VARCHAR(50) NOT NULL REFERENCES pd_store(id),
  license_key         TEXT NOT NULL,
  order_id            VARCHAR(50) REFERENCES pd_order(id),
  assigned_at         TIMESTAMP,
  is_used             BOOLEAN DEFAULT false,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_product ON pd_license_key(product_id, is_used);
CREATE INDEX IF NOT EXISTS idx_license_order ON pd_license_key(order_id);

-- =====================================================
-- Digital product download tracking
-- =====================================================

ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 5;
ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS download_expires_hours INTEGER DEFAULT 72;
