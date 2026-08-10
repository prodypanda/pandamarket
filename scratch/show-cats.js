const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const res = await client.query(`
      SELECT sc.name, sc.slug, COUNT(p.id) as published_products
      FROM pd_storefront_category sc
      LEFT JOIN pd_product p ON p.storefront_category_id = sc.id AND p.status = 'published'
      WHERE sc.store_id = 'pd_store_6hA7WWUBufUDF5ga'
      GROUP BY sc.name, sc.slug, sc.position
      ORDER BY sc.position ASC
    `);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
