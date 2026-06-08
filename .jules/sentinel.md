## 2024-06-08 - Fix SQL injection pattern in PostgreSQL INTERVAL and IN clauses
**Vulnerability:** String interpolation used for integer parameters in INTERVAL clauses (`INTERVAL '${days} days'`) and IN clauses (`IN (${roleFilter})`), which poses an SQL injection risk.
**Learning:** Even if data is validated as integers or enums beforehand, string interpolation in raw SQL queries bypasses database-level type safety and parameterization defenses, creating a risk if validation is ever weakened.
**Prevention:** Use type casting with multiplication for intervals (e.g., `$1::int * INTERVAL '1 day'`) and `ANY($2::text[])` for array comparisons instead of unsafe string interpolation.
