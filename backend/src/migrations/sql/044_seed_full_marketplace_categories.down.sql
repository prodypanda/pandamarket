-- Rollback Migration 044
DELETE FROM pd_marketplace_category WHERE id IN (
  'cat_market_smartphones', 'cat_market_iphone', 'cat_market_samsung', 'cat_market_android', 'cat_market_phone_acc',
  'cat_market_computers', 'cat_market_laptops', 'cat_market_desktops', 'cat_market_gaming',
  'cat_market_audio_tv', 'cat_market_headphones', 'cat_market_speakers',
  'cat_market_men_fashion', 'cat_market_men_tops', 'cat_market_men_shoes',
  'cat_market_women_fashion', 'cat_market_women_dresses', 'cat_market_women_shoes',
  'cat_market_watches_jewelry', 'cat_market_skincare', 'cat_market_makeup', 'cat_market_perfumes',
  'cat_market_furniture', 'cat_market_appliances', 'cat_market_kitchen',
  'cat_market_tunisian_local', 'cat_market_beverages', 'cat_market_pottery', 'cat_market_textiles',
  'cat_market_kids', 'cat_market_baby_care', 'cat_market_kids_toys', 'cat_market_kids_clothing',
  'cat_market_books_stationery', 'cat_market_books', 'cat_market_stationery',
  'cat_market_health', 'cat_market_supplements', 'cat_market_medical',
  'cat_market_jewelry_luxury', 'cat_market_gold_silver', 'cat_market_handbags_luggage', 'cat_market_eyewear',
  'cat_market_pet_garden', 'cat_market_pet_supplies', 'cat_market_gardening',
  'cat_market_household', 'cat_market_cleaning', 'cat_market_music'
);
