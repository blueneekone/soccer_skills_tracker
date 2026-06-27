# SSTracker — Acquisition FAQ

**Last updated:** 2026-06-25

---

## Product & market

### What is SSTracker?

A multi-tenant **youth sports operating system** for any team sport — combining **club operations** (RSVP, registration, tryouts, eligibility) with a **player development HUD** (Train, XP, coach intents, cadence, RL homework) and **compliance-first** parent/coach comms. Sport semantics configure via `sports_configs/{sportId}`.

### Is this soccer-only?

**No.** Architecture is **sport-configurable** — attribute trees, drill taxonomy, and copy skin per `sportId` ([`SPORTS_CONFIGS.md`](../SPORTS_CONFIGS.md)). The QA tenant (`qa_launch_2026`) is **soccer-configured** for manual testing; that is the documented gold path, not proof of a soccer-only product. Multiple sports are **not** claimed fully content-complete at launch — claim **platform readiness** + soccer QA path.

### Who should acquire?

**Multi-sport platforms** (TeamSnap, SportsEngine, LeagueApps, GameChanger, Stack Sports, Hudl adjacency) missing the **daily development engagement loop** and **COPPA-native household comms**. Vertical soccer buyers (GotSport adjacency) fit when they want tryout OS + development layer, not federation API as the sole day-one requirement.

### Who are the competitors?

Primarily **TeamSnap ONE**, **SportsEngine HQ**, and **GotSport**. SSTracker does not compete on live streaming or club website builders — it wins on development loop + COPPA/SafeSport depth. See [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md).

### Is this production-ready?

**Functionally:** Wave 0–2 code is shipped; functional audit A–F closed.  
**Operationally:** Full backend deploy + owner human QA on [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) remains.  
**Commercially:** Pre-revenue — see [TRACTION.md](./TRACTION.md).

### Why would an acquirer buy vs build?

- **18+ months equivalent** of persona OS, cell architecture, compliance callables, and test guards in one repo
- **Moat features** (VPC ceremony, SafeSport DM blocks, intent→Train lock, tryout OS) are wired end-to-end, not slideware
- Remaining work is deploy + polish + GTM, not greenfield

---

## Technical

### What is the stack?

SvelteKit 5 + Svelte 5 Runes · Firebase (Auth, Firestore, Functions v2, Hosting, FCM) · Stripe · Vitest · Playwright. Details: [`ARCHITECTURE.md`](../ARCHITECTURE.md).

### What are "cells"?

Physically separate Firestore databases per shard (`cellId`) so one large federation cannot throttle others. Routing via `apiGateway` + JWT claims. See ARCHITECTURE §1.2.

### Why seven Cloud Functions codebases?

Deploy isolation and cold-start bundling — `core`, `rl`, `compliance`, `platform`, `commerce`, `integrations`, plus slimming monolith. **All must be deployed** for callables to resolve. [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md).

### Does `npm run check` pass?

Not cleanly — pre-existing TypeScript debt outside functional MVP paths. **`npm run build` passes** and is the shipping gate.

### Where is QA hosted?

https://sstracker.app on Firebase project `sports-skill-tracker-dev` — treat as live-fire, not throwaway sandbox.

---

## Compliance

### How is COPPA handled?

Household waiver + per-child VPC ceremony; server writes `consent_records` and audit rows; operative login gated until consent complete. No director approval in standard path. [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md).

### How is SafeSport handled for messaging?

Coach→minor unsupervised DMs blocked at callable + rules layer; household threads give parents visibility. Epic 4.2 Done.

### Is there a SOC 2 report?

No — acquirer should schedule independent assessment. Overview: [SECURITY.md](./SECURITY.md).

---

## Gaps & roadmap

### What is intentionally NOT built?

Club website CMS, native App Store binaries (PWA at launch), GotSport-grade federation API, live streaming CDN. [NOTABLE_GAPS.md](./NOTABLE_GAPS.md).

### What about avatar / character art?

**Deferred post-launch** — shipping `defaultPortraitV2` SVG + initials only.

### What is left before commercial launch?

1. `LAUNCH-deploy-dev` — all deploy targets on dev  
2. P2 polish (payments, reg→roster UX)  
3. Owner QA phases in [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)

---

## Acquisition process

### What gets transferred?

Git repo, Firebase projects (IAM handoff), secrets vault, domain DNS, third-party accounts (Stripe, Checkr). [TRANSFER.md](./TRANSFER.md).

### How long to onboard an engineering team?

Estimate **2–4 weeks** to first green deploy + VPC demo for a team familiar with Firebase; add time for security review and secret rotation.

### Is there customer data?

QA tenant only in documented scripts — acquirer should inventory Firestore before production use.

### Can we see a demo?

Yes — follow [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) on https://sstracker.app with provisioned QA tenant.

---

## Document map

→ [INDEX.md](./INDEX.md) · [PROSPECTUS.md](./PROSPECTUS.md) · [ONE_PAGER.md](./ONE_PAGER.md)
