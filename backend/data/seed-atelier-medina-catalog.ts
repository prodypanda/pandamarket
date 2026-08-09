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
  // ----------------------------------------------------
  // Batch 2: Expansion Catalog (26 New Products)
  // ----------------------------------------------------
  {
    title: 'Vase Amphore Rustique en Terre Cuite de Guellala (Djerba)',
    product_reference: 'MED-POT-006',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 68.0,
    inventory_quantity: 20,
    weight_grams: 1500,
    thumbnail: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Amphore décorative traditionnelle façonnée dans les célèbres poteries souterraines de <em>Guellala</em> à Djerba. Argile blanche naturelle poreuse et poignées torsadées artisanales.</p>
    `,
    tags: ['amphore', 'guellala', 'djerba', 'terre cuite', 'vase', 'artisanat'],
    attributes: [
      { name: 'Matière', value: 'Argile naturelle de Guellala' },
      { name: 'Hauteur', value: '35 cm' },
      { name: 'Origine', value: 'Guellala, Djerba, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Vase amphore rustique en terre cuite',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coffret de 6 Verres à Thé Tunisien Soufflés Bouche et Peints Main',
    product_reference: 'MED-POT-007',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 48.0,
    inventory_quantity: 35,
    weight_grams: 900,
    thumbnail: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Coffret de 6 verres à thé à la menthe soufflés à la bouche avec dorures et motifs floraux peints à la main. Verre résistant aux boissons chaudes.</p>
    `,
    tags: ['verres à thé', 'thé à la menthe', 'verre soufflé', 'art de la table'],
    attributes: [
      { name: 'Matière', value: 'Verre soufflé artisanal & Dorure' },
      { name: 'Nombre de pièces', value: '6 verres' },
      { name: 'Contenance', value: '160 ml par verre' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coffret de verres à thé peints à la main',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Bougeoir "Menara" Traditionnel en Céramique Émaillée Nabeul',
    product_reference: 'MED-POT-008',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 34.0,
    inventory_quantity: 40,
    weight_grams: 600,
    thumbnail: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Bougeoir traditionnel à anse <em>Menara</em> émaillé aux couleurs vives de la Méditerranée. Idéal pour créer une ambiance tamisée chaleureuse sur une terrasse ou un buffet.</p>
    `,
    tags: ['bougeoir', 'menara', 'nabeul', 'céramique', 'lumière'],
    attributes: [
      { name: 'Matière', value: 'Céramique émaillée' },
      { name: 'Dimensions', value: '18 cm x 12 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bougeoir traditionnel en céramique',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Service Huilier & Vinaigrier Artisanal en Céramique Peinte Main',
    product_reference: 'MED-POT-009',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 55.0,
    inventory_quantity: 25,
    weight_grams: 950,
    thumbnail: 'https://images.unsplash.com/photo-1584990347449-389f4171804f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Duo de bouteilles de table avec becs verseurs métalliques anti-goutte et bouchons en liège. Décorées de branches d'olivier stylisées peintes à la main.</p>
    `,
    tags: ['huilier', 'vinaigrier', 'service de table', 'nabeul', 'céramique'],
    attributes: [
      { name: 'Matière', value: 'Céramique & Bec verseur inox' },
      { name: 'Contenance', value: '2 x 350 ml' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584990347449-389f4171804f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Duo huilier et vinaigrier artisanal',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Tapis Berbère Boucherouite Coloré Recyclé Tissé Main 100x160cm',
    product_reference: 'MED-TEX-005',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 190.0,
    inventory_quantity: 8,
    weight_grams: 2600,
    thumbnail: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Tapis <em>Boucherouite</em> écologiquement responsable tissé à la main par les femmes artisanes à partir de chutes de tissus nobles recyclés (coton, laine et velours). Motifs abstraits éclatants.</p>
    `,
    tags: ['tapis boucherouite', 'tapis recyclé', 'fait main', 'berbère', 'bohème'],
    attributes: [
      { name: 'Matière', value: 'Textiles recyclés & Coton' },
      { name: 'Dimensions', value: '100 cm x 160 cm' },
      { name: 'Style', value: 'Bohème Chic / Abstrait' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tapis berbère boucherouite coloré',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Lot de 2 Housses de Coussin Berbères en Laine & Broderies Sabra 45x45cm',
    product_reference: 'MED-TEX-006',
    marketplace_category_id: 'cat_sub_textiles_bedding',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 62.0,
    inventory_quantity: 30,
    weight_grams: 500,
    thumbnail: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Housses de coussins tissées en laine et brodées avec de la soie végétale de cactus (<em>Sabra</em>). Fermeture éclair invisible au dos.</p>
    `,
    tags: ['housses de coussin', 'coussins berbères', 'sabra', 'déco salon'],
    attributes: [
      { name: 'Dimensions', value: '45 cm x 45 cm' },
      { name: 'Matière', value: 'Laine & Soie végétale Sabra' },
      { name: 'Lot', value: '2 housses' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Lot de 2 housses de coussin berbères',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Fouta XXL Familiale 200x200cm Tissage Jacquard Motif Palmettes',
    product_reference: 'MED-TEX-007',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 58.0,
    inventory_quantity: 40,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Fouta géante carrée de 2m x 2m idéale pour les pique-niques en famille ou les journées à la plage. Tissage jacquard raffiné 100% coton.</p>
    `,
    tags: ['fouta xxl', 'fouta géante', 'plage', 'jacquard', 'coton'],
    attributes: [
      { name: 'Dimensions', value: '200 cm x 200 cm' },
      { name: 'Matière', value: '100% Coton peigné' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Fouta géante XXL familiale',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Serviettes d\'Invités en Pur Lin Tunisien Brodées Main (Lot de 4)',
    product_reference: 'MED-TEX-008',
    marketplace_category_id: 'cat_sub_textiles_bedding',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 38.0,
    inventory_quantity: 45,
    weight_grams: 300,
    thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Ensemble de 4 serviettes d'invités en pur lin lavé avec bordure ajourée à l'ancienne (<em>Chbika</em>). Douces, absorbantes et très élégantes.</p>
    `,
    tags: ['serviettes d\'invités', 'lin', 'chbika', 'linge de maison'],
    attributes: [
      { name: 'Matière', value: '100% Pur Lin lavé' },
      { name: 'Dimensions', value: '30 cm x 50 cm par pièce' },
      { name: 'Contenu', value: 'Lot de 4 serviettes' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Lot de serviettes d\'invités en lin brodé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Ceinture Homme en Cuir Pleine Fleur Tannage Végétal Boucle Laiton Massif',
    product_reference: 'MED-LEA-005',
    marketplace_category_id: 'cat_sub_men_acc',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 55.0,
    inventory_quantity: 50,
    weight_grams: 200,
    thumbnail: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Ceinture indémodable découpée dans une bande de cuir sellier pleine fleur de 3.5 cm de largeur. Boucle en laiton massif nickelé ou vieilli.</p>
    `,
    tags: ['ceinture cuir', 'cuir pleine fleur', 'homme', 'laiton massif', 'kairouan'],
    attributes: [
      { name: 'Matière', value: 'Cuir de collet pleine fleur 3.8 mm d\'épaisseur' },
      { name: 'Largeur', value: '3.5 cm' },
      { name: 'Boucle', value: 'Laiton massif garanti anti-allergique' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Ceinture en cuir pleine fleur avec boucle en laiton',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-LEA-005-95',
        title: 'Longueur 95 cm - Marron Marbré',
        price: 55.0,
        inventory_quantity: 15,
        options: { size: '95 cm', color: 'Marron Marbré' },
      },
      {
        sku: 'MED-LEA-005-105',
        title: 'Longueur 105 cm - Marron Marbré',
        price: 55.0,
        inventory_quantity: 20,
        options: { size: '105 cm', color: 'Marron Marbré' },
      },
      {
        sku: 'MED-LEA-005-115',
        title: 'Longueur 115 cm - Noir Ébène',
        price: 55.0,
        inventory_quantity: 15,
        options: { size: '115 cm', color: 'Noir Ébène' },
      },
    ],
  },
  {
    title: 'Trousse de Toilette / Vanity en Cuir Gras et Toile Kairouan',
    product_reference: 'MED-LEA-006',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 72.0,
    inventory_quantity: 30,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Trousse de toilette spacieuse et élégante, intérieur imperméabilisé lavable et poignée latérale en cuir pour un transport aisé.</p>
    `,
    tags: ['trousse de toilette', 'vanity', 'cuir gras', 'voyage', 'kairouan'],
    attributes: [
      { name: 'Matière', value: 'Cuir gras de vachette & Doublure étanche' },
      { name: 'Dimensions', value: '25 cm x 14 cm x 12 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Trousse de toilette en cuir gras',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sac Banane en Cuir Vintage Camel Fait-Main',
    product_reference: 'MED-LEA-007',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 95.0,
    inventory_quantity: 25,
    weight_grams: 300,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>L'accessoire tendance et pratique par excellence. Porté en bandoulière sur la poitrine ou à la taille. Deux poches zippées YKK sécurisées.</p>
    `,
    tags: ['sac banane', 'cuir camel', 'vintage', 'crossbody', 'mode'],
    attributes: [
      { name: 'Matière', value: 'Cuir souple pleine fleur tannage végétal' },
      { name: 'Sangle', value: 'Cuir et toile ajustable de 80 à 120 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sac banane en cuir vintage camel',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sacoche Porte-Documents / Ordinateur Portable 15" en Cuir de Vachette',
    product_reference: 'MED-LEA-008',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 260.0,
    inventory_quantity: 12,
    weight_grams: 1300,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sacoche professionnelle haut de gamme compartimentée pour ordinateur 15.6", documents A4, tablette et stylos. Bandoulière en cuir amovible.</p>
    `,
    tags: ['sacoche ordinateur', 'porte-documents', 'cuir professionnel', 'homme'],
    attributes: [
      { name: 'Matière', value: 'Cuir de vachette pleine fleur' },
      { name: 'Compatibilité', value: 'Ordinateur portable jusqu\'à 15.6 pouces' },
      { name: 'Dimensions', value: '40 cm x 29 cm x 8 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sacoche d\'ordinateur en cuir de vachette',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sandales Nu-Pieds en Cuir Naturel Tressé Main Femme',
    product_reference: 'MED-SHOE-003',
    marketplace_category_id: 'cat_market_women_shoes',
    storefront_category_slug: 'chaussures-babouches-artisanales',
    price: 68.0,
    inventory_quantity: 28,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sandales d'été légères et confortables avec lanières en cuir tressé artisanalement. Semelle en cuir et semelle d'usure en caoutchouc souple.</p>
    `,
    tags: ['sandales', 'nu-pieds', 'cuir tressé', 'femme', 'mode été'],
    attributes: [
      { name: 'Matière', value: '100% Cuir naturel tressé' },
      { name: 'Fermeture', value: 'Boucle cheville réglable' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sandales en cuir tressé pour femme',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-SHOE-003-38',
        title: 'Taille 38 - Cuir Naturel',
        price: 68.0,
        inventory_quantity: 10,
        options: { size: '38' },
      },
      {
        sku: 'MED-SHOE-003-39',
        title: 'Taille 39 - Cuir Naturel',
        price: 68.0,
        inventory_quantity: 10,
        options: { size: '39' },
      },
      {
        sku: 'MED-SHOE-003-40',
        title: 'Taille 40 - Cuir Naturel',
        price: 68.0,
        inventory_quantity: 8,
        options: { size: '40' },
      },
    ],
  },
  {
    title: 'Jebba Tunisienne d\'Été en Lin & Coton Brodé "Djerbi" Homme',
    product_reference: 'MED-CLO-005',
    marketplace_category_id: 'cat_market_men_tops',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 180.0,
    inventory_quantity: 15,
    weight_grams: 600,
    thumbnail: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Jebba d'été ultra-légère et respirante en mélange lin et coton. Broderies sobres inspirées du tissage traditionnel de l'île de Djerba.</p>
    `,
    tags: ['jebba d\'été', 'lin', 'djerbi', 'homme', 'traditionnel'],
    attributes: [
      { name: 'Tissu', value: '55% Lin, 45% Coton peigné' },
      { name: 'Origine', value: 'Djerba / Tunis' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Jebba d\'été en lin et coton',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-005-M',
        title: 'Taille M - Blanc Écru',
        price: 180.0,
        inventory_quantity: 5,
        options: { size: 'M' },
      },
      {
        sku: 'MED-CLO-005-L',
        title: 'Taille L - Blanc Écru',
        price: 180.0,
        inventory_quantity: 6,
        options: { size: 'L' },
      },
      {
        sku: 'MED-CLO-005-XL',
        title: 'Taille XL - Blanc Écru',
        price: 180.0,
        inventory_quantity: 4,
        options: { size: 'XL' },
      },
    ],
  },
  {
    title: 'Burnous Traditionnel Tunisien en Pure Laine Douce Blanche avec Capuche',
    product_reference: 'MED-CLO-006',
    marketplace_category_id: 'cat_sub_men_outerwear',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 390.0,
    inventory_quantity: 8,
    weight_grams: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Manteau traditionnel en drap de laine vierge blanche pure tissé à la main. Capuche pointue brodée au fil de soie avec pompon traditionnel. Vêtement noble porté lors des grandes célébrations et mariages.</p>
    `,
    tags: ['burnous', 'laine vierge', 'manteau traditionnel', 'mariage tunisien', 'prestige'],
    attributes: [
      { name: 'Matière', value: '100% Pure Laine Vierge foulée' },
      { name: 'Finitions', value: 'Bordures tressées au fil de soie Harir' },
      { name: 'Taille', value: 'Taille unique ajustable' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Burnous traditionnel tunisien en laine blanche',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Écharpe Châle en Soie & Laine Tissée Main Médina',
    product_reference: 'MED-CLO-007',
    marketplace_category_id: 'cat_sub_fashion_acc',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 75.0,
    inventory_quantity: 30,
    weight_grams: 150,
    thumbnail: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Étole fluide et douce tissée à la main sur métier artisanal. Motifs subtils en dégradé de couleurs naturelles.</p>
    `,
    tags: ['écharpe', 'châle', 'soie et laine', 'accessoire mode', 'médina'],
    attributes: [
      { name: 'Dimensions', value: '70 cm x 200 cm' },
      { name: 'Composition', value: '50% Soie naturelle, 50% Laine mérinos' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Écharpe châle en soie et laine',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Assortiment Prestige de Pâtisseries Tunisiennes Artisanales (Baklawa, Kaak Warka, Mlabes) 500g',
    product_reference: 'MED-FOOD-007',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 48.0,
    inventory_quantity: 50,
    weight_grams: 650,
    thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Coffret dégustation de pâtisseries tunisiennes fines confectionnées au beurre pur et amandes douces : Baklawa aux noisettes et amandes, Kaak Warka parfumé à l'eau d'églantier (<em>Nesri</em> de Zaghouan), et Mlabes de Sfax glacé au sucre fin.</p>
    `,
    tags: ['pâtisserie tunisienne', 'baklawa', 'kaak warka', 'mlabes', 'amandes', 'sfax'],
    attributes: [
      { name: 'Poids net', value: '500g (Environ 24 pièces)' },
      { name: 'Ingrédients', value: 'Amandes, Noisettes, Miel pur, Eau d\'églantier, Beurre clarifié' },
      { name: 'Conservation', value: 'À conserver dans un endroit sec à l\'abri de la chaleur' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Assortiment de pâtisseries tunisiennes fines',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Confiture Artisanale de Figues de Djebba AOP & Éclats de Noix 350g',
    product_reference: 'MED-FOOD-008',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 14.5,
    inventory_quantity: 60,
    weight_grams: 550,
    thumbnail: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Préparée avec les figues violettes de <em>Djebba</em> bénéficiant de l'Appellation d'Origine Protégée (AOP). Cuite au chaudron de cuivre avec des éclats de noix croquantes et une touche de citron frais.</p>
    `,
    tags: ['confiture', 'figues de djebba', 'aop', 'terroir tunisien', 'bio'],
    attributes: [
      { name: 'Poids net', value: '350g' },
      { name: 'Teneur en fruits', value: '65g de fruits pour 100g' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pot de confiture artisanale de figues de Djebba',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Bsissa Traditionnelle Complète aux Céréales & Noisettes Torréfiées 500g',
    product_reference: 'MED-FOOD-009',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 16.0,
    inventory_quantity: 70,
    weight_grams: 550,
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Mélange énergétique ancestral tunisien de blé dur torréfié, pois chiches, graines de sésame, noisettes grillées, anis et coriandre moulus. Se déguste mélangé avec de l'huile d'olive et du miel ou dilué en boisson fortifiante.</p>
    `,
    tags: ['bsissa', 'céréales', 'petit déjeuner sain', 'terroir tunisie', 'énergie'],
    attributes: [
      { name: 'Poids net', value: '500g' },
      { name: 'Ingrédients', value: 'Blé dur, Pois chiches, Noisettes, Sésame, Anis vert, Coriandre' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sachet de Bsissa traditionnelle aux noisettes',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sirop Artisanal d\'Orgeat & Amandes Douces Médina 500ml',
    product_reference: 'MED-FOOD-010',
    marketplace_category_id: 'cat_market_beverages',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 19.5,
    inventory_quantity: 45,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Véritable sirop d'orgeat traditionnel préparé par macération et émulsion d'amandes douces et amères blanchies avec de l'eau de fleur d'oranger.</p>
    `,
    tags: ['sirop orgeat', 'rozata', 'amandes', 'boisson traditionnelle', 'médina'],
    attributes: [
      { name: 'Volume', value: '500 ml' },
      { name: 'Ingrédients', value: 'Extrait pur d\'amandes, Sucre de canne, Eau de fleur d\'oranger' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille de sirop artisanal d\'orgeat',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Eau Florale de Géranium Bourbon (Atrchia) Distillée à Zaghouan 500ml',
    product_reference: 'MED-FOOD-011',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 18.5,
    inventory_quantity: 50,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>L'<em>Atrchia</em> est l'hydrolat emblématique tunisien obtenu par distillation des feuilles fraîches de Pelargonium odoratissimum sur les flancs du Djebel Zaghouan. Indispensable pour sublimer le thé, le café blanc et la crème pâtissière tunisienne.</p>
    `,
    tags: ['atrchia', 'géranium', 'zaghouan', 'hydrolat', 'parfum pâtisserie'],
    attributes: [
      { name: 'Volume', value: '500 ml' },
      { name: 'Origine', value: 'Zaghouan, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille d\'Atrchia eau de géranium de Zaghouan',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Crème Visage Régénérante à l\'Huile de Figue de Barbarie & Beurre de Karité 50ml',
    product_reference: 'MED-BEA-006',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 54.0,
    inventory_quantity: 40,
    weight_grams: 120,
    thumbnail: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Crème onctueuse riche en antioxydants naturels, formulée à base d'huile pure de pépins de figue de barbarie bio et de beurre de karité brut. Hydrate en profondeur, raffermit les traits et protège contre les agressions extérieures.</p>
    `,
    tags: ['crème visage', 'figue de barbarie', 'karité', 'soin bio', 'anti-rides'],
    attributes: [
      { name: 'Volume', value: '50 ml (Pot en verre dépoli)' },
      { name: 'Texture', value: 'Crème soyeuse pénétration rapide' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pot de crème visage à l\'huile de figue de barbarie',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Huile de Massage Relaxante à la Fleur d\'Oranger & Amande Douce 100ml',
    product_reference: 'MED-BEA-007',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 32.0,
    inventory_quantity: 50,
    weight_grams: 200,
    thumbnail: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Huile soyeuse pour le corps associant les propriétés adoucissantes de l'huile d'amande douce vierge aux effluves apaisants de l'huile essentielle de néroli (fleur d'oranger). Dénoue les tensions et laisse la peau satinée.</p>
    `,
    tags: ['huile de massage', 'néroli', 'amande douce', 'relaxant', 'spa'],
    attributes: [
      { name: 'Contenance', value: '100 ml' },
      { name: 'Formule', value: '100% Ingrédients d\'origine naturelle' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Flacon d\'huile de massage relaxante',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Shampoing Solide Artisanal au Ghassoul & Huile de Nigelle Bio 100g',
    product_reference: 'MED-BEA-008',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 14.0,
    inventory_quantity: 80,
    weight_grams: 110,
    thumbnail: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Shampoing écologique zéro déchet formulé avec l'argile purifiante Ghassoul et l'huile fortifiante de nigelle (habba sawda). Assainit le cuir chevelu et apporte volume et brillance aux cheveux.</p>
    `,
    tags: ['shampoing solide', 'ghassoul', 'nigelle', 'zéro déchet', 'bio'],
    attributes: [
      { name: 'Poids net', value: '100g (Équivaut à 2 bouteilles de shampoing liquide)' },
      { name: 'Types de cheveux', value: 'Tous types de cheveux, en particulier normaux à gras' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pain de shampoing solide artisanal au ghassoul',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Porte-Encens & Bakhour Traditionnel "Mabkhara" en Cuivre Martelé et Émail',
    product_reference: 'MED-DEC-003',
    marketplace_category_id: 'cat_sub_home_decor',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 48.0,
    inventory_quantity: 35,
    weight_grams: 650,
    thumbnail: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Brûleur d'encens et de bakhour traditionnel <em>Mabkhara</em> en laiton et cuivre orné d'émaux colorés. Couvercle ajouré permettant une diffusion harmonieuse et sécurisée des volutes parfumées.</p>
    `,
    tags: ['mabkhara', 'porte-encens', 'bakhour', 'cuivre', 'oriental', 'ambiance'],
    attributes: [
      { name: 'Matière', value: 'Cuivre martelé et Laiton émaillé' },
      { name: 'Hauteur', value: '22 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Porte-encens Mabkhara traditionnel en cuivre',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Bague Touareg / Berbère en Argent 925 avec Pierre d\'Onyx Noir Ciselée Main',
    product_reference: 'MED-JEW-003',
    marketplace_category_id: 'cat_sub_fine_jewelry',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 85.0,
    inventory_quantity: 25,
    weight_grams: 15,
    thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Chevalière artisanale berbère en argent massif 925 gravée de symboles géométriques traditionnels et sertie d'une pierre naturelle d'Onyx noir polie.</p>
    `,
    tags: ['bague berbère', 'touareg', 'argent 925', 'onyx noir', 'chevalière'],
    attributes: [
      { name: 'Matière', value: 'Argent massif 925/1000 poinçonné' },
      { name: 'Pierre', value: 'Onyx noir naturel' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bague berbère en argent 925 et onyx noir',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-JEW-003-54',
        title: 'Taille 54 (Ø 17.2 mm)',
        price: 85.0,
        inventory_quantity: 8,
        options: { size: '54' },
      },
      {
        sku: 'MED-JEW-003-56',
        title: 'Taille 56 (Ø 17.8 mm)',
        price: 85.0,
        inventory_quantity: 9,
        options: { size: '56' },
      },
      {
        sku: 'MED-JEW-003-58',
        title: 'Taille 58 (Ø 18.5 mm)',
        price: 85.0,
        inventory_quantity: 8,
        options: { size: '58' },
      },
    ],
  },
  // ----------------------------------------------------
  // Batch 3: Flagship Expansion (32 New Products - Total 100)
  // ----------------------------------------------------
  {
    title: 'Service à Tajine Individuel avec Coupelle & Couvercle Pointu Émaillé Nabeul (Set de 4)',
    product_reference: 'MED-POT-010',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 76.0,
    inventory_quantity: 25,
    weight_grams: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Ensemble de 4 mini-tajines individuels de présentation en céramique de Nabeul peints à la main. Idéals pour servir entrées chaudes, mézés, fruits secs ou sauces d'accompagnement sur votre table de fête.</p>
    `,
    tags: ['mini tajines', 'tajines individuels', 'céramique nabeul', 'art de la table', 'service apéro'],
    attributes: [
      { name: 'Matière', value: 'Terre cuite émaillée' },
      { name: 'Contenu', value: '4 coupelles + 4 couvercles pointus' },
      { name: 'Diamètre', value: '12 cm par unité' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Service de mini tajines individuels en céramique',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Pichet Carafe d\'Eau Artisanale en Grès Émaillé Traditionnel Nabeul 1.5L',
    product_reference: 'MED-POT-011',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 42.0,
    inventory_quantity: 30,
    weight_grams: 1100,
    thumbnail: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pichet à eau artisanal au col resserré gardant l'eau fraîche naturellement grâce aux propriétés thermiques de la terre cuite et du grès émaillé. Anse généreuse et bec verseur anti-goutte.</p>
    `,
    tags: ['pichet', 'carafe', 'grès émaillé', 'nabeul', 'eau fraîche'],
    attributes: [
      { name: 'Contenance', value: '1.5 Litre' },
      { name: 'Hauteur', value: '26 cm' },
      { name: 'Matière', value: 'Grès émaillé sans plomb' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pichet à eau artisanal en grès émaillé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Plat Ovale à Poisson Décoré Motifs Marins Méditerranée 45cm',
    product_reference: 'MED-POT-012',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 88.0,
    inventory_quantity: 15,
    weight_grams: 1600,
    thumbnail: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Grand plat de service ovale en céramique fine orné de poissons méditerranéens stylisés peints à la main dans des tons bleu indigo, turquoise et ocre. Idéal pour présenter vos poissons grillés et fruits de mer.</p>
    `,
    tags: ['plat ovale', 'plat poisson', 'céramique méditerranéenne', 'nabeul'],
    attributes: [
      { name: 'Dimensions', value: '45 cm x 28 cm' },
      { name: 'Matière', value: 'Céramique émaillée' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Plat ovale à poisson en céramique',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coquetiers Artisanaux Peints à la Main avec Sellette Assortie (Lot de 4)',
    product_reference: 'MED-POT-013',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 26.0,
    inventory_quantity: 40,
    weight_grams: 450,
    thumbnail: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Lot de 4 coquetiers en céramique peinte accompagnés d'un petit ramequin à sel de mer. Apporte une touche colorée et ensoleillée à votre table de petit déjeuner.</p>
    `,
    tags: ['coquetiers', 'petit déjeuner', 'céramique nabeul', 'fait main'],
    attributes: [
      { name: 'Contenu', value: '4 coquetiers + 1 mini coupelle à sel' },
      { name: 'Matière', value: 'Céramique émaillée' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coquetiers en céramique artisanale peinte',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Saladier Géant en Céramique Décorée Arabesques Jaune Safran & Bleu Ø 35cm',
    product_reference: 'MED-POT-014',
    marketplace_category_id: 'cat_market_pottery',
    storefront_category_slug: 'poterie-ceramique-artisanale',
    price: 78.0,
    inventory_quantity: 20,
    weight_grams: 1700,
    thumbnail: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Saladier généreux pour vos salades tunisiennes méchouia, omek houria ou salades fraîches d'été. Motifs arabesques safran et bleu cobalt peints au pinceau fin.</p>
    `,
    tags: ['saladier', 'salade méchouia', 'céramique', 'artisanat tunisien'],
    attributes: [
      { name: 'Diamètre', value: '35 cm' },
      { name: 'Profondeur', value: '11 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Saladier en céramique décorée main',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Tapis Berbère Beni Ouarain Moelleux en Laine Vierge Naturelle 140x200cm',
    product_reference: 'MED-TEX-009',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 340.0,
    inventory_quantity: 6,
    weight_grams: 4500,
    thumbnail: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Tapis berbère épais à poils longs en pure laine vierge écrue non teintée. Toucher d'une douceur exceptionnelle et motifs losanges noirs minimalistes.</p>
    `,
    tags: ['tapis beni ouarain', 'laine vierge', 'tapis moelleux', 'berbère', 'déco scandinave'],
    attributes: [
      { name: 'Matière', value: '100% Pure Laine Vierge épaisse' },
      { name: 'Dimensions', value: '140 cm x 200 cm' },
      { name: 'Épaisseur', value: '25 mm de velours doux' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tapis berbère Beni Ouarain en laine naturelle',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Chemin de Table Tissé Main aux Motifs Traditionnels en Lin et Coton 45x160cm',
    product_reference: 'MED-TEX-010',
    marketplace_category_id: 'cat_sub_textiles_bedding',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 35.0,
    inventory_quantity: 35,
    weight_grams: 280,
    thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Chemin de table élégant tissé sur métier manuel associant fil de lin naturel et coton peigné avec pompons soyeux aux extrémités.</p>
    `,
    tags: ['chemin de table', 'lin', 'tissage main', 'linge de table'],
    attributes: [
      { name: 'Dimensions', value: '45 cm x 160 cm' },
      { name: 'Composition', value: '60% Lin, 40% Coton' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Chemin de table en lin et coton tissé main',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Fouta Doublée Éponge Velours Ultra Absorbante pour Spa & Bain 100x180cm',
    product_reference: 'MED-TEX-011',
    marketplace_category_id: 'cat_market_textiles',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 39.0,
    inventory_quantity: 50,
    weight_grams: 550,
    thumbnail: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Le meilleur des deux mondes : une face en tissage traditionnel plat nid d'abeille et une face doublée en éponge bouclette douce et ultra-absorbante.</p>
    `,
    tags: ['fouta doublée éponge', 'drap de bain', 'spa', 'hammam', 'coton'],
    attributes: [
      { name: 'Matière', value: '100% Coton peigné (Doublure éponge bouclette 420g/m²)' },
      { name: 'Dimensions', value: '100 cm x 180 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Fouta doublée éponge pour spa et bain',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-TEX-011-BLU',
        title: 'Bleu Ciel & Éponge Blanche',
        price: 39.0,
        inventory_quantity: 25,
        options: { color: 'Bleu Ciel' },
      },
      {
        sku: 'MED-TEX-011-ROS',
        title: 'Rose Poudré & Éponge Blanche',
        price: 39.0,
        inventory_quantity: 25,
        options: { color: 'Rose Poudré' },
      },
    ],
  },
  {
    title: 'Peignoir Kimono en Coton Peigné Tissé Façon Fouta Tunisienne',
    product_reference: 'MED-TEX-012',
    marketplace_category_id: 'cat_sub_women_tops',
    storefront_category_slug: 'linge-foutas-traditionnelles',
    price: 85.0,
    inventory_quantity: 25,
    weight_grams: 600,
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Peignoir coupe kimono léger et élégant confectionné en tissu de fouta tunisienne 100% coton. Ceinture à nouer et poches plaquées.</p>
    `,
    tags: ['peignoir kimono', 'fouta', 'bain', 'homewear', 'coton'],
    attributes: [
      { name: 'Matière', value: '100% Coton peigné tissé' },
      { name: 'Coupe', value: 'Kimono unisexe avec ceinture' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Peignoir kimono en coton façon fouta',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-TEX-012-SM',
        title: 'Taille S/M - Bleu Méditerranée',
        price: 85.0,
        inventory_quantity: 12,
        options: { size: 'S/M' },
      },
      {
        sku: 'MED-TEX-012-LXL',
        title: 'Taille L/XL - Bleu Méditerranée',
        price: 85.0,
        inventory_quantity: 13,
        options: { size: 'L/XL' },
      },
    ],
  },
  {
    title: 'Panier Couffin Artisanal en Jonc Naturel Tressé avec Anses en Cuir Kairouan',
    product_reference: 'MED-TEX-013',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'tapis-tissages-berberes',
    price: 45.0,
    inventory_quantity: 40,
    weight_grams: 500,
    thumbnail: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>L'authentique couffin tunisien (<em>Gouffa</em>) tressé à la main en fibres végétales de palmier et jonc. Anses en cuir véritable rivetées pour une excellente solidité au marché ou à la plage.</p>
    `,
    tags: ['couffin', 'gouffa', 'panier tressé', 'jonc naturel', 'plage', 'marché'],
    attributes: [
      { name: 'Matière', value: 'Fibres de palmier & Cuir véritable de Kairouan' },
      { name: 'Dimensions', value: '45 cm x 30 cm x 25 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Couffin en jonc naturel tressé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Grand Sac Polochon Sport & Voyage en Cuir et Toile Canvas Kairouan 40L',
    product_reference: 'MED-LEA-009',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 210.0,
    inventory_quantity: 15,
    weight_grams: 1400,
    thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sac cylindrique polochon idéal pour la salle de sport ou les escapades week-end. Corps en toile canvas de coton épais imperméabilisé et empiècements en cuir de buffle pleine fleur.</p>
    `,
    tags: ['sac polochon', 'sac sport cuir', 'canvas et cuir', 'voyage', 'kairouan'],
    attributes: [
      { name: 'Matière', value: 'Toile Canvas 16oz & Cuir de buffle gras' },
      { name: 'Volume', value: '40 Litres' },
      { name: 'Dimensions', value: '50 cm x 28 cm x 28 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sac polochon en toile et cuir',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Porte-Chéquiers & Portefeuille Longue Femme en Cuir Gravé Floral',
    product_reference: 'MED-LEA-010',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 68.0,
    inventory_quantity: 30,
    weight_grams: 220,
    thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Compagnon portefeuille tout-en-un pour femme en cuir véritable embossé main de motifs floraux andalous. Nombreux fentes pour cartes, monnaie zippée et porte-chéquier.</p>
    `,
    tags: ['compagnon', 'portefeuille femme', 'porte-chéquier', 'cuir gravé'],
    attributes: [
      { name: 'Matière', value: 'Cuir de vachette souple' },
      { name: 'Dimensions', value: '20 cm x 11 cm x 2.5 cm' },
      { name: 'Capacité', value: '12 cartes, monnaie, billets et chéquier' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Portefeuille tout-en-un pour femme en cuir',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Étui à Passeport & Papiers de Voyage en Cuir Pleine Fleur avec Khomsa Embossée',
    product_reference: 'MED-LEA-011',
    marketplace_category_id: 'cat_sub_men_acc',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 32.0,
    inventory_quantity: 60,
    weight_grams: 90,
    thumbnail: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Protège-passeport de luxe en cuir tannage végétal orné d'une Khomsa embossée à chaud. Emplacements pour billets d'avion et cartes d'embarquement.</p>
    `,
    tags: ['protège passeport', 'étui voyage', 'cuir', 'khomsa', 'cadeau'],
    attributes: [
      { name: 'Matière', value: 'Cuir pleine fleur tannage végétal' },
      { name: 'Dimensions', value: '14 cm x 10 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Étui à passeport en cuir pleine fleur',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Pochette Soirée Minimaliste en Cuir Doré Miroir avec Chaînette Amovible',
    product_reference: 'MED-LEA-012',
    marketplace_category_id: 'cat_sub_bags_luggage',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 92.0,
    inventory_quantity: 20,
    weight_grams: 250,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pochette de cérémonie scintillante en cuir véritable métallisé doré. Porté main élégant ou bandoulière fine en mailles gourmettes dorées.</p>
    `,
    tags: ['pochette soirée', 'sac doré', 'cérémonie', 'mariage', 'cuir métallisé'],
    attributes: [
      { name: 'Matière', value: 'Cuir de chèvre métallisé or' },
      { name: 'Chaînette', value: 'Métal doré inoxydable 110 cm amovible' },
      { name: 'Dimensions', value: '22 cm x 14 cm x 4 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pochette de soirée en cuir doré',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sous-Mains de Bureau & Tapis de Souris en Cuir Sellier Kairouan',
    product_reference: 'MED-LEA-013',
    marketplace_category_id: 'cat_sub_home_decor',
    storefront_category_slug: 'maroquinerie-cuir-pleine-fleur',
    price: 75.0,
    inventory_quantity: 25,
    weight_grams: 600,
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Duo sous-main et tapis de souris ergonomique en cuir sellier épais brun havane avec coutures sellier beiges. Apporte élégance et confort à votre espace de travail.</p>
    `,
    tags: ['sous-main', 'tapis de souris cuir', 'bureau', 'cuir sellier', 'luxe'],
    attributes: [
      { name: 'Matière', value: 'Cuir sellier pleine fleur 2.5 mm d\'épaisseur' },
      { name: 'Dimensions sous-main', value: '60 cm x 40 cm' },
      { name: 'Dimensions tapis souris', value: '22 cm x 18 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sous-main de bureau en cuir sellier',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Collier "Skhab" Traditionnel Tunisien aux Perles Ambrées Parfumées & Pendentif Orfèvre',
    product_reference: 'MED-JEW-004',
    marketplace_category_id: 'cat_sub_fine_jewelry',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 175.0,
    inventory_quantity: 15,
    weight_grams: 60,
    thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Joyau du patrimoine tunisien, le <strong>Collier Skhab</strong> est composé de perles façonnées artisanalement à base de pâte ambrée aux clous de girofle, musc et eau de rose qui dégagent une fragrance subtile et captivante au contact de la chaleur de la peau.</p>
    `,
    tags: ['skhab', 'collier traditionnel', 'ambre parfumé', 'bijou tunisien', 'mariage'],
    attributes: [
      { name: 'Matière', value: 'Pâte de Skhab parfumée & Argent massif ciselé' },
      { name: 'Longueur', value: '55 cm ajustable' },
      { name: 'Parfum', value: 'Ambre, Musc et Clou de girofle naturel' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Collier Skhab traditionnel tunisien',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Boucles d\'Oreilles Andalouses Ciselées en Argent 925 "Khlal" Berbère',
    product_reference: 'MED-JEW-005',
    marketplace_category_id: 'cat_sub_fine_jewelry',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 68.0,
    inventory_quantity: 30,
    weight_grams: 18,
    thumbnail: 'https://images.unsplash.com/photo-1611591475837-1e5f88412674?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pendants d'oreilles filigranés en argent 925 reprenant la forme triangulaire sacrée de la fibule berbère (<em>Khlal</em>). Finition polie brillante avec fermoirs crochets sécurisés.</p>
    `,
    tags: ['boucles d\'oreilles', 'argent 925', 'fibule berbère', 'khlal', 'filigrane'],
    attributes: [
      { name: 'Métal', value: 'Argent massif 925/1000' },
      { name: 'Hauteur', value: '4.5 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1611591475837-1e5f88412674?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Boucles d\'oreilles en argent 925 ciselé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Gilet Traditionnel "Farmla" Femme en Velours Brodé Fil d\'Or',
    product_reference: 'MED-CLO-008',
    marketplace_category_id: 'cat_sub_women_tops',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 145.0,
    inventory_quantity: 20,
    weight_grams: 400,
    thumbnail: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>La <strong>Farmla</strong> est le gilet sans manches emblématique de la garde-robe tunisienne. Réalisé en velours de soie doux et rehaussé de somptueuses broderies dorées au fil métallique sur le devant et l'encolure.</p>
    `,
    tags: ['farmla', 'gilet traditionnel', 'velours', 'broderie or', 'femme'],
    attributes: [
      { name: 'Matière', value: 'Velours de soie & Doublure satin' },
      { name: 'Broderie', value: 'Fil d\'or Korbelle' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Gilet Farmla en velours brodé',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-008-38',
        title: 'Taille 38 - Velours Noir & Or',
        price: 145.0,
        inventory_quantity: 7,
        options: { size: '38' },
      },
      {
        sku: 'MED-CLO-008-40',
        title: 'Taille 40 - Velours Noir & Or',
        price: 145.0,
        inventory_quantity: 8,
        options: { size: '40' },
      },
      {
        sku: 'MED-CLO-008-42',
        title: 'Taille 42 - Velours Noir & Or',
        price: 145.0,
        inventory_quantity: 5,
        options: { size: '42' },
      },
    ],
  },
  {
    title: 'Sarouel Moderne Évasé en Lin Pur Lavé Beige Naturel',
    product_reference: 'MED-CLO-009',
    marketplace_category_id: 'cat_sub_women_bottoms',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 89.0,
    inventory_quantity: 25,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pantalon sarouel contemporain revisité avec une coupe fluide palazzo. Taille élastiquée smockée et poches italiennes. Tissu en lin pur respirant.</p>
    `,
    tags: ['sarouel', 'pantalon lin', 'mode bohème', 'lin naturel', 'été'],
    attributes: [
      { name: 'Matière', value: '100% Pur Lin lavé respirant' },
      { name: 'Coupe', value: 'Taille haute élastiquée et jambes larges' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Sarouel moderne en pur lin lavé',
        position: 0,
        is_thumbnail: true,
      },
    ],
    variants: [
      {
        sku: 'MED-CLO-009-S',
        title: 'Taille S - Beige Naturel',
        price: 89.0,
        inventory_quantity: 8,
        options: { size: 'S' },
      },
      {
        sku: 'MED-CLO-009-M',
        title: 'Taille M - Beige Naturel',
        price: 89.0,
        inventory_quantity: 10,
        options: { size: 'M' },
      },
      {
        sku: 'MED-CLO-009-L',
        title: 'Taille L - Beige Naturel',
        price: 89.0,
        inventory_quantity: 7,
        options: { size: 'L' },
      },
    ],
  },
  {
    title: 'Chapeau Capeline Estivale en Feuilles de Palmier Tressées Main avec Ruban Lin',
    product_reference: 'MED-CLO-010',
    marketplace_category_id: 'cat_sub_fashion_acc',
    storefront_category_slug: 'mode-vetements-traditionnels',
    price: 36.0,
    inventory_quantity: 40,
    weight_grams: 180,
    thumbnail: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Chapeau de soleil à large bord tressé à la main dans les oasis du Sud tunisien en fibres de palmier doum. Orné d'un ruban en lin noué.</p>
    `,
    tags: ['chapeau de paille', 'capeline', 'palmier', 'été', 'protection solaire'],
    attributes: [
      { name: 'Matière', value: 'Fibres naturelles de palmier doum' },
      { name: 'Largeur du bord', value: '12 cm' },
      { name: 'Taille', value: 'Taille unique 57 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Chapeau capeline estivale en palmier tressé',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Huile d\'Olive Vierge Extra Infusée au Piment Rouge & Romarin Sauvage 250ml',
    product_reference: 'MED-FOOD-012',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 16.5,
    inventory_quantity: 60,
    weight_grams: 450,
    thumbnail: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Huile d'olive extra vierge de première pression à froid macérée artisanalement avec des piments rouges Baklouti séchés et du romarin sauvage de montagne. Idéale pour pizzas, grillades et pâtes.</p>
    `,
    tags: ['huile pimentée', 'huile aromatisée', 'romarin', 'terroir tunisie'],
    attributes: [
      { name: 'Contenance', value: '250 ml (Bouteille en verre avec verseur)' },
      { name: 'Ingrédients', value: 'Huile d\'olive extra vierge 97%, Piments rouges 2%, Romarin sauvage 1%' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille d\'huile d\'olive infusée au piment',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Assortiment Épices Rares Tunisiennes (Tabil Artisanal, Cumin de Mahdia, Carvi, Paprika Fumé) 4x80g',
    product_reference: 'MED-FOOD-013',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 29.0,
    inventory_quantity: 55,
    weight_grams: 500,
    thumbnail: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Coffret d'épices tunisiennes pures sélectionnées et moulues sur meule de pierre : Tabil traditionnel au carvi et ail séché, Cumin vert de Mahdia, Carvi sauvage et Paprika fumé.</p>
    `,
    tags: ['épices tunisiennes', 'tabil', 'cumin', 'carvi', 'paprika', 'coffret épices'],
    attributes: [
      { name: 'Poids net', value: '4 pots en verre de 80g (320g au total)' },
      { name: 'Origine', value: 'Mahdia / Zaghouan, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coffret d\'épices tunisiennes artisanales',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sirop de Grenade Sauvage de Testour (Grenadine Artisanale Bio) 500ml',
    product_reference: 'MED-FOOD-014',
    marketplace_category_id: 'cat_market_beverages',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 17.0,
    inventory_quantity: 40,
    weight_grams: 700,
    thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Véritable sirop de grenadine pur jus préparé avec les grenades ruby renommées de la vallée de <em>Testour</em>. Sans colorant ni arôme artificiel.</p>
    `,
    tags: ['sirop de grenade', 'grenadine artisanale', 'testour', 'bio', 'boisson'],
    attributes: [
      { name: 'Contenance', value: '500 ml' },
      { name: 'Teneur en fruits', value: '100% Pur jus de grenade pressé & Sucre de canne' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bouteille de sirop de grenade artisanale',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Câpres Sauvages de l\'Île de Zembra au Sel Marin 200g',
    product_reference: 'MED-FOOD-015',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 12.5,
    inventory_quantity: 70,
    weight_grams: 350,
    thumbnail: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Câpres sauvages cueillies à la main sur les falaises maritimes protégées de l'archipel de Zembra. Conservées dans le sel marin brut pour préserver leur croquant et saveur iodée puissante.</p>
    `,
    tags: ['câpres', 'zembra', 'terroir méditerranée', 'sel marin', 'condiment'],
    attributes: [
      { name: 'Poids net égoutté', value: '200g' },
      { name: 'Conservation', value: 'Au sel marin naturel' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bocal de câpres sauvages au sel marin',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Pâte à Tartiner Noisettes de Tabarka & Chocolat Noir Artisanal 220g',
    product_reference: 'MED-FOOD-016',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 18.0,
    inventory_quantity: 50,
    weight_grams: 400,
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pâte à tartiner gourmande et saine contenant 55% de noisettes torréfiées des forêts de <em>Tabarka</em> et du cacao pur. Sans huile de palme ni additifs.</p>
    `,
    tags: ['pâte à tartiner', 'noisettes tabarka', 'chocolat noir', 'sans huile de palme', 'gourmand'],
    attributes: [
      { name: 'Poids net', value: '220g' },
      { name: 'Teneur en noisettes', value: '55% Noisettes tunisiennes torréfiées' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pot de pâte à tartiner aux noisettes de Tabarka',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Fleur de Sel de Guérande & Salines de Sahline aux Écorces de Citron Beldi 150g',
    product_reference: 'MED-FOOD-017',
    marketplace_category_id: 'cat_market_tunisian_local',
    storefront_category_slug: 'epicerie-fine-terroir-tunisien',
    price: 11.5,
    inventory_quantity: 80,
    weight_grams: 250,
    thumbnail: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Cristaux de fleur de sel récoltés à la surface des salines côtières de <em>Sahline</em> (Monastir), mélangés avec des zestes de citrons Beldi séchés au soleil et du poivre rose.</p>
    `,
    tags: ['fleur de sel', 'sahline', 'citron beldi', 'assaisonnement', 'terroir'],
    attributes: [
      { name: 'Poids net', value: '150g (Pot en verre avec cuillère en bois)' },
      { name: 'Origine', value: 'Salines de Sahline, Tunisie' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pot de fleur de sel aux écorces de citron beldi',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Sérum Capillaire Fortifiant à l\'Huile de Roquette, Ricin & Romarin Bio 50ml',
    product_reference: 'MED-BEA-009',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 28.0,
    inventory_quantity: 50,
    weight_grams: 150,
    thumbnail: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Sérum naturel stimulant la pousse et prévenant la chute des cheveux. Synergie d'huile de graines de roquette (<em>Jirjir</em>), huile de ricin première pression et huile essentielle de romarin à cinéole.</p>
    `,
    tags: ['sérum cheveux', 'huile de roquette', 'anti-chute', 'ricin', 'romarin', 'bio'],
    attributes: [
      { name: 'Volume', value: '50 ml (Pipette compte-gouttes)' },
      { name: 'Formule', value: '100% Huiles végétales et essentielles pures' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608248597359-00f72365a6e8?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Flacon sérum capillaire fortifiant',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Savon Gommant à la Poudre d\'Écorce d\'Orange Amère & Miel 150g',
    product_reference: 'MED-BEA-010',
    marketplace_category_id: 'cat_market_skincare',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 12.0,
    inventory_quantity: 90,
    weight_grams: 160,
    thumbnail: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Savon exfoliant naturel saponifié à froid à l'huile d'olive de Tunisie, enrichi en poudre fine d'écorces d'oranges amères de Nabeul et en miel de fleurs d'oranger.</p>
    `,
    tags: ['savon gommant', 'orange amère', 'miel', 'exfoliant naturel', 'nabeul'],
    attributes: [
      { name: 'Poids net', value: '150g' },
      { name: 'Saponification', value: 'À froid pour préserver les principes actifs' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1607006314144-8c8868846174?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Pain de savon gommant à l\'orange amère',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Bougie Végétale Parfumée Cire de Soja & Huile Essentielle de Jasmin de Sidi Bou Saïd 220g',
    product_reference: 'MED-BEA-011',
    marketplace_category_id: 'cat_market_perfumes',
    storefront_category_slug: 'soins-naturels-bien-etre',
    price: 38.0,
    inventory_quantity: 40,
    weight_grams: 450,
    thumbnail: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Bougie artisanale coulée à la main en cire de soja 100% végétale sans paraffine. Mèche en bois de pin crépitant et parfum envoûtant de jasmin blanc royal du Machmoum tunisien.</p>
    `,
    tags: ['bougie parfumée', 'jasmin', 'sidi bou said', 'cire de soja', 'mèche bois'],
    attributes: [
      { name: 'Poids net', value: '220g (Durée de combustion : ~45 heures)' },
      { name: 'Pot', value: 'Céramique blanche réutilisable' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Bougie parfumée au jasmin en pot céramique',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Coupe à Fruits Sculptée dans une Racine de Bois d\'Olivier Brut Ø 30cm',
    product_reference: 'MED-OLI-003',
    marketplace_category_id: 'cat_market_kitchen',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 95.0,
    inventory_quantity: 15,
    weight_grams: 2200,
    thumbnail: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Pièce maîtresse de décoration sculptée directement dans la racine massive d'un olivier centenaire de Sfax. Les bords naturels et le veinage marbré spectaculaire en font une œuvre d'art brute unique.</p>
    `,
    tags: ['coupe à fruits', 'bois d\'olivier', 'racine d\'olivier', 'sculpture bois', 'déco'],
    attributes: [
      { name: 'Diamètre', value: '30 cm environ (forme naturelle libre)' },
      { name: 'Matière', value: 'Bois d\'olivier massif centenaire' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Coupe à fruits en bois d\'olivier sculpté',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Ensemble Couverts à Salade Artisanal en Bois d\'Olivier Massif (Cuillère & Fourchette)',
    product_reference: 'MED-OLI-004',
    marketplace_category_id: 'cat_market_kitchen',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 29.0,
    inventory_quantity: 60,
    weight_grams: 200,
    thumbnail: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Duo de couverts à salade sculptés et poncés à la main en bois d'olivier. Doux au toucher, résistants et n'abîment pas vos plats et saladiers.</p>
    `,
    tags: ['couverts à salade', 'bois d\'olivier', 'ustensiles cuisine', 'écologique'],
    attributes: [
      { name: 'Contenu', value: '1 cuillère + 1 fourchette de service' },
      { name: 'Longueur', value: '30 cm' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Couverts à salade en bois d\'olivier',
        position: 0,
        is_thumbnail: true,
      },
    ],
  },
  {
    title: 'Tableau Mosaïque Romaine Artisanale Reproduction Méduse de Sousse 25x25cm',
    product_reference: 'MED-DEC-004',
    marketplace_category_id: 'cat_sub_home_decor',
    storefront_category_slug: 'objets-art-bois-olivier-bijoux',
    price: 145.0,
    inventory_quantity: 10,
    weight_grams: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
    description: `
      <p>Tableau mural en véritable mosaïque romaine assemblée pierre par pierre par les artisans mosaïstes d'El Jem. Reproduction fidèle des pavements antiques du musée de Sousse.</p>
    `,
    tags: ['mosaïque romaine', 'el jem', 'tableau pierre', 'histoire', 'artisanat d\'art'],
    attributes: [
      { name: 'Matière', value: 'Tesselles de marbre et pierres naturelles taillées main' },
      { name: 'Dimensions', value: '25 cm x 25 cm (Cadre en bois massif inclus)' },
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',
        alt_text: 'Tableau mosaïque romaine artisanale',
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
