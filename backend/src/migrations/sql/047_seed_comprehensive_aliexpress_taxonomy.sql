-- =====================================================
-- Migration 047: Seed Comprehensive AliExpress-Style Category Taxonomy
-- With Complete Multilingual Support (French, Arabic, English)
-- =====================================================

-- 1. Women's Fashion
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_women_fashion', 'womens-fashion', 'Women''s Fashion', 'Mode Femme', 'موضة وأزياء النسائية', 'Women''s Fashion',
  'Women''s clothing, activewear, sleepwear, and special occasion attire.', 'Vêtements pour femmes, tenues de sport, lingerie et robes de soirée.', 'ملابس نسائية، ملابس رياضية، ملابس نوم وأزياء للمناسبات.', 'Women''s clothing, activewear, sleepwear, and special occasion attire.',
  'Shirt', 1, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 2. Men's Fashion
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_men_fashion', 'mens-fashion', 'Men''s Fashion', 'Mode Homme', 'موضة وأزياء الرجالية', 'Men''s Fashion',
  'Men''s everyday clothing, outerwear, formal wear, and accessories.', 'Vêtements pour hommes, manteaux, tenues habillées et accessoires.', 'ملابس رجالية يومية، سترات، ملابس رسمية وإكسسوارات.', 'Men''s everyday clothing, outerwear, formal wear, and accessories.',
  'User', 2, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 3. Phones & Telecommunications
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_smartphones', 'smartphones-phones', 'Phones & Telecommunications', 'Smartphones & Téléphonie', 'الهواتف والاتصالات', 'Phones & Telecommunications',
  'Smartphones, mobile phone protection, replacement components, and radio comms.', 'Smartphones, protections, pièces détachées et équipements radio.', 'هواتف ذكية، حماية الهواتف، قطع غيار وأجهزة لاسلكي.', 'Smartphones, mobile phone protection, replacement components, and radio comms.',
  'Smartphone', 3, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 4. Computer, Office & Security
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_computers', 'computers-gaming', 'Computer, Office & Security', 'Informatique, Bureau & Sécurité', 'الحواسيب، المكتب والأمان', 'Computer, Office & Security',
  'Laptops, PC hardware, peripherals, networking gear, and security systems.', 'Ordinateurs portables, composants PC, périphériques et caméras de sécurité.', 'حواسيب محمولة، قطع كمبيوتر، ملحقات وشبكات وأجهزة أمان.', 'Laptops, PC hardware, peripherals, networking gear, and security systems.',
  'Laptop', 4, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 5. Consumer Electronics
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_electronics', 'electronics-5', 'Consumer Electronics', 'Électronique & High-Tech', 'الإلكترونيات والتكنولوجيا', 'Electronics & High-Tech',
  'Personal audio devices, smart gadgets, cameras, and gaming accessories.', 'Appareils audio, gadgets intelligents, appareils photo et jeux vidéo.', 'أجهزة صوتية شخصية، أجهزة إلكترونية ذكية، كاميرات وألعاب فيديو.', 'Personal audio devices, smart gadgets, cameras, and gaming accessories.',
  'Sparkles', 5, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 6. Jewelry & Accessories
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_watches_jewelry', 'watches-accessories', 'Jewelry & Accessories', 'Horlogerie & Bijoux', 'الساعات والمجوهرات', 'Watches & Fine Jewelry',
  'Fine and fashion jewelry, crafting supplies, eyewear, and fashion add-ons.', 'Montres raffinées, bijoux fantaisie, lunettes de soleil et accessoires.', 'ساعات فاخرة، مجوهرات راقية، نظارات شمسية وإكسسوارات أنيقة.', 'Fine and fashion jewelry, crafting supplies, eyewear, and fashion add-ons.',
  'Watch', 6, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 7. Home, Garden & Furniture
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_home', 'home-living-541', 'Home, Garden & Furniture', 'Maison, Meubles & Déco', 'المنزل، الأثاث والديكور', 'Home, Furniture & Living',
  'Interior décor, kitchenware, bedding, household furniture, and gardening gear.', 'Décoration d''intérieur, ustensiles de cuisine, literie et meubles de maison.', 'ديكورات داخلية، أدوات مطبخ، مفروشات، أثاث منزلي ومعدات حدائق.', 'Interior décor, kitchenware, bedding, household furniture, and gardening gear.',
  'Home', 7, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;

-- 8. Home Appliances
INSERT INTO pd_marketplace_category (
  id, slug, name, name_fr, name_ar, name_en,
  description, description_fr, description_ar, description_en,
  icon, position, is_active, is_default
) VALUES (
  'cat_market_appliances', 'home-appliances', 'Home Appliances', 'Électroménager', 'الأجهزة الكهرومنزلية', 'Home Appliances',
  'Small and large appliances for kitchen cooking, cleaning, and personal grooming.', 'Petit et grand électroménager pour la cuisine, le nettoyage et les soins.', 'أجهزة منزلية صغيرة وكبيرة للمطبخ والتنظيف والعناية الشخصية.', 'Small and large appliances for kitchen cooking, cleaning, and personal grooming.',
  'Tv', 8, true, false
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, name_fr = EXCLUDED.name_fr, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description = EXCLUDED.description, description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon, position = EXCLUDED.position, is_active = true;
