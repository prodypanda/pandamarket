const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const countRes = await client.query("SELECT COUNT(*) FROM pd_product WHERE store_id = 'pd_store_6hA7WWUBufUDF5ga'");
    const pubRes = await client.query("SELECT COUNT(*) FROM pd_product WHERE store_id = 'pd_store_6hA7WWUBufUDF5ga' AND status = 'published'");
    console.log(`Total products for store: ${countRes.rows[0].count}, Published: ${pubRes.rows[0].count}`);

    const prods = await client.query("SELECT id, title, price, status, product_reference, category, marketplace_category_id, storefront_category_id FROM pd_product WHERE store_id = 'pd_store_6hA7WWUBufUDF5ga' AND status = 'published' ORDER BY created_at DESC LIMIT 10");
    console.log(JSON.stringify(prods.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
