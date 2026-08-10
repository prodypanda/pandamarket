const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected to Supabase PostgreSQL!');

    // 1. Check store atelier-medina
    const storeRes = await client.query("SELECT id, name, subdomain, is_verified, subscription_plan, theme_id, settings, owner_id FROM pd_store WHERE subdomain = 'atelier-medina' OR name ILIKE '%medina%'");
    console.log('\n--- Stores matching atelier-medina ---');
    console.log(JSON.stringify(storeRes.rows, null, 2));

    let storeId = storeRes.rows[0]?.id;

    // 2. Check existing products for this store
    if (storeId) {
      const prodRes = await client.query("SELECT id, title, slug, category, marketplace_category_id, storefront_category_id, price, inventory_quantity, status, created_at FROM pd_product WHERE store_id = $1", [storeId]);
      console.log(`\n--- Existing products for store ${storeId} (${prodRes.rows.length} total) ---`);
      console.log(JSON.stringify(prodRes.rows, null, 2));

      // Check storefront categories for this store
      const scRes = await client.query("SELECT id, name, slug, parent_id, is_default, is_active, position FROM pd_storefront_category WHERE store_id = $1 ORDER BY position ASC, name ASC", [storeId]);
      console.log(`\n--- Storefront categories for store ${storeId} (${scRes.rows.length} total) ---`);
      console.log(JSON.stringify(scRes.rows, null, 2));
    }

    // 3. Check Marketplace categories (top level + subcategories)
    const mcRes = await client.query("SELECT id, parent_id, name, slug, position, is_active FROM pd_marketplace_category ORDER BY position ASC, name ASC");
    console.log(`\n--- Marketplace categories (${mcRes.rows.length} total) ---`);
    console.log(JSON.stringify(mcRes.rows.slice(0, 30), null, 2));

    // 4. Check total products in the marketplace
    const totalProd = await client.query("SELECT COUNT(*) FROM pd_product");
    console.log(`\nTotal products in marketplace: ${totalProd.rows[0].count}`);

  } catch (err) {
    console.error('Error connecting/querying DB:', err);
  } finally {
    await client.end();
  }
}

main();
