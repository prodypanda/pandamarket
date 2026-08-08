import { query } from '../db/pool';

async function main() {
  // 1. Check which AI tables exist
  const res = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'pd_ai%' ORDER BY table_name"
  );
  console.log('AI tables found:', res.rows.map((x: any) => x.table_name));

  // 2. Show the DB URL (masked)
  const dbUrl = process.env.PD_DATABASE_URL || 'NOT SET';
  const masked = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log('Connected to DB:', masked);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
