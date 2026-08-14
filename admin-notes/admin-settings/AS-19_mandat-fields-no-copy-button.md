# AS-19 — Mandat Payment Fields Have No Copy-to-Clipboard Button

**Severity:** 🟢 Improvement  
**Area:** Superadmin Settings — Finance Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Lines:** 400–403 (in DEFAULT_SETTINGS), Finance tab render  
**Impact:** When buyers pay via mandat postal (cash transfer), the support team frequently needs to share the mandat recipient details (`mandat_recipient_name`, `mandat_recipient_cin`, `mandat_recipient_city`, `mandat_proof_email`) with buyers via chat or email. Currently these are plain text inputs with no copy button — support agents must manually select and copy the text. A one-click copy button saves time and prevents transcription errors.

---

## Improvement Checklist

- [x] **Step 1 — Create a reusable `CopyableField` component**  
- [x] **Step 2 — Use `CopyableField` for the mandat details**  
- [x] **Step 3 — Import `Copy` from lucide-react**  
- [x] **Step 4 — Test the copy buttons**  
- [x] **Step 5 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add copy-to-clipboard buttons to mandat payment detail fields"
  ```

---

## Acceptance Criteria
- Each mandat field has a one-click copy button.
- A "Full Payment Instructions" compound copy field lets support agents copy everything at once.
- Clicking copy shows a brief "Copied!" confirmation and reverts after 2 seconds.
- Copying works in all modern browsers via the Clipboard API.
