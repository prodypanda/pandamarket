# AS-01 — Scoped Settings Saves and Concurrent-Edit Protection

> **Implementation status (2026-08-13):** The local frontend/backend implementation is complete and its focused automated checks pass. The production Admin Notes record remains open until the matching deployment and authenticated runtime checks are completed.

**Severity:** 🔴 Bug (data-loss risk)
**Area:** Superadmin platform Settings
**Primary surface:** `frontend/src/app/(admin)/settings/page.tsx`
**API surface:** `backend/src/api/admin.route.ts` and `backend/src/services/platform-config.service.ts`

## Verified finding

The previous Settings save path submitted the complete `PlatformSettings` object to the global endpoint, even when the operator was editing one tab. That allowed unrelated or hidden values in the form state to be persisted accidentally. The response merge could also replace local drafts, and concurrent administrators had no version check.

The working-tree fix changes platform-tab saves to `PUT /api/pd/admin/settings/:section`, derives the body from normalized values that differ from the saved snapshot, preserves drafts in other sections, preserves edits made while a request is in flight, scopes reset to the active section, blocks saving after an authoritative initial-load failure, and uses section versions with `If-Match`. The backend rejects stale same-section writes with `409 PD_SETTINGS_CONFLICT` and returns the latest section values/version for recovery.

## Root cause and impact

- `handleSave` used the global payload builder without an active-section allowlist.
- Settings state was shared across mounted tabs, so hidden drafts were present in the submitted object.
- A successful response replaced too much local state and could erase a newer in-flight edit.
- The API used last-write-wins semantics with no section version or conflict response.

This could overwrite settings the operator never intended to publish, create noisy audit records, and silently discard another administrator’s change.

## Implemented changes

- `frontend/src/app/(admin)/settings/page.tsx`
  - Selects only dirty keys from `SETTINGS_TAB_KEYS[activeTab]`.
  - Sends `If-Match` with the loaded section version.
  - Merges responses only into submitted keys and keeps newer local edits.
  - Keeps hidden-section drafts local and resets only the visible section.
  - Disables platform saves when the initial settings request failed.
- `frontend/src/lib/admin-settings-save.ts`
  - Centralizes dirty-key selection, normalization, success merging, and conflict merging.
- `backend/src/api/admin.route.ts`
  - Adds the section PUT route, validates the section schema, parses `If-Match`, and returns actionable 409 conflict data.
- `backend/src/services/platform-config.service.ts`
  - Filters keys to the server-side section allowlist.
  - Serializes same-section writes with a PostgreSQL advisory transaction lock.
  - Compares the expected section version before writing and invalidates configuration caches after successful writes.
- `packages/types/src/errors.ts`
  - Adds the typed `PD_SETTINGS_CONFLICT` error code.

## Required verification checklist

- [x] Confirm the request body contains only changed keys from the active section.
- [x] Confirm normalized values equal to the saved snapshot are omitted.
- [x] Confirm a draft in another tab remains present after saving the active tab.
- [x] Confirm an edit made while a save is in flight is not overwritten by the response.
- [x] Confirm reset changes only the active section.
- [x] Confirm a failed initial GET prevents saving fallback defaults.
- [x] Confirm the backend rejects keys outside the requested section.
- [x] Confirm a stale `If-Match` produces `409 PD_SETTINGS_CONFLICT` with latest values/version.
- [x] Confirm focused frontend helper tests pass (6/6).
- [x] Confirm focused backend platform-config tests pass (3/3).
- [x] Confirm frontend/backend TypeScript, focused ESLint, and `git diff --check` pass.
- [ ] Deploy frontend and backend together (or deploy the additive backend contract first).
- [ ] Run an authenticated save in every platform section using reversible test values; inspect `updated_keys` and audit metadata.
- [ ] Use two administrator sessions to reproduce a stale same-section save and verify the draft remains editable after the 409 response.
- [ ] Verify hidden drafts survive saving another section and survive a response that arrives after a newer edit.
- [ ] Verify maintenance cache invalidation and Hub revalidation for affected keys.
- [ ] Attach API responses/logs and a Settings UI screenshot to the production note before marking AS-01 complete.

## Acceptance criteria

- Saving a section never submits or persists a key owned by another section.
- Unchanged normalized values are not written.
- Hidden drafts are neither published nor discarded by another section’s save.
- In-flight responses cannot overwrite newer operator edits.
- Concurrent same-section edits produce an actionable conflict instead of silent data loss.
- `updated_keys`, cache invalidation, and audit metadata contain only actual changed keys.
- A failed initial settings load cannot cause fallback defaults to be saved.

## Rollback and safety

Rollback must be reversible and must not delete configuration rows, timestamps, audit history, or Admin Notes. If the UI is rolled back, keep the additive conflict error contract available and monitor for any temporary reappearance of global-payload saves.
