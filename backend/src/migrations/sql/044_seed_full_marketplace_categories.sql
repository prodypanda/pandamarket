-- =====================================================
-- Migration 044: Full Multi-Level Marketplace Category Taxonomy (Enhanced & Rich)
-- =====================================================

-- Upsert Top-Level Categories
INSERT INTO pd_marketplace_category (id, name, slug, description, short_description, is_default, is_active, position, icon)
VALUES
  ('cat_market_uncategorized', 'Non categorized products', 'non-categorized-products', 'Default marketplace category for uncategorized products.', 'Uncategorized items', true, true, 0, 'Tags'),
  ('cat_market_electronics', 'Electronics & High-Tech', 'electronics-high-tech', 'Smartphones, computers, audio, and gadgets.', 'Tech & Devices', false, true, 10, 'Smartphone'),
  ('cat_market_fashion', 'Fashion & Apparel', 'fashion-apparel', 'Men and women clothing, shoes, and accessories.', 'Clothing & Accessories', false, true, 20, 'Shirt'),
  ('cat_market_beauty', 'Beauty & Cosmetics', 'beauty-cosmetics', 'Skincare, makeup, perfumes, and personal care.', 'Skincare & Perfumes', false, true, 30, 'Sparkles'),
  ('cat_market_home', 'Home & Living', 'home-living', 'Furniture, appliances, kitchenware, and decor.', 'Furniture & Appliances', false, true, 40, 'Home'),
  ('cat_market_food', 'Food & Grocery', 'food-grocery', 'Local Tunisian delicacies, coffee, snacks, and grocery.', 'Tunisian Delicacies', false, true, 50, 'Utensils'),
  ('cat_market_handmade', 'Handmade & Artisan', 'handmade-artisan', 'Crafts, pottery, traditional textiles, and artisan goods.', 'Artisan & Pottery', false, true, 60, 'Palette'),
  ('cat_market_sports', 'Sports & Fitness', 'sports-fitness', 'Gym gear, outdoor equipment, and athletic wear.', 'Fitness & Sportswear', false, true, 70, 'Dumbbell'),
  ('cat_market_auto', 'Auto, Moto & Tools', 'auto-moto-tools', 'Car accessories, motorcycle equipment, and hardware tools.', 'Car & Motorcycle Parts', false, true, 80, 'Wrench'),
  ('cat_market_kids', 'Toys, Baby & Kids', 'toys-baby-kids', 'Baby gear, toys, games, and kids clothing.', 'Toys & Baby Care', false, true, 90, 'Baby'),
  ('cat_market_books_stationery', 'Books & Stationery', 'books-stationery', 'Books, office supplies, school supplies, and crafts.', 'Books & Office', false, true, 100, 'BookOpen'),
  ('cat_market_health', 'Health & Wellness', 'health-wellness', 'Supplements, vitamins, and medical care products.', 'Vitamins & Care', false, true, 110, 'HeartPulse'),
  ('cat_market_jewelry_luxury', 'Jewelry, Luxury & Bags', 'jewelry-luxury-bags', 'Gold & silver jewelry, designer handbags, and sunglasses.', 'Jewelry & Handbags', false, true, 120, 'Gem'),
  ('cat_market_pet_garden', 'Pet Supplies & Garden', 'pet-supplies-garden', 'Pet food, toys, plants, seeds, and outdoor garden care.', 'Pets & Gardening', false, true, 130, 'Dog'),
  ('cat_market_household', 'Household & Cleaning', 'household-cleaning', 'Cleaning products, paper goods, and home hygiene.', 'Cleaning & Hygiene', false, true, 140, 'Sparkle'),
  ('cat_market_music', 'Musical Instruments & Audio', 'musical-instruments-audio', 'Guitars, keyboards, drums, and pro audio gear.', 'Instruments & Studio', false, true, 150, 'Music')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  icon = EXCLUDED.icon,
  updated_at = NOW();

-- Upsert Electronics Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_smartphones', 'cat_market_electronics', 'Smartphones & Phones', 'smartphones-phones', 'Mobile phones, smartphones, and mobile accessories.', 'Smartphones & Mobile', false, true, 110),
  ('cat_market_iphone', 'cat_market_smartphones', 'Apple iPhone', 'apple-iphone', 'iPhones, MagSafe accessories, and Apple products.', 'iPhones & Accessories', false, true, 111),
  ('cat_market_samsung', 'cat_market_smartphones', 'Samsung Galaxy', 'samsung-galaxy', 'Samsung smartphones, tablets, and Galaxy devices.', 'Samsung Smartphones', false, true, 112),
  ('cat_market_android', 'cat_market_smartphones', 'Android & Other Brands', 'android-other-brands', 'Xiaomi, Oppo, Realme, and Huawei smartphones.', 'Android Phones', false, true, 113),
  ('cat_market_phone_acc', 'cat_market_smartphones', 'Phone Accessories', 'phone-accessories', 'Cases, screen protectors, chargers, and powerbanks.', 'Cases & Chargers', false, true, 114),

  ('cat_market_computers', 'cat_market_electronics', 'Computers & Gaming', 'computers-gaming', 'Laptops, desktop PCs, monitors, and gaming consoles.', 'Laptops & PCs', false, true, 120),
  ('cat_market_laptops', 'cat_market_computers', 'Laptops & MacBooks', 'laptops-macbooks', 'Gaming laptops, business notebooks, and MacBooks.', 'Laptops & MacBooks', false, true, 121),
  ('cat_market_desktops', 'cat_market_computers', 'Desktop PCs & Monitors', 'desktop-pcs-monitors', 'Desktop computers, workstations, and monitors.', 'PCs & Monitors', false, true, 122),
  ('cat_market_gaming', 'cat_market_computers', 'Gaming Consoles & Gear', 'gaming-consoles-gear', 'PlayStation, Xbox, Nintendo, and gaming controllers.', 'Gaming Gear', false, true, 123),

  ('cat_market_audio_tv', 'cat_market_electronics', 'Audio & Smart TVs', 'audio-smart-tvs', 'Headphones, bluetooth speakers, and Smart TVs.', 'Headphones & TVs', false, true, 130),
  ('cat_market_headphones', 'cat_market_audio_tv', 'Headphones & Earbuds', 'headphones-earbuds', 'Wireless earbuds, noise-canceling headphones, and headsets.', 'Earbuds & Headsets', false, true, 131),
  ('cat_market_speakers', 'cat_market_audio_tv', 'Speakers & Soundbars', 'speakers-soundbars', 'Bluetooth speakers, soundbars, and home audio.', 'Speakers & Soundbars', false, true, 132)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Fashion Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_men_fashion', 'cat_market_fashion', 'Men''s Fashion', 'mens-fashion', 'Men''s apparel, shoes, and accessories.', 'Men''s Clothing', false, true, 210),
  ('cat_market_men_tops', 'cat_market_men_fashion', 'Shirts & T-Shirts', 'mens-shirts-tshirts', 'Men''s t-shirts, shirts, and hoodies.', 'Shirts & Tops', false, true, 211),
  ('cat_market_men_shoes', 'cat_market_men_fashion', 'Men''s Shoes & Sneakers', 'mens-shoes-sneakers', 'Sneakers, boots, and formal shoes.', 'Sneakers & Shoes', false, true, 212),

  ('cat_market_women_fashion', 'cat_market_fashion', 'Women''s Fashion', 'womens-fashion', 'Women''s dresses, tops, shoes, and handbags.', 'Women''s Apparel', false, true, 220),
  ('cat_market_women_dresses', 'cat_market_women_fashion', 'Dresses & Skirts', 'womens-dresses-skirts', 'Elegant dresses, skirts, and evening wear.', 'Dresses & Skirts', false, true, 221),
  ('cat_market_women_shoes', 'cat_market_women_fashion', 'Women''s Shoes & Heels', 'womens-shoes-heels', 'Heels, sandals, sneakers, and flats.', 'Heels & Shoes', false, true, 222),

  ('cat_market_watches_jewelry', 'cat_market_fashion', 'Watches & Accessories', 'watches-accessories', 'Luxury watches, smartwatches, and fashion accessories.', 'Watches & Belts', false, true, 230)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Beauty Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_skincare', 'cat_market_beauty', 'Skincare & Body', 'skincare-body', 'Face creams, serums, cleansers, and body lotion.', 'Face & Body Care', false, true, 310),
  ('cat_market_makeup', 'cat_market_beauty', 'Makeup & Cosmetics', 'makeup-cosmetics', 'Lipstick, foundation, mascara, and makeup kits.', 'Makeup & Beauty', false, true, 320),
  ('cat_market_perfumes', 'cat_market_beauty', 'Fragrances & Perfumes', 'fragrances-perfumes', 'Men and women luxury perfumes and colognes.', 'Perfumes & Colognes', false, true, 330)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Home & Living Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_furniture', 'cat_market_home', 'Furniture & Bedding', 'furniture-bedding', 'Beds, sofas, tables, and mattress.', 'Sofas & Beds', false, true, 410),
  ('cat_market_appliances', 'cat_market_home', 'Home Appliances', 'home-appliances', 'Refrigerators, washing machines, microwaves, and blenders.', 'Electroménager', false, true, 420),
  ('cat_market_kitchen', 'cat_market_home', 'Kitchen & Dining', 'kitchen-dining', 'Cookware, tableware, and kitchen utensils.', 'Cookware & Utensils', false, true, 430)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Food & Tunisian Local Specialties Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_tunisian_local', 'cat_market_food', 'Tunisian Local Delicacies', 'tunisian-local-delicacies', 'Olive oil, Harissa, Deglet Nour dates, and honey.', 'Harissa, Oil & Dates', false, true, 510),
  ('cat_market_beverages', 'cat_market_food', 'Coffee, Tea & Drinks', 'coffee-tea-drinks', 'Artisanal coffee beans, mint tea, and juices.', 'Coffee & Tea', false, true, 520)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Handmade Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_pottery', 'cat_market_handmade', 'Pottery & Ceramics', 'pottery-ceramics', 'Handcrafted Nabeul pottery, ceramic bowls, and vases.', 'Nabeul Pottery', false, true, 610),
  ('cat_market_textiles', 'cat_market_handmade', 'Carpet & Weaving', 'carpet-weaving', 'Traditional Margoum carpets, Klim, and woven blankets.', 'Margoum & Carpets', false, true, 620)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Toys, Baby & Kids Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_baby_care', 'cat_market_kids', 'Baby Care & Gear', 'baby-care-gear', 'Strollers, car seats, feeding bottles, and diapers.', 'Strollers & Feeding', false, true, 710),
  ('cat_market_kids_toys', 'cat_market_kids', 'Toys & Board Games', 'toys-board-games', 'Action figures, educational toys, puzzles, and LEGO.', 'Toys & Puzzles', false, true, 720),
  ('cat_market_kids_clothing', 'cat_market_kids', 'Baby & Kids Clothing', 'baby-kids-clothing', 'Clothing and footwear for babies, toddlers, and kids.', 'Kids Clothing', false, true, 730)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Books & Stationery Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_books', 'cat_market_books_stationery', 'Books & Novels', 'books-novels', 'Fiction, non-fiction, textbooks, and children books.', 'Books & Literature', false, true, 810),
  ('cat_market_stationery', 'cat_market_books_stationery', 'School & Office Supplies', 'school-office-supplies', 'Notebooks, pens, backpacks, and office stationery.', 'Office & School Gear', false, true, 820)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Health & Wellness Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_supplements', 'cat_market_health', 'Vitamins & Supplements', 'vitamins-supplements', 'Multivitamins, protein powders, and herbal supplements.', 'Vitamins & Protein', false, true, 910),
  ('cat_market_medical', 'cat_market_health', 'Medical & First Aid', 'medical-first-aid', 'Blood pressure monitors, thermometers, and first aid.', 'Medical Monitors', false, true, 920)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Jewelry & Luxury Bags Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_gold_silver', 'cat_market_jewelry_luxury', 'Gold & Silver Jewelry', 'gold-silver-jewelry', '18k gold necklaces, silver rings, and bracelets.', 'Gold & Silver', false, true, 1010),
  ('cat_market_handbags_luggage', 'cat_market_jewelry_luxury', 'Handbags & Luggage', 'handbags-luggage', 'Leather handbags, backpacks, and travel suitcases.', 'Handbags & Suitcases', false, true, 1020),
  ('cat_market_eyewear', 'cat_market_jewelry_luxury', 'Eyewear & Sunglasses', 'eyewear-sunglasses', 'Designer sunglasses, frames, and blue-light glasses.', 'Sunglasses & Frames', false, true, 1030)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Upsert Pet Supplies & Garden Subcategories
INSERT INTO pd_marketplace_category (id, parent_id, name, slug, description, short_description, is_default, is_active, position)
VALUES
  ('cat_market_pet_supplies', 'cat_market_pet_garden', 'Pet Food & Care', 'pet-food-care', 'Dog and cat food, litter, toys, and grooming.', 'Cat & Dog Food', false, true, 1110),
  ('cat_market_gardening', 'cat_market_pet_garden', 'Plants & Gardening Tools', 'plants-gardening-tools', 'Indoor plants, seeds, fertilizers, and garden hoses.', 'Plants & Seeds', false, true, 1120)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();
