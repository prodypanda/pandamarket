const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  try {
    const userCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pd_user' ORDER BY ordinal_position
    `);
    console.log('pd_user columns:', userCols.rows.map(r => r.column_name));

    const storeCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pd_store' ORDER BY ordinal_position
    `);
    console.log('pd_store columns:', storeCols.rows.map(r => r.column_name));

    const sampleStore = await client.query(`SELECT * FROM pd_store LIMIT 1`);
    console.log('Sample pd_store:', sampleStore.rows[0]);

    if (sampleStore.rows[0] && sampleStore.rows[0].owner_id) {
      const sampleUser = await client.query(`SELECT * FROM pd_user WHERE id = $1`, [sampleStore.rows[0].owner_id]);
      console.log('Sample pd_user for store owner:', sampleUser.rows[0]);
    }
  } catch (err) {
    console.error('INSPECT ERROR:', err);
  } finally {
    await client.end();
  }
}

main();
