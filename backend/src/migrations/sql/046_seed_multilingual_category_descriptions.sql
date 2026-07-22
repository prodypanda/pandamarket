-- =====================================================
-- Migration 046: Seed Multilingual Category Descriptions (FR, AR, EN)
-- =====================================================

-- ----------------------------------------------------
-- 1. Top-Level Departments Multilingual Descriptions
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  description_fr = 'Smartphones, ordinateurs portables, gaming, TV Smart 4K, audio sans fil et gadgets high-tech.',
  description_ar = 'هواتف ذكية، حواسيب محمولة، ألعاب فيديو، تلفزيونات ذكية 4K، سماعات لاسلكية وأحدث التقنيات.',
  description_en = 'Smartphones, laptops, gaming, 4K Smart TVs, wireless audio, and high-tech gadgets.'
WHERE id = 'cat_market_electronics';

UPDATE pd_marketplace_category SET
  description_fr = 'Robes d''été et de soirée, chemisiers, jeans, chaussures, talons, sacs à main et tenues traditionnelles.',
  description_ar = 'فساتين سهرة وصيفية، بلوزات، جينز، أحذية، كعب عالي، حقائب يد وأزياء تقليدية راقية.',
  description_en = 'Summer and evening dresses, blouses, jeans, heels, shoes, handbags, and traditional apparel.'
WHERE id = 'cat_market_womens_fashion';

UPDATE pd_marketplace_category SET
  description_fr = 'Costumes sur mesure, t-shirts, polos, chemises, jeans, baskets tendance et chaussures de ville en cuir.',
  description_ar = 'بذلات رسمية، قمصان، بولو، جينز، أحذية رياضية عصرية وأحذية جلدية رسمية للرجال.',
  description_en = 'Suits, t-shirts, polo shirts, jeans, trendy sneakers, and formal leather dress shoes.'
WHERE id = 'cat_market_mens_fashion';

UPDATE pd_marketplace_category SET
  description_fr = 'Montres de luxe et automatiques, bijoux en or 18k, argent 925, colliers, bagues et bracelets.',
  description_ar = 'ساعات فاخرة وأوتوماتيكية، مجوهرات من الذهب عيار 18 والفضة 925، قلادات، خواتم وأساور.',
  description_en = 'Luxury and automatic watches, 18k gold jewelry, sterling silver 925, necklaces, rings, and bracelets.'
WHERE id = 'cat_market_watches_jewelry';

UPDATE pd_marketplace_category SET
  description_fr = 'Parfums de grandes marques, soins du visage et dermo-cosmétiques, maquillage, soins capillaires et tondeuses.',
  description_ar = 'عطور عالمية فاخرة، مستحضرات العناية بالبشرة والوجه، مكياج، عناية بالشعر ومعدات الحلاقة.',
  description_en = 'Luxury perfumes, skincare and dermocosmetics, makeup, haircare, and grooming trimmers.'
WHERE id = 'cat_market_beauty';

UPDATE pd_marketplace_category SET
  description_fr = 'Canapés d''angle, lits orthopédiques, tables à manger, tapis Margoum, luminaires et ustensiles de cuisine.',
  description_ar = 'أرائك حديثة، أسرّة طبية، طاولات طعام، زربية المرقوم، إضاءة وأدوات المطبخ.',
  description_en = 'Corner sofas, orthopedic beds, dining tables, Margoum rugs, lighting, and kitchenware.'
WHERE id = 'cat_market_home';

UPDATE pd_marketplace_category SET
  description_fr = 'Réfrigérateurs No-Frost, machines à laver Inverter, friteuses sans huile Air Fryer et climatiseurs.',
  description_ar = 'ثلاجات نوفروست، غسالات إنفرتر، مقلاة بدون زيت إيرفراير ومكيفات هواء عالية الكفاءة.',
  description_en = 'No-Frost refrigerators, Inverter washing machines, Air Fryers, and split air conditioners.'
WHERE id = 'cat_market_appliances';

UPDATE pd_marketplace_category SET
  description_fr = 'Huile d''olive vierge extra tunisienne, Harissa artisanale de Nabeul, dattes Deglet Nour de Tozeur et miel pur.',
  description_ar = 'زيت زيتون بكر ممتاز، هريسة دياري نابلية، تمر دقلة النور توزر وعسل طبيعي صافي.',
  description_en = 'Tunisian extra virgin olive oil, authentic Harissa, Deglet Nour dates, and pure honey.'
WHERE id = 'cat_market_food';

UPDATE pd_marketplace_category SET
  description_fr = 'Poterie peinte à la main de Nabeul, argile de Sejnane, tapis Margoum, Klim et foutas tunisiennes 100% coton.',
  description_ar = 'فخار نابل اليدوي، فخار سجنان، زربية المرقوم والكليم، والفوطة التونسية القطنية الأصيلة.',
  description_en = 'Handpainted Nabeul ceramics, Sejnane clay pottery, Margoum carpets, and cotton Foutas.'
WHERE id = 'cat_market_handmade';

UPDATE pd_marketplace_category SET
  description_fr = 'Poussettes 3-en-1, sièges auto ISOFIX, jouets éducatifs, sets LEGO, biberons et vêtements pour bébé.',
  description_ar = 'عربات أطفال 3 في 1، مقاعد سيارة آمنة، ألعاب تعليمية، ليجو، ملابس ومستلزمات الرضع.',
  description_en = '3-in-1 baby strollers, ISOFIX car seats, educational toys, LEGO sets, and baby clothing.'
WHERE id = 'cat_market_kids';

UPDATE pd_marketplace_category SET
  description_fr = 'Tapis de course électriques, haltères, vélos d''appartement, vêtements de sport Nike/Adidas et trottinettes.',
  description_ar = 'أجهزة مشي كهربائية، أثقال، دراجات ثابته، ملابس رياضية نايكي وأديداس ودراجات هوائية.',
  description_en = 'Electric treadmills, dumbbells, exercise bikes, Nike/Adidas sportswear, and bicycles.'
WHERE id = 'cat_market_sports';

UPDATE pd_marketplace_category SET
  description_fr = 'Huiles moteur synthétiques, écrans Android tactiles pour voiture, casques moto et perceuses sans fil.',
  description_ar = 'زيوت محركات اصطناعية، شاشات أندرويد للسيارات، خوذات دراجات نارية ومعدات وأدوات حفر.',
  description_en = 'Synthetic motor oils, car Android touchscreens, motorcycle helmets, and cordless power drills.'
WHERE id = 'cat_market_auto';

UPDATE pd_marketplace_category SET
  description_fr = 'Romans, livres de développement personnel, manuels scolaires, cartables, stylos et fournitures de bureau.',
  description_ar = 'روايات، كتب تطوير الذات، كتب مدرسية، محافظ وكراسات وأدوات مكتبية.',
  description_en = 'Novels, personal development books, school textbooks, backpacks, and office stationery.'
WHERE id = 'cat_market_books_office';

UPDATE pd_marketplace_category SET
  description_fr = 'Protéine Whey Isolate, créatine monohydrate, tensiomètres électroniques, lecteurs de glycémie et matériel médical.',
  description_ar = 'واي بروتين، كرياتين، أجهزة قياس ضغط الدم والسكر، ومستلزمات طبية.',
  description_en = 'Whey protein isolate, creatine, blood pressure monitors, glucose meters, and medical supplies.'
WHERE id = 'cat_market_health';

UPDATE pd_marketplace_category SET
  description_fr = 'Croquettes pour chats et chiens, litières, aquariums, graines, plantes d''intérieur et outils de jardinage.',
  description_ar = 'أغذية القطط والكلاب، رمال، حوض أسماك، نباتات منزلية وأدوات بستنة.',
  description_en = 'Cat food, dog kibble, litter, aquariums, indoor plants, seeds, and gardening tools.'
WHERE id = 'cat_market_pet';

UPDATE pd_marketplace_category SET
  description_fr = 'Lessives liquides, détergents, produits de vaisselle, désinfectants et papier hygiénique.',
  description_ar = 'سائل غسيل الملابس، منظفات الأواني، مطهرات ومنتجات التنظيف المنزلي.',
  description_en = 'Liquid laundry detergents, dishwashing soaps, disinfectants, and household paper goods.'
WHERE id = 'cat_market_household';

UPDATE pd_marketplace_category SET
  description_fr = 'Guitares acoustiques et électriques, pianos numériques, synthétiseurs, batteries et microphones de studio.',
  description_ar = 'قيثارات أكوستيك وكهربائية، بيانو رقمي، سينثسايزر، درامز وميكروفونات أستوديو.',
  description_en = 'Acoustic and electric guitars, digital pianos, synthesizers, drum sets, and studio microphones.'
WHERE id = 'cat_market_music';

UPDATE pd_marketplace_category SET
  description_fr = 'Lecteurs code-barres, imprimantes tickets thermiques, tiroirs-caisses et rayonnages magazin.',
  description_ar = 'قارئ البار코드، طابعات إيصالات حرارية، صناديق نقود ورفوف للمحلات.',
  description_en = 'Barcode scanners, thermal receipt printers, cash drawers, and store shelving.'
WHERE id = 'cat_market_business';

-- ----------------------------------------------------
-- 2. Subcategories Multilingual Descriptions
-- ----------------------------------------------------
UPDATE pd_marketplace_category SET
  description_fr = 'Smartphones Apple, Samsung, Xiaomi, Oppo et accessoires mobiles.',
  description_ar = 'هواتف ذكية أبل، سامسونج، شاومي، أوبو وإكسسوارات الجوال.',
  description_en = 'Apple, Samsung, Xiaomi, Oppo smartphones and mobile accessories.'
WHERE id = 'cat_market_smartphones';

UPDATE pd_marketplace_category SET
  description_fr = 'iPhones neufs et reconditionnés garanti, coques MagSafe et chargeurs rapides.',
  description_ar = 'أجهزة آيفون جديدة ومجددة بضمان، أغطية ماج سيف وشواحن سريعة.',
  description_en = 'New and certified refurbished iPhones, MagSafe cases, and fast chargers.'
WHERE id = 'cat_market_iphone';

UPDATE pd_marketplace_category SET
  description_fr = 'Gammes Samsung Galaxy S, Note, A et téléphones pliables Z Fold/Flip.',
  description_ar = 'سلسلة سامسونج جالاكسي إس، نوت، أي والهواتف القابلة للطي.',
  description_en = 'Samsung Galaxy S series, Note, A series, and Z Fold/Flip foldables.'
WHERE id = 'cat_market_samsung';

UPDATE pd_marketplace_category SET
  description_fr = 'Série Xiaomi Redmi Note, Poco F/X et téléphones au meilleur rapport qualité-prix.',
  description_ar = 'سلسلة شاومي ريدمي نوت، بوكو وأفضل الهواتف القيمة.',
  description_en = 'Xiaomi Redmi Note series, Poco F/X, and high value smartphones.'
WHERE id = 'cat_market_xiaomi';

UPDATE pd_marketplace_category SET
  description_fr = 'Huile d''olive tunisienne extra vierge pressée à froid de première qualité.',
  description_ar = 'زيت زيتون تونسي بكر ممتاز معصور على البارد عالي الجودة.',
  description_en = 'First cold-pressed premium Tunisian extra virgin olive oil.'
WHERE id = 'cat_market_olive_oil';

UPDATE pd_marketplace_category SET
  description_fr = 'Harissa pimentée traditionnelle de Nabeul et mélange d''épices Tabil tunisien.',
  description_ar = 'هريسة دياري حارة نابلية وتوابل التابل والكروية التونسية الأصيلة.',
  description_en = 'Authentic spicy Nabeul Harissa and traditional Tunisian Tabil spice blend.'
WHERE id = 'cat_market_harissa_spices';
