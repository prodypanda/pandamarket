-- Rollback Migration 044
DELETE FROM pd_marketplace_category WHERE id IN (
  'cat_market_smartphones', 'cat_market_iphone', 'cat_market_samsung', 'cat_market_android', 'cat_market_phone_acc',
  'cat_market_computers', 'cat_market_laptops', 'cat_market_desktops', 'cat_market_gaming',
  'cat_market_audio_tv', 'cat_market_headphones', 'cat_market_speakers',
  'cat_market_men_fashion', 'cat_market_men_tops', 'cat_market_men_shoes',
  'cat_market_women_fashion', 'cat_market_women_dresses', 'cat_market_women_shoes',
  'cat_market_watches_jewelry', 'cat_market_skincare', 'cat_market_makeup', 'cat_market_perfumes',
  'cat_market_furniture', 'cat_market_appliances', 'cat_market_kitchen',
  'cat_market_tunisian_local', 'cat_market_beverages', 'cat_market_pottery', 'cat_market_textiles'
);
