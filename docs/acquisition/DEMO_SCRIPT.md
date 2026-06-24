# SSTracker — Demo Script

**Environment:** https://sstracker.app (Firebase `sports-skill-tracker-dev`)  
**Duration:** ~45 minutes (full) · ~15 minutes (exec cut)  
**Authority:** [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) · [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)

---

## Before you start

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

```bash
node scripts/dev-tenant-reset.mjs --provision --club-id qa_launch_2026 --team-id qa_launch_2026_ppc
```

Provision **auto-purges** orphaned `@operative.local` Auth/users rows so operative callsigns can be reused between QA sessions.

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

---

## Exec cut (15 min)

**Narrative:** *"Schedule tools stop at the calendar. SSTracker closes the development loop with compliance built in."*

| Step | Persona | Action | Talk track |
|------|---------|--------|------------|
| 1 | Parent | Sign in → `/parent/household` | Household graph — one guardian, linked operatives |
| 2 | Parent | `/parent/vpc` — grant VPC | COPPA ceremony; server writes consent records (no director approval step) |
| 3 | Coach | `/coach/forge` — deploy intent to player | Coach prescription: sets/reps/RPE |
| 4 | Player | `/player/dashboard` — accept bounty → **Start session** → Train | Locked-by-coach Train after explicit arm; log workout → XP + cadence on HQ. **Talk track:** *"Multi-day assignments credit one session per UTC day — coach sets frequency in Forge; player sees X/N this week on HQ."* Optional 30s: point at **Adaptive homework** band — *"Heuristic drill from coach intent + club libraries; RL ramp is ops-controlled (`abPercent`)."* |
| 5 | Parent | `/parent/dashboard` — co-op / schedule strip | Parent parity: RSVP, push prefs, `.ics` export |
| 6 | Any | `/messages` | SafeSport — no coach→minor unsupervised DM |

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
4. **Logistics** — `/coach/logistics`
   - Compose parent announcement (`safeSportBroadcast`)

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

1. **`/messages`** — Parent Lounge / household threads
2. Attempt coach→player DM (minor) — **blocked** by policy
3. Mention Epic 4.2 guards in `commsSprint42.test.ts`

---

## Demo fallbacks

| Issue | Fallback |
|-------|------------|
| Callable not found | Say: "Deploy grouping — code shipped, needs `deploy:core` on this project" |
| RL pill missing | Expected at `abPercent: 0` — show Adaptive Homework heuristic list |
| Empty roster | Run dev-tenant-reset provision; coach must have team selected |
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
