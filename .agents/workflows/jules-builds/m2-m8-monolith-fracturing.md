# Sprint M2, M5, M6, M7, M8: Vanguard Trinity Monolith Fracturing

## Execution Environment: Google Jules Cloud VM
## Governance: Process files in batches of 2. Run `pnpm run check` after EACH batch. Hard limit: 500 lines per file.

---

### BATCH 1 — Sprint M2: SquadTelemetryView.svelte (1553 lines) + RecruiterPortal.svelte (1529 lines)

**SquadTelemetryView** → `src/lib/components/hud/`
- `SquadTelemetryViewEngine.svelte.ts` — all `$state`, `$derived`, Firestore listeners, player data aggregation. B815 guard: `if (!db || !authStore.isAuthenticated) return;` before every fetch.
- `SquadTelemetryViewArena.svelte` — VanguardPrism radar rendering, bar chart components, grid layout
- `SquadTelemetryViewHUD.svelte` — player selection controls, KPI cards, filter chips
- `+page.svelte` or original file becomes thin Shell importing all three

**RecruiterPortal** → `src/lib/components/recruiter/`
- `RecruiterPortalEngine.svelte.ts` — Firestore queries, Checkr verification status, search logic
- `RecruiterPortalArena.svelte` — search results grid, player profile cards
- `RecruiterPortalHUD.svelte` — search filters, Checkr status badges, pagination controls

Run: `pnpm run check` → 0 errors before proceeding.

---

### BATCH 2 — Sprint M5: CoachDrillsView.svelte (1208 lines) + CommandCenter.svelte (1077 lines)

**CoachDrillsView** → `src/lib/coach/drills/` (or `src/lib/components/coach/drill/`)
- `CoachDrillsViewEngine.svelte.ts` — drill data fetching, category filtering, search state
- `CoachDrillsViewArena.svelte` — drill card grid, drill detail panel
- `CoachDrillsViewHUD.svelte` — filter sidebar, create drill CTA, category tab bar

**CommandCenter** → `src/lib/components/coach/`
- `CommandCenterEngine.svelte.ts` — dashboard data aggregation, real-time onSnapshot listeners
- `CommandCenterArena.svelte` — bento grid layout, metric cards, chart rendering
- `CommandCenterHUD.svelte` — quick actions toolbar, notification badges, player spotlight

Run: `pnpm run check` → 0 errors before proceeding.

---

### BATCH 3 — Sprint M6: SquadMatrix.svelte (1026) + ComplianceHub.svelte (989) + CoachMatchDayView.svelte (970)

Process one at a time (these are large). Standard Trinity pattern for each:
- Engine: reactive `$state`, Firestore, business logic
- Arena: visual layout, data presentation
- HUD: controls, filters, action buttons
- Shell: thin import wrapper

Run: `pnpm run check` after each file.

---

### BATCH 4 — Sprint M7: stats/+page.svelte (858) + ClipAnalyzer.svelte (785) + OrgInvites.svelte (826)

- `stats/+page.svelte` → thin shell + `StatsEngine.svelte.ts` + `StatsArena.svelte` + `StatsHUD.svelte`
- `ClipAnalyzer` → Engine (video state, frame analysis) + Arena (video player, annotation overlay) + HUD (timeline, controls)
- `OrgInvites` → Engine (invite CRUD, status) + Arena (invite list, detail cards) + HUD (create form, filters)

Run: `pnpm run check` after each.

---

### BATCH 5 — Sprint M8: Secondary Monoliths (process 3 at a time)

Fracture these in order:
1. `setup/+page.svelte` (774) + `ActiveBounties.svelte` (769) + `OrgDashboard.svelte` (758)
2. `TournamentBracketPanel.svelte` (752) + `TutorDashboard.svelte` (739) + `PlayerWorkoutPageView.svelte` (731)
3. `ParentCoachDmPanel.svelte` (721) + `CoachScoutingView.svelte` (715) + `MediaVault.svelte` (715) + `IntakePanopticon.svelte` (712)

Standard Trinity for each. `pnpm run check` after each batch of 3.

---

### FINAL COMMIT

After all batches pass `pnpm run check` with 0 errors:
```bash
git config user.name "Nexus Command Automation"
git commit -am "refactor(M2-M8): fracture all 15 monolithic files into Vanguard Trinity Shell+Engine+Arena+HUD"
git push origin head
```
