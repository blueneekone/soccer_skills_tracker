# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## fed-phase2 — closure/fed-phase2 (2026-06-14)

**Slice:** C-02 format adapters + C-03 Phase 3 stubs  
**Branch:** `closure/fed-phase2`  
**Status:** Done

- `ngbFormatAdapters.js` — `formatAdapterRegistry` (`csv_v1`, `us_soccer_roster`, `gotsport_roster`) + `export_profiles` custom mapping
- `ngbExportOps.js` — `formatId` on `exportStateRoster`; `listNgbExportFormats` callable
- `federationSyncOps.js` — Phase 3 sync job stubs (not deployed)
- `StateRosterExportPanel` — federation format picker
- `FEDERATION_ROADMAP.md` Phase 2 Done; Phase 3 stub documented
- `PLATFORM_GAP_REGISTER` C-02, C-03 → Done

**Verify:** `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts` · `node functions/__tests__/ngbFormatAdapters.test.js` · `npm run check` · `npm run build`

## tournament-p2 — 2026-06-14

**Branch:** `closure/tournament-p2`  
**Slice:** E-02 seeding UX polish + E-04 public buyer read-only bracket polish  
**ManualQaId:** QA-203

**Shipped:**
- Classic bracket seed order (`bracketSeedOrder`, `firstRoundPairings`) — #1 vs lowest seed in round one
- Director seeding: move up/down, shuffle seeds, round-1 pairing preview before generate
- Public buyer page: dedicated `bracket-section` glass panel with heading and live-results subtitle; seed labels on readonly match rows

**Verify:**
- `npm test -- src/lib/tournament/__tests__/p2TournamentBracket.test.ts` — 12 passed
- `npm run check` — 0 errors
- `npm run build` — ok

**Register:** E-02, E-04 → Done in `PLATFORM_GAP_REGISTER.md`
