-- Migration 028: seed PandaMarket Ads platform configuration
INSERT INTO pd_platform_config (key,value) VALUES
 ('ads_enabled','true'),
 ('ads_moderation_required','true'),
 ('ads_min_refill_tnd','5'),
 ('ads_max_refill_tnd','10000'),
 ('ads_min_daily_budget_tnd','1'),
 ('ads_max_campaign_days','90'),
 ('ads_frequency_cap_daily','5'),
 ('ads_click_attribution_days','7'),
 ('ads_view_attribution_days','1'),
 ('ads_sponsored_products_enabled','true'),
 ('ads_sponsored_brands_enabled','true'),
 ('ads_sponsored_content_enabled','true'),
 ('ads_prohibited_terms',''),
 ('ads_creative_image_required','false'),
 ('ads_max_creative_description_length','500')
ON CONFLICT (key) DO NOTHING;
