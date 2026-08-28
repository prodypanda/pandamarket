-- 094b_create_pd_cart_and_gamified_lead_tables.sql
--
-- Backfill CREATE TABLE migrations for pd_cart and pd_gamified_lead.
-- Both tables exist in production but were originally created out-of-band and
-- never had a migration, so a fresh environment built purely from ./sql could
-- never boot (093 indexes pd_cart, cart/gamified services query both).
-- The DDL below mirrors the live production schema exactly.
-- Every statement is IF NOT EXISTS, so this migration is a no-op on the
-- production database.

CREATE TABLE IF NOT EXISTS pd_cart (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT,
  session_token           TEXT,
  items                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  coupon_code             TEXT,
  discount_amount         NUMERIC DEFAULT 0,
  subtotal                NUMERIC DEFAULT 0,
  shipping_total          NUMERIC DEFAULT 0,
  customer_email          TEXT,
  customer_phone          TEXT,
  is_abandoned            BOOLEAN DEFAULT FALSE,
  abandoned_at            TIMESTAMPTZ,
  recovery_email_sent_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_cart_user_id ON pd_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_pd_cart_session_token ON pd_cart(session_token);
CREATE INDEX IF NOT EXISTS idx_pd_cart_abandoned ON pd_cart(is_abandoned, updated_at);

CREATE TABLE IF NOT EXISTS pd_gamified_lead (
  id                 TEXT PRIMARY KEY,
  store_id           TEXT,
  phone              TEXT,
  email              TEXT,
  consent_given      BOOLEAN NOT NULL DEFAULT TRUE,
  game_type          TEXT NOT NULL,
  prize_won          TEXT NOT NULL,
  coupon_code        TEXT NOT NULL,
  discount_value     NUMERIC NOT NULL DEFAULT 0,
  device_fingerprint TEXT,
  is_redeemed        BOOLEAN DEFAULT FALSE,
  redeemed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_gamified_lead_phone ON pd_gamified_lead(phone);
CREATE INDEX IF NOT EXISTS idx_pd_gamified_lead_coupon ON pd_gamified_lead(coupon_code);
