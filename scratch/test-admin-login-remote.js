const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function checkAdminPassword() {
  try {
    const res = await pool.query('SELECT id, email, password_hash, role FROM pd_user WHERE email = $1', ['admin@pandamarket.tn']);
    const user = res.rows[0];
    console.log('User found:', user ? user.email : 'NOT FOUND');
    if (user) {
      console.log('Password Hash:', user.password_hash);
      const testPasswords = ['admin_password', 'Admin123!', 'admin123', 'pandamarket', 'PandaMarket2026!'];
      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, user.password_hash);
        console.log(`Password "${pwd}":`, match ? 'MATCH!' : 'no');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkAdminPassword();
