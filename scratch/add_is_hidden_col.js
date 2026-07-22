const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  try {
    await client.query(`ALTER TABLE pd_ads_campaign ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;`);
    console.log('SUCCESS! Added is_hidden column to pd_ads_campaign.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err);
  } finally {
    await client.end();
  }
}

main();
