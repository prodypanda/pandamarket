import { query } from './src/db/pool';

async function cleanup() {
  const { rows } = await query(`
    SELECT key, content_type FROM pd_file_blobs
    WHERE key LIKE '%pd_file_t8zkcDwYHc7byAjG%'
  `);
  console.log(rows);
  process.exit(0);
}

cleanup().catch(console.error);
