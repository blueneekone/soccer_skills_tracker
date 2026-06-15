# Agent — comp-checkr-lifecycle

**Slice ID:** comp-checkr-lifecycle  
**Branch:** `competitive/comp-checkr-lifecycle`

**Owns:**
- `functions/compliance.js` (Checkr webhooks)
- `src/routes/(app)/compliance/CheckrEmbed.svelte`
- `src/lib/compliance/checkrCoachClearance.ts`
- `functions/__tests__/complianceCheckr.guard.test.js`

## Task — Register D-01 extension; D-02 stays Partial (NOT NCSI)

- Webhook events → coach clearance status on director panopticon matrix
- Idempotent webhook handling; audit log row
- Director sees pending/clear/expired states without manual refresh
- Document in NOTABLE_GAPS: NCSI = acquirer vendor swap; Checkr path complete

Do **not** integrate NCSI iframe.

## AutomatedVerify

```bash
node --test functions/__tests__/complianceCheckr.guard.test.js
npm run check
npm run build
```

## ManualQaId

QA-204

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
