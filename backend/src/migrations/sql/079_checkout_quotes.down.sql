DROP INDEX IF EXISTS idx_order_quote_id;
ALTER TABLE pd_order_item
  DROP COLUMN IF EXISTS discount_breakdown,
  DROP COLUMN IF EXISTS discount_amount,
  DROP COLUMN IF EXISTS gross_subtotal;
ALTER TABLE pd_order
  DROP COLUMN IF EXISTS quote_snapshot,
  DROP COLUMN IF EXISTS discount_breakdown,
  DROP COLUMN IF EXISTS tax_total,
  DROP COLUMN IF EXISTS discount_total,
  DROP COLUMN IF EXISTS gross_subtotal,
  DROP COLUMN IF EXISTS coupon_code,
  DROP COLUMN IF EXISTS quote_version,
  DROP COLUMN IF EXISTS quote_id;
DROP TABLE IF EXISTS pd_checkout_quote;
