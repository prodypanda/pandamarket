const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  try {
    const res = await client.query(`SELECT * FROM pd_ads_campaign WHERE id = 'pd_adcmp_bx7xkRJBCHJgqgTw'`);
    console.log('Campaign row:', res.rows[0]);

    if (res.rows[0]) {
      const storeId = res.rows[0].store_id;
      const acct = await client.query(`SELECT * FROM pd_ads_account WHERE store_id = $1`, [storeId]);
      console.log('Ads Account row:', acct.rows[0]);
    }
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await client.end();
  }
}

main();
