# Roster dedupe runbook (QA tenant cleanup)

**Sprint:** LAUNCH-HOTFIX-P5-WEATHER-ROSTER-INTENT  
**Scope:** Find and fix duplicate `users` docs on a team that cause double roster rows, ghost challenge targets, or team-scope intent limbo.

> **Ops:** `getWeatherConditions` + `evaluateFieldWeatherLock` live in **functions-integrations** (`us-east1`). Do **not** deploy unless owner requests — see [`docs/FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md).

---

## Symptoms

- Coach `/coach` or Forge shows **two rows** for one operative (same display name).
- Team-scope coach intent never reaches **fulfilled** because `fulfilledByUids` waits on a ghost email doc uid.
- Player mission rail stuck after coach cancel (see mission rail refetch — separate hotfix).

---

## Find duplicates (Firestore console or Admin script)

### A — Same auth uid on multiple docs

```javascript
// users where teamId == qa_launch_2026_ppc AND role == player
// Group by data.uid — if count > 1 for same uid, you have ghosts.
```

**Keep:** doc id === auth uid (`users/{uid}`) when present.  
**Merge/delete:** email-keyed legacy doc (`users/{email}`) after merging fields into survivor.

### B — Same displayName + teamId (no uid on ghost)

Query:

- `users` where `teamId == <teamId>` and `role == player`
- Compare normalized `playerName` (trim, lowercase)
- If one row has valid `uid` and another does not → keep uid row, remove ghost

### C — `teams.playerUids` orphans

```javascript
// teams/{teamId}.playerUids should only list auth uids that exist on a surviving users doc.
```

Remove uids pointing at deleted ghosts.

### D — `rosters/{teamId}.players[]` name-only ghosts

If operative is linked (has auth uid on `users/{uid}`), remove duplicate name string from `rosters.players` when it only existed for a pre-link ghost.

---

## Owner tenant: `qa_launch_2026_ppc`

1. Query `users` where `teamId == qa_launch_2026_ppc` and `role == player`.
2. If **2 docs** for one child: keep the operative whose `uid` matches the child login auth uid from household/VPC flow.
3. Merge XP / `xpByAttribute` / streak fields into survivor (last-write-wins on non-null).
4. Delete or archive the ghost doc **after** merge.
5. Re-run provision sanity:  
   `node scripts/dev-tenant-reset.mjs --provision --club-id qa_launch_2026 --team-id qa_launch_2026_ppc`

---

## Canonical dedupe script

[`scripts/dedupeUsers.js`](../../scripts/dedupeUsers.js) — email-keyed vs uid-keyed **global** users dedupe.

```bash
# Dry-run first (default)
node scripts/dedupeUsers.js

# Commit merges + deletes
node scripts/dedupeUsers.js --execute

# Verbose field diffs
node scripts/dedupeUsers.js --verbose
```

**Rules (script):**

- Default **dry-run** — no writes without `--execute`.
- Keeps doc where `docId === uid` (canonical).
- Merges loser field tree into winner; writes `security_audit` row per deletion.

For **team-scoped** duplicates (same uid or same name on one team), prefer manual review using sections A–D above before running global dedupe.

---

## Code guards (post-hotfix)

| Surface | Guard |
| ------- | ----- |
| Forge roster | `dedupeRosterEntries` in `IntentEngine` |
| Coach HQ table | `buildCoachRosterDisplayNames` in `SquadTelemetryView` |
| Intent fulfillment | `rosterAuthUidsFromUserDocs` — auth `uid` field only, no `d.id` email fallback |

---

## Verify after cleanup

1. Coach `/coach` — **one assignable row** per operative.
2. Forge deploy — target list matches HQ roster (no duplicate names).
3. Team-scope intent — fulfills when all **auth-linked** operatives complete (not blocked by email ghosts).
4. Player `/player/dashboard` — single coach mission after deploy; clears after coach cancel.

```bash
npm test -- src/lib/coach/__tests__/rosterDisplayDedupe.test.ts \
  src/lib/coach/intent/__tests__/intentModule.test.ts \
  src/lib/player/dashboard/__tests__/activeBounties.test.ts \
  src/lib/player/dashboard/__tests__/missionRailCoachIntents.test.ts \
  functions/src/domains/__tests__/intentOps.test.js
```
