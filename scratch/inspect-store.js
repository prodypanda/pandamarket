const { Client } = require('pg');

const DATABASE_URL =
  'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function checkStore() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const res = await client.query(
    "SELECT id, name, subdomain, custom_domain, status, is_verified, seller_type, settings, created_at FROM pd_store WHERE id = 'pd_store_6hA7WWUBufUDF5ga'"
  );
  console.log('Store record:', JSON.stringify(res.rows[0], null, 2));
  await client.end();
}

checkStore();
