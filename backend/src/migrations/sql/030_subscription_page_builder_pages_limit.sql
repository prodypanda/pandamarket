ALTER TABLE pd_subscription_limits
  ADD COLUMN IF NOT EXISTS max_page_builder_pages INTEGER;

UPDATE pd_subscription_limits
SET max_page_builder_pages = CASE
  WHEN has_page_builder = false THEN 0
  WHEN plan_id = 'regular' THEN 20
  WHEN plan_id = 'agency' THEN 50
  WHEN plan_id = 'pro' THEN 100
  WHEN plan_id = 'golden' THEN 250
  WHEN plan_id = 'platinum' THEN -1
  ELSE 20
END
WHERE max_page_builder_pages IS NULL;

ALTER TABLE pd_subscription_limits
  ALTER COLUMN max_page_builder_pages SET DEFAULT 20,
  ALTER COLUMN max_page_builder_pages SET NOT NULL;
