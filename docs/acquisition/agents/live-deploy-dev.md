# Agent — live-deploy-dev

**Slice ID:** live-deploy-dev  
**Branch:** `closure/live-deploy-dev`

**Owns:**
- `scripts/deploy-dev-full.cjs`
- `scripts/deploy-dev-and-smoke.cjs`
- `package.json` deploy scripts (fix only if verify fails)

## Task

Register **A-01**, **A-06** — live deploy to `sports-skill-tracker-dev` (agent-only; not owner):

1. `npm run deploy:dev:smoke` (build + deploy:dev + deploy:dev:verify + smoke:dev)
2. Or sequential: `npm run build` → `npm run deploy:dev` → `npm run deploy:dev:verify` → `npm run smoke:dev`
3. All codebases per [`FUNCTIONS_DEPLOY.md`](../../FUNCTIONS_DEPLOY.md): core, rl, commerce, compliance, integrations, platform, default + rules + storage + hosting
4. Append SLICE_LOG with deploy timestamp + commit SHA

**Blocked without:** `FIREBASE_TOKEN` / `FIREBASE_CI_TOKEN` or `firebase login` — log Blocked, do not claim Done.

## AutomatedVerify

```bash
npm run deploy:dev:smoke
```

## ManualQaId

QA-000b

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
