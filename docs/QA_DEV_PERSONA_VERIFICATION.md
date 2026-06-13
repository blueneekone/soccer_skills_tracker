# Dev QA — phased pair-programming (Coach · Parent · Player)

**Environment:** `sports-skill-tracker-dev` (backend) · **Primary QA URL:** https://sstracker.app (canonical; Firebase/auth tied to main domain — not `*.web.app` alone)  
**Branch:** `dev`  
**Authority:** [`FUNCTIONAL_MVP.md`](vision/FUNCTIONAL_MVP.md) · [`FUNCTIONS_DEPLOY.md`](FUNCTIONS_DEPLOY.md)

Run **one phase per session** with the agent as your second pair of eyes. Paste phase results (pass/fail + notes) back into chat; agent updates blockers and tells you what to run next.

---

## How to pair-program with the agent

1. Confirm **Phase 0** deploy checklist is green (below).
2. Say: **"Start Phase N"** (e.g. *Start Phase 2 — Parent VPC*).
3. Run the steps in that phase on dev; report what you see (screenshots optional).
4. Agent checks expected vs actual, logs blockers, and clears you for the next phase.

**Do not skip Phase 0.** Phases 1–7 assume full stack on dev.

---

## Phase 0 — Full dev deploy (operator, agent-assisted)

Run before any human QA. Agent can execute; you confirm green checks.

| Step | Command / action | Pass |
|------|------------------|------|
| 0.1 | `firebase use sports-skill-tracker-dev` | [ ] |
| 0.2 | Copy `.env` into split codebases (see `FUNCTIONS_DEPLOY.md`) | [ ] |
| 0.3 | `$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"` (PowerShell) | [ ] |
| 0.4 | `npm run build` | [ ] |
| 0.5 | `firebase deploy --only firestore:rules,storage` | [ ] |
| 0.6 | `npm run deploy:backend:systematic` (core → rl → platform → commerce → compliance → integrations; ~15–25 min) | [ ] |
| 0.7 | `npm run deploy:comms` (default monolith messaging batch) | [ ] |
| 0.8 | `firebase deploy --only hosting` | [ ] |
| 0.9 | Hard refresh https://sstracker.app/login | [ ] |

**Sign out (all personas):**

| Persona | Path |
|---------|------|
| Player | `/player/settings` → **Danger** → **Sign out** |
| Parent | `/parent/household` → Sign out (footer) |
| Coach / Director / Admin | Sidebar **Sign out** or header **Disconnect** |

**Stuck without deploy?** Incognito window, or browser DevTools → Application → Clear site data for `sstracker.app`.

**Automated smoke (local, optional):**

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm run build
```

**Deploy record (fill after Phase 0):**

| Field | Value |
|-------|-------|
| Date | |
| Git commit | |
| Hosting deploy | |
| Backend systematic | |
| Comms deploy | |
| Rules deploy | |

---

## QA tenant & accounts

**Tenant:** club **`qa_launch_2026`**, team **`qa_launch_2026_ppc`**  
**Provision:** `node scripts/dev-tenant-reset.mjs --provision`

| Role | Account (example) |
|------|-------------------|
| Super admin | `ecwaechtler@gmail.com` |
| Parent | `ecwaechtler+parent@gmail.com` |
| Coach | `ecwaechtler+coach@gmail.com` |
| Player | Operative linked via parent household |

---

## Phase 1 — Admin bootstrap & platform surfaces

**Account:** super_admin  
**Goal:** Tenant exists; admin verification routes stable.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1.1 | Sign in → passkey if prompted | Lands on admin shell | [ ] |
| 1.2 | `/admin/overview` | Loads; security feed or empty state (no spinner loop) | [ ] |
| 1.3 | `/admin/audit-log` | Loads **once**; table or error (not infinite "Decrypting…") | [ ] |
| 1.4 | `/admin/coach-clearance` | SIEM panopticon; breadcrumb; matrix or empty | [ ] |
| 1.5 | Confirm QA club/team/users exist | `qa_launch_2026` visible in org tools | [ ] |

**Report to agent:** pass/fail per row + any console errors.

---

## Phase 2 — Parent verification (identity + VPC)

**Account:** parent  
**Goal:** Household + VPC unlock child training routes.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 2.1 | Magic link → passkey enrollment | Reaches parent shell | [ ] |
| 2.2 | `/parent/household` | Linked operative(s); waiver signed | [ ] |
| 2.3 | `/parent/vpc` | VPC ceremony completes per child | [ ] |
| 2.4 | Firestore spot-check (optional) | Child `vpcStatus: verified`, `coppaStatus: granted` | [ ] |
| 2.5 | `/parent/dashboard` | Co-op Command loads; no infinite spinner | [ ] |

**Report to agent:** child email tested, VPC outcome, blockers.

---

## Phase 3 — Coach verification (clearance gate)

**Account:** coach (uncleared OK for first pass)  
**Goal:** Clearance SIEM gate → cleared coach reaches HQ.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 3.1 | Sign in uncleared coach | Redirect to `/compliance` | [ ] |
| 3.2 | `/compliance` UI | Void/navy SIEM (not white Material pills) | [ ] |
| 3.3 | QA simulate clearance (director/admin panopticon) OR Checkr path | Coach `clearance.status` updates | [ ] |
| 3.4 | Coach sign out / back in | Lands on `/coach` (not stuck on compliance) | [ ] |
| 3.5 | `/director/compliance` (as director/admin) | Matrix loads once; tenant audit log below, no reload loop | [ ] |

**Report to agent:** clearance path used (simulate vs Checkr), final landing route.

---

## Phase 4 — Player verification (HQ + Train)

**Account:** player (child, post-VPC)  
**Goal:** HQ loop + training log + XP.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 4.1 | Child login | No `/vpc-pending` block | [ ] |
| 4.2 | `/player/dashboard` | Identity, missions rail, telemetry | [ ] |
| 4.3 | Portrait | `defaultPortraitV2` or initials (no broken PNG stack) | [ ] |
| 4.4 | `/player/workout` free log | Session logs; duration max 120 min | [ ] |
| 4.5 | HQ after log | XP / streak updates | [ ] |
| 4.6 | Adaptive homework band | Visible on HQ (heuristic OK) | [ ] |

**XP smoke (optional):**

- [ ] 3×25 reps, bilateral off → 75 reps in log
- [ ] 1×10 reps, bilateral on → 20 reps

**Report to agent:** XP numbers if smoke run, any gate blocks.

---

## Phase 5 — Coach → Player handoff

**Accounts:** coach + player (same session or back-to-back)  
**Goal:** Intent deploy → HQ mission → locked Train prescription.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 5.1 | Coach `/coach/forge` | Deploy intent to test player | [ ] |
| 5.2 | Player HQ | Bounty/intent on mission rail | [ ] |
| 5.3 | Accept → Start session | `/player/workout` locked by coach | [ ] |
| 5.4 | Complete log | XP on HQ; intent marked progress | [ ] |

**Report to agent:** intent type, drill name, whether lock fields match prescription.

---

## Phase 6 — Parent verification of work (B4 + Co-op)

**Accounts:** parent (+ coach if testing proof flag)  
**Goal:** Advisory parent proof + bounty funding path.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 6.1 | Coach intent with `requiresParentVerification` (if testing) | Player can submit proof | [ ] |
| 6.2 | `/parent/dashboard` proof queue | Pending item appears | [ ] |
| 6.3 | Parent approve proof | Coach sees verified mark; media gated pre-approval | [ ] |
| 6.4 | Bounty terminal | Funding linked or honest Stripe error | [ ] |
| 6.5 | `/parent/log-workout` | Co-op log affects child progress | [ ] |
| 6.6 | Car Ride debrief | Surfaces when fixture pending | [ ] |

**Report to agent:** proof flow outcome, bounty funding state.

---

## Phase 7 — Comms cross-persona

**Accounts:** coach, parent, player (as needed)  
**Goal:** Persona skins + SafeSport gates.

| # | Step | Expected | Pass |
|---|------|----------|------|
| 7.1 | `/messages` as player | Gold comms skin | [ ] |
| 7.2 | `/messages` as coach/parent | Cyan comms skin | [ ] |
| 7.3 | Coach → minor DM attempt | Blocked with clear error | [ ] |
| 7.4 | Parent Lounge / household thread | Send + receive | [ ] |
| 7.5 | Coach `/coach/logistics` | Compose announcement → parent inbox | [ ] |

**Report to agent:** which channels tested, any send failures.

---

## Phase 8 — Mobile spot check (optional)

Repeat **4.2**, **5.2**, **6.4**, **7.1** at **390px** width.

| # | Check | Pass |
|---|-------|------|
| 8.1 | Document scroll only (no trapped inner scroll on Player HQ) | [ ] |
| 8.2 | Bottom nav / mobile chrome usable | [ ] |

---

## Session log (copy into chat each phase)

```
Phase: 
Tester: 
Commit / deploy date: 
Results: 
Blockers: 
Screenshots/console: 
Agent sign-off for next phase: 
```

---

## Final sign-off

| Phase | Date | Pass |
|-------|------|------|
| 0 Deploy | | [ ] |
| 1 Admin | | [ ] |
| 2 Parent VPC | | [ ] |
| 3 Coach clearance | | [ ] |
| 4 Player HQ/Train | | [ ] |
| 5 Coach→Player | | [ ] |
| 6 Parent proof/Co-op | | [ ] |
| 7 Comms | | [ ] |
| 8 Mobile (opt) | | [ ] |

**Blockers →** [`FUNCTIONAL_AUDIT_BACKLOG.md`](FUNCTIONAL_AUDIT_BACKLOG.md) or GitHub issue.
