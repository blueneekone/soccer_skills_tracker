# Sprint 2.22 slice 6e — HQ pathway Tier A timeline

Lift the **Mission rewards pathway** from a matte `pd-page-panel` slab to a **Tier A horizontal timeline** — emissive edge-lit nodes, connector rail with progress fill, Z1 reward icon wells, milestone gold accents. Pathway floats in void between Quick Ops and analytics void (6c).

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `hq-1280-pathway-void-rail.png` | No grey pathway slab; **emissive connector rail** visible behind nodes |
| `hq-1280-pathway-current-active.png` | Current tier node has **ACTIVE** label + strongest teal edge glow |
| `hq-1280-pathway-milestone.png` | At least one milestone node (e.g. LVL 10) shows **gold edge accent** |
| `hq-390-pathway-scroll.png` | Horizontal scroll works; rail + nodes readable on mobile |
| `hq-1280-hub-regression.png` | Identity hologram + mission rail + analytics void unchanged |

## Capture

With dev server running (`npm run dev`):

```bash
node scripts/capture-slice-6e-visuals.mjs
```

First run: log in at `http://localhost:5173/player/dashboard` in your browser, then re-run the script — it saves session to `e2e/.auth/player.json`.

Alternatively:

```bash
npx playwright test e2e/player-hq-slice-6e.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or an existing `e2e/.auth/player.json`.

The milestone screenshot scrolls the pathway track so LVL 10 is centered when present in the DOM.

## Files touched

- `src/lib/components/player/dashboard/OperativePathwayPreview.svelte` — `opp-preview--void` shell
- `src/lib/components/player/OperativePathway.svelte` — timeline rail, edge nodes, reward wells
- `src/lib/styles/player-dashboard-hud.css` — Sprint 2.22 slice 6e Tier A treatment
- `src/lib/components/player/dashboard/__tests__/playerHudSprint231.test.ts`
- `e2e/player-hq-slice-6e.visual.spec.ts`

## Anti-patterns avoided

- No `pd-page-panel` matte wrapper on pathway preview
- No `HologramCardShell` / `VanguardCard` on pathway nodes
- No expand/collapse toggle reintroduced
- No DOM clone hacks in visual spec

## Next

Armory Studio full dossier in `HologramCardShell` = slice **6f** (out of scope for 6e).
