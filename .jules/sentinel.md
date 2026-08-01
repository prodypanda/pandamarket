## 2026-08-01 - Fix SQL Injection in Audit Log Purge
**Vulnerability:** String interpolation used for interval days and role filters in `DELETE FROM pd_audit_log` query.
**Learning:** PostgreSQL `INTERVAL` and `IN` clauses can be tricky to parameterize, leading to string interpolation fallback.
**Prevention:** Use `$X::int * INTERVAL '1 day'` for dynamic intervals and `= ANY($Y)` passing an array for dynamic `IN` clauses to ensure queries remain fully parameterized.
