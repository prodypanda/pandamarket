-- =====================================================
-- Migration 045: Multilingual Category Support (FR, AR, EN)
-- =====================================================

ALTER TABLE pd_marketplace_category
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

-- ----------------------------------------------------
-- 1. Top-Level Departments Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'Électronique & High-Tech',
  name_ar = 'الإلكترونيات والتكنولوجيا',
  name_en = 'Electronics & High-Tech'
WHERE id = 'cat_market_electronics';

UPDATE pd_marketplace_category SET
  name_fr = 'Mode Femme',
  name_ar = 'موضة وأزياء النسائية',
  name_en = 'Women''s Fashion'
WHERE id = 'cat_market_womens_fashion';

UPDATE pd_marketplace_category SET
  name_fr = 'Mode Homme',
  name_ar = 'موضة وأزياء الرجالية',
  name_en = 'Men''s Fashion'
WHERE id = 'cat_market_mens_fashion';

UPDATE pd_marketplace_category SET
  name_fr = 'Horlogerie & Bijoux',
  name_ar = 'الساعات والمجوهرات',
  name_en = 'Watches & Fine Jewelry'
WHERE id = 'cat_market_watches_jewelry';

UPDATE pd_marketplace_category SET
  name_fr = 'Beauté, Parfums & Soins',
  name_ar = 'العطور، التجميل والعناية',
  name_en = 'Beauty, Perfumes & Care'
WHERE id = 'cat_market_beauty';

UPDATE pd_marketplace_category SET
  name_fr = 'Maison, Meubles & Déco',
  name_ar = 'المنزل، الأثاث والديكور',
  name_en = 'Home, Furniture & Living'
WHERE id = 'cat_market_home';

UPDATE pd_marketplace_category SET
  name_fr = 'Électroménager',
  name_ar = 'الأجهزة الكهرومنزلية',
  name_en = 'Home Appliances'
WHERE id = 'cat_market_appliances';

UPDATE pd_marketplace_category SET
  name_fr = 'Produits du Terroir & Épicerie',
  name_ar = 'المنتجات المحلية والمواد الغذائية',
  name_en = 'Food & Tunisian Delicacies'
WHERE id = 'cat_market_food';

UPDATE pd_marketplace_category SET
  name_fr = 'Artisanat Tunisien',
  name_ar = 'الصناعات التقليدية التونسية',
  name_en = 'Tunisian Craftsmanship'
WHERE id = 'cat_market_handmade';

UPDATE pd_marketplace_category SET
  name_fr = 'Jouets, Bébé & Enfants',
  name_ar = 'الألعاب، مستلزمات الرضع والأطفال',
  name_en = 'Toys, Baby & Kids'
WHERE id = 'cat_market_kids';

UPDATE pd_marketplace_category SET
  name_fr = 'Sports, Fitness & Plein Air',
  name_ar = 'الرياضة والأنشطة الخارجية',
  name_en = 'Sports, Fitness & Outdoor'
WHERE id = 'cat_market_sports';

UPDATE pd_marketplace_category SET
  name_fr = 'Auto, Moto & Bricolage',
  name_ar = 'السيارات، الدراجات والعدة',
  name_en = 'Auto, Moto & Tools'
WHERE id = 'cat_market_auto';

UPDATE pd_marketplace_category SET
  name_fr = 'Livres & Fournitures de Bureau',
  name_ar = 'الكتب والأدوات المكتبية',
  name_en = 'Books & Office Supplies'
WHERE id = 'cat_market_books_office';

UPDATE pd_marketplace_category SET
  name_fr = 'Santé & Parapharmacie',
  name_ar = 'الصحة والمستلزمات الطبية',
  name_en = 'Health & Pharmacy'
WHERE id = 'cat_market_health';

UPDATE pd_marketplace_category SET
  name_fr = 'Animalerie & Jardin',
  name_ar = 'مستلزمات الحيوانات والحدائق',
  name_en = 'Pet Supplies & Garden'
WHERE id = 'cat_market_pet';

UPDATE pd_marketplace_category SET
  name_fr = 'Supermarché & Hygiène',
  name_ar = 'السوبرماركت والتنظيف',
  name_en = 'Supermarket & Hygiene'
WHERE id = 'cat_market_household';

UPDATE pd_marketplace_category SET
  name_fr = 'Instruments de Musique',
  name_ar = 'الآلات الموسيقية والمعدات',
  name_en = 'Musical Instruments'
WHERE id = 'cat_market_music';

UPDATE pd_marketplace_category SET
  name_fr = 'Matériel Professionnel',
  name_ar = 'المعدات المهنية والتجارية',
  name_en = 'Business & Commercial'
WHERE id = 'cat_market_business';

-- ----------------------------------------------------
-- 2. Electronics Subcategories Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'Smartphones & Téléphones',
  name_ar = 'الهواتف الذكية والنقالة',
  name_en = 'Smartphones & Mobile Phones'
WHERE id = 'cat_market_smartphones';

UPDATE pd_marketplace_category SET
  name_fr = 'Apple iPhone',
  name_ar = 'آيفون وأبل',
  name_en = 'Apple iPhone'
WHERE id = 'cat_market_iphone';

UPDATE pd_marketplace_category SET
  name_fr = 'Samsung Galaxy',
  name_ar = 'سامسونج جالاكسي',
  name_en = 'Samsung Galaxy'
WHERE id = 'cat_market_samsung';

UPDATE pd_marketplace_category SET
  name_fr = 'Xiaomi, Redmi & Poco',
  name_ar = 'شاومي وريدمي وبوكو',
  name_en = 'Xiaomi, Redmi & Poco'
WHERE id = 'cat_market_xiaomi';

UPDATE pd_marketplace_category SET
  name_fr = 'Oppo, Realme & Vivo',
  name_ar = 'أوبو وريلمي وفيفو',
  name_en = 'Oppo, Realme & Vivo'
WHERE id = 'cat_market_oppo_realme';

UPDATE pd_marketplace_category SET
  name_fr = 'Accessoires Téléphones',
  name_ar = 'إكسسوارات الهواتف',
  name_en = 'Phone Accessories'
WHERE id = 'cat_market_phone_acc';

UPDATE pd_marketplace_category SET
  name_fr = 'Informatique & Laptops',
  name_ar = 'أجهزة الكمبيوتر والمحمول',
  name_en = 'Computers & Laptops'
WHERE id = 'cat_market_computers';

UPDATE pd_marketplace_category SET
  name_fr = 'PC Portables & Gaming',
  name_ar = 'الحواسيب المحمولة والألعاب',
  name_en = 'Gaming & Business Laptops'
WHERE id = 'cat_market_laptops';

UPDATE pd_marketplace_category SET
  name_fr = 'Apple MacBooks & iMacs',
  name_ar = 'ماك بوك وآيمك أبل',
  name_en = 'Apple MacBooks & iMacs'
WHERE id = 'cat_market_macbooks';

UPDATE pd_marketplace_category SET
  name_fr = 'PC Bureau & Écrans',
  name_ar = 'حواسيب المكتب والشاشات',
  name_en = 'Desktop PCs & Monitors'
WHERE id = 'cat_market_desktops';

UPDATE pd_marketplace_category SET
  name_fr = 'Composants PC & Stockage',
  name_ar = 'مكونات الكمبيوتر والتخزين',
  name_en = 'PC Components & Storage'
WHERE id = 'cat_market_pc_parts';

UPDATE pd_marketplace_category SET
  name_fr = 'Gaming & Consoles',
  name_ar = 'ألعاب الفيديو والكونسول',
  name_en = 'Gaming & Consoles'
WHERE id = 'cat_market_gaming';

UPDATE pd_marketplace_category SET
  name_fr = 'PlayStation 5 & Jeux',
  name_ar = 'بلايستيشن 5 والألعاب',
  name_en = 'PlayStation 5 & Games'
WHERE id = 'cat_market_playstation';

UPDATE pd_marketplace_category SET
  name_fr = 'Xbox & Nintendo',
  name_ar = 'إكس بوكس ونينتندو',
  name_en = 'Xbox & Nintendo'
WHERE id = 'cat_market_xbox';

UPDATE pd_marketplace_category SET
  name_fr = 'TV, Audio & Photo',
  name_ar = 'التلفزيون، الصوت والكاميرات',
  name_en = 'TV, Audio & Cameras'
WHERE id = 'cat_market_audio_tv';

UPDATE pd_marketplace_category SET
  name_fr = 'Écouteurs Sans Fil & Casques',
  name_ar = 'السماعات اللاسلكية والرأس',
  name_en = 'Wireless Earbuds & Headphones'
WHERE id = 'cat_market_earbuds';

UPDATE pd_marketplace_category SET
  name_fr = 'Téléviseurs Smart TV 4K',
  name_ar = 'التلفزيونات الذكية 4K',
  name_en = 'Smart TVs & Soundbars'
WHERE id = 'cat_market_smart_tvs';

UPDATE pd_marketplace_category SET
  name_fr = 'Appareils Photo & Drones',
  name_ar = 'الكاميرات والطائرات المسيرة',
  name_en = 'Cameras & Drones'
WHERE id = 'cat_market_cameras';

-- ----------------------------------------------------
-- 3. Women's Fashion Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'Robes & Combinaisons',
  name_ar = 'الفساتين والجمبسوت',
  name_en = 'Dresses & Jumpsuits'
WHERE id = 'cat_market_w_dresses';

UPDATE pd_marketplace_category SET
  name_fr = 'Tops, T-shirts & Chemisiers',
  name_ar = 'القمصان والبلوزات النسائية',
  name_en = 'Tops, Shirts & Blouses'
WHERE id = 'cat_market_w_tops';

UPDATE pd_marketplace_category SET
  name_fr = 'Jeans & Pantalons Femme',
  name_ar = 'الجينز والبناطيل النسائية',
  name_en = 'Jeans, Pants & Trousers'
WHERE id = 'cat_market_w_pants';

UPDATE pd_marketplace_category SET
  name_fr = 'Vestes, Manteaux & Blazers',
  name_ar = 'السترات والمعاطف',
  name_en = 'Jackets, Coats & Hoodies'
WHERE id = 'cat_market_w_jackets';

UPDATE pd_marketplace_category SET
  name_fr = 'Tenues Traditionnelles & Abayas',
  name_ar = 'العبايات والأزياء التقليدية',
  name_en = 'Traditional & Abayas'
WHERE id = 'cat_market_w_traditional';

UPDATE pd_marketplace_category SET
  name_fr = 'Chaussures & Talons Femme',
  name_ar = 'الأحذية والكعب العالي',
  name_en = 'Women''s Shoes & Heels'
WHERE id = 'cat_market_w_shoes';

UPDATE pd_marketplace_category SET
  name_fr = 'Sacs à Main & Sacs à Dos',
  name_ar = 'حقائب اليد والحقائب النسائية',
  name_en = 'Handbags & Backpacks'
WHERE id = 'cat_market_w_bags';

-- ----------------------------------------------------
-- 4. Men's Fashion Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'T-Shirts, Polos & Chemises',
  name_ar = 'القمصان والبولو للرجال',
  name_en = 'T-Shirts, Polos & Shirts'
WHERE id = 'cat_market_m_tops';

UPDATE pd_marketplace_category SET
  name_fr = 'Jeans & Pantalons Chino',
  name_ar = 'الجينز والبناطيل للرجال',
  name_en = 'Jeans & Chinos'
WHERE id = 'cat_market_m_jeans';

UPDATE pd_marketplace_category SET
  name_fr = 'Costumes & Blazers',
  name_ar = 'البذلات والسترات الرسمية',
  name_en = 'Suits & Blazers'
WHERE id = 'cat_market_m_suits';

UPDATE pd_marketplace_category SET
  name_fr = 'Vestes, Blousons & Sweats',
  name_ar = 'السترات والجاكيتات للرجال',
  name_en = 'Jackets, Coats & Hoodies'
WHERE id = 'cat_market_m_jackets';

UPDATE pd_marketplace_category SET
  name_fr = 'Baskets & Chaussures Casual',
  name_ar = 'الأحذية الرياضية والخفيفة',
  name_en = 'Sneakers & Casual Shoes'
WHERE id = 'cat_market_m_sneakers';

UPDATE pd_marketplace_category SET
  name_fr = 'Chaussures de Ville en Cuir',
  name_ar = 'الأحذية الجلدية الرسمية',
  name_en = 'Formal Leather Shoes'
WHERE id = 'cat_market_m_formal_shoes';

UPDATE pd_marketplace_category SET
  name_fr = 'Portefeuilles, Ceintures & Casquettes',
  name_ar = 'المحفظات والأحزمة والكابات',
  name_en = 'Wallets, Belts & Caps'
WHERE id = 'cat_market_m_wallets';

-- ----------------------------------------------------
-- 5. Food & Terroir Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'Huile d''Olive Vierge Extra',
  name_ar = 'زيت الزيتون البكر الممتاز',
  name_en = 'Tunisian Extra Virgin Olive Oil'
WHERE id = 'cat_market_olive_oil';

UPDATE pd_marketplace_category SET
  name_fr = 'Harissa Artisanale & Épices',
  name_ar = 'الهريسة الديارية والتوابل',
  name_en = 'Traditional Harissa & Spices'
WHERE id = 'cat_market_harissa_spices';

UPDATE pd_marketplace_category SET
  name_fr = 'Dattes Deglet Nour & Miel',
  name_ar = 'تمر دقلة النور والعسل الطبيعي',
  name_en = 'Deglet Nour Dates & Honey'
WHERE id = 'cat_market_dates';

UPDATE pd_marketplace_category SET
  name_fr = 'Café, Thé & Boissons',
  name_ar = 'القهوة، الشاي والمشروبات',
  name_en = 'Coffee, Tea & Beverages'
WHERE id = 'cat_market_coffee_tea';

-- ----------------------------------------------------
-- 6. Craftsmanship Multilingual Updates
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  name_fr = 'Poterie de Nabeul & Sejnane',
  name_ar = 'فخار نابل وسجنان',
  name_en = 'Nabeul & Sejnane Pottery'
WHERE id = 'cat_market_nabeul_pottery';

UPDATE pd_marketplace_category SET
  name_fr = 'Tapis Margoum & Klim',
  name_ar = 'زربية المرقوم والكليم',
  name_en = 'Margoum & Klim Carpets'
WHERE id = 'cat_market_margoum';

UPDATE pd_marketplace_category SET
  name_fr = 'Fouta Tunisienne 100% Coton',
  name_ar = 'الفوطة التونسية الأصيلة',
  name_en = 'Tunisian Fouta & Weaving'
WHERE id = 'cat_market_fouta';
