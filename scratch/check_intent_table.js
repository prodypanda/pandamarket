require('dotenv').config({ path: 'c:/tek/pandamarket/backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.PD_DATABASE_URL
});

async function run() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pd_subscription_intent';
    `);
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
