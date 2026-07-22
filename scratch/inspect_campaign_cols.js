const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  try {
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pd_ads_campaign' ORDER BY ordinal_position
    `);
    console.log('pd_ads_campaign columns:', cols.rows.map(r => r.column_name));
  } catch (err) {
    console.error('INSPECT ERROR:', err);
  } finally {
    await client.end();
  }
}

main();
