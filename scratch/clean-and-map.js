const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const storeId = 'pd_store_6hA7WWUBufUDF5ga';

    // 1. Delete empty test storefront categories
    const oldTestSlugs = ['bbbbbb', 'bfgh', 'dfgdfgdfg', 'fghfgggggg', 'llllllllllllllllllllllllllllllll', 'tttttt'];
    await client.query("DELETE FROM pd_storefront_category WHERE store_id = $1 AND slug = ANY($2)", [storeId, oldTestSlugs]);
    console.log('Cleaned up legacy test storefront categories.');

    // 2. Map earlier seed products to the right storefront & marketplace categories
    const mappings = [
      {
        slug: 'tunique-brodee-artisanale',
        storefront_slug: 'mode-vetements-traditionnels',
        marketplace_id: 'cat_sub_women_tops',
        category_name: 'Tops & Tees'
      },
      {
        slug: 'plateau-en-ceramique-berbere',
        storefront_slug: 'poterie-ceramique-artisanale',
        marketplace_id: 'cat_market_pottery',
        category_name: 'Poterie & Céramique de Nabeul'
      },
      {
        slug: 'coffret-the-verveine-bio',
        storefront_slug: 'epicerie-fine-terroir-tunisien',
        marketplace_id: 'cat_market_beverages',
        category_name: 'Café, Thé & Boissons'
      },
      {
        slug: 'lampe-en-cuivre-martele',
        storefront_slug: 'objets-art-bois-olivier-bijoux',
        marketplace_id: 'cat_sub_home_decor',
        category_name: 'Décoration Intérieure & Miroirs'
      },
      {
        slug: 'sac-a-main-cuir-tannage-vegetal',
        storefront_slug: 'maroquinerie-cuir-pleine-fleur',
        marketplace_id: 'cat_sub_bags_luggage',
        category_name: 'Sacs à Dos, Sacs à Main & Valises'
      },
      {
        slug: 'huile-dolive-vierge-extra-1l',
        storefront_slug: 'epicerie-fine-terroir-tunisien',
        marketplace_id: 'cat_market_tunisian_local',
        category_name: 'Spécialités du Terroir Tunisien'
      }
    ];

    for (const m of mappings) {
      const scRes = await client.query(
        "SELECT id FROM pd_storefront_category WHERE store_id = $1 AND slug = $2",
        [storeId, m.storefront_slug]
      );
      const scId = scRes.rows[0]?.id;
      if (scId) {
        await client.query(`
          UPDATE pd_product SET
            storefront_category_id = $1,
            marketplace_category_id = $2,
            category = $3
          WHERE store_id = $4 AND slug = $5
        `, [scId, m.marketplace_id, m.category_name, storeId, m.slug]);
      }
    }
    console.log('Mapped legacy seed products to accurate categories.');

    // 3. Verify final distribution
    const verifyCats = await client.query(`
      SELECT sc.name, sc.slug, COUNT(p.id) as product_count
      FROM pd_storefront_category sc
      LEFT JOIN pd_product p ON p.storefront_category_id = sc.id AND p.status = 'published'
      WHERE sc.store_id = $1
      GROUP BY sc.name, sc.slug
      ORDER BY sc.position ASC, sc.name ASC
    `, [storeId]);
    console.log('\n=== FINAL STOREFRONT CATEGORIES & PRODUCT COUNTS ===');
    console.table(verifyCats.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
