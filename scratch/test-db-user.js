const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function checkAdminUser() {
  try {
    console.log('Connecting to database...');
    const res = await pool.query('SELECT id, email, role, is_active, email_verified, two_factor_enabled FROM pd_user');
    console.log('Total Users Count:', res.rowCount);
    console.log('Users:', res.rows);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await pool.end();
  }
}

checkAdminUser();
