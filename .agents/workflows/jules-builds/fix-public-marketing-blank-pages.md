# JULES PIPELINE: PUBLIC / MARKETING — BLANK PAGE FIX & UI/UX RECOVERY
## Role: Lead UI/UX Architect + Svelte 5 Debugger
## Mission: Fix blank-page rendering across Public Marketing routes and enforce Nuclear Americana design system.

### CRITICAL CONTEXT:
The previous Jules UI/UX sprint produced **blank pages** or unverified states for Public Marketing.
This means either:
1. A Svelte 5 reactivity crash (`$effect` infinite loop or missing `untrack()`)
2. A missing import or broken component reference
3. A broken media element or missing asset link causing prerendering/client runtime crashes
4. A broken `+page.svelte` or `+layout.svelte` that throws during SSR/CSR

You MUST diagnose and fix the root cause before doing any cosmetic work.

### MANDATORY DIAGNOSTIC STEPS:
1. Run `pnpm run check` and record ALL Svelte compiler errors/warnings for files under `src/routes/(marketing)/` and `src/routes/(public)/`.
2. Open every `+page.svelte` under `src/routes/(marketing)/` (root, about, features, pricing, legal, register, tryouts, clearance-policy, director, coach, parent, player, events, acquisition) and `src/routes/(public)/club/[slug]/` and verify:
   - No `$effect` contains `goto()` without `untrack()` wrapping.
   - No component import is missing or points to a deleted file.
   - Static assets (images, videos) have graceful fallbacks and don't crash if missing.
3. Check `src/routes/(marketing)/+layout.svelte` for header/footer rendering issues.

### COMPONENT TARGETS:
- `src/routes/(marketing)/+layout.svelte`
- `src/routes/(marketing)/+page.svelte`
- `src/routes/(marketing)/about/+page.svelte`
- `src/routes/(marketing)/features/+page.svelte`
- `src/routes/(marketing)/pricing/+page.svelte`
- `src/routes/(marketing)/legal/+page.svelte`
- `src/routes/(marketing)/register/+page.svelte`
- `src/routes/(marketing)/tryouts/+page.svelte`
- `src/routes/(marketing)/clearance-policy/+page.svelte`
- `src/routes/(marketing)/director/+page.svelte`
- `src/routes/(marketing)/coach/+page.svelte`
- `src/routes/(marketing)/parent/+page.svelte`
- `src/routes/(marketing)/player/+page.svelte`
- `src/routes/(marketing)/events/+page.svelte`
- `src/routes/(marketing)/acquisition/+page.svelte`
- `src/routes/(public)/club/[slug]/+page.svelte`
- `src/lib/components/marketing/` (all sub-components including LandingHero, FeatureBento, StakeholderBento, TrustStripPanel, BusinessModelPanel, MarketingNav, MarketingFooter)

### UI/UX ENFORCEMENT (after blank-page fix):
1. `tw-text-[#daff0a]` (Nuclear Yellow) for high-impact metric counters, feature badges, and interactive highlight borders.
2. `tw-text-[#14b8a6]` (Data Cyan) for technical specs, protocol tags, and tier features with `font-mono`.
3. `tw-text-[#fbbf24]` (Action Gold) for the ONE primary CTA per viewport ("Start Free Trial", "Schedule Demo", "Join Now").
4. All cards: `tw-bg-[#0f172a]` with `tw-border-[#334155]`.
5. 12-column asymmetric Bento Grid (`lg:tw-col-span-8` / `lg:tw-col-span-4`).

### VERIFICATION:
1. `pnpm run check` must return 0 errors.
2. `pnpm run build` must succeed without crashes.
3. Every Marketing/Public route must render visible content (not a blank page).

### COMMIT:
Commit with message: `fix(public-marketing): resolve blank-page rendering and enforce Nuclear Americana UI`
