const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT id, slug, name_en, parent_id
    FROM pd_marketplace_category
    WHERE is_active = true
    ORDER BY position ASC, name_en ASC
  `);
  
  const categories = res.rows;
  
  function printTree(parentId, indent = '') {
    const children = categories.filter(c => c.parent_id === parentId);
    children.forEach((c, i) => {
      console.log(`${indent}${i+1}. [${c.id}] ${c.name_en} (slug: ${c.slug})`);
      printTree(c.id, indent + '   ');
    });
  }
  
  console.log("MARKETPLACE CATEGORY TREE:\n");
  printTree(null);
  console.log(`\nTOTAL: ${categories.length}`);
  await client.end();
}

run().catch(console.error);
