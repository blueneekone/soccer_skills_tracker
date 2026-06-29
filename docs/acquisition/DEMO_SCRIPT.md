# SSTracker — Demo Script

**Environment:** https://sstracker.app (Firebase `sports-skill-tracker-dev`)  
**Preferred demo URL:** https://sports-skill-tracker-dev.web.app (use when custom domain SSL fails)  
**Duration:** ~45 minutes (full) · ~15 minutes (exec cut)  
**Authority:** [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) · [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)

---

## Before you start

**Secrets & env:** [`DEMO_ENV_SECRETS_RUNBOOK.md`](./DEMO_ENV_SECRETS_RUNBOOK.md) — Tier 0–3 checklist before buyer demo.

### Phase 0 — confirm deploy green

If features fail with "callable not found", backend is not fully deployed. Operator runs:

```bash
firebase use sports-skill-tracker-dev
export FUNCTIONS_DISCOVERY_TIMEOUT=120
npm run build
firebase deploy --only firestore:rules,storage
npm run deploy:backend:systematic
npm run deploy:comms
firebase deploy --only hosting
```

Full checklist: [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md) · [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) Phase 0

### QA tenant

**First-time / broken tenant** — full provision (purges orphaned operatives, resets household shell):

```bash
node scripts/dev-tenant-reset.mjs --provision --club-id qa_launch_2026 --team-id qa_launch_2026_ppc
```

**Between demos (same operative)** — stats-only reset; preserves Auth, household `playerEmails`, VPC/consent:

```bash
node scripts/dev-tenant-reset.mjs --reset-demo-stats --club-id qa_launch_2026
# Owner replies "approved execute", then:
node scripts/dev-tenant-reset.mjs --reset-demo-stats --execute --club-id qa_launch_2026
```

Kept operative: auto-detected from `households/qa_launch_2026_parent_hh` → `playerEmails[0]`, or `--keep-operative-email <child@operative.local>`.  
Does **not** delete Auth users, `consent_records`, or household links. Wipes XP, missions, bounties, reps, team-scoped comms artifacts.  
Demo avatar seeds automatically on `--execute` (skip with `--skip-demo-avatar`). Artifact: `artifacts/firestore-reset-{date}/DEMO_STATS_RESET.md`.

Provision **auto-purges** orphaned `@operative.local` Auth/users rows so operative callsigns can be reused between QA sessions (**`--provision` only** — not stats reset).

| Field | Value |
|-------|-------|
| Club | `qa_launch_2026` |
| Team | `qa_launch_2026_ppc` |
| Team dispatch code | `QA-PP26` (coach → parent household link) |

| Role | Account |
|------|---------|
| Super admin | `ecwaechtler@gmail.com` |
| Parent | `ecwaechtler+parent@gmail.com` |
| Coach | `ecwaechtler+coach@gmail.com` |
| Player | Operative linked via parent household |

Use **incognito** or sign out between persona switches ([`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)).

### Owner QA status (2026-05-22)

| Item | Status |
|------|--------|
| Phase 5 owner sign-off | **Complete** on `qa_launch_2026` — exec cut steps 1–5 |
| Step 6 (SafeSport `/messages`) | **Verify before final video cut** — GP-ACQ-06 / QA-153 / QA-406 |
| Recorded demo video | **Not yet in data room** — placeholder for future `docs/acquisition/demo/` or static path; do not claim video asset exists |

---

## Exec cut (15 min)

**Narrative (multi-sport OS — open here):** *"Schedule tools stop at the calendar. SSTracker is the youth sports OS for any team sport — it closes the development loop from coach intent → player training → XP → parent visibility, sport-configurable and COPPA-native. Today's demo runs on our soccer-configured QA tenant; the same HUD engine skins per sport via `sports_configs`."*

**Optional 60s architecture beat (after step 4 or during Q&A):** Point to `sports_configs/{sportId}` in [`SPORTS_CONFIGS.md`](../SPORTS_CONFIGS.md) — club `sport` field selects config; Player HUD, Train, and XP loop are identical; attribute tree and drill taxonomy differ per sport.

| Step | Persona | Action | Talk track |
|------|---------|--------|------------|
| 1 | Parent | Sign in → `/parent/household` | Household graph — one guardian, linked operatives |
| 2 | Parent | `/parent/vpc` — grant VPC | COPPA ceremony; server writes consent records (no director approval step) |
| 3 | Coach | `/coach/forge` — deploy intent to player | Coach prescription: sets/reps/RPE |
| 4 | Player | `/player/dashboard` — accept bounty → **Start session** → Train | Locked-by-coach Train after explicit arm; log workout → XP + cadence on HQ. **Talk track:** *"Multi-day assignments credit one session per UTC day — coach sets frequency in Forge; player sees X/N this week on HQ."* Optional 30s: point at **Adaptive homework** band — *"Heuristic drill from coach intent + club libraries; RL ramp is ops-controlled (`abPercent`)."* |
| 5 | Parent | `/parent/dashboard` — co-op / schedule strip | Parent parity: RSVP, push prefs, `.ics` export |
| 6 | Parent | `/messages` | Nav 2.0 hub · Parent Circle · **Message coach** (parent↔coach DM) · household threads · **DeliveryReceipt** on staff sends |
| 6b | Coach | `/coach/logistics?tab=comms` | **Team Comms** pin or Team Ops → Comms — Parent messages · Broadcast announcement · Logistics threads; `/messages` redirects coach JWT here |

---

## Full demo (45 min)

### Act 1 — Parent & compliance (10 min)

1. **Login** — parent magic link / passkey at `/login`
2. **Household** — `/parent/household`
   - Show linked operative(s)
   - Sign household waiver if not already (`parentSignCoppaWaiver`)
   - **Team link:** enter dispatch code `QA-PP26` when provisioning or use **Link to team** for an existing operative
3. **VPC** — `/parent/vpc`
   - Grant consent per child (`parentGrantVpcConsent`)
   - Explain: auto-finalizes `vpcStatus`, writes `consent_records` + `security_audit`
4. **Optional:** provision new operative (`parentProvisionOperative`)

**Proof point:** Competitors use checkbox waivers; SSTracker has auditable consent chain.

### Act 2 — Coach development loop (12 min)

1. **Coach HQ** — `/coach`
   - Squad telemetry, facility/weather (live data — no mock turf strings)
2. **Forge / Intent Engine** — `/coach/forge`
   - Select team drill from **team + club** library (not global-only)
   - Deploy intent with prescription (sets × reps, bilateral, duration, RPE)
3. **Drill designer** — `/coach/drills`
   - Spatial designer saves to `teams/{teamId}/drills`
4. **Team Ops → Comms** — `/coach/logistics?tab=comms`
   - **Team Comms** field pin lands here; coach `/messages` redirects to this tab
   - **Broadcast:** publish team announcement via embedded `ParentAnnouncementCompose` (Announcements channel)
   - Optional depth: **Parent messages** (`parent_coach_dm`), **Logistics** threads in `CommsWorkspaceShell`

**Proof point:** Coach intent appears on player HQ within seconds.

### Act 3 — Player OS (12 min)

1. **HQ** — `/player/dashboard`
   - Identity bento, Active Bounties, Adaptive Homework band
   - Accept coach intent → **Start session**
2. **Train** — `/player/workout`
   - Prescription locked read-only when armed from HQ
   - Log session → confirm XP/streak update on return to HQ
   - **XP smoke:** 3×25 reps bilateral off = 75 rep component (see FUNCTIONAL_MVP)
3. **Armory** — `/player/armory`
   - Default portrait SVG (avatar PNG deferred)
4. **Stats** — `/stats`
   - Telemetry surfaces — calm radar, no nav-tile chrome on analytics

**Proof point:** Daily engagement loop — not a static roster app.

### Act 4 — Club ops & director (8 min)

1. **Public tryout** — `/tryouts/{programId}` (if provisioned)
   - Registration → session RSVP → check-in narrative
2. **Director** — `/director`
   - Compliance tab — read-only VPC audit queue
   - Field ops, eligibility matrix
3. **RSVP** — parent dashboard "this week" strip — going/not/maybe

**Proof point:** Table stakes + tryout OS in one platform.

### Act 5 — Comms & safety (3 min)

**Coach path:** `/coach/logistics?tab=comms` (Team Ops → Comms) — do **not** demo coach browsing `/messages` (coach JWT redirects to Team Ops).

**Parent path:** `/messages` — Nav 2.0 space picker + Families rail.

1. **Coach** — Team Ops → Comms → **Broadcast** (Announcements channel) — parent-targeted `safeSportBroadcast` with inline **DeliveryReceipt**
2. **Parent** — `/messages` — **Parent Circle** (parents post only), household threads, **Message coach** (parent↔coach DM)
3. Attempt coach→player DM (minor) — **blocked** by policy (`commsSprint42.test.ts`) — verify from coach Team Ops surfaces or parent hub as applicable
4. Optional depth: partner offers on **`/parent/dashboard`** strip (not hub rail); parent voice session lobby when flag on

**Note:** If a reviewer hits `/messages` while signed in as coach, they are redirected to `/coach/logistics?tab=comms` — expected behavior.

**Proof point:** SafeSport-native comms — typed channels, parent-first reach, honest delivery semantics.

---

## Demo fallbacks

| Issue | Fallback |
|-------|------------|
| Callable not found | Say: "Deploy grouping — code shipped, needs `deploy:core` on this project" |
| RL pill missing | Expected at `abPercent: 0` — show Adaptive Homework heuristic list |
| Empty roster | Run `--provision` (first time) or `--reset-demo-stats --execute` (repeat) |
| WebAuthn localhost error | Compliance deploy missing `WEBAUTHN_RP_ID=sstracker.app` — see FUNCTIONS_DEPLOY |

---

## Post-demo diligence links

- Architecture deep-dive: [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Security: [SECURITY.md](./SECURITY.md)
- Remaining gaps: [NOTABLE_GAPS.md](./NOTABLE_GAPS.md)
- Transfer: [TRANSFER.md](./TRANSFER.md)

---

## Automated smoke (optional before demo)

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm run build
```
