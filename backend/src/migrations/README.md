# Database Migrations

SQL files live in `./sql/` and run in **alphabetical order** via `npm run migrate`.
Each file runs inside its own transaction; the whole runner holds a Postgres
advisory lock so concurrent boots cannot race.

## Naming convention (adopted 2026-08-25)

**New migrations MUST use a timestamp prefix:**

```
YYYYMMDDHHMM_short_description.sql
202608251430_add_coupon_table.sql
```

Legacy sequential prefixes (`001_` … `087_`) are still supported and applied
correctly, but numeric prefixes collide the moment two branches both add the
next number. Timestamps make collisions effectively impossible while preserving
ordering. The runner's preflight (`assertMigrationHygiene`) warns on duplicate
numeric prefixes and suspiciously small placeholder files.

## Rules

1. Never edit an already-applied migration — add a new one.
2. Every up-migration gets a matching `<name>.down.sql` for rollback.
3. Idempotent statements (`IF NOT EXISTS` / `IF NOT EXISTS ON CONFLICT`) are
   recommended but not required — the runner records applied filenames in
   `pd_migrations` and skips them.
4. `CREATE INDEX CONCURRENTLY` is forbidden inside migration files (the runner
   wraps each file in a transaction). Create such indexes as a one-off against
   the live database, then mirror them here with plain `CREATE INDEX IF NOT EXISTS`
   (see 085/087 for the pattern).
