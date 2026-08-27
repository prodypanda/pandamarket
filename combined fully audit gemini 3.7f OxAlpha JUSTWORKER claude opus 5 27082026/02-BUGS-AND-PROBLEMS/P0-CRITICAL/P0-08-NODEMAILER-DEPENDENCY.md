# P0-08 · NODEMAILER-DEPENDENCY

### P0-8 · Missing Production Dependency nodemailer
- **Files:** `backend/package.json:115`
- **Evidence:** `nodemailer` is in `devDependencies`, causing production container crashes on SMTP imports.
- **Fix Guide:** See [Guide H](../../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md).
