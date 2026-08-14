import { Client } from 'pg';

async function updateNotes() {
  const client = new Client({
    connectionString: process.env.PD_DATABASE_URL || 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('Connected to DB');

  const ids = ['SO-01', 'SO-02', 'SO-03'];
  for (const id of ids) {
    await client.query(
      `UPDATE admin_notes SET is_completed = TRUE, completed_at = NOW(), updated_at = NOW() WHERE title LIKE $1 OR tags @> ARRAY[$2]::text[]`,
      [`%${id}%`, `external-id:${id}`]
    );
    await client.query(
      `UPDATE admin_note_checklist_items SET is_done = TRUE, updated_at = NOW() WHERE note_id IN (SELECT id FROM admin_notes WHERE title LIKE $1 OR tags @> ARRAY[$2]::text[])`,
      [`%${id}%`, `external-id:${id}`]
    );
    console.log(`Marked ${id} done`);
  }
  await client.end();
  console.log('Finished updating DB');
}

updateNotes().catch(console.error);
