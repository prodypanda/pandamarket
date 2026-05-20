## 2024-05-20 - [Fix SQL Injection in Audit Log Purge]
**Vulnerability:** SQL injection via string interpolation for intervals (`INTERVAL '${older_than_days} days'`).
**Learning:** PostgreSQL interval inputs were incorrectly populated directly from user input without parameterized queries.
**Prevention:** Use parameterized integer multiplication with static intervals (`$1::int * INTERVAL '1 day'`) instead of interpolation to preserve type safety and block SQL injection.
