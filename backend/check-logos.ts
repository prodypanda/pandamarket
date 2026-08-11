import { query } from './src/db/pool';

async function check() {
  const { rows } = await query(`
    SELECT key FROM pd_file_blobs WHERE key LIKE '%logo%' OR key LIKE '%branding%'
  `);
  console.log("Logos:", rows);
  process.exit(0);
}

check().catch(console.error);
