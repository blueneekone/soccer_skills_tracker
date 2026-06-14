# Agent — checkr-webhooks

**Branch:** `closure/checkr-webhooks`

**Owns:** `functions/compliance.js`, `functions-compliance/**`, `functions/__tests__/complianceCheckr.guard.test.js`, `src/lib/compliance/**`

## Task

Harden register **D-01** Checkr webhook lifecycle:

1. Verify `checkrWebhook` / `backgroundCheckCallback` handle report.completed, report.updated, candidate.created — idempotent writes to coach clearance docs.
2. Surface webhook failure/retry states in director panopticon (neutral copy, no Ankored strings).
3. Extend guard tests for each event type + signature verification failure path.

**Acceptance:** Guard tests pass; no duplicate clearance flips on webhook retry.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `node --test functions/__tests__/complianceCheckr.guard.test.js` + clearance URL tests, npm run check, npm run build. Do not ask questions.
