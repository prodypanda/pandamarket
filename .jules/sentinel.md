## 2025-05-19 - Fix SQL Injection in Audit Log Purge
**Vulnerability:** SQL Injection in `backend/src/api/admin.route.ts` where `older_than_days` was interpolated directly into a DELETE query.
**Learning:** Even though input is validated by a Zod schema (`older_than_days` must be an integer), string concatenation in raw SQL queries is risky and breaks best practices. The vulnerability existed because the developer likely trusted the Zod validation layer to prevent injection, forgetting that validation schemas can change or be bypassed.
**Prevention:** Always use parameterized queries for all user inputs in SQL, regardless of prior validation. For dynamic intervals in PostgreSQL, use `($1 || ' days')::interval`.
