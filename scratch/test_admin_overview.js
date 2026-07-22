const { Client } = require('pg');
const DATABASE_URL = 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to production database.');

  try {
    const campaigns = await client.query(`
      SELECT c.*, s.name AS store_name, s.subdomain, s.custom_domain, s.is_verified, s.seller_type,
             u.email AS owner_email, CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
             a.balance AS account_balance, a.reserved_balance AS account_reserved_balance, a.status AS account_status,
             COALESCE(json_agg(DISTINCT cr.*) FILTER (WHERE cr.id IS NOT NULL), '[]') AS creatives,
             COALESCE(json_agg(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL), '[]') AS placement_names
      FROM pd_ads_campaign c
      JOIN pd_store s ON s.id=c.store_id
      LEFT JOIN pd_user u ON u.id=s.owner_id
      LEFT JOIN pd_ads_account a ON a.store_id=c.store_id
      LEFT JOIN pd_ads_creative cr ON cr.campaign_id=c.id
      LEFT JOIN pd_ads_campaign_placement cp ON cp.campaign_id=c.id
      LEFT JOIN pd_ads_placement p ON p.id=cp.placement_id
      GROUP BY c.id,s.name,s.subdomain,s.custom_domain,s.is_verified,s.seller_type,u.email,u.first_name,u.last_name,a.balance,a.reserved_balance,a.status
      ORDER BY c.created_at DESC LIMIT 100
    `);
    console.log('SUCCESS! Returned campaigns count:', campaigns.rows.length);
    console.log('Sample campaign 0:', {
      id: campaigns.rows[0].id,
      name: campaigns.rows[0].name,
      store_name: campaigns.rows[0].store_name,
      owner_name: campaigns.rows[0].owner_name,
      owner_email: campaigns.rows[0].owner_email,
      account_balance: campaigns.rows[0].account_balance,
      account_status: campaigns.rows[0].account_status,
    });
  } catch (err) {
    console.error('QUERY ERROR Stack:', err);
  } finally {
    await client.end();
  }
}

main();
