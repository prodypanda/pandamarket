-- 100_cod_otp_hardening.down.sql
--
-- Reverts the COD OTP hardening columns. The legacy plaintext otp_code column
-- is restored empty (hashes cannot be reversed), so any in-flight OTP must be
-- re-requested after a rollback.

ALTER TABLE pd_cod_verification
  ADD COLUMN IF NOT EXISTS otp_code VARCHAR(20);

ALTER TABLE pd_cod_verification
  DROP COLUMN IF EXISTS otp_hash,
  DROP COLUMN IF EXISTS otp_expires_at,
  DROP COLUMN IF EXISTS otp_attempts,
  DROP COLUMN IF EXISTS otp_channel;
