# Gap closure plan

> **Execution superseded by:** [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md) + [`WAVE_3_MANIFEST.md`](./WAVE_3_MANIFEST.md) + [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) (2026-06-14). Historical Done rows below remain valid evidence; do not add new backlog here. No "owner runs deploy" — use `npm run deploy:dev:smoke` / `npm run smoke:dev`.

**Last updated:** 2026-06-13  
**Branch baseline:** dev @ `7adb90ae`

Historical backlog for remaining work before owner QA (pre-register). Every row must reach **Done**, **Partial-with-acceptance**, or **Intentional reject** before [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) human sign-off begins.

---

## Intentional exclusions (never build — Closed/Rejected)

| # | Gap | Status | SSTracker alternative |
|---|-----|--------|----------------------|
| 1 | Drag-and-drop club website CMS (TeamSnap/SportsEngine-style) | **Closed/Rejected** | `/club/{slug}`, `/register/{clubId}`, `/tryouts/{programId}` |
| 2 | App Store Connect / Google Play submission and store review | **Closed/Rejected** | Capacitor shell + [`NATIVE_SHELL.md`](../NATIVE_SHELL.md) in scope; store binaries = acquirer |
| 3 | Shallow COPPA checkbox-only compliance | **Closed/Rejected** | VPC ceremony is moat |

---

## Done (verified in code + merged to dev)

| Gap | Evidence (file/test/route) | Agent/slice | Notes |
|-----|---------------------------|-------------|-------|
| Launch P0 — waiver copy, dispatch code, vpc-pending, QA tenant | `scripts/dev-tenant-reset.mjs`, `launchP0Fixes.test.ts`, `parent/household/+page.svelte` | 02-launch-p0 | Provision writes `qa_launch_2026` household + invite code |
| Registration → roster assign (paid registrants) | `assignSeasonRegistrationToRoster` CF, `RegistrationRosterAssignPanel.svelte`, `registrationLaunch.test.ts` | 03-p2-reg-roster | Not GotSport drag-drop; director assign panel |
| Parent payment installments UX | `paymentInstallments.ts`, `/parent/payments`, `paymentInstallments.test.ts` | 04-p2-payments | Uses existing Stripe CF per installment |
| Tournament bracket polish | `tournamentBracket.ts`, `TournamentBracketPanel.svelte`, `p2TournamentBracket.test.ts` | 05-p2-tournament | Single-elimination 4/8/16/32 |
| Checkr embed polish | `CheckrEmbed.svelte`, `legacyRecordId` copy, guard tests | 06-p2-checkr | Ankored strings removed from UI |
| Player tracker nav parity | `/player/tracker` in `PlayerShell` + `workspaceNav.js`, `personaFunctionalMvp.test.ts` | 07-p2-tracker-nav | Enterprise-shell rail parity |
| svelte-check zero (full repo) | `npm run check` → 0 errors; CI typecheck job in `.github/workflows/ci.yml` | 08–13, 22 | Agents 08–11, 13 logged in SLICE_LOG; 12 + 22 merged on dev |
| Federation CSV export v1 | `exportStateRoster` CF, `StateRosterExportPanel.svelte`, `ngbExportLaunch.test.ts`, `FEDERATION_ROADMAP.md` | 14-fed-ngb | Director/registrar CSV from `player_lookup` |
| Live stream embed MVP | `liveStreamUrl` on events, `LiveStreamWatch.svelte`, `liveStreamLaunch.test.ts` | 15-live-stream | YouTube/Vimeo/Mux; teen 13–16 external-link fallback |
| `/acquisition` marketing route | `routes/(marketing)/acquisition/+page.svelte`, `marketingLanding.test.ts` | 16-marketing-acq | Acquisition landing + footer CTA |
| Capacitor native shell MVP | `capacitor.config.ts`, `ios/`, `android/`, `NATIVE_SHELL.md`, `nativeShellLaunch.test.ts` | 17-native-shell | Parent-first WebView; no store submission |
| Gemini ingest #1 (one bust JPEG) | `static/portrait/approved/bust_teen_long_light_away.jpeg`, ingest commit `b294f099` | 18-gemini-ingest-1 | Precomposed holo default wired |
| Acquisition data room | `docs/acquisition/**` INDEX, PROSPECTUS, LIMITATIONS, etc. | 01-docs-dataroom | Baseline diligence pack |
| CI vitest allowlist expansion | `.github/workflows/ci.yml` — 129 green files | 23-vitest-ci | 61 red files still excluded |
| Deploy verify scripts | `npm run deploy:dev`, `deploy-dev-full.cjs`, `deploy-dev-verify.cjs` | 24-deploy-verify | Local gates green |

---

## Partial (code exists — polish/deploy/docs remain)

| Gap | What shipped | What remains | Priority | Suggested next slice |
|-----|--------------|--------------|----------|---------------------|
| Live Firebase deploy to dev | `deploy:dev:verify` green; deploy scripts + `.firebaserc` alias | Owner runs `npm run build && npm run deploy:dev` with `FIREBASE_CI_TOKEN` | **P0** | Owner deploy slice — confirm callables on `sports-skill-tracker-dev` |
| Owner FUNCTIONAL_MVP QA | All persona routes wired; regression tests pass | Human checkbox walkthrough on `qa_launch_2026` tenant | **P0** | Owner-only — [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) |
| Payment installment → full-season unlock | Partial PI charges via `createRegistrationIntent` | Webhook should set `activeSeasonStatus` only when all installments paid (not first partial) | **P1** | `functions-commerce` webhook follow-up |
| NGB / federation export | CSV v1 callable + director panel | Phases 2–4 in `FEDERATION_ROADMAP.md` (API sync, 38-body parity) unless owner rejects soccer GTM | **P2** | Federation Phase 2 slice |
| Tournament brackets | Single-elimination panel + public read-only view | Double-elim, seeding UX, GotSport-grade tournament ops | **P2** | Tournament Phase 2 (defer if owner accepts v1) |
| Registration → roster UX | Paid-reg assign panel on Director Licenses tab | Drag-drop GotSport-style roster builder | **P2** | Accept v1 assign panel OR future drag UX slice |
| Background checks | Checkr embed + director panopticon + neutral copy | NCSI/SafeSport vendor parity, full webhook lifecycle | **P2** | Integration hardening (acquirer) |
| Native mobile distribution | Capacitor 6 shell, parent-first routing | App Store / Play binaries, push cert provisioning, store metadata | **P3** | Acquirer — see intentional exclusion #2 |
| Live streaming | URL embed on schedule + match-day | TeamSnap-class CDN, in-app production tools | **P3** | Accept embed MVP OR streaming vendor slice |
| Avatar bust art | One JPEG wired (`bust_teen_long_light_away`); 16 refs in `static/portrait/approved/` | Owner Holo VA approval; PNG layer ingest per `AVATAR_MANIFEST.md` | **P3** | Owner art approval → gemini-ingest-2/3 unblocked |
| Vitest CI coverage | 129 green files in CI allowlist | 61 red files (deferred avatar/HUD sprint guards) | **P2** | Vitest burn-down slices (non-blocking for owner QA) |
| Acquisition demo materials | `DEMO_SCRIPT.md`, data room docs | Owner-recorded demo video, legal review, outreach sends | **P1** | Owner-only |

---

## Not started / Blocked

| Gap | Blocker | Owner vs agent |
|-----|---------|----------------|
| Gemini ingest #2 (second bust PNG) | No second owner-approved PNG in `static/portrait/approved/` — agent logged **Blocked** | Owner provides asset → agent wires |
| Gemini ingest #3 (third bust PNG) | No third asset — agent logged **Blocked** | Owner provides asset → agent wires |
| Live Firebase deploy (cloud agent) | No `FIREBASE_CI_TOKEN` / `firebase login` in CI agent environment | **Owner** runs deploy locally or via CI secret |

---

## Owner-only (post code gaps)

- [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) human QA on `qa_launch_2026` tenant — do not automate checkboxes
- Live Firebase deploy confirmation if overnight slices not yet live on `sports-skill-tracker-dev`
- Legal review, traction narrative, demo video ([`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md))
- Holo VA approve bust portrait variants if avatar track matters pre-close ([`AVATAR_MANIFEST.md`](./AVATAR_MANIFEST.md))

---

## Recommended agent slice order

1. **Owner live deploy** — Run `npm run deploy:dev` with Firebase credentials; smoke-test `assignSeasonRegistrationToRoster`, `exportStateRoster`, payment CF on dev. Files: operator only. Verify: `npm run deploy:dev:verify` then manual persona smoke on https://sstracker.app.

2. **Payment webhook full-season unlock** — Fix partial-installment → `activeSeasonStatus` logic in commerce webhooks. Files: `functions/src/domains/commerce*.js`, tests in `functions/__tests__/`. Verify: `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` + commerce webhook tests.

3. **Post-deploy regression gate** — Re-run launch guards after deploy. Files: none. Verify: `npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` · `npm run check`.

4. **Federation Phase 2 (optional GTM)** — Implement next phase in [`FEDERATION_ROADMAP.md`](./FEDERATION_ROADMAP.md). Files: `functions/src/domains/ngbExportOps.js`, director export panel. Verify: `npm test -- src/lib/director/__tests__/ngbExportLaunch.test.ts`.

5. **Vitest CI burn-down (parallel, non-blocking)** — Triage and fix or retire 61 excluded red suites. Files: `.github/workflows/ci.yml`, affected `__tests__`. Verify: expand allowlist + `npx vitest run` on newly green paths.

6. **Avatar ingest 2/3 (when owner unblocks)** — Wire owner-approved PNGs per [`portrait-gemini-ingest.mdc`](../../.cursor/rules/portrait-gemini-ingest.mdc). Files: `static/portrait/approved/`, holo default config. Verify: avatar guard tests if present.

7. **Owner QA execution** — Phased walkthrough [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md); tick [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) checkboxes. Owner-only.

---

## Close criteria

Every row in **Partial**, **Not started / Blocked**, and **Owner-only** is either:

- Moved to **Done** with evidence, or
- Accepted as **Partial-with-acceptance** (documented acquirer decision), or
- Listed under **Intentional exclusions**

When close criteria met → owner QA on `qa_launch_2026` may begin.
