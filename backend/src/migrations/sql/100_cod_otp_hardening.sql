-- 100_cod_otp_hardening.sql
--
-- Hardens the COD verification OTP. Previously sendCodOtp generated a 6-digit
-- code, stored it in PLAINTEXT (pd_cod_verification.otp_code), logged it, and
-- RETURNED IT IN THE HTTP RESPONSE — which the seller dashboard rendered on
-- screen. No SMS was ever sent, there was no expiry, no attempt limit and no
-- rate limit, so the "customer OTP confirmation" had zero fraud value.
--
-- This migration adds the columns needed for a real OTP flow:
--   otp_hash        - SHA-256 of the code (never the code itself)
--   otp_expires_at  - short validity window (10 minutes)
--   otp_attempts    - failed verification counter for lockout
--   otp_channel     - how the code was delivered (sms | whatsapp | none)
-- The legacy plaintext otp_code column is dropped, and any pending plaintext
-- codes are invalidated (customers simply request a new code).

ALTER TABLE pd_cod_verification
  ADD COLUMN IF NOT EXISTS otp_hash       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS otp_attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_channel    VARCHAR(20);

-- Invalidate any in-flight plaintext OTPs before removing the column.
UPDATE pd_cod_verification
SET otp_sent_at = NULL,
    updated_at = NOW()
WHERE otp_code IS NOT NULL;

ALTER TABLE pd_cod_verification DROP COLUMN IF EXISTS otp_code;

COMMENT ON COLUMN pd_cod_verification.otp_hash IS
  'SHA-256 hash of the delivered OTP. The plaintext code is never persisted, logged, or returned by the API.';
COMMENT ON COLUMN pd_cod_verification.otp_channel IS
  'Delivery channel actually used for the last OTP: sms | whatsapp | none.';
