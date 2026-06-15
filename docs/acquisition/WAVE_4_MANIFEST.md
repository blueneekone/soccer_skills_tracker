# Wave 4 manifest — competitive parity fleet

**Last updated:** 2026-06-15  
**Authority:** [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) (🟡 rows = Wave 4 flip targets) · [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md)  
**Branch prefix:** `competitive/<slice-id>` from `dev`

---

## Permanent rejects (never build)

| Id | Gap |
|----|-----|
| R-01 | Drag-and-drop club website CMS (TeamSnap/SportsEngine site builder) |
| R-02 | App Store / Google Play submission and store review (Capacitor + `NATIVE_SHELL.md` in scope) |
| R-03 | Shallow COPPA checkbox-only compliance |

## Cannot fake Done (Partial-with-limitation in data room — do not mark ✅)

| Gap | Max scope |
|-----|-----------|
| NCSI vendor iframe (no NCSI API) | Max out Checkr lifecycle instead |
| TeamSnap-class native streaming CDN | Enhance embed + director publish UX only |
| GotSport 38-body OAuth API (Phase 4) | Phase 3 sync jobs + export demo packet only |

---

## Unattended overnight rules (every agent)

1. **Do not ask questions.** If blocked, append [`SLICE_LOG.md`](./SLICE_LOG.md) **Blocked** row and exit.
2. Max **5 files** per slice (vitest batches excepted — explicit test globs only).
3. **Permanent rejects R-01–R-03** — never build.
4. **Manual testing** = [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) only — agents ship code + AutomatedVerify.
5. Each commit: slice tests · `npm run check` · `npm run build`.
6. Do **not** mark competitive matrix rows ✅ until corresponding code slice merges — doc-sync sets truth + reopened register statuses only.
7. Do **not:** refactor `teamsStore`, add Coach OS gamification, duplicate ROADMAP files.

**Owner launcher:**

```powershell
git checkout dev; git pull origin dev
node scripts/bootstrap-competitive-branches.mjs
$env:CURSOR_AGENT_MODEL = "composer-2.5"
node scripts/launch-overnight-agents.mjs --wave 4a
# after 4A merged:
node scripts/launch-overnight-agents.mjs --wave 4b
node scripts/launch-overnight-agents.mjs --wave orch4
```

Dry-run: `node scripts/launch-overnight-agents.mjs --wave 4a --dry-run`

---

## Bootstrap branches

Run **before** first `--wave 4a`:

```bash
node scripts/bootstrap-competitive-branches.mjs
```

For each slice: `git branch -f competitive/<slice-id> dev && git push -u origin competitive/<slice-id>`

Slice ID arrays (also in `scripts/bootstrap-competitive-branches.mjs`):

```javascript
const WAVE_4A = ['comp-competitive-doc-sync','comp-roster-dragdrop','comp-tournament-brackets','comp-checkr-lifecycle'];
const WAVE_4B = ['comp-federation-phase3','comp-streaming-schedule'];
const WAVE_4C = ['comp-capacitor-polish'];
const WAVE_ORCH4 = ['orch-wave4'];
```

---

## Wave 4A — parallel (P0 demo blockers)

| Slice ID | Competitive matrix row | Register rows to fix | Depends | Prompt |
|----------|------------------------|----------------------|---------|--------|
| `comp-competitive-doc-sync` | ALL 🟡 rows (doc truth) | Reopen B-03, D-02, E-03, E-01/E-02 if over-closed; sync NOTABLE_GAPS | none | [`agents/comp-competitive-doc-sync.md`](./agents/comp-competitive-doc-sync.md) |
| `comp-roster-dragdrop` | Drag-drop roster from registration | B-03 | none | [`agents/comp-roster-dragdrop.md`](./agents/comp-roster-dragdrop.md) |
| `comp-tournament-brackets` | Tournaments / brackets | E-01, E-02, E-03, E-04 | none | [`agents/comp-tournament-brackets.md`](./agents/comp-tournament-brackets.md) |
| `comp-checkr-lifecycle` | Background check integration | D-01 (extend), D-02 honest Partial | none | [`agents/comp-checkr-lifecycle.md`](./agents/comp-checkr-lifecycle.md) |

---

## Wave 4B — parallel (P1)

| Slice ID | Competitive row | Register | Depends | Prompt |
|----------|-----------------|----------|---------|--------|
| `comp-federation-phase3` | NGB / state roster export | C-03 (Phase 3 sync jobs) | none | [`agents/comp-federation-phase3.md`](./agents/comp-federation-phase3.md) |
| `comp-streaming-schedule` | Live streaming | D-03, D-04 | none | [`agents/comp-streaming-schedule.md`](./agents/comp-streaming-schedule.md) |

---

## Wave 4C — optional P2 (launch only if 4A capacity left)

| Slice ID | Competitive row | Register | Prompt |
|----------|-----------------|----------|--------|
| `comp-capacitor-polish` | Native parent mobile app | H-04 deep links / push on Capacitor | [`agents/comp-capacitor-polish.md`](./agents/comp-capacitor-polish.md) |

---

## Orchestrator

| Slice ID | Task | Prompt |
|----------|------|--------|
| `orch-wave4` | Merge `competitive/*` → `dev`; update PARALLEL_STATUS, TRACTION, register counts | [`agents/orch-wave4.md`](./agents/orch-wave4.md) |

Merge order: `comp-competitive-doc-sync` → `comp-roster-dragdrop` → `comp-tournament-brackets` → `comp-checkr-lifecycle` → `comp-federation-phase3` → `comp-streaming-schedule` → `comp-capacitor-polish` (if exists).

---

## Post-wave deploy (document only — not separate agent unless 4B touches functions)

If `functions-core` / `compliance` / `commerce` changed after orch4:

- `closure/live-deploy-dev` pattern, or
- `npm run deploy:dev:smoke` on `sports-skill-tracker-dev` after orch4 merge

---

## Slice index (agent .md count = 8)

| # | Slice ID | Wave |
|---|----------|------|
| 46 | `comp-competitive-doc-sync` | 4A |
| 47 | `comp-roster-dragdrop` | 4A |
| 48 | `comp-tournament-brackets` | 4A |
| 49 | `comp-checkr-lifecycle` | 4A |
| 50 | `comp-federation-phase3` | 4B |
| 51 | `comp-streaming-schedule` | 4B |
| 52 | `comp-capacitor-polish` | 4C |
| 53 | `orch-wave4` | orch4 |

Do **not** relaunch Wave 3 closure agents.

---

## Launch commands

```bash
node scripts/bootstrap-competitive-branches.mjs
node scripts/launch-overnight-agents.mjs --wave 4a [--dry-run]
node scripts/launch-overnight-agents.mjs --wave 4b [--dry-run]
node scripts/launch-overnight-agents.mjs --wave 4c [--dry-run]
node scripts/launch-overnight-agents.mjs --wave orch4 [--dry-run]
node scripts/launch-overnight-agents.mjs --agent comp-roster-dragdrop
```
