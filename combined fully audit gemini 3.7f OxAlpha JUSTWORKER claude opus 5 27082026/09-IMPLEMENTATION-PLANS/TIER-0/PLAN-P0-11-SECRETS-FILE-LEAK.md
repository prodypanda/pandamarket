# Engineering Specification: PLAN-P0-11
## Git-Untrack `env-vars.json` & Implement Production Secret Rotation

- **Target Bug:** [P0-11](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-11-SECRETS-FILE-LEAK.md)
- **Severity:** 🔴 P0 (Production Credential Exposure)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Git Repository, Supabase Database, Render/Vercel Deployments.

---

### 1. Summary & Business Impact
The file `env-vars.json` in the repository root is tracked by git and contains production database connection strings, JWT signing keys, and payment gateway secrets. Pushing this repository exposes live production credentials to anyone with read access to the git history.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Environment variables dumped into a local JSON file that was staged and committed without a `.gitignore` rule.
- **Blast Radius:** Complete platform compromise if the git repository is shared, cloned, or pushed publicly.

---

### 3. Proposed Changes & Exact Diffs

#### Step 1: Remove `env-vars.json` from Git Cache
```bash
git rm --cached env-vars.json
```

#### Step 2: Add Rule to `.gitignore`
```diff
--- a/.gitignore
+++ b/.gitignore
@@ -35,3 +35,4 @@ test-results/
 playwright-report/
 *.log
+env-vars.json
```

#### Step 3: Production Secrets Rotation Checklist
Before launch:
1. Rotate Supabase database password in Supabase Dashboard.
2. Generate new 64-character hex keys for `PD_JWT_SECRET`, `PD_COOKIE_SECRET`, and `PD_ENCRYPTION_KEY`.
3. Update environment variables in Render dashboard.
4. Update environment variables in Vercel dashboard.

---

### 4. Concurrency, Security & Edge Cases
- Ensure the local copy of `env-vars.json` is moved out of the working tree or securely shredded before deployment.

---

### 5. Automated Verification Plan
Verify git index:
```bash
git ls-files env-vars.json
```
*Expected Output:* (empty, exit code 0).

---

### 6. Manual Verification Procedure
```bash
git status -s
```
Verify that `env-vars.json` appears as deleted from the index and ignored on disk.

---

### 7. Rollback Strategy
```bash
git checkout HEAD -- .gitignore
```
