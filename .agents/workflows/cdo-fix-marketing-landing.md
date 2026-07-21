# Workflow: CDO — Fix Marketing Landing Page Violations

**Owner**: Antigravity (Frontend)
**Priority**: P1 — HIGH IMPACT / BRAND CRITICAL
**Persona Context**: Chief Design Officer (CDO)

## Objective
The marketing landing page (`src/routes/(marketing)/+page.svelte`) contains multiple violations of the nexus-command-ui design system that will damage brand trust and conversion rates.

## Violations to Fix

### 1. Live Placeholder Image (CRITICAL)
- **Target**: Line 57 — `<img src="https://placehold.co/1920x1080/...">`
- **Fix**: Replace with a generated product screenshot or a styled SVG placeholder that renders the NEXUS COMMAND UI aesthetic. The video slot must show a visually compelling mock of the product dashboard, not a gray box. Use the `generate_image` tool to create a premium product preview.

### 2. Banned Color on Parent Card (HIGH)
- **Target**: Line 107 — `tw-text-[#3b82f6]` (plain blue on Parent Visibility icon)
- **Fix**: Replace with `tw-text-[#14b8a6]` (Data Cyan) per the strict 10% Action/Telemetry color taxonomy. Blue is not in the approved palette.

### 3. Overly Long Hero Headline (MEDIUM)
- **Target**: Line 35 — "Level-up in game and reality, with the ultimate sports skill tracker." (14 words)
- **Fix**: Rewrite to ≤10 words. Suggested: "The operating system for elite youth clubs." or "Train. Prove. Dominate. The youth sports OS." — brutalist, declarative, sub-10 words.

### 4. Symmetrical Feature Grid Violation (HIGH)
- **Target**: Lines 79 — `tw-grid-cols-3` symmetrical layout
- **Fix**: Refactor to an asymmetric 12-column Bento Grid. The primary "Player Train" card should span 6 columns (hero feature), with "Coach Forge" (4 cols) and "Parent Visibility" (2 cols) as supporting cells. This creates the asymmetric visual hierarchy mandated by the design system.

## Constraints
- Maintain `prerender = true` — no dynamic data or auth imports allowed on marketing pages
- All font classes must use `tw-font-mono` for telemetry/data, `tw-font-sans` (Switzer) for body
- The single Action Gold CTA ("Deploy Your Club") must remain the ONLY `#fbbf24` element per viewport

## Verification
- Run `npm run check` — 0 errors
- Visual browser validation to confirm color, layout, and image render correctly
