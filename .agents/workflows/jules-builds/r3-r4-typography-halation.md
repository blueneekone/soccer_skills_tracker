# Sprint R3 + R4: Typography Audit & Global Halation Purge

## Execution Environment: Google Jules Cloud VM
## Governance: Max 2 tasks per session. Run `pnpm run check` after EACH file batch.

---

### TASK 1: Enforce Typography (Sprint R3)

Run this grep to locate all non-compliant font-family declarations:
```
grep -rn "font-family" src/ --include="*.svelte" --include="*.css"
```

Rules:
- Technical data, KPIs, timestamps, stat readouts → `font-family: 'Geist Mono', ui-monospace, monospace`
- Body copy, descriptions, labels → `font-family: 'Switzer', system-ui, sans-serif`
- NO browser-default serif/sans-serif without explicit family

Fix these 6 confirmed sub-8px font-size violations. Replace `font-size: Xpx` where X < 8 with `font-size: clamp(0.625rem, 1vw, 0.75rem)`:
- `src/routes/+error.svelte`
- `src/routes/(app)/reset/+page.svelte`
- `src/lib/components/ui/OperativeIdCardFrame.svelte`
- `src/lib/components/player/PlayerCard.svelte`
- `src/lib/components/coach/CommandCenter.svelte`
- `src/lib/components/recruiter/OpponentCard.svelte`

In `src/app.css`, add to the `body` selector:
```css
font-size-adjust: 0.79;
```

Run: `pnpm run check` → must be 0 errors before proceeding.

---

### TASK 2: Halation Purge (Sprint R4)

Find all `#ffffff` occurrences in .svelte files:
```
grep -rn "#ffffff\|color: white\|text-white" src/ --include="*.svelte"
```

Replace every `color: #ffffff` → `color: #fafafa`
Replace every `background: #ffffff` or `bg-white` → `background: #0f172a` or `background: #000000`

Key confirmed violators to prioritize:
- `src/lib/components/ui/Button.svelte`
- `src/lib/components/ui/Table.svelte`
- `src/lib/components/marketing/landing/LandingHero.svelte`
- `src/lib/components/marketing/landing/FeatureBento.svelte`
- `src/lib/components/marketing/landing/StakeholderCard.svelte`
- `src/lib/components/field-ops/FacilityMapVault.svelte`
- `src/lib/components/field-ops/FacilityDrawingMap.svelte`
- `src/routes/(public)/privacy/+page.svelte`
- `src/routes/(public)/terms/+page.svelte`

Run: `pnpm run check` → 0 errors.

Commit using:
```bash
git config user.name "Nexus Command Automation"
git commit -am "style(R3+R4): enforce Geist Mono/Switzer typography, purge #ffffff halation → #fafafa"
git push origin head
```
