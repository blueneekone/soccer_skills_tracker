# Parent Bounty Funding Panel (CDO blueprint)

Source: Gemini Vanguard Architect AI · **VS-4c implemented**.

## Architecture

| Layer | Role | Class hook |
|-------|------|------------|
| Z0 | Void canvas | `.parent-lounge-shell` (layout) |
| Z1 | Funding stats well | `.parent-bounty-funding-panel` |
| Z2 | Bounty config / claim modules | `.parent-bounty-z2-panel`, `.parent-bounty-terminal` |
| Z3 | Confirm deployment modal | `.parent-bounty-z3-modal` (shadow, no blur) |

## Palette

| Use | Token |
|-----|-------|
| Wells / panels | `#0f172a` navy |
| Borders | `#334155` grey trim |
| Verified balances / affirmative data | `#14b8a6` data cyan |
| Nav labels / deploy primary fill | `#06b6d4` nav cyan |
| Pending / errors | `#d97706` amber |
| **REJECTED** | Gold `#fbbf24`, soft green success, glass blur |

## Actions

- **Deploy bounty:** `.parent-bounty-btn-deploy` — nav cyan fill, black text, chamfer
- **Audit claims:** `.parent-bounty-btn-audit` — transparent, grey trim border

## Geometry

- 4px chamfer on Z2/Z3 via clip-path
- Flat admin tables — 1px grey dividers, no zebra striping

## Rejections

- Gold tokens
- Rounded pill buttons
- Motion blur / glassmorphism
- Soft-green success states (use data cyan only)

## Implementation

- CSS: `src/lib/styles/parent-bounty-funding-panel.css`
- Route: `src/routes/(app)/parent/dashboard/+page.svelte`
- Components: `CoOpArena.svelte`, `BountyTerminal.svelte`, `ProofReviewQueue.svelte`
- Preserved: `CoOpEngine` escrow deploy, funding link, `parentReviewCompletionProof`

## Sprint

`VS-4c` in [`CDO_PROMPT_LIBRARY.md`](../CDO_PROMPT_LIBRARY.md)
