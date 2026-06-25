# SSTracker — One Pager

**The youth sports OS for any team sport — player addiction, parent co-op, coach development, and club ops in one tenant.**

> The youth sports OS that closes the loop from coach intent → player training → XP/progress → parent visibility — sport-configurable, COPPA-native, with club operations included. Incumbents (TeamSnap, SportsEngine, LeagueApps) own schedule/chat/reg; SSTracker owns **daily development engagement** plus compliance depth.

---

## Problem

Youth sports clubs use TeamSnap or SportsEngine for schedules, RSVPs, and payments — then bolt on spreadsheets, group texts, and waiver PDFs for **athlete development** and **minor safety**. No incumbent owns the loop from coach intent → player training → XP → parent visibility with **COPPA-native** architecture — across **any team sport**.

## Solution

**SSTracker** is a multi-tenant, **sport-configurable** youth sports operating system (Player · Parent · Coach · Director) built on **SvelteKit 5 + Firebase**. Attribute trees and drill catalogs skin per `sportId` via `sports_configs` — same HUD loop, different sport semantics. It ships:

- **Player OS** — addictive training/gaming HUD: missions, Train, XP/skill tree, coach bounties, cadence, armory, RL adaptive homework
- **Parent OS** — co-op partner: household graph, VPC ceremony, co-op logging, proof review, SafeSport-gated messaging (no gamified chrome)
- **Coach OS** — development loop: Intent Engine, spatial drill designer, match-day, tryout lifecycle (flat sideline analytics)
- **Director OS** — club business: eligibility matrix, field ops, compliance audit, registration, tryouts

## Moat (hard to copy)

| Capability | Why it matters |
|------------|----------------|
| Train → XP → coach intent loop | Daily engagement competitors lack |
| Household-gated comms | No coach→minor unsupervised DM (rules + callables) |
| VPC + consent records + minor retention | COPPA depth beyond checkbox waivers |
| Cell-isolated Firestore | Federation-scale tenant blast-radius control |
| RL adaptive homework (Epic 8) | Policy/heuristic drill queue on player HQ |
| Sport-configurable platform | `sports_configs/{sportId}` — same Train/XP/intent loop; attribute tree + drill semantics per sport |

## Table stakes (shipped in code)

RSVP · registration-lite + Stripe path · roster invite · tryouts OS (reg → eval → callback → roster) · eligibility matrix · parent push/calendar · PWA install.

## Stage

- **Platform:** Multi-sport architecture **ready** — sport-configurable via `sports_configs` ([`SPORTS_CONFIGS.md`](../SPORTS_CONFIGS.md))
- **QA tenant:** `qa_launch_2026` is **soccer-configured** for manual testing — not proof the product is soccer-only
- **Functional OS:** Wave 0–2 code **Done** ([`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md))
- **Next gate:** Full backend deploy to dev + owner QA ([`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md))
- **Revenue:** Pre-commercial · live-fire QA at https://sstracker.app

## Intentional gaps

No drag-and-drop club website CMS · no App Store binaries yet (PWA + Capacitor path) · no GotSport-grade 38-body federation API (CSV v1). See [NOTABLE_GAPS.md](./NOTABLE_GAPS.md).

## Stack

Svelte 5 Runes · SvelteKit · Firebase (Auth, Firestore cells, Functions v2, Hosting, FCM) · Stripe · Vitest · Playwright

## Diligence entry

→ [INDEX.md](./INDEX.md) · [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [PROSPECTUS.md](./PROSPECTUS.md) · [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

**PDF downloads:** [Executive brief](https://sports-skill-tracker-dev.web.app/acquisition/sstracker-executive-brief.pdf) · [Prospectus](https://sports-skill-tracker-dev.web.app/acquisition/sstracker-prospectus.pdf) · [Director trust brief](https://sports-skill-tracker-dev.web.app/acquisition/sstracker-director-trust-brief.pdf) · Web hub: [/acquisition](https://sstracker.app/acquisition)
