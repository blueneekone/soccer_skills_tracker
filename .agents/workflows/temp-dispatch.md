### Sprint R4: Consent Token Page Design Polish
**Jules Prompt**: Open `src/routes/(legal)/consent/[token]/+page.svelte`. Fix: (1) replace `#020208` with `#000000` (Void Black) or `#0f172a` (Navy Slate) per Z-depth, (2) replace `#ffffff` with `#fafafa` (anti-halation muted off-white), (3) if `<style>` block exceeds 200 lines, extract reusable CSS into `src/lib/styles/consent-tokens.css` and `@import` it, (4) ensure single Action Gold CTA per viewport, (5) verify `Geist Mono` for token display, `Switzer` for body. Run `pnpm run check` to verify 0 errors.


CRITICAL DIRECTIVE: You are running in fully autonomous CI mode. DO NOT ask clarifying questions. Make safe assumptions and proceed with full execution of the sprint. Once done, mark the task as complete.