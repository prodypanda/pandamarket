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
      SELECT 
        c.id, 
        c.parent_id,
        p.name as parent_name,
        c.name, 
        c.slug, 
        c.is_active,
        c.position
      FROM pd_marketplace_category c
      LEFT JOIN pd_marketplace_category p ON p.id = c.parent_id
      ORDER BY COALESCE(c.parent_id, c.id), c.parent_id NULLS FIRST, c.position ASC, c.name ASC
    `);

    console.log(`Total categories: ${res.rows.length}`);
    const parents = res.rows.filter(r => !r.parent_id);
    console.log(`\n=== TOP LEVEL DEPARTMENTS (${parents.length}) ===`);
    parents.forEach(p => {
      console.log(`[${p.id}] ${p.name} (slug: ${p.slug})`);
      const subs = res.rows.filter(r => r.parent_id === p.id);
      subs.forEach(s => {
        console.log(`   └── [${s.id}] ${s.name} (slug: ${s.slug})`);
        const subsubs = res.rows.filter(r => r.parent_id === s.id);
        subsubs.forEach(ss => {
          console.log(`         └── [${ss.id}] ${ss.name} (slug: ${ss.slug})`);
        });
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
