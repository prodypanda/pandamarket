const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/pandamarket',
});

async function run() {
  const allRes = await pool.query("SELECT key FROM pd_file_blobs WHERE bucket = 'pd-product-images' ORDER BY created_at DESC LIMIT 20");
  console.log("All keys:");
  console.log(allRes.rows.map(r => r.key));

  const queryRes = await pool.query(`
    SELECT key FROM pd_file_blobs
    WHERE content_type LIKE 'image/%'
      AND key NOT LIKE '%_thumbnail.webp'
      AND key NOT LIKE '%_small.webp'
      AND key NOT LIKE '%_medium.webp'
      AND key NOT LIKE '%_large.webp'
    ORDER BY created_at DESC LIMIT 20
  `);
  console.log("\nFiltered keys:");
  console.log(queryRes.rows.map(r => r.key));
  process.exit(0);
}

run().catch(console.error);
