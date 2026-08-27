-- =====================================================
-- Migration 046: Complete Multilingual Subcategory Translations (FR, AR, EN)
-- =====================================================

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Mode & Vêtements'),
  name_ar = COALESCE(name_ar, 'الموضة والأزياء'),
  name_en = COALESCE(name_en, 'Fashion & Apparel'),
  description_fr = COALESCE(description_fr, 'Découvrez les collections de mode pour homme, femme et enfant.'),
  description_ar = COALESCE(description_ar, 'اكتشف تشكيلات الموضة والأزياء للرجال، النساء والأطفال.'),
  description_en = COALESCE(description_en, 'Explore fashion collections for men, women and children.')
WHERE id = 'cat_market_fashion';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Casques & Écouteurs'),
  name_ar = COALESCE(name_ar, 'سماعات الرأس والأذن'),
  name_en = COALESCE(name_en, 'Headphones & Earbuds'),
  description_fr = COALESCE(description_fr, 'Écouteurs sans fil, casques bluetooth et équipements audio de qualité.'),
  description_ar = COALESCE(description_ar, 'سماعات لاسلكية، سماعات بلوتوث ومعدات صوتية عالية الجودة.'),
  description_en = COALESCE(description_en, 'Wireless earbuds, bluetooth headphones and high quality audio gear.')
WHERE id = 'cat_market_headphones';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Haut-parleurs & Barres de son'),
  name_ar = COALESCE(name_ar, 'مكبرات الصوت والعارضات الصوتيّة'),
  name_en = COALESCE(name_en, 'Speakers & Soundbars'),
  description_fr = COALESCE(description_fr, 'Enceintes portables, barres de son pour TV et systèmes home cinéma.'),
  description_ar = COALESCE(description_ar, 'مكبرات صوت محمولة، عارضات صوت للتلفزيون وأنظمة سينما منزلية.'),
  description_en = COALESCE(description_en, 'Portable speakers, TV soundbars and home theater audio systems.')
WHERE id = 'cat_market_speakers';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Parfums & Fragrances'),
  name_ar = COALESCE(name_ar, 'العطور والبخور'),
  name_en = COALESCE(name_en, 'Fragrances & Perfumes'),
  description_fr = COALESCE(description_fr, 'Parfums de luxe, eaux de toilette et senteurs orientales raffinées.'),
  description_ar = COALESCE(description_ar, 'عطور فاخرة، ماء تواليت وعطور شرقية راقية.'),
  description_en = COALESCE(description_en, 'Luxury perfumes, eau de toilette and refined oriental fragrances.')
WHERE id = 'cat_market_perfumes';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Maquillage & Cosmétiques'),
  name_ar = COALESCE(name_ar, 'المكياج ومستحضرات التجميل'),
  name_en = COALESCE(name_en, 'Makeup & Cosmetics'),
  description_fr = COALESCE(description_fr, 'Produits de maquillage, fond de teint, rouges à lèvres et cosmétiques.'),
  description_ar = COALESCE(description_ar, 'مستحضرات تجميل، كريم أساس، أحمر شفاه ومكياج كامل.'),
  description_en = COALESCE(description_en, 'Makeup products, foundation, lipsticks and cosmetics.')
WHERE id = 'cat_market_makeup';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Soins de la peau & Corps'),
  name_ar = COALESCE(name_ar, 'العناية بالبشرة والجسم'),
  name_en = COALESCE(name_en, 'Skincare & Body'),
  description_fr = COALESCE(description_fr, 'Crèmes hydratantes, sérums et soins du corps naturels.'),
  description_ar = COALESCE(description_ar, 'كريمات مرطبة، سيروم ومستحضرات العناية بالجسم الطبيعية.'),
  description_en = COALESCE(description_en, 'Moisturizing creams, serums and natural body care products.')
WHERE id = 'cat_market_skincare';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Mode Homme'),
  name_ar = COALESCE(name_ar, 'موضة وأزياء الرجالية'),
  name_en = COALESCE(name_en, 'Men''s Fashion'),
  description_fr = COALESCE(description_fr, 'Vêtements, chemises, t-shirts et pantalons pour hommes.'),
  description_ar = COALESCE(description_ar, 'ملابس، قمصان، تيشرتات وسراويل للرجال.'),
  description_en = COALESCE(description_en, 'Men''s apparel, shirts, t-shirts, and trousers.')
WHERE id = 'cat_market_men_fashion';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Mode Femme'),
  name_ar = COALESCE(name_ar, 'موضة وأزياء النسائية'),
  name_en = COALESCE(name_en, 'Women''s Fashion'),
  description_fr = COALESCE(description_fr, 'Robes, tenues chic, vêtements et accessoires pour femmes.'),
  description_ar = COALESCE(description_ar, 'فساتين، أزياء أنيقة، ملابس وإكسسوارات للنساء.'),
  description_en = COALESCE(description_en, 'Dresses, chic outfits, apparel and accessories for women.')
WHERE id = 'cat_market_women_fashion';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Café, Thé & Boissons'),
  name_ar = COALESCE(name_ar, 'القهوة، الشاي والمشروبات'),
  name_en = COALESCE(name_en, 'Coffee, Tea & Drinks'),
  description_fr = COALESCE(description_fr, 'Sélection de cafés artisanaux, thés parfumés et jus locaux.'),
  description_ar = COALESCE(description_ar, 'تشكيلة من القهوة الشاذلية، الشاي المعطر والعصائر المحلية.'),
  description_en = COALESCE(description_en, 'Selection of artisanal coffee, specialty teas and local juices.')
WHERE id = 'cat_market_beverages';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Spécialités du Terroir Tunisien'),
  name_ar = COALESCE(name_ar, 'المنتجات التونسية الاصيلة'),
  name_en = COALESCE(name_en, 'Tunisian Local Delicacies'),
  description_fr = COALESCE(description_fr, 'Huile d''olive bio, dattes Deglet Nour, harissa et douceurs tunisiennes.'),
  description_ar = COALESCE(description_ar, 'زيت زيتون بيولوجي، تمر دقلة النور، هريسة وحلويات تونسية.'),
  description_en = COALESCE(description_en, 'Organic olive oil, Deglet Nour dates, harissa and authentic Tunisian sweets.')
WHERE id = 'cat_market_tunisian_local';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Tapis & Tissages Artisanaux'),
  name_ar = COALESCE(name_ar, 'السجاد والمنسوجات التقليدية'),
  name_en = COALESCE(name_en, 'Carpet & Weaving'),
  description_fr = COALESCE(description_fr, 'Tapis Kairouan faits main, margoum et tissages traditionnels.'),
  description_ar = COALESCE(description_ar, 'زربيات قيروانية يدوية، مرقوم ومنسوجات تقليدية أصيلة.'),
  description_en = COALESCE(description_en, 'Handmade Kairouan rugs, margoum and authentic traditional textiles.')
WHERE id = 'cat_market_textiles';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Poterie & Céramique de Nabeul'),
  name_ar = COALESCE(name_ar, 'الفخار والخزف النابلي'),
  name_en = COALESCE(name_en, 'Pottery & Ceramics'),
  description_fr = COALESCE(description_fr, 'Art de la table, plats decoratifs et poteries faites à la main à Nabeul.'),
  description_ar = COALESCE(description_ar, 'أواني مائدة، أطباق مزخرفة وفخار مصنوع يدوياً في نابل.'),
  description_en = COALESCE(description_en, 'Tableware, decorative dishes and handmade pottery from Nabeul.')
WHERE id = 'cat_market_pottery';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Meubles & Literie'),
  name_ar = COALESCE(name_ar, 'الأثاث والمفروشات'),
  name_en = COALESCE(name_en, 'Furniture & Bedding'),
  description_fr = COALESCE(description_fr, 'Canapés, tables, lits et linge de maison de qualité.'),
  description_ar = COALESCE(description_ar, 'أرائك، طاولات، أسرة ومفروشات منزلية عالية الجودة.'),
  description_en = COALESCE(description_en, 'Sofas, tables, beds and high quality home bedding.')
WHERE id = 'cat_market_furniture';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Cuisine & Art de la Table'),
  name_ar = COALESCE(name_ar, 'المطبخ ومستلزمات المائدة'),
  name_en = COALESCE(name_en, 'Kitchen & Dining'),
  description_fr = COALESCE(description_fr, 'Ustensiles de cuisine, casseroles, ustensiles et vaisselle.'),
  description_ar = COALESCE(description_ar, 'أدوات المطبخ، أواني الطهي والأطباق.'),
  description_en = COALESCE(description_en, 'Kitchenware, cookware, utensils and dining sets.')
WHERE id = 'cat_market_kitchen';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Chaussures & Baskets Homme'),
  name_ar = COALESCE(name_ar, 'أحذية وأحذية رياضية للرجال'),
  name_en = COALESCE(name_en, 'Men''s Shoes & Sneakers'),
  description_fr = COALESCE(description_fr, 'Baskets tendance, mocassins en cuir et chaussures de sport pour hommes.'),
  description_ar = COALESCE(description_ar, 'أحذية رياضية عصرية، أحذية جلدية وأحذية سبورت للرجال.'),
  description_en = COALESCE(description_en, 'Trendy sneakers, leather loafers and sports shoes for men.')
WHERE id = 'cat_market_men_shoes';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Chemises & T-Shirts Homme'),
  name_ar = COALESCE(name_ar, 'قمصان وتيشرتات رجالية'),
  name_en = COALESCE(name_en, 'Shirts & T-Shirts'),
  description_fr = COALESCE(description_fr, 'Chemises élégantes, t-shirts décontractés et polos pour hommes.'),
  description_ar = COALESCE(description_ar, 'قمصان أنيقة، تيشرتات كاجوال وبولو للرجال.'),
  description_en = COALESCE(description_en, 'Elegant shirts, casual t-shirts and polo shirts for men.')
WHERE id = 'cat_market_men_tops';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Smartphones Android & Autres'),
  name_ar = COALESCE(name_ar, 'هواتف أندرويد وعلامات أخرى'),
  name_en = COALESCE(name_en, 'Android & Other Brands'),
  description_fr = COALESCE(description_fr, 'Smartphones Xiaomi, Oppo, Realme et téléphones Android performants.'),
  description_ar = COALESCE(description_ar, 'هواتف شاومي، أوبو، ريالمي وهواتف أندرويد عالية الأداء.'),
  description_en = COALESCE(description_en, 'Xiaomi, Oppo, Realme smartphones and high performance Android devices.')
WHERE id = 'cat_market_android';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Robes & Jupes Femme'),
  name_ar = COALESCE(name_ar, 'فساتين وتنانير نسائية'),
  name_en = COALESCE(name_en, 'Dresses & Skirts'),
  description_fr = COALESCE(description_fr, 'Robes de soirée, robes d''été et jupes élégantes pour femmes.'),
  description_ar = COALESCE(description_ar, 'فساتين سهرة، فساتين صيفية وتنانير أنيقة للنساء.'),
  description_en = COALESCE(description_en, 'Evening dresses, summer dresses and elegant skirts for women.')
WHERE id = 'cat_market_women_dresses';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Chaussures & Talons Femme'),
  name_ar = COALESCE(name_ar, 'أحذية وأحذية بكعب للنساء'),
  name_en = COALESCE(name_en, 'Women''s Shoes & Heels'),
  description_fr = COALESCE(description_fr, 'Chaussures à talons, sandales et baskets confortables pour femmes.'),
  description_ar = COALESCE(description_ar, 'أحذية بكعب عالٍ، صندل وأحذية مريحة للنساء.'),
  description_en = COALESCE(description_en, 'High heels, sandals and comfortable sneakers for women.')
WHERE id = 'cat_market_women_shoes';

UPDATE pd_marketplace_category SET
  name_fr = COALESCE(name_fr, 'Autres Produits'),
  name_ar = COALESCE(name_ar, 'منتجات أخرى'),
  name_en = COALESCE(name_en, 'Other Products'),
  description_fr = COALESCE(description_fr, 'Articles divers et nouveaux produits sur la marketplace.'),
  description_ar = COALESCE(description_ar, 'منتجات متنوعة ومنتجات جديدة في السوق.'),
  description_en = COALESCE(description_en, 'Miscellaneous items and new products on the marketplace.')
WHERE id = 'cat_market_uncategorized';
