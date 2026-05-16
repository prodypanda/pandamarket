/**
 * PandaMarket — Database Seeder
 * ----------------------------------------------------
 * Idempotent seed for local development and CI.
 *
 * Seeds:
 *   1. `pd_subscription_limits` (7 plans — source of truth for quotas)
 *   2. `pd_theme` (20 themes: minimal, classic, modern, boutique, artisan, techhub, flavor, elegance, neon, sahara, medina, coastal, urban, garden, studio, luxe, fresh, craft, digital, kids)
 *   3. Super admin user                  (admin@pandamarket.tn / Admin123!)
 *   4. Verified Pro vendor + store       (vendor.pro@test.tn / Test123!)
 *   5. Free-plan vendor + store          (vendor.free@test.tn / Test123!)
 *   6. Customer                          (customer@test.tn / Test123!)
 *   7. Sample published products on the verified store
 *
 * Run with:  cd backend && npm run seed
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING / UPDATE where appropriate.
 * ----------------------------------------------------
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env BEFORE importing config — config validates required vars at import time
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { closePool, transaction } from '../src/db/pool';
import { pdId } from '../src/utils/crypto';
import { logger } from '../src/utils/logger';
import { config } from '../src/config';
import { slugify } from '../src/utils/subdomain';
import { PLAN_DEFAULTS } from '../src/utils/plans';
import {
  PayoutMode,
  ProductStatus,
  ProductType,
  SellerType,
  ShippingMode,
  StoreStatus,
  SubscriptionPlan,
  SubscriptionType,
  UserRole,
} from '@pandamarket/types';

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

interface SeedUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
}

async function upsertUser(c: PoolClient, u: SeedUser): Promise<string> {
  const { rows: existing } = await c.query<{ id: string }>(
    'SELECT id FROM pd_user WHERE email = $1',
    [u.email],
  );
  if (existing[0]) return existing[0].id;

  const id = pdId('user');
  const passwordHash = await hashPassword(u.password);
  await c.query(
    `INSERT INTO pd_user
       (id, email, password_hash, first_name, last_name, role, phone, email_verified, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)`,
    [id, u.email, passwordHash, u.first_name, u.last_name, u.role, u.phone ?? null],
  );
  return id;
}

interface SeedStore {
  owner_id: string;
  name: string;
  subdomain: string;
  seller_type?: SellerType;
  plan: SubscriptionPlan;
  is_verified: boolean;
}

async function upsertStore(c: PoolClient, s: SeedStore): Promise<string> {
  const { rows: existing } = await c.query<{ id: string }>(
    'SELECT id FROM pd_store WHERE subdomain = $1',
    [s.subdomain],
  );
  if (existing[0]) return existing[0].id;

  const id = pdId('store');
  const subscriptionType =
    s.plan === SubscriptionPlan.Free ? SubscriptionType.Commission : SubscriptionType.Yearly;
  const expiresAt =
    subscriptionType === SubscriptionType.Yearly
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : null;

  await c.query(
    `INSERT INTO pd_store
       (id, name, status, seller_type, is_verified, subscription_plan, subscription_type,
        subscription_expires_at, subdomain, theme_id, settings, shipping_mode, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      s.name,
      s.is_verified ? StoreStatus.Verified : StoreStatus.Unverified,
      s.seller_type ?? SellerType.Retailer,
      s.is_verified,
      s.plan,
      subscriptionType,
      expiresAt,
      s.subdomain,
      'minimal',
      JSON.stringify({
        store_name: s.name,
        store_description: `Bienvenue sur ${s.name} — votre boutique de confiance sur PandaMarket.`,
        colors: { primary: '#16C784', secondary: '#1A1A2E' },
      }),
      ShippingMode.SelfManaged,
      s.owner_id,
    ],
  );

  // Link owner to store
  await c.query('UPDATE pd_user SET store_id = $1, role = $2 WHERE id = $3', [
    id,
    UserRole.Vendor,
    s.owner_id,
  ]);

  // Bootstrap wallet
  await c.query(
    `INSERT INTO pd_vendor_wallet
       (id, store_id, retention_days, payout_mode, currency)
     VALUES ($1, $2, $3, $4, $5)`,
    [pdId('wallet'), id, config.defaultRetentionDays, PayoutMode.OnDemand, config.defaultCurrency],
  );

  // Bootstrap credits
  const tokens = PLAN_DEFAULTS[s.plan].ai_tokens_included;
  await c.query(
    `INSERT INTO pd_vendor_credits (id, store_id, ai_tokens, last_refill)
     VALUES ($1, $2, $3, NOW())`,
    [pdId('credits'), id, tokens],
  );

  return id;
}

// ----------------------------------------------------
// Plans (subscription_limits)
// ----------------------------------------------------

async function seedPlans(c: PoolClient): Promise<void> {
  const plans = Object.entries(PLAN_DEFAULTS) as [SubscriptionPlan, typeof PLAN_DEFAULTS[SubscriptionPlan]][];
  for (const [planId, def] of plans) {
    await c.query(
      `INSERT INTO pd_subscription_limits
         (plan_id, max_products, max_images_per_product, max_page_builder_pages, has_ai_seo, has_image_compression,
          has_custom_domain, has_page_builder, has_direct_payment, has_white_label, has_own_ai_provider,
          commission_rate, ai_tokens_included, yearly_price, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
       ON CONFLICT (plan_id) DO UPDATE SET
         max_products            = EXCLUDED.max_products,
         max_images_per_product  = EXCLUDED.max_images_per_product,
         max_page_builder_pages  = EXCLUDED.max_page_builder_pages,
         has_ai_seo              = EXCLUDED.has_ai_seo,
         has_image_compression   = EXCLUDED.has_image_compression,
         has_custom_domain       = EXCLUDED.has_custom_domain,
         has_page_builder        = EXCLUDED.has_page_builder,
         has_direct_payment      = EXCLUDED.has_direct_payment,
         has_white_label         = EXCLUDED.has_white_label,
         has_own_ai_provider     = EXCLUDED.has_own_ai_provider,
         commission_rate         = EXCLUDED.commission_rate,
         ai_tokens_included      = EXCLUDED.ai_tokens_included,
         yearly_price            = EXCLUDED.yearly_price,
         updated_at              = NOW()`,
      [
        planId,
        def.max_products,
        def.max_images_per_product,
        def.max_page_builder_pages,
        def.has_ai_seo,
        def.has_image_compression,
        def.has_custom_domain,
        def.has_page_builder,
        def.has_direct_payment,
        def.has_white_label,
        def.has_own_ai_provider,
        def.commission_rate,
        def.ai_tokens_included,
        def.yearly_price,
      ],
    );
  }
  logger.info({ count: plans.length }, '✓ Seeded subscription_limits');
}

// ----------------------------------------------------
// Themes
// ----------------------------------------------------

async function seedThemes(c: PoolClient): Promise<void> {
  const themes = [
    {
      slug: 'minimal',
      name: 'Minimal',
      description:
        'Design épuré, typographie centrale, idéal pour mode/lifestyle/produits premium.',
      preview_url: '/themes/minimal/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'classic',
      name: 'Classic',
      description:
        'Layout traditionnel e-commerce avec sidebar de filtres, parfait pour les catalogues larges.',
      preview_url: '/themes/classic/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'modern',
      name: 'Modern',
      description:
        'Hero plein écran, animations fluides, mise en page asymétrique pour boutiques tendance.',
      preview_url: '/themes/modern/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'boutique',
      name: 'Boutique',
      description:
        'Élégance luxueuse avec tons ivoire et or. Typographie serif, espacement généreux. Idéal pour mode, bijoux et lifestyle premium.',
      preview_url: '/themes/boutique/preview.jpg',
      is_free: false,
      price: 75,
    },
    {
      slug: 'artisan',
      name: 'Artisan',
      description:
        'Tons terreux et chaleureux, formes organiques arrondies. Parfait pour produits artisanaux, bio, fait-main et cosmétiques naturels.',
      preview_url: '/themes/artisan/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'techhub',
      name: 'TechHub',
      description:
        'Design sombre avec accents cyan néon. Header sticky, grille dense. Conçu pour électronique, gadgets et produits tech.',
      preview_url: '/themes/techhub/preview.jpg',
      is_free: false,
      price: 100,
    },
    {
      slug: 'flavor',
      name: 'Flavor',
      description:
        'Couleurs chaudes terracotta, coins arrondis généreux. Idéal pour restaurants, pâtisseries, épiceries fines et produits alimentaires.',
      preview_url: '/themes/flavor/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'elegance',
      name: 'Elegance',
      description: 'Luxe minimaliste avec typographie serif, espacement généreux et palette sobre. Idéal pour marques haut de gamme.',
      preview_url: '/themes/elegance/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'neon',
      name: 'Neon',
      description: 'Mode sombre par défaut, accents néon vibrants, ambiance gaming/cyberpunk. Pour boutiques tech et gaming.',
      preview_url: '/themes/neon/preview.jpg',
      is_free: false,
      price: 120,
    },
    {
      slug: 'sahara',
      name: 'Sahara',
      description: 'Tons désertiques chaleureux, motifs tunisiens. Parfait pour artisanat local, décoration et produits du terroir.',
      preview_url: '/themes/sahara/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'medina',
      name: 'Medina',
      description: 'Ambiance souk traditionnel, palette teal et or, bordures ornées. Pour artisanat, bijoux et produits culturels.',
      preview_url: '/themes/medina/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'coastal',
      name: 'Coastal',
      description: 'Bleus océan et tons sablés, ambiance bord de mer méditerranéen. Pour mode estivale, accessoires et lifestyle.',
      preview_url: '/themes/coastal/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'urban',
      name: 'Urban',
      description: 'Typographie bold, contraste élevé, style streetwear. Pour mode urbaine, sneakers et culture street.',
      preview_url: '/themes/urban/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'garden',
      name: 'Garden',
      description: 'Verts naturels et tons terreux, ambiance organique. Pour cosmétiques bio, produits naturels et bien-être.',
      preview_url: '/themes/garden/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'studio',
      name: 'Studio',
      description: 'Style portfolio/galerie avec layout masonry. Pour photographes, artistes, créateurs et produits visuels.',
      preview_url: '/themes/studio/preview.jpg',
      is_free: false,
      price: 90,
    },
    {
      slug: 'luxe',
      name: 'Luxe',
      description: 'Fond sombre avec accents dorés, typographie serif élégante. Pour joaillerie, montres et produits de luxe.',
      preview_url: '/themes/luxe/preview.jpg',
      is_free: false,
      price: 150,
    },
    {
      slug: 'fresh',
      name: 'Fresh',
      description: 'Verts vifs et blancs lumineux, design épuré. Pour épicerie, alimentation saine, produits bio et fitness.',
      preview_url: '/themes/fresh/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'craft',
      name: 'Craft',
      description: 'Textures rustiques, bordures en pointillés, palette chaude. Pour artisanat DIY, fait-main et créations uniques.',
      preview_url: '/themes/craft/preview.jpg',
      is_free: true,
      price: 0,
    },
    {
      slug: 'digital',
      name: 'Digital',
      description: 'Fond sombre avec dégradés, design moderne. Pour produits numériques, logiciels, templates et assets digitaux.',
      preview_url: '/themes/digital/preview.jpg',
      is_free: false,
      price: 80,
    },
    {
      slug: 'kids',
      name: 'Kids',
      description: 'Coloré et ludique, formes arrondies, typographie fun. Pour jouets, vêtements enfants et produits éducatifs.',
      preview_url: '/themes/kids/preview.jpg',
      is_free: true,
      price: 0,
    },
  ];

  for (const t of themes) {
    await c.query(
      `INSERT INTO pd_theme (id, slug, name, description, preview_url, is_free, price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         preview_url = EXCLUDED.preview_url`,
      [pdId('theme'), t.slug, t.name, t.description, t.preview_url, t.is_free, t.price],
    );
  }
  logger.info({ count: themes.length }, '✓ Seeded themes');
}

// ----------------------------------------------------
// Sample products
// ----------------------------------------------------

interface SeedProduct {
  title: string;
  description: string;
  category: string;
  price: number;
  inventory_quantity: number;
  thumbnail: string;
  tags: string[];
}

const SAMPLE_PRODUCTS: SeedProduct[] = [
  {
    title: 'Tunique Brodée Artisanale',
    description:
      'Tunique en lin naturel brodée à la main par des artisans de Sidi Bou Saïd. Coupe ample, coloris écru.',
    category: 'mode',
    price: 89.0,
    inventory_quantity: 12,
    thumbnail: 'https://picsum.photos/seed/pd-tunique/600/600',
    tags: ['mode', 'artisanat', 'lin', 'femme'],
  },
  {
    title: 'Huile d\'Olive Vierge Extra 1L',
    description:
      'Huile d\'olive première pression à froid, récolte 2025, bouteille verre 1L. Variétés Chemlali & Chetoui.',
    category: 'epicerie',
    price: 32.5,
    inventory_quantity: 80,
    thumbnail: 'https://picsum.photos/seed/pd-huile/600/600',
    tags: ['épicerie', 'bio', 'tunisie', 'huile-olive'],
  },
  {
    title: 'Plateau en Céramique Berbère',
    description:
      'Plateau rond peint à la main, motifs berbères traditionnels, 35 cm de diamètre. Pièce unique.',
    category: 'maison',
    price: 145.0,
    inventory_quantity: 8,
    thumbnail: 'https://picsum.photos/seed/pd-plateau/600/600',
    tags: ['maison', 'décoration', 'céramique', 'artisanat'],
  },
  {
    title: 'Sac à Main Cuir Tannage Végétal',
    description:
      'Sac bandoulière en cuir pleine fleur, tannage végétal naturel, fabriqué à Kairouan.',
    category: 'mode',
    price: 220.0,
    inventory_quantity: 5,
    thumbnail: 'https://picsum.photos/seed/pd-sac/600/600',
    tags: ['mode', 'cuir', 'sac', 'kairouan'],
  },
  {
    title: 'Coffret Thé & Verveine Bio',
    description:
      'Coffret découverte 4 sachets de tisanes bio cultivées dans le Cap Bon : verveine, menthe, sauge, romarin.',
    category: 'epicerie',
    price: 24.9,
    inventory_quantity: 50,
    thumbnail: 'https://picsum.photos/seed/pd-the/600/600',
    tags: ['épicerie', 'bio', 'thé', 'tisane'],
  },
  {
    title: 'Lampe en Cuivre Martelé',
    description: 'Lampe artisanale en cuivre martelé, ampoule E27 incluse. Hauteur 28 cm.',
    category: 'maison',
    price: 175.0,
    inventory_quantity: 6,
    thumbnail: 'https://picsum.photos/seed/pd-lampe/600/600',
    tags: ['maison', 'cuivre', 'lampe', 'artisanat'],
  },
];

async function seedProducts(c: PoolClient, storeId: string): Promise<void> {
  const { rows: existing } = await c.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM pd_product WHERE store_id = $1",
    [storeId],
  );
  if (parseInt(existing[0].count, 10) > 0) {
    logger.info({ store_id: storeId }, '↷ Products already exist, skipping');
    return;
  }

  for (const p of SAMPLE_PRODUCTS) {
    const id = pdId('prod');
    const slug = slugify(p.title);
    await c.query(
      `INSERT INTO pd_product
         (id, store_id, type, status, title, slug, description, category,
          price, inventory_quantity, thumbnail, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        storeId,
        ProductType.Physical,
        ProductStatus.Published,
        p.title,
        slug,
        p.description,
        p.category,
        p.price,
        p.inventory_quantity,
        p.thumbnail,
        JSON.stringify(p.tags),
      ],
    );

    await c.query(
      `INSERT INTO pd_product_image (id, product_id, url, alt_text, position, is_thumbnail)
       VALUES ($1, $2, $3, $4, 0, true)`,
      [pdId('pimg'), id, p.thumbnail, p.title],
    );
  }
  logger.info({ count: SAMPLE_PRODUCTS.length, store_id: storeId }, '✓ Seeded sample products');
}

// ----------------------------------------------------
// Verified vendor: also seed approved KYC + verified marker
// ----------------------------------------------------

async function seedKycForStore(c: PoolClient, storeId: string, adminId: string): Promise<void> {
  const { rows: existing } = await c.query<{ id: string }>(
    'SELECT id FROM pd_verification_documents WHERE store_id = $1',
    [storeId],
  );
  if (existing[0]) return;

  await c.query(
    `INSERT INTO pd_verification_documents
       (id, store_id, rc_document_url, cin_document_url, phone_number, phone_verified,
        status, reviewed_by, reviewed_at, notes)
     VALUES ($1, $2, $3, $4, $5, true, 'approved', $6, NOW(), $7)`,
    [
      pdId('kyc'),
      storeId,
      'private://kyc/sample-rc.pdf',
      'private://kyc/sample-cin.jpg',
      '+216 22 000 000',
      adminId,
      'Seed-approved by system (development data only).',
    ],
  );
}

// ----------------------------------------------------
// Main
// ----------------------------------------------------

async function main(): Promise<void> {
  logger.info('🌱 Seeding PandaMarket database…');

  await transaction(async (c) => {
    // 1. Plans
    await seedPlans(c);

    // 2. Themes
    await seedThemes(c);

    // 3. Super admin
    const adminId = await upsertUser(c, {
      email: 'admin@pandamarket.tn',
      password: 'Admin123!',
      first_name: 'Super',
      last_name: 'Admin',
      role: UserRole.SuperAdmin,
      phone: '+216 71 000 000',
    });
    logger.info({ admin_id: adminId }, '✓ Super admin');

    // 4. Verified Pro vendor
    const vendorProId = await upsertUser(c, {
      email: 'vendor.pro@test.tn',
      password: 'Test123!',
      first_name: 'Mohamed',
      last_name: 'Ben Salah',
      role: UserRole.Vendor,
      phone: '+216 22 111 111',
    });
    const vendorProStoreId = await upsertStore(c, {
      owner_id: vendorProId,
      name: 'Atelier Médina',
      subdomain: 'atelier-medina',
      plan: SubscriptionPlan.Pro,
      is_verified: true,
    });
    await seedKycForStore(c, vendorProStoreId, adminId);
    await seedProducts(c, vendorProStoreId);
    logger.info({ store_id: vendorProStoreId }, '✓ Pro vendor (verified) + sample products');

    // 5. Free vendor (unverified)
    const vendorFreeId = await upsertUser(c, {
      email: 'vendor.free@test.tn',
      password: 'Test123!',
      first_name: 'Sarra',
      last_name: 'Trabelsi',
      role: UserRole.Vendor,
      phone: '+216 24 222 222',
    });
    await upsertStore(c, {
      owner_id: vendorFreeId,
      name: 'Sarra Boutique',
      subdomain: 'sarra-boutique',
      plan: SubscriptionPlan.Free,
      is_verified: false,
    });
    logger.info('✓ Free vendor (unverified)');

    // 6. Customer
    await upsertUser(c, {
      email: 'customer@test.tn',
      password: 'Test123!',
      first_name: 'Amira',
      last_name: 'Hamdi',
      role: UserRole.Customer,
      phone: '+216 50 333 333',
    });
    logger.info('✓ Customer');
  });

  logger.info('');
  logger.info('🎉 Seed complete. Test accounts:');
  logger.info('   Super Admin   : admin@pandamarket.tn   / Admin123!');
  logger.info('   Pro vendor    : vendor.pro@test.tn     / Test123!');
  logger.info('   Free vendor   : vendor.free@test.tn    / Test123!');
  logger.info('   Customer      : customer@test.tn       / Test123!');
}

main()
  .catch((err) => {
    logger.error({ err }, '❌ Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
