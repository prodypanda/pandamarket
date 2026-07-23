const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT c.id, c.slug, c.name_en, c.parent_id, p.name_en as parent_name 
    FROM pd_marketplace_category c 
    LEFT JOIN pd_marketplace_category p ON p.id = c.parent_id 
    WHERE c.is_active = true 
    ORDER BY c.parent_id NULLS FIRST, c.position ASC, c.name_en ASC
  `);
  
  const parents = res.rows.filter(r => !r.parent_id);
  parents.forEach((p, i) => {
    console.log(`\n--- ${i+1}. [${p.id}] ${p.name_en} (slug: ${p.slug})`);
    const children = res.rows.filter(r => r.parent_id === p.id);
    children.forEach((ch, j) => {
      console.log(`   ${j+1}. [${ch.id}] ${ch.name_en} (slug: ${ch.slug})`);
    });
  });
  console.log(`\nTOTAL: ${res.rows.length} (${parents.length} parents + ${res.rows.length - parents.length} subcategories)`);
  await client.end();
}

run().catch(console.error);
