-- Rollback Migration 046
UPDATE pd_marketplace_category SET
  description_fr = NULL,
  description_ar = NULL,
  description_en = NULL;
