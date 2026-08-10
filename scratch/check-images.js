const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const imgs = await client.query(`
      SELECT p.title, p.thumbnail, pi.url, pi.alt_text, pi.is_thumbnail 
      FROM pd_product p 
      LEFT JOIN pd_product_image pi ON pi.product_id = p.id 
      LIMIT 20
    `);
    console.log(JSON.stringify(imgs.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
