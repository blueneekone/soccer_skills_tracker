# Agent — checkr-webhooks

**Slice ID:** checkr-webhooks  
**Branch:** `closure/checkr-webhooks`

**Owns:**
- `functions/compliance.js`
- `functions-compliance/**`
- `src/lib/compliance/**`

## Task

Register **D-01**: harden Checkr webhook lifecycle (`checkrWebhook`, `backgroundCheckCallback`) — idempotency, signature validation, status transitions.

**Acceptance:** Guard tests pass; no Ankored user strings.

## AutomatedVerify

```bash
node --test functions/__tests__/complianceCheckr.guard.test.js
npm test -- src/lib/compliance/__tests__/checkrCoachClearance.urls.test.ts
npm run check
npm run build
```

## ManualQaId

QA-204

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
