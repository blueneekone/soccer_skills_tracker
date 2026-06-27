# Federation / NGB export roadmap

**Owner:** Agent 14 (`overnight/fed-ngb`)  
**Status:** Phase 1 shipped — CSV v1 callable + director UI  
**Authority:** [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) (NGB export deferred at launch; this track is post-launch federation parity)

## Goal

Give club directors a compliant path from SSTracker roster + household graph to state association and national governing body (NGB) filing — without rebuilding registration or compliance in a third-party roster system.

## Data sources (canonical)

| Collection | Role in export |
|------------|----------------|
| `player_lookup` | Email-linked roster index (`playerName`, `teamId`, `clubId`, denormalized `parentEmails`, `householdId`, `vpcStatus`) |
| `households` | Authoritative guardian list (`parentEmails`, `playerEmails`) |
| `users` | DOB and profile fields for linked players |
| `rosters` | Jersey map (`jerseys[playerName]`) |
| `teams` | Team name resolution and club scoping |

Name-only roster strings without `player_lookup` rows are **excluded** from Phase 1 — directors must link guardian accounts first (see `HouseholdLinkerPanel`).

## Phase 1 — CSV v1 (**Done**)

**Callable:** `exportStateRoster` (`functions-core`, director/registrar + matching `clubId`)

**Parameters:**

- `clubId` (required)
- `teamId` (optional — omit for full-club export)

**Output:** UTF-8 CSV with fixed columns:

`player_name`, `player_email`, `team_id`, `team_name`, `jersey_number`, `date_of_birth`, `household_id`, `guardian_emails`, `primary_guardian_email`, `vpc_status`, `club_id`

**UI:** `StateRosterExportPanel` on Director Portal → Roster tab (`TeamsTab`)

**Verify:**

```bash
npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts
npm run deploy:core
```

## Phase 2 — Format adapters (**Done**)

Per-body CSV transforms on top of the Phase 1 row model:

- **Built-in adapters** (`formatAdapterRegistry` in `functions/src/domains/ngbFormatAdapters.js`):
  - `csv_v1` — universal columns (Phase 1 default)
  - `us_soccer_roster` — US Soccer / state association roster template
  - `gotsport_roster` — GotSport-style column map
- **Custom club profiles** — `clubs/{clubId}/export_profiles/{bodyId}` field mapping (`columns: [{ header, field }]`)
- **Callables:** `exportStateRoster` accepts `formatId` (+ optional `exportProfileId`); `listNgbExportFormats` lists built-ins + club profiles for the director picker
- **UI:** `StateRosterExportPanel` format selector on Director Portal → Roster tab

**Verify:**

```bash
npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts
node functions/__tests__/ngbFormatAdapters.test.js
npm run deploy:core
```

## Phase 3 — Sync jobs (stub — not deployed)

Scheduled + on-demand push to federation endpoints where APIs exist:

- Diff engine: `player_lookup` + `households` snapshot vs last successful sync
- Retry queue in `federation_sync_jobs/{clubId}`
- Audit trail in `security_audit` (no raw guardian PII in logs)

**Stubs (Phase 3 slice):** `functions/src/domains/federationSyncOps.js` — `reconcileFederationSync`, `enqueueFederationSyncJob`, `getFederationSyncStatus` (not wired to `functions-core/index.js` until reconciliation ships).

**Deliverables (future):** `onSchedule` reconciliation, director sync status panel, failure alerts.

## Phase 4 — API per body (planned)

OAuth/API-key integrations per NGB or state system:

- Credential vault per club (`federation_credentials` — director-scoped, rules-gated)
- Webhook receivers for roster acceptance / rejection
- Bi-directional status (registered, pending, rejected) surfaced in compliance matrix

**Deliverables:** adapter SDK, sandbox certification checklist, owner-approved credential onboarding.

## Out of scope

- Drag-and-drop club website CMS
- Live streaming or public marketing site builder
- Avatar / portrait PNG pipelines

## Related slices

- **LAUNCH-household-graph** — guardian denorm on `player_lookup`
- **LAUNCH-eligibility-matrix** — org-configurable eligibility gates
- **LAUNCH-roster-invite** — name-only → guardian invite path
