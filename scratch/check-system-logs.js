const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function checkSystemLogs() {
  try {
    const res = await pool.query('SELECT * FROM pd_system_log ORDER BY created_at DESC LIMIT 5');
    console.log('Logs:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSystemLogs();
