const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  const campaignId = 'pd_adcmp_bx7xkRJBCHJgqgTw';
  const decision = 'approved';
  const next = 'approved';

  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE pd_ads_campaign SET status=$2::varchar, approved_at=CASE WHEN $2::text='approved' THEN NOW() ELSE NULL END,
        rejection_reason=CASE WHEN $2::text='rejected' THEN $3 ELSE NULL END, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [campaignId, next, null],
    );
    console.log('SUCCESS! Updated campaign:', updated.rows[0]);
    await client.query('ROLLBACK');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('REVIEW SQL ERROR:', err);
  } finally {
    await client.end();
  }
}

main();
