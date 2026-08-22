DROP TABLE IF EXISTS pd_courier_settlement;
DROP TABLE IF EXISTS pd_cod_verification;
DROP TABLE IF EXISTS pd_shipment_reconciliation;
DROP TABLE IF EXISTS pd_shipment_event;

DROP TRIGGER IF EXISTS trg_pd_shipment_updated_at ON pd_shipment;

DROP INDEX IF EXISTS idx_shipment_reconciliation_due;
DROP INDEX IF EXISTS idx_shipment_provider_tracking;

ALTER TABLE pd_fulfillment
  DROP COLUMN IF EXISTS rto_reason_code,
  DROP COLUMN IF EXISTS rto_notes,
  DROP COLUMN IF EXISTS rto_at;

ALTER TABLE pd_shipment
  DROP COLUMN IF EXISTS provider_reference,
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS cancellation_requested_at,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS last_synced_at,
  DROP COLUMN IF EXISTS next_sync_at,
  DROP COLUMN IF EXISTS sync_attempts,
  DROP COLUMN IF EXISTS last_sync_error;
