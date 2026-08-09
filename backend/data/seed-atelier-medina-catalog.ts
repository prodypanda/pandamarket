/**
 * PandaMarket — Atelier Médina Catalog Seeder
 * ----------------------------------------------------
 * Seeds 36 rich, authentic artisan and lifestyle products for:
 * Store ID: pd_store_6hA7WWUBufUDF5ga (Atelier Médina)
 *
 * Runs against remote Supabase PostgreSQL.
 */

import { Client } from 'pg';
import * as crypto from 'crypto';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

function pdId(prefix: string): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `pd_${prefix}_${id}`;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface StorefrontCategoryDef {
  id: string;
  name: string;
  slug: string;
  description: string;
  position: number;
}

interface ProductImageDef {
  url: string;
  alt_text: string;
  position: number;
  is_thumbnail: boolean;
}

interface ProductVariantDef {
  sku: string;
  title: string;
  price: number;
  inventory_quantity: number;
  options: Record<string, string>;
}

interface ProductDef {
  title: string;
  slug?: string;
  product_reference: string;
  marketplace_category_id: string;
  storefront_category_slug: string;
  price: number;
  inventory_quantity: number;
  weight_grams: number;
  description: string;
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
  thumbnail: string;
  images: ProductImageDef[];
  variants?: ProductVariantDef[];
  seo_title?: string;
  seo_description?: string;
}

const STOREFRONT_CATEGORIES: StorefrontCategoryDef[] = [
  {
    id: 'pd_cat_store_med_poterie',
    name: 'Poterie & Céramique Artisanale',
    slug: 'poterie-ceramique-artisanale',
    description: 'Céramiques émaillées de Nabeul, poteries rustiques de Sejnane et Guellala peintes à la main.',
    position: 10,
  },
  {
    id: 'pd_cat_store_med_tapis',
    name: 'Tapis & Tissages Berbères',
    slug: 'tapis-tissages-berberes',
    description: 'Margoums en pure laine vierge de Kairouan, kilims traditionnels et tissages berbères géométriques.',
    position: 20,
  },
  {
    id: 'pd_cat_store_med_foutas',
    name: 'Linge & Foutas Traditionnelles',
    slug: 'linge-foutas-traditionnelles',
    description: 'Foutas de hammam 100% coton peigné, tissages nid d’abeille et linge de maison artisanal.',
    position: 30,
  },
  {
    id: 'pd_cat_store_med_cuir',
    name: 'Maroquinerie & Cuir Pleine Fleur',
    slug: 'maroquinerie-cuir-pleine-fleur',
    description: 'Sacs besace, cabas, sacs de voyage et portefeuilles en cuir pleine fleur au tannage végétal.',
    position: 40,
  },
  {
    id: 'pd_cat_store_med_chaussures',
    name: 'Chaussures & Babouches Artisanales',
    slug: 'chaussures-babouches-artisanales',
    description: 'Babouches royales en cuir souple cousu main et balghas brodées au fil d’or.',
    position: 50,
  },
  {
    id: 'pd_cat_store_med_mode',
    name: 'Mode & Vêtements Traditionnels',
    slug: 'mode-vetements-traditionnels',
    description: 'Jebbas en laine et soie, kaftans modernes raffinés, tuniques brodées en lin et chéchias artisanales.',
    position: 60,
  },
  {
    id: 'pd_cat_store_med_epicerie',
    name: 'Épicerie Fine & Terroir Tunisien',
    slug: 'epicerie-fine-terroir-tunisien',
    description: 'Huile d’olive extra vierge pressée à froid, harissa fumée, dattes Deglet Nour et miels de l’Atlas.',
    position: 70,
  },
  {
    id: 'pd_cat_store_med_soins',
    name: 'Soins Naturels & Bien-Être',
    slug: 'soins-naturels-bien-etre',
    description: 'Huile pure de pépins de figue de barbarie bio, rituels hammam, savon d’Alep et eaux florales.',
    position: 80,
  },
  {
    id: 'pd_cat_store_med_art',
    name: 'Objets d’Art, Bois d’Olivier & Bijoux',
    slug: 'objets-art-bois-olivier-bijoux',
    description: 'Miroirs en cuivre ciselé, mortiers en bois d’olivier massif et bijoux berbères en argent 925.',
    position: 90,
  },
];

const PRODUCTS: ProductDef[] = [
  // ----------------------------------------------------
  // 1. Poterie & Céramique Artisanale (5 items)
  // ----------------------------------------------------
  {
    title: 'Service à Thé Andalou Nabeulien (Théière + 6 Verres en Céramique + Plateau Cuivre)',
    product_reference: 'MED-POT-001',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 135.0,
    inventory_quantity: 25,
    weight_grams: 2200,
    thumbnail: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Embellissez vos moments de dégustation avec cet authentique <strong>Service à Thé Andalou</strong> entièrement façonné et peint à la main par les maîtres potiers de <em>Nabeul</em>.</p>
      <p>Inspiré de l'art hispano-mauresque, chaque pièce arbore de délicats motifs floraux et arabesques aux émaux minéraux éclatants. Le service complet comprend une théière artisanale avec bec verseur anti-goutte, 6 gobelets à thé en céramique résistante à la chaleur et un plateau de présentation en cuivre martelé poli.</p>
      <h3>Caractéristiques & Points Forts :</h3>
      <ul>
        <li><strong>Fabrication :</strong> Façonnage au tour traditionnel et double cuisson à 1020°C.</li>
        <li><strong>Composition :</strong> 1 théière (850 ml), 6 tasses à thé (150 ml), 1 plateau en cuivre (Ø 35 cm).</li>
        <li><strong>Finition :</strong> Émaillage alimentaire sans plomb, résistant au lave-vaisselle.</li>
        <li><strong>Origine :</strong> Ateliers artisanaux de Nabeul, Tunisie.</li>
      </ul>
    `,
    tags: ['service à thé', 'nabeul', 'céramique', 'artisanat tunisien', 'fait main', 'théière'],
    attributes: [
      { name: 'Matière', value: 'Terre cuite émaillée & Cuivre martelé' },
      { name: 'Origine', value: 'Nabeul, Tunisie' },
      { name: 'Contenance théière', value: '850 ml' },
      { name: 'Nombre de pièces', value: '8 pièces' },
      { name: 'Entretien', value: 'Lavable à la main ou lave-vaisselle (cycle doux)' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Service à Thé Andalou Nabeulien vue d\'ensemble',
        position: 0,
        is_thumbnail: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Détail des tasses en céramique peintes à la main',
        position: 1,
        is_thumbnail: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Théière andalouse avec plateau en cuivre',
        position: 2,
        is_thumbnail: false,
      },
    ],
    variants: [
      {
        sku: 'MED-POT-001-BLU',
        title: 'Bleu Majorelle & Blanc',
        price: 135.0,
        inventory_quantity: 12,
        options: { color: 'Bleu Majorelle & Blanc' },
      },
      {
        sku: 'MED-POT-001-GRE',
        title: 'Vert Émeraude & Or',
        price: 135.0,
        inventory_quantity: 8,
        options: { color: 'Vert Émeraude & Or' },
      },
      {
        sku: 'MED-POT-001-SAF',
        title: 'Jaune Safran & Terracotta',
        price: 135.0,
        inventory_quantity: 5,
        options: { color: 'Jaune Safran & Terracotta' },
      },
    ],
  },
  {
    title: 'Grand Plat à Couscous Traditionnel "Tebsi" Ø 42cm Peint à la Main',
    product_reference: 'MED-POT-002',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 95.0,
    inventory_quantity: 18,
    weight_grams: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Le <strong>Tebsi</strong> est la pièce maîtresse incontournable de la table tunisienne. Idéal pour servir le couscous familial, les tajines de fête ou comme plat de présentation d'exception.</p>
      <p>Décoré à la pointe du pinceau avec des arabesques géométriques traditionnelles bleues et ocres, ce plat généreux de 42 cm de diamètre conjugue élégance ancestrale et robustesse.</p>
      <ul>
        <li><strong>Diamètre :</strong> 42 cm — Idéal pour 6 à 8 convives.</li>
        <li><strong>Matière :</strong> Argile rouge naturelle de Nabeul, émail brillant sans métaux lourds.</li>
        <li><strong>Utilisation :</strong> Service chaud ou froid, plat décoratif mural (crochet arrière inclus).</li>
      </ul>
    `,
    tags: ['tebsi', 'plat couscous', 'céramique nabeul', 'poterie', 'art de la table', 'tunisie'],
    attributes: [
      { name: 'Matière', value: 'Argile rouge émaillée' },
      { name: 'Diamètre', value: '42 cm' },
      { name: 'Hauteur', value: '7.5 cm' },
      { name: 'Origine', value: 'Nabeul, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Grand Plat Tebsi en céramique peint à la main',
        position: 0,
        is_thumbnail: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Détail des motifs arabesques peints au pinceau',
        position: 1,
        is_thumbnail: false,
      },
    ],
  },
  {
    title: 'Tajine de Cuisson Authentique en Argile de Sejnane (Inscrit UNESCO)',
    product_reference: 'MED-POT-003',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 85.0,
    inventory_quantity: 12,
    weight_grams: 2500,
    thumbnail: 'https://images.unsplash.com/photo-1584990347449-389f4171804f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Façonné par les femmes potières de <em>Sejnane</em> selon un savoir-faire millénaire inscrit au <strong>Patrimoine Culturel Immatériel de l'UNESCO</strong>, ce tajine de cuisson est une œuvre d'art vivante.</p>
      <p>Modelé à la main sans tour, poli avec des galets de rivière et cuit à foyer ouvert, il est décoré de pigments naturels végétaux et de motifs berbères sacrés. Il confère aux plats mijotés une saveur fumée et authentique inégalable.</p>
    `,
    tags: ['tajine', 'sejnane', 'unesco', 'poterie sejnane', 'argile naturelle', 'fait main'],
    attributes: [
      { name: 'Matière', value: 'Argile brute de Sejnane & Pigments naturels' },
      { name: 'Diamètre', value: '30 cm' },
      { name: 'Technique', value: 'Modelage à la main sans tour' },
      { name: 'Label', value: 'Patrimoine Immatériel UNESCO' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584990347449-389f4171804f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tajine de cuisson en argile naturelle de Sejnane',
        position: 0,
        is_thumbnail: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Détail de la texture polie aux galets',
        position: 1,
        is_thumbnail: false,
      },
    ],
  },
  {
    title: 'Service de 6 Bols "Kessria" à Soupe & Lablabi Peints Main',
    product_reference: 'MED-POT-004',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 58.0,
    inventory_quantity: 40,
    weight_grams: 1200,
    thumbnail: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Ce lot de 6 bols artisanaux <em>Kessria</em> est parfait pour déguster la chorba traditionnelle, le lablabi chaud ou pour présenter vos apéritifs et tapas méditerranéens.</p>
      <p>Chaque bol présente une harmonie de couleurs vives (bleu kobalt, ocre, vert olive) peintes à main levée.</p>
    `,
    tags: ['bols', 'chorba', 'lablabi', 'kessria', 'nabeul', 'céramique'],
    attributes: [
      { name: 'Matière', value: 'Céramique émaillée' },
      { name: 'Diamètre', value: '14 cm par bol' },
      { name: 'Nombre de bols', value: '6 unités' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Service de 6 bols en céramique artisanale',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Ensemble 3 Pots à Épices & Harissa Traditionnelle avec Cuillères en Bois d\'Olivier',
    product_reference: 'MED-POT-005',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 42.0,
    inventory_quantity: 50,
    weight_grams: 800,
    thumbnail: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Trio de pots en céramique de Nabeul sur plateau avec couvercles ajourés et petites cuillères sculptées en bois d'olivier massif. Parfait pour servir la harissa maison, l'ail confit, le cumin ou la fleur de sel sur votre table.</p>
    `,
    tags: ['pots épices', 'harissa', 'bois d\'olivier', 'nabeul', 'artisanat'],
    attributes: [
      { name: 'Composition', value: '3 pots avec couvercles + plateau + 3 cuillères bois' },
      { name: 'Matière', value: 'Céramique émaillée & Bois d\'olivier' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Trio de pots à épices et harissa',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },

  // ----------------------------------------------------
  // 2. Tapis & Tissages Berbères (4 items)
  // ----------------------------------------------------
  {
    title: 'Tapis Margoum Berbère Pur Laine Vierge Kairouan 150x200cm',
    product_reference: 'MED-TEX-001',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 380.0,
    inventory_quantity: 8,
    weight_grams: 4200,
    thumbnail: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Véritable chef-d'œuvre de tissage tunisien, ce <strong>Tapis Margoum de Kairouan</strong> est confectionné à la main sur des métiers traditionnels en pure laine vierge de mouton sélectionnée.</p>
      <p>Les motifs losangiques berbères (<em>regma</em>) tissés en relief inversé racontent les symboles de fécondité, de protection et de voyage de la culture nomade. Apporte une chaleur incomparable et une élégance intemporelle à votre salon ou chambre.</p>
    `,
    tags: ['tapis margoum', 'kairouan', 'laine vierge', 'tapis berbère', 'tissé main', 'déco'],
    attributes: [
      { name: 'Matière', value: '100% Pure Laine Vierge naturelle' },
      { name: 'Dimensions', value: '150 cm x 200 cm' },
      { name: 'Technique', value: 'Tissage ras et motifs brodés au point noué' },
      { name: 'Origine', value: 'Kairouan, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tapis Margoum Berbère en laine de Kairouan',
        position: 0,
        is_thumbnail: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Détail du tissage et des motifs berbères',
        position: 1,
        is_thumbnail: false,
      },
    ],
    variants: [
      {
        sku: 'MED-TEX-001-TER',
        title: 'Terracotta, Écru & Noir',
        price: 380.0,
        inventory_quantity: 5,
        options: { color: 'Terracotta, Écru & Noir' },
      },
      {
        sku: 'MED-TEX-001-IND',
        title: 'Indigo & Blanc Cassé',
        price: 380.0,
        inventory_quantity: 3,
        options: { color: 'Indigo & Blanc Cassé' },
      },
    ],
  },
  {
    title: 'Tapis Kilim Géométrique Tissé Main aux Teintures Végétales 120x180cm',
    product_reference: 'MED-TEX-002',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 260.0,
    inventory_quantity: 10,
    weight_grams: 2800,
    thumbnail: 'https://images.unsplash.com/photo-1594897030560-69c1cf6ddc4f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Ce <strong>Kilim Berbère</strong> à tissage plat et réversible utilise des laines teintes naturellement avec des écorces de grenade, de la garance et de l'indigo.</p>
      <p>Souple, résistant et facile d'entretien, il habille chaleureusement vos sols ou s'accroche comme une tapisserie murale raffinée.</p>
    `,
    tags: ['kilim', 'tapis berbère', 'teintures végétales', 'laine', 'fait main'],
    attributes: [
      { name: 'Matière', value: 'Laine & Coton naturel' },
      { name: 'Dimensions', value: '120 cm x 180 cm' },
      { name: 'Teintures', value: '100% végétales naturelles' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1594897030560-69c1cf6ddc4f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tapis Kilim berbère aux motifs géométriques',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Fouta Tunisienne Plate Pur Coton Peigné Tissage Artisanal Nid d\'Abeille (Lot de 3)',
    product_reference: 'MED-TEX-003',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 49.0,
    inventory_quantity: 60,
    weight_grams: 900,
    thumbnail: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>L'incontournable <strong>Fouta Tunisienne</strong> en pur coton peigné extra-doux. Tissage dense nid d'abeille ultra absorbant qui sèche rapidement sans retenir le sable.</p>
      <p>Idéale pour la plage, le bain, le spa, le hammam ou comme jeté de canapé. Lot de 3 draps avec franges nouées à la main par des artisanes.</p>
    `,
    tags: ['fouta', 'fouta tunisienne', 'coton', 'hammam', 'plage', 'lot de 3'],
    attributes: [
      { name: 'Matière', value: '100% Coton peigné naturel' },
      { name: 'Dimensions', value: '100 cm x 200 cm par unité' },
      { name: 'Grammage', value: '380 g/m²' },
      { name: 'Finition', value: 'Franges torsadées et nouées à la main' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Foutas tunisiennes en coton peigné',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-TEX-003-BLU',
        title: 'Trio Bleu Méditerranée & Blanc',
        price: 49.0,
        inventory_quantity: 25,
        options: { color: 'Trio Bleu Méditerranée' },
      },
      {
        sku: 'MED-TEX-003-TER',
        title: 'Trio Terracotta & Sable Doré',
        price: 49.0,
        inventory_quantity: 20,
        options: { color: 'Trio Terracotta & Sable' },
      },
      {
        sku: 'MED-TEX-003-SAU',
        title: 'Trio Vert Sauge & Écru',
        price: 49.0,
        inventory_quantity: 15,
        options: { color: 'Trio Vert Sauge & Écru' },
      },
    ],
  },
  {
    title: 'Couvre-lit / Jeté de Canapé Artisanal en Lin Tissé Main avec Pompons 220x240cm',
    product_reference: 'MED-TEX-004',
    marketplace_category_id: 'cat_sub_textiles_bedding',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 175.0,
    inventory_quantity: 15,
    weight_grams: 1600,
    thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Couvre-lit grande taille confectionné en lin naturel et coton brut. Texture authentique, finitions pompons généreux faits main aux 4 coins. Apporte une ambiance bohème chic et méditerranéenne à votre chambre à coucher.</p>
    `,
    tags: ['couvre-lit', 'jeté de canapé', 'lin', 'pompons', 'déco méditerranéenne'],
    attributes: [
      { name: 'Matière', value: '60% Lin naturel, 40% Coton brut' },
      { name: 'Dimensions', value: '220 cm x 240 cm' },
      { name: 'Finition', value: 'Pompons artisanaux en fil de coton' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Couvre-lit en lin naturel avec pompons',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },

  // ----------------------------------------------------
  // 3. Cuir Tannage Végétal & Maroquinerie Médina (6 items)
  // ----------------------------------------------------
  {
    title: 'Sac Besace Bandoulière en Cuir Pleine Fleur Tannage Végétal Kairouan',
    product_reference: 'MED-LEA-001',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 220.0,
    inventory_quantity: 14,
    weight_grams: 850,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Fabriqué dans les ateliers historiques de <em>Kairouan</em>, ce sac besace est taillé dans un cuir de vachette pleine fleur tanné aux écorces végétales sans produits chimiques.</p>
      <p>Il développera une patine sublime au fil des années. Équipé d'une bandoulière réglable, d'un fermoir boucle en laiton massif vieilli et de compartiments intérieurs doublés en toile de coton.</p>
    `,
    tags: ['sac cuir', 'besace', 'cuir pleine fleur', 'kairouan', 'tannage végétal', 'maroquinerie'],
    attributes: [
      { name: 'Matière', value: 'Cuir de vachette pleine fleur au tannage végétal' },
      { name: 'Bouclerie', value: 'Laiton massif brossé' },
      { name: 'Dimensions', value: '28 cm x 22 cm x 8 cm' },
      { name: 'Bandoulière', value: 'Réglable de 90 cm à 130 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sac Besace en cuir pleine fleur camel',
        position: 0,
        is_thumbnail: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Détail des coutures sellier et finitions cuir',
        position: 1,
        is_thumbnail: false,
      },
    ],
    variants: [
      {
        sku: 'MED-LEA-001-CAM',
        title: 'Marron Vintage Camel',
        price: 220.0,
        inventory_quantity: 7,
        options: { color: 'Vintage Camel' },
      },
      {
        sku: 'MED-LEA-001-NOI',
        title: 'Noir Ébène',
        price: 220.0,
        inventory_quantity: 4,
        options: { color: 'Noir Ébène' },
      },
      {
        sku: 'MED-LEA-001-COG',
        title: 'Cognac Bruni',
        price: 220.0,
        inventory_quantity: 3,
        options: { color: 'Cognac Bruni' },
      },
    ],
  },
  {
    title: 'Grand Sac Cabas en Cuir Naturel Souple & Toile de Jute Brodé Médina',
    product_reference: 'MED-LEA-002',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 165.0,
    inventory_quantity: 20,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Mariage parfait entre l'authenticité de la toile de jute naturelle brodée et la robustesse des anses en cuir gras. Spacieux et léger, ce cabas fourre-tout vous accompagne aussi bien en ville qu'en escapade balnéaire.</p>
    `,
    tags: ['cabas', 'sac de plage', 'jute et cuir', 'sac femme', 'artisanat'],
    attributes: [
      { name: 'Matière', value: 'Toile de jute naturelle & Anses en cuir véritable' },
      { name: 'Dimensions', value: '45 cm x 35 cm x 15 cm' },
      { name: 'Poche intérieure', value: 'Poche zippée pour smartphone et clés' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Grand Sac Cabas en cuir et toile de jute',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sac de Voyage Weekender en Cuir Rustique Gravé Main 50L',
    product_reference: 'MED-LEA-003',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 340.0,
    inventory_quantity: 6,
    weight_grams: 1900,
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Le compagnon idéal de vos escapades d'un week-end. Conçu en cuir de buffle résistant et souple, renforcé par des rivets métalliques. Volume généreux de 50L avec compartiment à chaussures séparé et bandoulière molletonnée amovible.</p>
    `,
    tags: ['sac de voyage', 'weekender', 'sac cuir homme', 'duffel bag', 'voyage'],
    attributes: [
      { name: 'Matière', value: 'Cuir pleine fleur gras haute résistance' },
      { name: 'Contenance', value: '50 Litres' },
      { name: 'Dimensions', value: '55 cm x 30 cm x 28 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sac de voyage Weekender en cuir de buffle',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Portefeuille Porte-cartes Minimaliste en Cuir Tanné Naturellement',
    product_reference: 'MED-LEA-004',
    marketplace_category_id: 'cat_sub_men_acc',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 48.0,
    inventory_quantity: 45,
    weight_grams: 120,
    thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Portefeuille compact et ultra-plat façonné à la main. Capacité de 8 cartes bancaires, compartiment à billets et protection RFID intégrée. Coutures au point sellier ciré pour une longévité garantie.</p>
    `,
    tags: ['portefeuille', 'porte-cartes', 'cuir', 'accessoire homme', 'kairouan'],
    attributes: [
      { name: 'Matière', value: 'Cuir de veau pleine fleur' },
      { name: 'Dimensions', value: '11 cm x 8.5 cm x 1 cm' },
      { name: 'Capacité', value: '8 cartes + billets de banque' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Portefeuille porte-cartes en cuir naturel',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Babouches Royales Tunisiennes en Cuir Souple Cousu Main Homme',
    product_reference: 'MED-SHOE-001',
    marketplace_category_id: 'cat_market_men_shoes',
    storefront_category_slug: 'chaussures-babouches-artisanales',
    price: 75.0,
    inventory_quantity: 30,
    weight_grams: 400,
    thumbnail: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Babouches traditionnelles <em>Belgha</em> confectionnées par les artisans chausseurs du Souk El Grana à Tunis. Tige en cuir d'agneau souple, semelle extérieure en cuir tanné épais et semelle intérieure moussée pour un confort incomparable au quotidien ou lors des cérémonies.</p>
    `,
    tags: ['babouches', 'belgha', 'chaussures traditionnelles', 'cuir', 'homme', 'tunisie'],
    attributes: [
      { name: 'Tige', value: '100% Cuir d\'agneau véritable' },
      { name: 'Semelle', value: 'Cuir de vache cousu trépointe' },
      { name: 'Origine', value: 'Médina de Tunis, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Babouches artisanales en cuir souple pour homme',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-SHOE-001-41-YEL',
        title: 'Jaune Impérial - Taille 41',
        price: 75.0,
        inventory_quantity: 6,
        options: { size: '41', color: 'Jaune Impérial' },
      },
      {
        sku: 'MED-SHOE-001-42-YEL',
        title: 'Jaune Impérial - Taille 42',
        price: 75.0,
        inventory_quantity: 8,
        options: { size: '42', color: 'Jaune Impérial' },
      },
      {
        sku: 'MED-SHOE-001-43-YEL',
        title: 'Jaune Impérial - Taille 43',
        price: 75.0,
        inventory_quantity: 8,
        options: { size: '43', color: 'Jaune Impérial' },
      },
      {
        sku: 'MED-SHOE-001-44-NOI',
        title: 'Noir Ébène - Taille 44',
        price: 75.0,
        inventory_quantity: 4,
        options: { size: '44', color: 'Noir Ébène' },
      },
      {
        sku: 'MED-SHOE-001-45-NOI',
        title: 'Noir Ébène - Taille 45',
        price: 75.0,
        inventory_quantity: 4,
        options: { size: '45', color: 'Noir Ébène' },
      },
    ],
  },
  {
    title: 'Mules Babouches "Balgha" Brodées au Fil d\'Or Femme',
    product_reference: 'MED-SHOE-002',
    marketplace_category_id: 'cat_market_women_shoes',
    storefront_category_slug: 'chaussures-babouches-artisanales',
    price: 82.0,
    inventory_quantity: 25,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Élégance royale et raffinement oriental. Ces babouches pour femme sont confectionnées en velours noble rehaussé de broderies délicates au fil d'or <em>Korbelle</em>. Idéales pour sublimer un kaftan ou une tenue habillée moderne.</p>
    `,
    tags: ['babouches femme', 'balgha', 'broderie fil d\'or', 'velours', 'mariage', 'soirée'],
    attributes: [
      { name: 'Matière', value: 'Velours soyeux et broderie dorée' },
      { name: 'Semelle', value: 'Cuir véritable avec patin anti-dérapant' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Babouches brodées au fil d\'or pour femme',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-SHOE-002-37-ROU',
        title: 'Velours Rouge Carmin - Taille 37',
        price: 82.0,
        inventory_quantity: 5,
        options: { size: '37', color: 'Rouge Carmin' },
      },
      {
        sku: 'MED-SHOE-002-38-ROU',
        title: 'Velours Rouge Carmin - Taille 38',
        price: 82.0,
        inventory_quantity: 8,
        options: { size: '38', color: 'Rouge Carmin' },
      },
      {
        sku: 'MED-SHOE-002-39-BLE',
        title: 'Velours Bleu Nuit - Taille 39',
        price: 82.0,
        inventory_quantity: 7,
        options: { size: '39', color: 'Bleu Nuit' },
      },
      {
        sku: 'MED-SHOE-002-40-BLE',
        title: 'Velours Bleu Nuit - Taille 40',
        price: 82.0,
        inventory_quantity: 5,
        options: { size: '40', color: 'Bleu Nuit' },
      },
    ],
  },

  // ----------------------------------------------------
  // 4. Mode & Vêtements Traditionnels (4 items)
  // ----------------------------------------------------
  {
    title: 'Jebba Traditionnelle Tunisienne Homme en Laine & Soie Brodée "Harir"',
    product_reference: 'MED-CLO-001',
    marketplace_category_id: 'cat_market_men_tops',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 290.0,
    inventory_quantity: 10,
    weight_grams: 900,
    thumbnail: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Symbole incontesté de l'élégance masculine tunisienne, la <strong>Jebba</strong> est confectionnée dans un drap de laine fine et fil de soie (<em>Harir</em>). Broderies fines au col, aux emmanchures et poches réalisées entièrement à la main.</p>
      <p>Parfaite pour les mariages, les fêtes de l'Aïd et les grandes réceptions culturelles.</p>
    `,
    tags: ['jebba', 'costume traditionnel', 'homme', 'soie', 'harir', 'mariage tunisien'],
    attributes: [
      { name: 'Tissu', value: '70% Laine mérinos fine, 30% Soie naturelle' },
      { name: 'Broderie', value: 'Fil de soie tressé main (Kardoun)' },
      { name: 'Coupe', value: 'Ample traditionnelle avec poches latérales' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Jebba traditionnelle tunisienne brodée',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-001-M-CRE',
        title: 'Blanc Crème - Taille M',
        price: 290.0,
        inventory_quantity: 3,
        options: { size: 'M', color: 'Blanc Crème' },
      },
      {
        sku: 'MED-CLO-001-L-CRE',
        title: 'Blanc Crème - Taille L',
        price: 290.0,
        inventory_quantity: 4,
        options: { size: 'L', color: 'Blanc Crème' },
      },
      {
        sku: 'MED-CLO-001-XL-GRI',
        title: 'Gris Perle - Taille XL',
        price: 290.0,
        inventory_quantity: 3,
        options: { size: 'XL', color: 'Gris Perle' },
      },
    ],
  },
  {
    title: 'Kaftan Tunisien Moderne en Soie Sauvage avec Broderies Dorées',
    product_reference: 'MED-CLO-002',
    marketplace_category_id: 'cat_market_women_dresses',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 320.0,
    inventory_quantity: 12,
    weight_grams: 800,
    thumbnail: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Kaftan moderne fluide et majestueux en soie sauvage de première qualité. Orné d'un travail minutieux de broderie au fil d'or le long du buste et des manches, accompagné d'une ceinture ajustable ornée d'une boucle ciselée.</p>
    `,
    tags: ['kaftan', 'caftan', 'robe de soirée', 'soie', 'broderie or', 'mariage'],
    attributes: [
      { name: 'Matière', value: '100% Soie sauvage avec doublure satinée' },
      { name: 'Accessoire', value: 'Ceinture brodée assortie incluse' },
      { name: 'Longueur', value: '150 cm (coupe longue élégante)' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Kaftan tunisien moderne en soie sauvage',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-002-38-VER',
        title: 'Vert Émeraude - Taille 38',
        price: 320.0,
        inventory_quantity: 3,
        options: { size: '38', color: 'Vert Émeraude' },
      },
      {
        sku: 'MED-CLO-002-40-VER',
        title: 'Vert Émeraude - Taille 40',
        price: 320.0,
        inventory_quantity: 4,
        options: { size: '40', color: 'Vert Émeraude' },
      },
      {
        sku: 'MED-CLO-002-42-IVO',
        title: 'Ivoire & Or - Taille 42',
        price: 320.0,
        inventory_quantity: 5,
        options: { size: '42', color: 'Ivoire & Or' },
      },
    ],
  },
  {
    title: 'Tunique Brodée en Lin Naturel Sidi Bou Saïd Coupe Ample Femme',
    product_reference: 'MED-CLO-003',
    marketplace_category_id: 'cat_sub_women_tops',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 110.0,
    inventory_quantity: 22,
    weight_grams: 300,
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Inspirée par la douceur de vivre du village mythique de <em>Sidi Bou Saïd</em>, cette tunique en pur lin naturel lavé offre une fraîcheur incomparable pendant les journées ensoleillées.</p>
      <p>Col tunisien orné de broderies géométriques artisanales au fil de coton bleu azur.</p>
    `,
    tags: ['tunique', 'lin', 'sidi bou said', 'mode été', 'broderie', 'femme'],
    attributes: [
      { name: 'Matière', value: '100% Lin naturel prélavé respirant' },
      { name: 'Coupe', value: 'Ample avec fentes latérales' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tunique brodée en lin naturel blanc et bleu',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-003-S-BLU',
        title: 'Blanc & Broderie Bleue - Taille S',
        price: 110.0,
        inventory_quantity: 6,
        options: { size: 'S', color: 'Blanc & Bleu' },
      },
      {
        sku: 'MED-CLO-003-M-BLU',
        title: 'Blanc & Broderie Bleue - Taille M',
        price: 110.0,
        inventory_quantity: 8,
        options: { size: 'M', color: 'Blanc & Bleu' },
      },
      {
        sku: 'MED-CLO-003-L-BLU',
        title: 'Blanc & Broderie Bleue - Taille L',
        price: 110.0,
        inventory_quantity: 8,
        options: { size: 'L', color: 'Blanc & Bleu' },
      },
    ],
  },
  {
    title: 'Chéchia Tunisienne Authentique Pure Laine Mérinos Feutrée Rouge Souk des Chéchias',
    product_reference: 'MED-CLO-004',
    marketplace_category_id: 'cat_sub_men_acc',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 45.0,
    inventory_quantity: 35,
    weight_grams: 100,
    thumbnail: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>La véritable <strong>Chéchia Tunisienne</strong> confectionnée dans les règles de l'art par les maîtres <em>Chaouachis</em> de la Médina de Tunis. Pure laine mérinos tricotée, foulée, feutrée et teinte au rouge garance avec gland noir traditionnel (<em>Kbeba</em>).</p>
    `,
    tags: ['chéchia', 'coiffe traditionnelle', 'laine mérinos', 'médina de tunis', 'authentique'],
    attributes: [
      { name: 'Matière', value: '100% Laine Mérinos d\'Australie feutrée' },
      { name: 'Origine', value: 'Souk des Chéchias, Tunis' },
      { name: 'Label', value: 'Appellation d\'origine artisanale' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Chéchia tunisienne rouge en pure laine feutrée',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-004-57',
        title: 'Tour de tête 57 cm',
        price: 45.0,
        inventory_quantity: 12,
        options: { size: '57' },
      },
      {
        sku: 'MED-CLO-004-58',
        title: 'Tour de tête 58 cm',
        price: 45.0,
        inventory_quantity: 15,
        options: { size: '58' },
      },
      {
        sku: 'MED-CLO-004-59',
        title: 'Tour de tête 59 cm',
        price: 45.0,
        inventory_quantity: 8,
        options: { size: '59' },
      },
    ],
  },

  // ----------------------------------------------------
  // 5. Spécialités du Terroir & Épicerie Fine (6 items)
  // ----------------------------------------------------
  {
    title: 'Huile d\'Olive Vierge Extra Bio Chetoui & Chemlali Première Pression à Froid 1L',
    product_reference: 'MED-FOOD-001',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 36.5,
    inventory_quantity: 100,
    weight_grams: 1400,
    thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Issue des oliveraies séculaires de la vallée de la Medjerda, cette <strong>Huile d'Olive Vierge Extra Biologique</strong> est un assemblage d'exception des variétés endémiques <em>Chetoui</em> (ardence et fruité vert) et <em>Chemlali</em> (douceur amandée).</p>
      <p>Extraite à froid (< 24°C) dans les 4 heures suivant la récolte manuelle. Acidité ultra-basse < 0.2%, riche en polyphénols antioxydants. Bouteille en verre teinté anti-UV.</p>
    `,
    tags: ['huile d\'olive', 'bio', 'extra vierge', 'terroir tunisien', 'chetoui', 'chemlali', '1L'],
    attributes: [
      { name: 'Acidité', value: '< 0.2%' },
      { name: 'Variétés', value: 'Chetoui & Chemlali' },
      { name: 'Contenance', value: '1 Litre (Bouteille verre teinté sombre)' },
      { name: 'Récolte', value: '2025 / 2026' },
      { name: 'Certification', value: 'Agriculture Biologique (TN-BIO-001)' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille d\'Huile d\'Olive Vierge Extra Bio',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coffret Trio Harissa Artisanale de Nabeul Séchée au Soleil et Fumée au Bois de Citronnier (3x190g)',
    product_reference: 'MED-FOOD-002',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 28.0,
    inventory_quantity: 70,
    weight_grams: 900,
    thumbnail: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Découvrez la véritable <strong>Harissa Traditionnelle de Nabeul</strong> (Inscrite au Patrimoine Immatériel UNESCO). Piments rouges Baklouti séchés naturellement au soleil méditerranéen, fumés délicatement au bois de citronnier et broyés à la meule avec ail frais, graines de carvi et coriandre sauvage.</p>
      <p>Coffret découverte de 3 recettes : Harissa Traditionnelle Fumée, Harissa Douce aux Poivrons Grillés, et Harissa Berbère aux Herbes de l'Atlas.</p>
    `,
    tags: ['harissa', 'nabeul', 'piment', 'terroir', 'unesco', 'coffret', 'épices'],
    attributes: [
      { name: 'Poids net', value: '3 x 190g (570g au total)' },
      { name: 'Ingrédients', value: 'Piments rouges séchés, ail, coriandre, carvi, sel de mer, huile d\'olive' },
      { name: 'Conservation', value: 'À conserver au frais après ouverture avec un filet d\'huile d\'olive' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coffret Harissa artisanale de Nabeul',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Dattes Deglet Nour Bio de Tozeur Branchées Prestige 1kg',
    product_reference: 'MED-FOOD-003',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 24.5,
    inventory_quantity: 85,
    weight_grams: 1100,
    thumbnail: 'https://images.unsplash.com/photo-1593444285843-02f5e08c5c70?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Surnommée les <em>Doigts de Lumière</em>, la datte <strong>Deglet Nour de Tozeur</strong> est réputée dans le monde entier pour sa chair translucide et moelleuse au goût subtil de miel et de fleur d'oranger.</p>
      <p>Présentées en branches naturelles intactes dans un coffret prestige. 100% bio, sans conservateur ni glucose ajouté.</p>
    `,
    tags: ['dattes', 'deglet nour', 'tozeur', 'bio', 'dattes branchées', 'sahara'],
    attributes: [
      { name: 'Origine', value: 'Oasis de Tozeur & Nefta, Tunisie' },
      { name: 'Poids net', value: '1 Kg' },
      { name: 'Qualité', value: 'Choix Extra Prestige sur branche' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1593444285843-02f5e08c5c70?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Dattes Deglet Nour de Tozeur en branches',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Miel Pur de Thym et Fleurs Sauvages de l\'Atlas Tunisien 500g',
    product_reference: 'MED-FOOD-004',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 44.0,
    inventory_quantity: 40,
    weight_grams: 750,
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Miel d'apiculture traditionnelle récolté dans les massifs montagneux préservés de la Dorsale Tunisienne (Zaghouan et Kesra). Arômes boisés intenses, vertus antiseptiques et digestives reconnues.</p>
    `,
    tags: ['miel', 'miel de thym', 'miel bio', 'apiculture tunisie', 'zaghouan'],
    attributes: [
      { name: 'Poids net', value: '500g' },
      { name: 'Fleurs dominantes', value: 'Thym sauvage, Romarin, Bruyère' },
      { name: 'Texture', value: 'Crémeuse et ambrée naturelle' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pot de Miel pur de thym de l\'Atlas',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Eau de Fleur d\'Oranger Distillée Traditionnellement à Nabeul 500ml',
    product_reference: 'MED-FOOD-005',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 18.0,
    inventory_quantity: 60,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Distillée dans des alambics traditionnels en cuivre à partir de fleurs de Bigaradier (Oranger amer) fraîches au printemps à Nabeul. Parfum floral envoûtant pour parfumer vos pâtisseries tunisiennes, café turc ou boissons rafraîchissantes.</p>
    `,
    tags: ['eau de fleur d\'oranger', 'zhar', 'nabeul', 'distillation', 'pâtisserie'],
    attributes: [
      { name: 'Volume', value: '500 ml' },
      { name: 'Ingrédients', value: '100% Hydrolat pur de fleurs d\'oranger amer' },
      { name: 'Origine', value: 'Nabeul, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille d\'Eau de Fleur d\'Oranger artisanale',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coffret Infusions & Tisanes Bio du Cap Bon (Verveine, Menthe, Sauge Royale) 120g',
    product_reference: 'MED-FOOD-006',
    marketplace_category_id: 'cat_market_beverages',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 22.0,
    inventory_quantity: 55,
    weight_grams: 250,
    thumbnail: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sélection de plantes médicinales et aromatiques biologiques cultivées sous le soleil du Cap Bon : Feuilles de Verveine odorante entière, Menthe pouliot vivifiante et Sauge officinale royale. Idéal pour des soirées de détente digestive.</p>
    `,
    tags: ['tisane', 'infusion', 'verveine', 'menthe', 'bio', 'cap bon'],
    attributes: [
      { name: 'Poids net', value: '120g (3 sachets de 40g)' },
      { name: 'Plantes', value: 'Verveine, Menthe, Sauge royale' },
      { name: 'Culture', value: '100% Biologique récoltée à la main' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coffret d\'infusions et tisanes bio du Cap Bon',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },

  // ----------------------------------------------------
  // 6. Soins Naturels & Cosmétique Bio (5 items)
  // ----------------------------------------------------
  {
    title: 'Huile Précieuse de Pépins de Figue de Barbarie 100% Pure & Bio 30ml (Sérum Anti-Âge)',
    product_reference: 'MED-BEA-001',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 89.0,
    inventory_quantity: 45,
    weight_grams: 100,
    thumbnail: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Véritable or végétal tunisien, l'<strong>Huile de Pépins de Figue de Barbarie</strong> est l'élixir anti-âge naturel le plus puissant au monde. Il faut près d'une tonne de figues pour extraire 1 litre de cette huile miraculeuse.</p>
      <p>Riche en Vitamine E naturelle (plus de 1000 mg/kg) et en stérols, elle régénère les cellules cutanées, atténue les rides et ridules, estompe les cernes et redonne fermeté et éclat au visage.</p>
    `,
    tags: ['figue de barbarie', 'huile végétale', 'anti-âge', 'sérum bio', 'cosmétique tunisie', 'kasserine'],
    attributes: [
      { name: 'Volume', value: '30 ml (Flacon pipette en verre ambré)' },
      { name: 'Procédé', value: '100% Pure, première pression à froid des pépins' },
      { name: 'Origine', value: 'Zelfen / Kasserine, Tunisie' },
      { name: 'Types de peau', value: 'Toutes peaux, matures, sèches et déshydratées' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Flacon sérum d\'huile de pépins de figue de barbarie bio',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coffret Rituel Hammam Traditionnel (Savon Noir à l\'Eucalyptus 250g + Ghassoul 200g + Gant Kessa)',
    product_reference: 'MED-BEA-002',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 46.0,
    inventory_quantity: 50,
    weight_grams: 600,
    thumbnail: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Recréez l'expérience authentique du <em>Hammam Tunisien</em> à la maison. Ce rituel complet de gommage et détoxification comprend :</p>
      <ul>
        <li>1 Savon noir traditionnel à l'huile d'olive et huile essentielle d'eucalyptus globulus (250g).</li>
        <li>1 Ghassoul naturel aux 7 plantes aromatiques (200g).</li>
        <li>1 Gant de gommage Kessa de qualité supérieure pour une exfoliation douce et efficace.</li>
      </ul>
    `,
    tags: ['hammam', 'savon noir', 'ghassoul', 'gant kessa', 'gommage', 'soin du corps'],
    attributes: [
      { name: 'Contenu du coffret', value: 'Savon noir 250g + Argile Ghassoul 200g + Gant Kessa' },
      { name: 'Propriétés', value: 'Exfoliant, purifiant et adoucissant' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coffret rituel de bain et hammam traditionnel',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Eau Florale de Rose Pure Distillée de l\'Ariana Flacon Verre Spray 200ml',
    product_reference: 'MED-BEA-003',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 26.0,
    inventory_quantity: 60,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Hydrolat de rose de Damas fraîchement distillé dans la région de l'Ariana (la cité des roses). Tonifiant naturel, astringent et apaisant pour le teint. S'utilise matin et soir en lotion tonique ou brumisateur rafraîchissant.</p>
    `,
    tags: ['eau de rose', 'hydrolat', 'soin visage', 'ariana', 'tonique bio'],
    attributes: [
      { name: 'Volume', value: '200 ml' },
      { name: 'Formule', value: '100% pure eau florale sans alcool ni conservateurs' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Flacon spray d\'eau florale de rose de l\'Ariana',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Savon d\'Alep Artisanal 20% Huile de Baies de Laurier & Olive 200g',
    product_reference: 'MED-BEA-004',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 16.5,
    inventory_quantity: 90,
    weight_grams: 220,
    thumbnail: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Saponifié au chaudron selon la tradition ancestrale et affiné pendant 9 mois de séchage. Enrichi à 20% d'huile noble de baies de laurier purifiante et d'huile d'olive adoucissante. Recommandé pour peaux sensibles, acnéiques ou atopiques.</p>
    `,
    tags: ['savon', 'savon d\'alep', 'laurier', 'olive', 'bio', 'peaux sensibles'],
    attributes: [
      { name: 'Poids net', value: '200g' },
      { name: 'Teneur en Laurier', value: '20% Huile de baies de laurier' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pain de savon artisanal à l\'huile de laurier',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Parfum d\'Ambiance et Corps Oriental Oud & Fleur de Jasmin 50ml',
    product_reference: 'MED-BEA-005',
    marketplace_category_id: 'cat_market_perfumes',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 68.0,
    inventory_quantity: 30,
    weight_grams: 180,
    thumbnail: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Fragrance orientale captivante mêlant la noblesse du bois de Oud fumé, la délicatesse solaire du jasmin de Sidi Bou Saïd et des touches chaudes d'ambre et de vanille. Sillage sensuel et raffiné de longue tenue.</p>
    `,
    tags: ['parfum', 'oud', 'jasmin', 'ambre', 'oriental', 'fragrance'],
    attributes: [
      { name: 'Contenance', value: '50 ml' },
      { name: 'Famille olfactive', value: 'Oriental Boisé Floral' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Flacon de parfum oriental Oud et Jasmin',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },

  // ----------------------------------------------------
  // 7. Objets d'Art, Bois d'Olivier & Bijoux Berbères (6 items)
  // ----------------------------------------------------
  {
    title: 'Miroir Soleil Majestueux en Cuivre Ciselé Main Médina de Tunis Ø 55cm',
    product_reference: 'MED-DEC-001',
    marketplace_category_id: 'cat_sub_home_decor',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 195.0,
    inventory_quantity: 10,
    weight_grams: 2100,
    thumbnail: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Création d'artisan dinandier de la Médina de Tunis. Rayons solaires façonnés en cuivre jaune massif et laiton martelé puis patiné à l'ancienne. Cette pièce lumineuse agrandit votre espace et apporte une signature décorative somptueuse.</p>
    `,
    tags: ['miroir soleil', 'cuivre', 'dinanderie', 'médina de tunis', 'déco murale', 'artisanat'],
    attributes: [
      { name: 'Matière', value: 'Cuivre massif ciselé et Laiton poli' },
      { name: 'Diamètre total', value: '55 cm' },
      { name: 'Diamètre miroir central', value: '25 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Miroir soleil en cuivre ciselé main',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Lampe Lanterne Moucharabieh en Cuivre Ajouré & Verre Teinté Hauteur 40cm',
    product_reference: 'MED-DEC-002',
    marketplace_category_id: 'cat_sub_home_decor',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 160.0,
    inventory_quantity: 12,
    weight_grams: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Lanterne orientale artisanale en cuivre repoussé et ajouré à la main créant une projection d'ombres poétiques et chaleureuses sur vos murs. Équipée pour ampoule standard E27 ou pour bougie d'ambiance.</p>
    `,
    tags: ['lanterne', 'lampe moucharabieh', 'cuivre', 'lumière tamisée', 'oriental'],
    attributes: [
      { name: 'Matière', value: 'Cuivre ajouré & Verre teinté ambré' },
      { name: 'Hauteur', value: '40 cm' },
      { name: 'Électrification', value: 'Câble textile et douille E27 inclus' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Lanterne orientale moucharabieh en cuivre',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Ensemble de Planche Apéro & 3 Spatules en Bois d\'Olivier Massif Rustique',
    product_reference: 'MED-OLI-001',
    marketplace_category_id: 'cat_market_kitchen',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 65.0,
    inventory_quantity: 35,
    weight_grams: 1100,
    thumbnail: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sculptée dans un bloc unique de bois d'olivier centenaire non traité issu de vergers durables de Sfax. Le veinage marbré spectaculaire rend chaque planche absolument unique. Antibactérien naturel et très résistant aux coupures.</p>
    `,
    tags: ['bois d\'olivier', 'planche à découper', 'apéro', 'cuisine', 'sfax', 'écologique'],
    attributes: [
      { name: 'Matière', value: 'Bois d\'olivier massif non traité' },
      { name: 'Longueur', value: '40 cm environ (forme libre rustique)' },
      { name: 'Traitement', value: 'Nourri à l\'huile d\'olive vierge' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Planche de présentation en bois d\'olivier massif',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Mortier & Pilon Artisanal Sculpté dans le Bois d\'Olivier Centenaire Ø 14cm',
    product_reference: 'MED-OLI-002',
    marketplace_category_id: 'cat_market_kitchen',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 52.0,
    inventory_quantity: 28,
    weight_grams: 950,
    thumbnail: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Idéal pour écraser l'ail, le carvi, la coriandre et préparer votre propre harissa ou pesto maison. Bois d'olivier ultra-dense qui n'absorbe pas les odeurs ni les liquides.</p>
    `,
    tags: ['mortier et pilon', 'bois d\'olivier', 'épices', 'cuisine tunisienne'],
    attributes: [
      { name: 'Matière', value: 'Bois d\'olivier massif tourné main' },
      { name: 'Diamètre', value: '14 cm' },
      { name: 'Pilon inclus', value: 'Longueur 16 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Mortier et pilon en bois d\'olivier',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Pendentif "Khomsa" Main de Fatma en Argent Massif 925 Ciselé Main & Émail Bleu',
    product_reference: 'MED-JEW-001',
    marketplace_category_id: 'cat_sub_fine_jewelry',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 120.0,
    inventory_quantity: 20,
    weight_grams: 25,
    thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Symbole universel de protection et de bienveillance méditerranéenne, la <strong>Khomsa</strong> est ici minutieusement ciselée en argent massif 925 par les maîtres orfèvres du Souk des Bijoutiers de Tunis. Rehaussée d'une touche d'émail bleu céleste et montée sur chaîne en argent massif 45 cm.</p>
    `,
    tags: ['khomsa', 'main de fatma', 'argent 925', 'bijou tunisien', 'pendentif', 'protection'],
    attributes: [
      { name: 'Métal', value: 'Argent massif 925/1000 (Poinçon officiel)' },
      { name: 'Chaîne', value: 'Chaîne maille forçat en argent 45 cm incluse' },
      { name: 'Hauteur pendentif', value: '3.2 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pendentif Khomsa en argent massif 925',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Bracelet Jonc Berbère Traditionnel en Argent 925 Gravé Motifs Aurès',
    product_reference: 'MED-JEW-002',
    marketplace_category_id: 'cat_sub_fine_jewelry',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 145.0,
    inventory_quantity: 15,
    weight_grams: 45,
    thumbnail: 'https://images.unsplash.com/photo-1611591475837-1e5f88412674?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Bracelet jonc rigide ajustable orné de gravures géométriques berbères ancestrales. Fabriqué à la main selon la technique du filigrane et du repoussé d'argent. Livré dans son écrin de velours.</p>
    `,
    tags: ['bracelet jonc', 'bijou berbère', 'argent massif 925', 'artisanat tunisien'],
    attributes: [
      { name: 'Métal', value: 'Argent massif 925 poinçonné' },
      { name: 'Largeur', value: '1.8 cm' },
      { name: 'Taille', value: 'Ajustable au poignet' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1611591475837-1e5f88412674?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bracelet jonc berbère en argent 925 gravé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
];

async function seedAtelierMedinaCatalog() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // 1. Locate store atelier-medina
    const storeRes = await client.query(
      "SELECT id, name, subdomain FROM pd_store WHERE subdomain = 'atelier-medina' OR id = 'pd_store_6hA7WWUBufUDF5ga'",
    );
    if (!storeRes.rows[0]) {
      throw new Error('Could not find store with subdomain atelier-medina or ID pd_store_6hA7WWUBufUDF5ga');
    }
    const storeId = storeRes.rows[0].id;
    console.log(`Target store confirmed: "${storeRes.rows[0].name}" (ID: ${storeId})`);

    // 2. Archive legacy test/draft products if any
    const testTitles = ['iiiii', 'yyyyyyyyyy', 'gggggggggoo dfgh', 'fdfgdg', 'gfhfgh', 'llllllll', 'ghghhghg'];
    const archiveTest = await client.query(
      "UPDATE pd_product SET status = 'archived' WHERE store_id = $1 AND (title = ANY($2) OR status = 'draft')",
      [storeId, testTitles],
    );
    console.log(`Archived ${archiveTest.rowCount} legacy draft/test products.`);

    // 3. Upsert Storefront Categories for Atelier Médina
    const categoryMap = new Map<string, string>(); // slug -> id
    for (const cat of STOREFRONT_CATEGORIES) {
      const catRes = await client.query(
        `INSERT INTO pd_storefront_category (id, store_id, name, slug, description, is_default, is_active, position)
         VALUES ($1, $2, $3, $4, $5, false, true, $6)
         ON CONFLICT (store_id, slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           position = EXCLUDED.position,
           is_active = true,
           updated_at = NOW()
         RETURNING id, slug`,
        [cat.id, storeId, cat.name, cat.slug, cat.description, cat.position],
      );
      categoryMap.set(cat.slug, catRes.rows[0].id);
    }
    console.log(`Upserted ${STOREFRONT_CATEGORIES.length} storefront categories for Atelier Médina.`);

    // 4. Insert / Update the 36 products
    let insertedCount = 0;
    for (const p of PRODUCTS) {
      const slug = p.slug || slugify(p.title);
      const storefrontCatId = categoryMap.get(p.storefront_category_slug) || null;

      // Look up marketplace category name
      const mcRes = await client.query(
        'SELECT name FROM pd_marketplace_category WHERE id = $1',
        [p.marketplace_category_id],
      );
      const categoryName = mcRes.rows[0]?.name || 'Artisanat Tunisien';

      // Upsert product
      const existingProd = await client.query(
        'SELECT id FROM pd_product WHERE store_id = $1 AND (slug = $2 OR product_reference = $3)',
        [storeId, slug, p.product_reference],
      );

      let productId = existingProd.rows[0]?.id;
      if (productId) {
        await client.query(
          `UPDATE pd_product SET
             title = $1,
             description = $2,
             category = $3,
             marketplace_category_id = $4,
             storefront_category_id = $5,
             price = $6,
             inventory_quantity = $7,
             weight_grams = $8,
             thumbnail = $9,
             product_reference = $10,
             tags = $11,
             attributes = $12,
             status = 'published',
             type = 'physical',
             updated_at = NOW()
           WHERE id = $13`,
          [
            p.title,
            p.description,
            categoryName,
            p.marketplace_category_id,
            storefrontCatId,
            p.price,
            p.inventory_quantity,
            p.weight_grams,
            p.thumbnail,
            p.product_reference,
            JSON.stringify(p.tags),
            JSON.stringify(p.attributes),
            productId,
          ],
        );
      } else {
        productId = pdId('prod');
        await client.query(
          `INSERT INTO pd_product
             (id, store_id, type, status, title, slug, description, category,
              marketplace_category_id, storefront_category_id, price, inventory_quantity,
              weight_grams, thumbnail, product_reference, tags, attributes)
           VALUES ($1, $2, 'physical', 'published', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            productId,
            storeId,
            p.title,
            slug,
            p.description,
            categoryName,
            p.marketplace_category_id,
            storefrontCatId,
            p.price,
            p.inventory_quantity,
            p.weight_grams,
            p.thumbnail,
            p.product_reference,
            JSON.stringify(p.tags),
            JSON.stringify(p.attributes),
          ],
        );
      }

      // Upsert product images
      await client.query('DELETE FROM pd_product_image WHERE product_id = $1', [productId]);
      for (let i = 0; i < p.images.length; i++) {
        const img = p.images[i];
        await client.query(
          `INSERT INTO pd_product_image (id, product_id, url, alt_text, position, is_thumbnail)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pdId('pimg'), productId, img.url, img.alt_text, img.position, img.is_thumbnail],
        );
      }

      // Upsert product variants if any
      await client.query('DELETE FROM pd_product_variant WHERE product_id = $1', [productId]);
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          await client.query(
            `INSERT INTO pd_product_variant (id, product_id, sku, title, price, inventory_quantity, options, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              pdId('var'),
              productId,
              v.sku,
              v.title,
              v.price,
              v.inventory_quantity,
              JSON.stringify(v.options),
            ],
          );
        }
      }

      insertedCount++;
    }

    console.log(`\n Successfully seeded ${insertedCount} published products for Atelier Médina!`);

    // Verify total published count for store
    const verifyRes = await client.query(
      "SELECT COUNT(*) as count FROM pd_product WHERE store_id = $1 AND status = 'published'",
      [storeId],
    );
    console.log(`Total active published products in Atelier Médina: ${verifyRes.rows[0].count}`);

  } catch (err) {
    console.error('Error seeding Atelier Médina catalog:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedAtelierMedinaCatalog()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedAtelierMedinaCatalog };
