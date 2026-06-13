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

## Phase 2 — Format adapters (planned)

Per-body CSV/XML/JSON transforms on top of the Phase 1 row model:

- US Soccer / state association roster templates
- GotSport-style column maps
- Custom club `export_profiles/{bodyId}` field mapping stored in Firestore

**Deliverables:** `formatAdapterRegistry`, unit tests per adapter, director picker for export profile.

## Phase 3 — Sync jobs (planned)

Scheduled + on-demand push to federation endpoints where APIs exist:

- Diff engine: `player_lookup` + `households` snapshot vs last successful sync
- Retry queue in `federation_sync_jobs/{clubId}`
- Audit trail in `security_audit` (no raw guardian PII in logs)

**Deliverables:** `onSchedule` reconciliation, director sync status panel, failure alerts.

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
