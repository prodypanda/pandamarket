-- =====================================================
-- Migration 044: Comprehensive World-Class Marketplace Category Taxonomy
-- =====================================================

-- ----------------------------------------------------
-- 1. Top-Level Departments
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, name, slug, description, short_description, is_default, is_active, position, icon)
VALUES
  ('cat_market_uncategorized', 'Non categorized products', 'non-categorized-products', 'Default marketplace category for uncategorized products.', 'Uncategorized items', true, true, 0, 'Tags'),
  ('cat_market_electronics', 'Electronics & High-Tech', 'electronics-high-tech', 'Smartphones, laptops, gaming, TV, audio, and gadgets.', 'Tech, Phones & Gaming', false, true, 10, 'Smartphone'),
  ('cat_market_womens_fashion', 'Women''s Fashion', 'womens-fashion', 'Women dresses, shoes, handbags, apparel, and traditional wear.', 'Dresses, Bags & Shoes', false, true, 20, 'Shirt'),
  ('cat_market_mens_fashion', 'Men''s Fashion', 'mens-fashion', 'Men suits, t-shirts, jeans, formal shoes, and accessories.', 'Shirts, Suits & Sneakers', false, true, 30, 'User'),
  ('cat_market_watches_jewelry', 'Watches & Fine Jewelry', 'watches-jewelry', 'Luxury watches, gold 18k, sterling silver, and accessories.', 'Luxury Watches & Gold', false, true, 40, 'Gem'),
  ('cat_market_beauty', 'Beauty, Perfumes & Care', 'beauty-personal-care', 'Fragrances, skincare, makeup, haircare, and grooming.', 'Perfumes, Skincare & Makeup', false, true, 50, 'Sparkles'),
  ('cat_market_home', 'Home, Furniture & Living', 'home-furniture-living', 'Furniture, bedding, decor, kitchenware, and lighting.', 'Furniture & Home Decor', false, true, 60, 'Home'),
  ('cat_market_appliances', 'Home Appliances', 'home-appliances', 'Refrigerators, washing machines, TV, coffee makers, and air fryers.', 'Electroménager & TVs', false, true, 70, 'Tv'),
  ('cat_market_food', 'Food & Tunisian Delicacies', 'food-grocery-supermarket', 'Olive oil, Harissa, Deglet Nour dates, artisanal coffee, and sweets.', 'Tunisian Terroir & Grocery', false, true, 80, 'Utensils'),
  ('cat_market_handmade', 'Tunisian Craftsmanship', 'handicraft-artisan', 'Nabeul pottery, Sejnane clay, Margoum carpets, and olive wood.', 'Artisan Pottery & Carpets', false, true, 90, 'Palette'),
  ('cat_market_kids', 'Toys, Baby & Kids', 'toys-baby-kids', 'Strollers, baby gear, toys, LEGO, and kids clothing.', 'Prams, Toys & Kids Wear', false, true, 100, 'Baby'),
  ('cat_market_sports', 'Sports, Fitness & Outdoor', 'sports-fitness-outdoor', 'Treadmills, dumbbells, sportswear, camping, and bicycles.', 'Fitness & Sportswear', false, true, 110, 'Dumbbell'),
  ('cat_market_auto', 'Auto, Moto & Tools', 'auto-moto-tools', 'Car parts, motor oils, car audio, motorcycle helmets, and power tools.', 'Car Parts & Tools', false, true, 120, 'Wrench'),
  ('cat_market_books_office', 'Books & Office Supplies', 'books-stationery-office', 'Novels, school supplies, notebooks, pens, and art gear.', 'Books & School Supplies', false, true, 130, 'BookOpen'),
  ('cat_market_health', 'Health & Pharmacy', 'health-pharmacy-wellness', 'Whey protein, vitamins, blood pressure monitors, and medical care.', 'Supplements & Medical', false, true, 140, 'HeartPulse'),
  ('cat_market_pet', 'Pet Supplies & Garden', 'pet-supplies-care', 'Cat food, dog kibble, aquariums, plants, and seeds.', 'Cat Food & Gardening', false, true, 150, 'Dog'),
  ('cat_market_household', 'Supermarket & Hygiene', 'supermarket-household', 'Detergents, dishwashing, cleaning supplies, and paper goods.', 'Cleaning & Hygiene', false, true, 160, 'Sparkle'),
  ('cat_market_music', 'Musical Instruments', 'musical-instruments-studio', 'Guitars, keyboards, drums, microphones, and studio audio.', 'Guitars & Audio Gear', false, true, 170, 'Music'),
  ('cat_market_business', 'Business & Commercial', 'business-industrial', 'POS scanners, receipt printers, store racks, and office chairs.', 'Store Fixtures & POS', false, true, 180, 'Briefcase')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  icon = EXCLUDED.icon,
  updated_at = NOW();

-- ----------------------------------------------------
-- 2. Electronics Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_smartphones', 'cat_market_electronics', 'Smartphones & Mobile Phones', 'smartphones-phones', 'iOS, Android, and feature mobile phones.', 'Mobile Phones', false, true, 201),
  ('cat_market_iphone', 'cat_market_smartphones', 'Apple iPhone', 'apple-iphone', 'iPhones, MagSafe cases, and Apple devices.', 'iPhone & Apple', false, true, 202),
  ('cat_market_samsung', 'cat_market_smartphones', 'Samsung Galaxy', 'samsung-galaxy', 'Galaxy S, Galaxy A, and Foldable phones.', 'Samsung Galaxy', false, true, 203),
  ('cat_market_xiaomi', 'cat_market_smartphones', 'Xiaomi, Redmi & Poco', 'xiaomi-redmi-poco', 'Xiaomi smartphones, Redmi Note, and Poco phones.', 'Xiaomi & Redmi', false, true, 204),
  ('cat_market_oppo_realme', 'cat_market_smartphones', 'Oppo, Realme & Vivo', 'oppo-realme-vivo', 'Oppo Reno, Realme, Vivo, and Huawei smartphones.', 'Oppo & Realme', false, true, 205),
  ('cat_market_phone_acc', 'cat_market_smartphones', 'Phone Accessories', 'phone-accessories', 'Cases, screen protectors, fast chargers, cables & powerbanks.', 'Cases & Chargers', false, true, 206),

  ('cat_market_computers', 'cat_market_electronics', 'Computers & Laptops', 'computers-laptops', 'Laptops, MacBooks, desktop PCs, and monitors.', 'Laptops & PCs', false, true, 210),
  ('cat_market_laptops', 'cat_market_computers', 'Gaming & Business Laptops', 'gaming-laptops-notebooks', 'Gaming laptops, ASUS ROG, HP, Dell, and Lenovo notebooks.', 'Gaming Laptops', false, true, 211),
  ('cat_market_macbooks', 'cat_market_computers', 'Apple MacBooks & iMacs', 'macbooks-imacs', 'MacBook Air M2/M3, MacBook Pro, and iMacs.', 'MacBooks & iMacs', false, true, 212),
  ('cat_market_desktops', 'cat_market_computers', 'Desktop PCs & Monitors', 'desktop-pcs-monitors', 'Gaming PC towers, workstations, and high-refresh monitors.', 'PCs & Monitors', false, true, 213),
  ('cat_market_pc_parts', 'cat_market_computers', 'PC Components & Storage', 'pc-components-storage', 'GPUs, CPUs, RAM, SSDs, power supplies & PC cases.', 'GPUs, CPUs & SSDs', false, true, 214),

  ('cat_market_gaming', 'cat_market_electronics', 'Gaming & Consoles', 'gaming-esports', 'PlayStation 5, Xbox Series X, Nintendo Switch, and controllers.', 'PS5, Xbox & Switch', false, true, 220),
  ('cat_market_playstation', 'cat_market_gaming', 'PlayStation 5 & Games', 'playstation', 'PS5 consoles, DualSense controllers, and games.', 'PS5 & Games', false, true, 221),
  ('cat_market_xbox', 'cat_market_gaming', 'Xbox & Nintendo', 'xbox-nintendo', 'Xbox Series S/X, Nintendo Switch OLED, and accessories.', 'Xbox & Switch', false, true, 222),

  ('cat_market_audio_tv', 'cat_market_electronics', 'TV, Audio & Cameras', 'tv-audio-home-cinema', 'Smart TVs, soundbars, wireless earbuds, and cameras.', 'TVs & Audio', false, true, 230),
  ('cat_market_earbuds', 'cat_market_audio_tv', 'Wireless Earbuds & Headphones', 'wireless-earbuds-headphones', 'AirPods, Sony, JBL earbuds & noise-canceling headphones.', 'AirPods & Earbuds', false, true, 231),
  ('cat_market_smart_tvs', 'cat_market_audio_tv', 'Smart TVs & Soundbars', 'smart-tvs-soundbars', '4K OLED/QLED TVs, Samsung, LG, TCL, and soundbars.', '4K Smart TVs', false, true, 232),
  ('cat_market_cameras', 'cat_market_audio_tv', 'Cameras & Drones', 'cameras-photography-drones', 'Canon, Sony mirrorless cameras, GoPro, and DJI drones.', 'Cameras & Drones', false, true, 233)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 3. Women's Fashion Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_w_dresses', 'cat_market_womens_fashion', 'Dresses & Jumpsuits', 'dresses-jumpsuits', 'Evening dresses, casual summer dresses, and jumpsuits.', 'Dresses & Suits', false, true, 301),
  ('cat_market_w_tops', 'cat_market_womens_fashion', 'Tops, Shirts & Blouses', 'womens-tops-blouses', 'T-shirts, chic blouses, shirts, and crop tops.', 'Tops & Shirts', false, true, 302),
  ('cat_market_w_pants', 'cat_market_womens_fashion', 'Jeans, Pants & Trousers', 'womens-pants-jeans', 'Jeans, wide-leg trousers, leggings, and shorts.', 'Jeans & Pants', false, true, 303),
  ('cat_market_w_jackets', 'cat_market_womens_fashion', 'Jackets, Coats & Hoodies', 'womens-jackets-coats', 'Winter coats, blazers, denim jackets, and hoodies.', 'Coats & Blazers', false, true, 304),
  ('cat_market_w_traditional', 'cat_market_womens_fashion', 'Traditional & Abayas', 'traditional-hijab-fashion', 'Abayas, Kaftans, Tunisian Jebba, and Hijab scarves.', 'Abayas & Kaftans', false, true, 305),
  ('cat_market_w_shoes', 'cat_market_womens_fashion', 'Women''s Shoes & Heels', 'womens-shoes', 'Heels, trendy sneakers, sandals, and boots.', 'Heels & Sneakers', false, true, 306),
  ('cat_market_w_bags', 'cat_market_womens_fashion', 'Handbags & Backpacks', 'womens-bags-accessories', 'Leather handbags, shoulder bags, totes, and wallets.', 'Handbags & Totes', false, true, 307)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 4. Men's Fashion Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_m_tops', 'cat_market_mens_fashion', 'T-Shirts, Polos & Shirts', 'mens-tshirts-polos-shirts', 'Casual t-shirts, polo shirts, and formal dress shirts.', 'Shirts & Polos', false, true, 401),
  ('cat_market_m_jeans', 'cat_market_mens_fashion', 'Jeans & Chinos', 'mens-jeans-chinos', 'Slim fit jeans, casual chinos, and trousers.', 'Jeans & Chinos', false, true, 402),
  ('cat_market_m_suits', 'cat_market_mens_fashion', 'Suits & Blazers', 'mens-suits-blazers', 'Formal suits, blazers, and wedding tuxedos.', 'Suits & Blazers', false, true, 403),
  ('cat_market_m_jackets', 'cat_market_mens_fashion', 'Jackets, Coats & Hoodies', 'mens-jackets-hoodies', 'Leather jackets, parkas, hoodies, and sweatshirts.', 'Jackets & Hoodies', false, true, 404),
  ('cat_market_m_sneakers', 'cat_market_mens_fashion', 'Sneakers & Casual Shoes', 'mens-sneakers-casual-shoes', 'Fashion sneakers, running shoes, and loafers.', 'Sneakers & Shoes', false, true, 405),
  ('cat_market_m_formal_shoes', 'cat_market_mens_fashion', 'Formal Leather Shoes', 'mens-formal-leather-shoes', 'Oxfords, Derbies, boots, and leather shoes.', 'Leather Dress Shoes', false, true, 406),
  ('cat_market_m_wallets', 'cat_market_mens_fashion', 'Wallets, Belts & Caps', 'mens-wallets-belts-caps', 'Leather wallets, belts, caps, and sunglasses.', 'Wallets & Belts', false, true, 407)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 5. Watches & Fine Jewelry Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_m_watches', 'cat_market_watches_jewelry', 'Men''s Watches', 'mens-watches', 'Chronographs, automatic, and steel luxury watches.', 'Men''s Watches', false, true, 501),
  ('cat_market_w_watches', 'cat_market_watches_jewelry', 'Women''s Watches', 'womens-watches', 'Gold, rose gold, crystal, and elegant watches.', 'Women''s Watches', false, true, 502),
  ('cat_market_gold', 'cat_market_watches_jewelry', 'Gold Jewelry (18k / 24k)', 'gold-jewelry', '18k gold necklaces, rings, and bracelets.', '18k Gold Jewelry', false, true, 503),
  ('cat_market_silver', 'cat_market_watches_jewelry', 'Sterling Silver Jewelry', 'silver-jewelry', '925 sterling silver rings, chains, and earrings.', 'Sterling Silver 925', false, true, 504)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 6. Beauty, Perfumes & Personal Care Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_w_perfumes', 'cat_market_beauty', 'Women''s Perfumes', 'womens-perfumes', 'Luxury French perfumes, Chanel, Dior, Yves Saint Laurent.', 'Women''s Fragrances', false, true, 601),
  ('cat_market_m_colognes', 'cat_market_beauty', 'Men''s Colognes & Oud', 'mens-colognes-oud', 'Sauvage, Bleu de Chanel, and Arabian Oud colognes.', 'Men''s Colognes', false, true, 602),
  ('cat_market_skincare', 'cat_market_beauty', 'Skincare & Dermocosmetics', 'skincare-dermo', 'La Roche-Posay, CeraVe, Vichy creams, serums & sunscreens.', 'Skincare & Serums', false, true, 603),
  ('cat_market_makeup', 'cat_market_beauty', 'Makeup & Cosmetics', 'makeup-cosmetics', 'Foundations, lipsticks, mascaras, and palettes.', 'Makeup & Palette', false, true, 604),
  ('cat_market_haircare', 'cat_market_beauty', 'Haircare & Styling Tools', 'haircare-styling', 'Keratin masks, serums, Dyson hair dryers & straighteners.', 'Haircare & Straighteners', false, true, 605),
  ('cat_market_grooming', 'cat_market_beauty', 'Men''s Grooming & Trimmers', 'personal-care-grooming', 'Beard trimmers, electric shavers, and grooming kits.', 'Trimmers & Shavers', false, true, 606)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 7. Home, Furniture & Living Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_sofas', 'cat_market_home', 'Living Room Sofas & Armchairs', 'sofas-armchairs', 'Corner sofas, recliner armchairs, and L-shaped couches.', 'Sofas & Couches', false, true, 701),
  ('cat_market_beds', 'cat_market_home', 'Beds & Mattresses', 'beds-mattresses', 'Double beds, orthopedic mattresses, and headboards.', 'Beds & Mattresses', false, true, 702),
  ('cat_market_tables', 'cat_market_home', 'Tables, Chairs & Storage', 'tables-chairs-storage', 'Dining tables, office desks, wardrobes & closets.', 'Tables & Wardrobes', false, true, 703),
  ('cat_market_decor', 'cat_market_home', 'Rugs, Lighting & Wall Art', 'home-decor-lighting', 'Carpets, chandeliers, LED lamps, and wall paintings.', 'Rugs & Lighting', false, true, 704),
  ('cat_market_cookware', 'cat_market_home', 'Cookware & Kitchen Utensils', 'kitchen-diningware', 'Granite pots, pans, dinnerware sets & knives.', 'Pots, Pans & Plates', false, true, 705)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 8. Major & Small Home Appliances Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_fridges', 'cat_market_appliances', 'Refrigerators & Freezers', 'refrigerators-freezers', 'No-Frost refrigerators, side-by-side, and chest freezers.', 'Fridges & Freezers', false, true, 801),
  ('cat_market_washers', 'cat_market_appliances', 'Washing Machines & Dryers', 'washing-machines-dryers', 'Front load washers, LG, Samsung, and dryers.', 'Washers & Dryers', false, true, 802),
  ('cat_market_air_fryers', 'cat_market_appliances', 'Air Fryers & Espresso Makers', 'air-fryers-coffee-makers', 'Ninja/Philips air fryers, Delonghi espresso machines.', 'Air Fryers & Coffee', false, true, 803),
  ('cat_market_climatisation', 'cat_market_appliances', 'Air Conditioners & Heating', 'air-conditioners-heating', 'Inverter air conditioners, split systems, and heaters.', 'Air Conditioners', false, true, 804)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 9. Food & Tunisian Local Specialties Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_olive_oil', 'cat_market_food', 'Tunisian Extra Virgin Olive Oil', 'tunisian-olive-oil', 'Organic extra virgin Tunisian olive oil in tins and bottles.', 'Extra Virgin Olive Oil', false, true, 901),
  ('cat_market_harissa_spices', 'cat_market_food', 'Traditional Harissa & Spices', 'harissa-spices', 'Authentic Baklouti harissa, Tabil, Caraway & Tunisian spices.', 'Harissa & Spices', false, true, 902),
  ('cat_market_dates', 'cat_market_food', 'Deglet Nour Dates & Honey', 'deglet-nour-dates', 'Premium Tozeur Deglet Nour dates and wildflower honey.', 'Deglet Nour Dates', false, true, 903),
  ('cat_market_coffee_tea', 'cat_market_food', 'Coffee, Tea & Beverages', 'coffee-tea-beverages', 'Roasted coffee beans, ground coffee, and mint tea.', 'Coffee & Mint Tea', false, true, 904)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 10. Tunisian Craftsmanship Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_nabeul_pottery', 'cat_market_handmade', 'Nabeul & Sejnane Pottery', 'nabeul-pottery-ceramics', 'Handpainted Nabeul ceramic bowls, tajines, and Sejnane clay.', 'Nabeul Pottery', false, true, 1001),
  ('cat_market_margoum', 'cat_market_handmade', 'Margoum & Klim Carpets', 'margoum-klim-carpets', 'Traditional woven Margoum, Berber rugs, and Klim blankets.', 'Margoum & Berber Rugs', false, true, 1002),
  ('cat_market_fouta', 'cat_market_handmade', 'Tunisian Fouta & Weaving', 'foutas-throws', '100% cotton Tunisian hammam Fouta towels and throws.', 'Cotton Foutas', false, true, 1003)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 11. Toys, Baby & Kids Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_strollers', 'cat_market_kids', 'Strollers & Car Seats', 'strollers-prams', '3-in-1 baby strollers, prams, and ISOFIX car seats.', 'Strollers & Car Seats', false, true, 1101),
  ('cat_market_lego_toys', 'cat_market_kids', 'Toys, LEGO & Board Games', 'lego-toys-games', 'LEGO sets, action figures, Barbie dolls, and puzzles.', 'LEGO & Action Toys', false, true, 1102),
  ('cat_market_kids_fashion', 'cat_market_kids', 'Baby & Kids Apparel', 'baby-kids-fashion', 'Baby onesies, boys and girls clothing, and shoes.', 'Baby & Kids Apparel', false, true, 1103)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 12. Sports, Fitness & Outdoor Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_treadmills', 'cat_market_sports', 'Treadmills & Gym Weights', 'treadmills-bikes-weights', 'Electric treadmills, exercise bikes, dumbbells & kettlebells.', 'Treadmills & Weights', false, true, 1201),
  ('cat_market_sportswear', 'cat_market_sports', 'Sportswear & Running Shoes', 'sportswear-running-shoes', 'Nike, Adidas sportswear, tracksuits, leggings & shoes.', 'Nike & Adidas Sportswear', false, true, 1202),
  ('cat_market_bicycles', 'cat_market_sports', 'Bicycles & Electric Scooters', 'bicycles-scooters', 'Mountain bikes, road bicycles, and electric scooters.', 'Bicycles & Trottinettes', false, true, 1203)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 13. Auto, Moto & Tools Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_car_oils', 'cat_market_auto', 'Motor Oils & Car Care', 'car-oils-fluids-care', '5W30 synthetic motor oils, brake fluid, and detailing kits.', 'Motor Oils & Care', false, true, 1301),
  ('cat_market_car_audio', 'cat_market_auto', 'Car Dashcams & Android Screen', 'car-audio-dashcams-gps', 'Android touch screens, dashcams, speakers & parking sensors.', 'Android Screen & Audio', false, true, 1302),
  ('cat_market_power_tools', 'cat_market_auto', 'Power Tools & Hand Tools', 'power-tools-drills-wrenches', 'Bosch, DeWalt cordless drills, angle grinders & tool sets.', 'Cordless Drills & Tools', false, true, 1303)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- ----------------------------------------------------
-- 14. Health, Pharmacy & Wellness Subcategories
-- ----------------------------------------------------
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_whey', 'cat_market_health', 'Whey Protein & Supplements', 'whey-protein-creatine-supplements', 'Whey protein isolate, creatine monohydrate, BCAA & vitamins.', 'Whey Protein & Creatine', false, true, 1401),
  ('cat_market_tensiometers', 'cat_market_health', 'Blood Pressure & Medical Devices', 'blood-pressure-monitors-medical', 'Omron blood pressure monitors, glucose meters & thermometers.', 'Blood Pressure Monitors', false, true, 1402)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();
