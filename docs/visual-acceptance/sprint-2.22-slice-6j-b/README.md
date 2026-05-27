# Sprint 2.22 slice 6j-b — Routes pd-os-deck depth (6j-a parity)

Apply the **pd-os-deck** depth kit from **6j-a** to secondary Player OS routes: Train, Tracker, Armory (player tabs), Settings (player). Each route reads as **stacked deck plates**, not flat matte slabs or teal hairlines on black.

Assumes **6j-a Done**. Batch 2 of 6j — routes only (HQ locked).

## Pass criteria

| Filename | Pass criteria |
|----------|---------------|
| `train-1280-theater-depth.png` | Single **hero deck** wraps threat+exec; visible Z3 cast shadow; sections readable vs black void |
| `train-1280-exec-hover.png` | Exec terminal hover on log CTA — no quest chrome |
| `train-390-stack.png` | Mobile stack; terminal chrome intact |
| `tracker-1280-deck-stack.png` | Stat band + hero capsule deck + gap rhythm |
| `tracker-1280-ghost-well.png` | Ghost in Z1 well, not hairline box |
| `armory-1280-qa-cards.png` | QM cards as raised decks; clear card separation |
| `settings-1280-player-panel.png` | Player settings panel as `pd-os-deck` |
| `hq-1280-regression.png` | HQ 6j-a depth unchanged |

## Material contract

| Class | Use on routes |
|-------|---------------|
| `pd-os-deck` | Stat bands, QM cards, settings panels |
| `pd-os-deck--hero` | Train `pw-theater`, Tracker capsule hero |
| `pd-os-deck__well` | Ghost whispers, form sections |
| `pd-route-stack` | Vertical rhythm between route sections |

**Terminal chrome** (`pg-bracket` / `pg-scanline`): **Train exec terminal only** — never on Armory cards, Tracker, Settings, or identity surfaces.

**Visual fail conditions:**

- Page reads as “lines on black” with no panel mass
- Cannot tell where sections start/end
- Idle tiles glow like Christmas lights
- Double matte frame (deck + `pd-page-panel`)

## Capture

```bash
npx playwright test e2e/player-routes-slice-6j-b.visual.spec.ts
```

Auth: set `E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`, or reuse `e2e/.auth/player.json`.

## Files touched

- `player-dossier.css` — route stack, train theater, QM card deck, quest row physics
- `player-dashboard-hud.css` — Tracker ghost well
- `workout/+page.svelte`, `tracker/+page.svelte`, `armory/+page.svelte`
- `PlayerSettingsPanel.svelte`, `player/settings/+page.svelte`
- `playerHudSprint238.test.ts`
- `e2e/player-routes-slice-6j-b.visual.spec.ts`

## Out of scope

HQ (6j-a), Stats (6g), Armory Studio hologram (6f), Skill Tree, Coach OS, **6i** sign-off.
