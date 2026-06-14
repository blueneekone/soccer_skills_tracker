# Wave 3 manifest — unattended overnight closure

**Last updated:** 2026-06-14  
**Authority:** [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md) · manual QA [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)  
**Branch prefix:** `closure/<slice-id>` from `dev`

---

## Unattended overnight rules (every agent)

1. **Do not ask questions.** If blocked, append [`SLICE_LOG.md`](./SLICE_LOG.md) **Blocked** row and exit.
2. **Deploy slices** assume `FIREBASE_TOKEN` or `FIREBASE_CI_TOKEN` in environment — never prompt owner.
3. **Merge orchestrator** `closure/orch-wave3` merges `closure/*` → `dev` in dependency order without owner.
4. Max **5 files** per slice (vitest batches excepted — explicit test globs only).
5. **Permanent rejects #1–#3** — never build (CMS, store submission, shallow COPPA).
6. **Manual testing** = [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) only — agents ship code + AutomatedVerify.
7. Each commit: slice tests · `npm run check` · `npm run build`.

**Owner launcher (once, then sleep):**

```bash
git checkout dev && git pull origin dev
node scripts/launch-overnight-agents.mjs --wave 3a
# after 3A merged + FIREBASE_TOKEN set:
node scripts/launch-overnight-agents.mjs --wave 3b
node scripts/launch-overnight-agents.mjs --wave orch
```

Dry-run: `node scripts/launch-overnight-agents.mjs --wave 3a --dry-run`

---

## Bootstrap branches

```bash
git checkout dev && git pull origin dev
# For each slice (launcher uses prompts; Cloud Agent may create branch on first commit):
git branch closure/<slice-id> dev
```

---

## Wave 3A — parallel (no deploy dependency)

| Slice ID | Register | AutomatedVerify | ManualQaId | Prompt |
|----------|----------|-----------------|------------|--------|
| `smoke-dev-script` | M-06, A-02 | `npm run smoke:dev` | QA-000c | [`agents/smoke-dev-script.md`](./agents/smoke-dev-script.md) |
| `deploy-gha-dev` | A-04 | `npm run check` | QA-000d | [`agents/deploy-gha-dev.md`](./agents/deploy-gha-dev.md) |
| `payment-webhook` | B-01 | `paymentInstallments.test.ts` | QA-202 | [`agents/payment-webhook.md`](./agents/payment-webhook.md) |
| `eligibility-ux` | B-04 | `eligibilityLaunch.test.ts` | none | [`agents/eligibility-ux.md`](./agents/eligibility-ux.md) |
| `fcm-broadcast` | D-06, D-08 | `commsSprint48/49.test.ts` | QA-210 | [`agents/fcm-broadcast.md`](./agents/fcm-broadcast.md) |
| `checkr-webhooks` | D-01 | `complianceCheckr.guard.test.js` | QA-204 | [`agents/checkr-webhooks.md`](./agents/checkr-webhooks.md) |
| `fed-phase2` | C-02, C-03 | `ngbExportLaunch.test.ts` | QA-206 | [`agents/fed-phase2.md`](./agents/fed-phase2.md) |
| `tournament-p2` | E-02, E-04 | `p2TournamentBracket.test.ts` | QA-203 | [`agents/tournament-p2.md`](./agents/tournament-p2.md) |
| `player-rl-functional` | G-03 | `playerRlFunctional.test.ts` | none | [`agents/player-rl-functional.md`](./agents/player-rl-functional.md) |
| `vitest-batch-hud` | G-02 | expand CI + vitest hud paths | none | [`agents/vitest-batch-hud.md`](./agents/vitest-batch-hud.md) |
| `vitest-batch-loadout` | G-02 | expand CI + vitest loadout paths | none | [`agents/vitest-batch-loadout.md`](./agents/vitest-batch-loadout.md) |
| `vitest-batch-misc` | G-02, G-06 | expand CI + misc paths | none | [`agents/vitest-batch-misc.md`](./agents/vitest-batch-misc.md) |
| `functional-mvp-doc-sync` | F-05, F-06, A-05 | `personaFunctionalMvp.test.ts`, `launchWave2Complete.test.ts` | none | [`agents/functional-mvp-doc-sync.md`](./agents/functional-mvp-doc-sync.md) |
| `player-os-6f` | J-01, J-08 | `playerHudSprint252.test.ts` | QA-301, QA-302 | [`agents/player-os-6f.md`](./agents/player-os-6f.md) |
| `player-os-6j` | J-02, J-06, J-07, J-10 | `playerHudSprint234.test.ts` | QA-303, QA-304, QA-307 | [`agents/player-os-6j.md`](./agents/player-os-6j.md) |
| `diegetic-modals` | J-03, J-09 | `playerHudSprint244/250.test.ts` | QA-305, QA-306 | [`agents/diegetic-modals.md`](./agents/diegetic-modals.md) |

**3A dependency notes:** `player-os-6j` prefer after `diegetic-modals` if same CSS files — otherwise parallel with care.

---

## Wave 3B — after 3A merged OR `FIREBASE_TOKEN` available

| Slice ID | Register | AutomatedVerify | ManualQaId | Prompt |
|----------|----------|-----------------|------------|--------|
| `live-deploy-dev` | A-01, A-06 | `npm run deploy:dev:smoke` | QA-000b | [`agents/live-deploy-dev.md`](./agents/live-deploy-dev.md) |
| `post-deploy-guards` | A-02, D-09, H-03 | `npm run smoke:dev` · `launchWave2Complete.test.ts` | QA-000c, QA-210 | [`agents/post-deploy-guards.md`](./agents/post-deploy-guards.md) |

---

## Wave 3C — blocked-only-if-asset (auto-skip)

| Slice ID | Register | Blocker | Prompt |
|----------|----------|---------|--------|
| `gemini-ingest-2` | I-02 | No PNG #2 in `static/portrait/approved/` | [`agents/gemini-ingest-2.md`](./agents/gemini-ingest-2.md) |
| `gemini-ingest-3` | I-03 | No PNG #3 | [`agents/gemini-ingest-3.md`](./agents/gemini-ingest-3.md) |

Agents: if no new PNG, append SLICE_LOG **Blocked** and exit — do not ask owner.

---

## Wave orchestrator

| Slice ID | Register | AutomatedVerify | Prompt |
|----------|----------|-----------------|--------|
| `orch-wave3` | M-04 | register row count = agent .md count | [`agents/orch-wave3.md`](./agents/orch-wave3.md) |

Poll SLICE_LOG every merge · update PARALLEL_STATUS · merge `closure/*` → `dev`.

---

## Slice index (agent .md count = 21)

| # | Slice ID | Wave |
|---|----------|------|
| 25 | `payment-webhook` | 3A |
| 26 | `eligibility-ux` | 3A |
| 27 | `fcm-broadcast` | 3A |
| 28 | `checkr-webhooks` | 3A |
| 29 | `fed-phase2` | 3A |
| 30 | `tournament-p2` | 3A |
| 31 | `player-rl-functional` | 3A |
| 32 | `vitest-batch-hud` | 3A |
| 33 | `vitest-batch-loadout` | 3A |
| 34 | `vitest-batch-misc` | 3A |
| 35 | `deploy-gha-dev` | 3A |
| 36 | `functional-mvp-doc-sync` | 3A |
| 37 | `player-os-6f` | 3A |
| 38 | `player-os-6j` | 3A |
| 39 | `diegetic-modals` | 3A |
| 40 | `smoke-dev-script` | 3A |
| 41 | `live-deploy-dev` | 3B |
| 42 | `post-deploy-guards` | 3B |
| 43 | `gemini-ingest-2` | 3C |
| 44 | `gemini-ingest-3` | 3C |
| 45 | `orch-wave3` | orch |

Do **not** relaunch overnight agents 01–24.

---

## Launch commands

```bash
node scripts/launch-overnight-agents.mjs --wave 3a [--dry-run]
node scripts/launch-overnight-agents.mjs --wave 3b [--dry-run]
node scripts/launch-overnight-agents.mjs --wave 3c [--dry-run]
node scripts/launch-overnight-agents.mjs --wave orch [--dry-run]
node scripts/launch-overnight-agents.mjs --agent payment-webhook
```
