const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  const storeId = 'pd_store_6hA7WWUBufUDF5ga';
  const id = 'pd_adcmp_bx7xkRJBCHJgqgTw';
  let next = 'pending_review';
  const requestedNext = next;

  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE pd_ads_campaign SET status=$3::varchar,
        submitted_at=CASE WHEN $4::text='pending_review' THEN NOW() ELSE submitted_at END,
        approved_at=CASE WHEN $3::text='approved' THEN NOW() ELSE approved_at END,
        updated_at=NOW() WHERE id=$1 AND store_id=$2 RETURNING *`,
      [id, storeId, next, requestedNext],
    );
    console.log('SUCCESS! Updated campaign:', updated.rows[0]);
    await client.query('ROLLBACK');
    console.log('Test transition succeeded perfectly!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('TRANSITION ERROR Stack:', err);
  } finally {
    await client.end();
  }
}

main();
