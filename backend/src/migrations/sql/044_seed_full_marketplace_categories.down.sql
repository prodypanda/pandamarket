-- Rollback Migration 044
DELETE FROM pd_marketplace_category WHERE id IN (
  'cat_market_smartphones', 'cat_market_iphone', 'cat_market_samsung', 'cat_market_xiaomi', 'cat_market_oppo_realme', 'cat_market_phone_acc',
  'cat_market_computers', 'cat_market_laptops', 'cat_market_macbooks', 'cat_market_desktops', 'cat_market_pc_parts',
  'cat_market_gaming', 'cat_market_playstation', 'cat_market_xbox',
  'cat_market_audio_tv', 'cat_market_earbuds', 'cat_market_smart_tvs', 'cat_market_cameras',
  'cat_market_w_dresses', 'cat_market_w_tops', 'cat_market_w_pants', 'cat_market_w_jackets', 'cat_market_w_traditional', 'cat_market_w_shoes', 'cat_market_w_bags',
  'cat_market_m_tops', 'cat_market_m_jeans', 'cat_market_m_suits', 'cat_market_m_jackets', 'cat_market_m_sneakers', 'cat_market_m_formal_shoes', 'cat_market_m_wallets',
  'cat_market_m_watches', 'cat_market_w_watches', 'cat_market_gold', 'cat_market_silver',
  'cat_market_w_perfumes', 'cat_market_m_colognes', 'cat_market_skincare', 'cat_market_makeup', 'cat_market_haircare', 'cat_market_grooming',
  'cat_market_sofas', 'cat_market_beds', 'cat_market_tables', 'cat_market_decor', 'cat_market_cookware',
  'cat_market_fridges', 'cat_market_washers', 'cat_market_air_fryers', 'cat_market_climatisation',
  'cat_market_olive_oil', 'cat_market_harissa_spices', 'cat_market_dates', 'cat_market_coffee_tea',
  'cat_market_nabeul_pottery', 'cat_market_margoum', 'cat_market_fouta',
  'cat_market_strollers', 'cat_market_lego_toys', 'cat_market_kids_fashion',
  'cat_market_treadmills', 'cat_market_sportswear', 'cat_market_bicycles',
  'cat_market_car_oils', 'cat_market_car_audio', 'cat_market_power_tools',
  'cat_market_whey', 'cat_market_tensiometers',
  'cat_market_womens_fashion', 'cat_market_mens_fashion', 'cat_market_watches_jewelry', 'cat_market_books_office', 'cat_market_pet', 'cat_market_household', 'cat_market_business'
);
