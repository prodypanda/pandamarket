const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Check Storefront categories
    const cats = await client.query(`
      SELECT sc.id, sc.name, sc.slug, sc.position, COUNT(p.id) as product_count
      FROM pd_storefront_category sc
      LEFT JOIN pd_product p ON p.storefront_category_id = sc.id AND p.status = 'published'
      WHERE sc.store_id = 'pd_store_6hA7WWUBufUDF5ga'
      GROUP BY sc.id, sc.name, sc.slug, sc.position
      ORDER BY sc.position ASC, sc.name ASC
    `);
    console.log('=== ATELIER MÉDINA STOREFRONT CATEGORIES ===');
    console.table(cats.rows);

    // 2. Check Marketplace categories distribution
    const mcDist = await client.query(`
      SELECT mc.name as marketplace_category, mc.slug, COUNT(p.id) as product_count
      FROM pd_product p
      JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
      WHERE p.store_id = 'pd_store_6hA7WWUBufUDF5ga' AND p.status = 'published'
      GROUP BY mc.name, mc.slug
      ORDER BY product_count DESC
    `);
    console.log('\n=== ATELIER MÉDINA MARKETPLACE CATEGORIES DISTRIBUTION ===');
    console.table(mcDist.rows);

    // 3. Check Image & Variant counts
    const counts = await client.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT pi.id) as total_images,
        COUNT(DISTINCT pv.id) as total_variants,
        MIN(p.price) as min_price,
        MAX(p.price) as max_price,
        AVG(p.price) as avg_price
      FROM pd_product p
      LEFT JOIN pd_product_image pi ON pi.product_id = p.id
      LEFT JOIN pd_product_variant pv ON pv.product_id = p.id
      WHERE p.store_id = 'pd_store_6hA7WWUBufUDF5ga' AND p.status = 'published'
    `);
    console.log('\n=== CATALOG METRICS ===');
    console.table(counts.rows);

    // 4. Sample Products with Variants & Images
    const sample = await client.query(`
      SELECT p.title, p.product_reference, p.price, p.inventory_quantity, p.thumbnail,
             (SELECT COUNT(*) FROM pd_product_image WHERE product_id = p.id) as image_count,
             (SELECT COUNT(*) FROM pd_product_variant WHERE product_id = p.id) as variant_count
      FROM pd_product p
      WHERE p.store_id = 'pd_store_6hA7WWUBufUDF5ga' AND p.status = 'published'
      ORDER BY p.product_reference ASC NULLS LAST
      LIMIT 15
    `);
    console.log('\n=== SAMPLE PRODUCTS (FIRST 15) ===');
    console.table(sample.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
