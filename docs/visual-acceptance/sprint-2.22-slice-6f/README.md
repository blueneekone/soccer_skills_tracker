# Sprint 2.22 slice 6f — Armory Studio dossier hologram

Wrap the **Dossier Card Preview** in Armory Studio with `HologramCardShell` so the operative card reads as a **Tier A Z3 collectible** — same material language as HQ identity (6a), at full Studio scale.

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `armory-1280-studio-dossier-holo.png` | Studio tab — holo dossier card with tilt/foil visible |
| `armory-1280-studio-dossier-hover.png` | Pointer over card — edge-glow/tilt |
| `armory-390-studio-dossier.png` | Mobile — card centered, no overflow |
| `hq-1280-regression.png` | HQ unchanged (quick sanity) |

## Capture

With dev server running (`npm run dev`):

```bash
npx playwright test e2e/player-armory-slice-6f.visual.spec.ts
```

Requires `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or an existing `e2e/.auth/player.json`.

Navigates to `/player/armory?tab=studio` for dossier captures.

## Files touched

- `src/lib/components/player/OperativeLoadoutStudio.svelte` — `HologramCardShell` around `ProPlayerCard`
- `src/lib/components/player/dashboard/__tests__/playerHudSprint232.test.ts`
- `e2e/player-armory-slice-6f.visual.spec.ts`

## Anti-patterns avoided

- No `HologramCardShell` on portrait workshop or catalog items
- No matte `ols-dossier-panel` grey slab competing with holo shell
- No HQ dashboard / VPP / Quartermaster changes in this slice

## Next

Stats investigation workspace parity = slice **6g** (out of scope for 6f).
