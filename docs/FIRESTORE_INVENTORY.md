# Firestore hygiene audit — `sports-skill-tracker-dev`

**Sprint:** LAUNCH-functional-os (inventory only — no deletes in this session)  
**Project:** `sports-skill-tracker-dev` (owner uses dev as prod)  
**Date:** 2026-06-03  
**Owner approval:** `approved: Tier A` (2026-06-03)  
**Status:** Tier A **ready to execute** via `--tier-a --execute` after `firebase login --reauth`. Agent run blocked on expired CLI refresh token.

---

## Executive summary

| Item | Result |
|------|--------|
| Deletes performed | **None** (awaiting owner `approved` + collection list) |
| Live root collection scan | **Not completed** — Firebase CLI refresh token invalid in agent environment |
| Rules + code crosswalk | **Complete** — 122 root `match` blocks in `firestore.rules`; 126 distinct collection ids referenced in app/functions |
| Rules gaps (client writes denied) | `active_missions`, `club_playbooks`, `global_drills`, `mail`, `system_telemetry`, `intrinsic_journals` (+ subcollection-only ids) |
| Overlap / consolidation | Documented below — **do not delete** until migration plan |

**Owner next step:** `npx firebase-tools@latest login --reauth`, then run the inventory script (below) to fill **doc count** column. Reply `approved: <comma-separated collections>` only after reviewing Tier A/B tables.

---

## Run live inventory

```bash
firebase use sports-skill-tracker-dev
npx firebase-tools@latest login --reauth
node scripts/firestore-inventory-report.cjs --project sports-skill-tracker-dev --out artifacts/firestore-inventory-dev.json
```

- Output JSON is **gitignored** under `artifacts/` (may contain doc ids / emails in samples).
- Uses Firebase CLI OAuth + Firestore REST when `GOOGLE_APPLICATION_CREDENTIALS` is unset.
- Re-run after any approved cleanup: `node scripts/firestore-inventory-report.cjs ...`

---

## Phase 4 — Tier A approved (execute locally)

```bash
firebase use sports-skill-tracker-dev
npx firebase-tools@latest login --reauth

# Dry-run full Tier A bundle
node scripts/firestore-cleanup-approved.cjs --project sports-skill-tracker-dev --tier-a

# Execute (backs up doc paths to artifacts/tier-a-backup-<timestamp>.json)
node scripts/firestore-cleanup-approved.cjs --project sports-skill-tracker-dev --tier-a --execute

# Re-inventory
node scripts/firestore-inventory-report.cjs --project sports-skill-tracker-dev --out artifacts/firestore-inventory-dev.json
```

**Tier A bundle steps:** `auth_challenges` (>7d), `gateway_idempotency` / `gateway_rate_buckets` (>24h), stale `magic_uplinks` (consumed/expired/revoked >30d), `magic_uplink_audit` (>30d), empty-only `sports` + `recruiters`, collection-group `passkey_challenges` (expired or >1d). **Excluded:** bulk `users/*/passkeys` (needs explicit re-enroll confirmation).

**Blocked collections** (script hard-fails): `users`, `households`, `player_lookup`, `coach_lookup`, `registrar_lookup`, `organizations`, `clubs`, `teams`, `license_entitlements`, `team_assignments`, `bounties`, `audit_logs`, `security_audit`, `consent_*`, `pii_vault`, `magic_uplinks`, `magic_uplink_audit`, `passports`, `player_stats`, `rosters`.

Before `--execute`: export backup (gcloud export or copy doc ids to `artifacts/` — **do not commit PII**).

---

## 1) Collections to KEEP (canonical / production)

These are referenced in [`docs/DATA_FLOW.md`](./DATA_FLOW.md), [`docs/SPORTS_CONFIGS.md`](./SPORTS_CONFIGS.md), [`docs/MAGIC_UPLINKS.md`](./MAGIC_UPLINKS.md), or are Tier-C in the audit brief.

| Collection | Rules | Src | Functions | Notes |
|------------|:-----:|:---:|:---------:|-------|
| `users` | ✓ | ✓ | ✓ | Email-keyed canonical; **see uid-keyed orphan risk** |
| `households` | ✓ | ✓ | ✓ | COPPA / parent thread |
| `player_lookup` | ✓ | ✓ | ✓ | Invite / roster index |
| `coach_lookup` | ✓ | ✓ | ✓ | Staff index |
| `registrar_lookup` | ✓ | ✓ | ✓ | Registrar index |
| `organizations` | ✓ | ✓ | ✓ | Tenant root |
| `clubs` | ✓ | ✓ | ✓ | Club scope |
| `teams` | ✓ | ✓ | ✓ | Subcollections: `drills`, `workouts`, `tactics`, `channels`, `telemetry_events` |
| `team_assignments` | ✓ | ✓ | ✓ | Epic 8 intents — **canonical** coach homework |
| `bounties` | ✓ | ✓ | ✓ | Parent Co-Op escrow loop |
| `bounty_completions` | ✓ | ✓ | ✓ | Immutable verification |
| `bounty_audit` | ✓ | ✓ | ✓ | Money/COPPA trail |
| `license_entitlements` | ✓ | ✓ | ✓ | Seat licensing |
| `team_entitlements` | ✓ | ✓ | ✓ | Per-team seats |
| `audit_logs` | ✓ | ✓ | ✓ | Platform audit |
| `security_audit` | ✓ | ✓ | ✓ | Security / compliance audit |
| `consent_records` | ✓ | ✓ | ✓ | COPPA records |
| `consent_tokens` | ✓ | ✓ | ✓ | Consent flow |
| `consent_logs` | ✓ | ✓ | ✓ | Consent audit |
| `consents` | ✓ | ✓ | ✓ | Legacy consent docs |
| `pii_vault` | ✓ | ✓ | ✓ | Sealed PII |
| `magic_uplinks` | ✓ | ✓ | ✓ | Active invites — **never bulk-delete** |
| `magic_uplink_audit` | ✓ | — | ✓ | Immutable; purged with uplink >90d via CF |
| `sports_configs` | ✓ | ✓ | ✓ | **Canonical** sport trees (not `sports`) |
| `assigned_missions` | ✓ | ✓ | ✓ | Player mission deck / seed data |
| `player_stats` | ✓ | ✓ | ✓ | XP / radar source |
| `reps` | ✓ | ✓ | ✓ | Training reps |
| `passports` | ✓ | ✓ | ✓ | Public-safe player card |
| `rosters` | ✓ | ✓ | ✓ | Team roster doc |
| `invites` | ✓ | ✓ | ✓ | Staff invite tokens (DATA_FLOW) |
| `sports_configs` | ✓ | ✓ | ✓ | See SPORTS_CONFIGS.md |

*(Additional KEEP rows with rules + active UI: `fixtures`, `schedules`, `in_app_messages`, `platform_fee_ledger`, `pricing_policy`, `tournament_events`, `rl_*`, `reengagement_alerts`, etc.)*

---

## 2) Recommended deletes (Tier A — after owner OK + live counts)

> Counts are **TBD** until live inventory runs. Reasons reference existing purge jobs in functions.

| Collection | Tier | Reason | Existing automation |
|------------|------|--------|---------------------|
| `auth_challenges` | A | OTP rows; 10-minute intent in `operativeOps.js` | Manual / cleanup script; **no scheduled purge found** |
| `gateway_idempotency` | A | Cache >24h | `purgeGatewayCaches` on **registry** DB (`functions/cellObservability.js`) — confirm same project |
| `gateway_rate_buckets` | A | Rate-limit state | Same scheduler (registry) |
| `magic_uplinks` (consumed/expired, age >30d) | A | Owner brief: consumed >30d; CF uses **90d** hard delete | `purgeExpiredUplinks` daily |
| `magic_uplink_audit` (orphaned after uplink delete) | A | Tied to uplink purge | Same CF |
| `passkey_challenges` (users subcoll.) | A | Short-lived WebAuthn challenges | Confirm age in Console |
| `users/{uid}/passkeys` (localhost RP) | A | RP mismatch — **owner confirms re-enroll** | Per-user delete only |

**Tier A — only if live scan shows 0 docs and no references:**

| Collection | Code refs | Rules | Verdict |
|------------|-----------|:-----:|---------|
| `sports` | Legacy icon path | ✓ | DELETE_CANDIDATE if empty — superseded by `sports_configs` |
| `recruiters` | Admin recruiters page | ✓ | DELETE_CANDIDATE if empty — billing uses `recruiter_accounts` |
| `practice_sessions` | `functions/league.js` only | ✗ | REVIEW — add rules or remove writer |
| `cv_drill_verifications` | Bounty verification stub | ✗ | REVIEW — rename vs `cv_verified_drill` in DATA_FLOW |
| `orgs` / `compliance_vault` | Legacy compliance.js | ✗ | DELETE_CANDIDATE if empty — prefer `pii_vault` / `clearance_records` |

---

## 3) Owner review (Tier B — do not auto-delete)

| Collection | Rules | Src | Issue |
|------------|:-----:|:---:|-------|
| `active_missions` | **✗** | ✓ | Coach CommandCenter + org service; overlaps `assigned_missions` / `team_assignments` |
| `club_playbooks` | **✗** | ✓ | Director PlaybookTab; needs rules or migration |
| `assignments` | ✓ | ✓ | Legacy per-player homework; HQ still listens alongside `team_assignments` |
| `missions` | ✓ | ✓ | Coach forge top-level missions |
| `intrinsic_journals` | **✗** | ✓ | Player sanctuary; nested `entries` |
| `system_telemetry` | **✗** | ✓ | Client error reports (`+error.svelte`) |
| `alpha_feedback` | ✓ | ✓ | Anomaly reports |
| `mail` | **✗** | ✓ | Trigger Email queue; functions + director panopticon |
| `global_drills` | **✗** | ✓ | RL + AdaptiveHomework; indexed |
| `minor_retention_queue` | ✓ | ✓ | COPPA retention jobs |
| `pending_deletions` | ✓ | ✓ | Document verification pipeline |
| Duplicate / `+alias` test `users` without `clubId` | ✓ | — | **List emails in Console before any user doc delete** |

---

## 4) Overlapping models (consolidate later — no delete)

| Set | Collections | Current usage |
|-----|---------------|---------------|
| Homework / intents | `assignments` vs `team_assignments` | `ActiveBounties` listens to **both**; Epic 8 canonical = `team_assignments` |
| Missions | `missions`, `assigned_missions`, `active_missions` | Forge → `missions`; player deck → `assigned_missions`; coach deploy → `active_missions` (no rules) |
| Sport config | `sports` vs `sports_configs` | **Canonical:** `sports_configs` per SPORTS_CONFIGS.md |
| Recruiter billing | `recruiters` vs `recruiter_accounts` | Stripe state on `recruiter_accounts`; admin UI still queries `recruiters` |
| Drills / workouts | top-level `drills`, `workouts`, `team_workouts` vs `teams/{id}/drills` | Coach drills page uses **team subcollection** + global `drills` |
| User doc id | `users/{email}` vs `users/{uid}` | Most paths use **email**; `login/+page.svelte` uses `user.uid` — orphan risk |

---

## 5) Rules / code gaps (Phase 3 — report only)

| Collection | Has data? (TBD) | Client access today | Recommendation |
|------------|-----------------|---------------------|----------------|
| `active_missions` | TBD | **Denied** (catch-all) | Either add `match /active_missions` rules aligned with coach tenant, or migrate writes to `team_assignments` / `assigned_missions` |
| `club_playbooks` | TBD | **Denied** | Add director-scoped rules or move under `clubs/{clubId}/playbooks` |
| `global_drills` | TBD | **Denied** | Add read rules (authed) + Admin writes; already in `firestore.indexes.json` |
| `mail` | TBD | **Denied** | Intentionally server-only for Trigger Email; client `addDoc(mail)` in director panopticon **will fail** unless rules added or switched to callable |
| `system_telemetry` | TBD | **Denied** | Add narrow create-only rule for authed users or route via callable |
| `intrinsic_journals` | TBD | **Denied** | Add player-owner rules for `intrinsic_journals/{uid}/entries` |

**Not in scope:** `/setup` director self-serve (per brief).

---

## 6) Tier C — never auto-delete

`users`, `households`, `player_lookup`, `coach_lookup`, `registrar_lookup`, `organizations`, `clubs`, `teams`, `license_entitlements`, `team_assignments`, `bounties`, `audit_logs`, `security_audit`, `consent_*`, `pii_vault`, **unconsumed** `magic_uplinks`.

**Also never:** delete entire `users` collection; touch `soccer-skills-tracker` prod without separate instruction; delete QA parent/player/coach rows without listing emails first.

---

## 7) Static inventory table (all code-mentioned root collections)

Doc counts = **`TBD (live scan)`** until `firestore-inventory-report.cjs` succeeds.

| collection | doc count | rules | src | functions | verdict |
|------------|-----------|:-----:|:---:|:---------:|---------|
| `active_missions` | TBD | ✗ | ✓ | — | REVIEW |
| `club_playbooks` | TBD | ✗ | ✓ | — | REVIEW |
| `global_drills` | TBD | ✗ | ✓ | ✓ | REVIEW |
| `mail` | TBD | ✗ | ✓ | ✓ | REVIEW |
| `system_telemetry` | TBD | ✗ | ✓ | — | REVIEW |
| `intrinsic_journals` | TBD | ✗ | ✓ | — | REVIEW |
| `assignments` | TBD | ✓ | ✓ | ✓ | REVIEW (overlap) |
| `team_assignments` | TBD | ✓ | ✓ | ✓ | KEEP |
| `assigned_missions` | TBD | ✓ | ✓ | ✓ | KEEP |
| `missions` | TBD | ✓ | ✓ | ✓ | REVIEW |
| `sports` | TBD | ✓ | ✓ | ✓ | DELETE_CANDIDATE if empty |
| `sports_configs` | TBD | ✓ | ✓ | ✓ | KEEP |
| `recruiters` | TBD | ✓ | ✓ | ✓ | DELETE_CANDIDATE if empty |
| `recruiter_accounts` | TBD | ✓ | — | ✓ | KEEP |
| `auth_challenges` | TBD | ✓ | — | ✓ | Tier A after OK |
| `gateway_idempotency` | TBD | ✓ | — | ✓ | Tier A (registry note) |
| `magic_uplinks` | TBD | ✓ | ✓ | ✓ | KEEP (active); Tier A stale subset |
| `practice_sessions` | TBD | ✗ | — | ✓ | REVIEW |
| `cv_drill_verifications` | TBD | ✗ | — | ✓ | REVIEW |
| `orgs` | TBD | ✗ | — | ✓ | DELETE_CANDIDATE if empty |

*(Full machine-readable table: run inventory script — 126 code paths, 122 rules root matches.)*

---

## 8) Files added (this audit)

| File | Purpose |
|------|---------|
| `scripts/firestore-inventory-report.cjs` | Read-only live inventory + code/rules crosswalk |
| `scripts/firestore-cleanup-approved.cjs` | Batch delete with dry-run default + Tier-C blocks |
| `docs/FIRESTORE_INVENTORY.md` | Owner report (this file) |

---

## Approval template

Reply in chat:

```
approved: auth_challenges, gateway_idempotency
```

Optional: `exclude: magic_uplinks` · confirm QA emails safe · confirm passkey re-enroll done.

No deletes are executed until that message is received.
