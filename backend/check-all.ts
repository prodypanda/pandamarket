import { query } from './src/db/pool';

async function check() {
  const { rows } = await query(`
    SELECT key FROM pd_file_blobs LIMIT 10
  `);
  console.log("Blobs:", rows);

  const { rows: assets } = await query(`
    SELECT url, file_key FROM pd_file_asset LIMIT 10
  `);
  console.log("Assets:", assets);
  process.exit(0);
}

check().catch(console.error);
