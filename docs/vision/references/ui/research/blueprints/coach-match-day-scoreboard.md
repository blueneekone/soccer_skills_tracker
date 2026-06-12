# Coach Match Day Scoreboard (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-3d implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.coach-match-shell` |
| Z1 | Match-log sidebar gutter | `.coach-match-z1-well` |
| Z2 | Home/Away score cells (tap) | `.coach-match-z2-cell` |
| Z4 | Match strap — clock + period | `.coach-match-z4-strap` |

## Typography

| Element | Spec |
|---------|------|
| Score numerics | ~72pt mono, `--pd-data-cyan` |
| Match clock | 24pt mono, `--pd-atom-amber` (running) |
| Labels | 10pt all-caps, `--pd-grey-trim` |

## Actions

- Tap Z2 score cell → atomic increment + Firestore `match_sessions/{session_id}`
- 150ms cyan flash on Z2 cell (`.coach-match-z2-cell--flash`) — no confetti

## Rejections

- Gold, pills, gradients, glassmorphism, excessive animation

## Implementation

- CSS: `src/lib/styles/coach-match-day-scoreboard.css`
- View: `src/lib/coach/match-day/CoachMatchDayView.svelte`
- Route: `/coach/match-day`

## Sprint

`VS-3d` in [`PLATFORM_VISUAL_REDESIGN_PLAN.md`](../PLATFORM_VISUAL_REDESIGN_PLAN.md)
