# SSTracker — One Pager

**The development OS for clubs that have outgrown schedule-and-chat.**

---

## Problem

Youth sports clubs use TeamSnap or SportsEngine for schedules, RSVPs, and payments — then bolt on spreadsheets, group texts, and waiver PDFs for **athlete development** and **minor safety**. No incumbent owns the loop from coach intent → player training → XP → parent visibility with **COPPA-native** architecture.

## Solution

**SSTracker** is a multi-tenant SaaS platform (Player · Parent · Coach · Director) built on **SvelteKit 5 + Firebase**. It ships:

- **Player OS** — missions, Train logging, XP/skill tree, coach bounties, RL adaptive homework
- **Parent OS** — household graph, VPC ceremony, co-op logging, SafeSport-gated messaging
- **Coach OS** — Intent Engine, spatial drill designer, match-day, tryout lifecycle
- **Director OS** — eligibility matrix, field ops, compliance audit, registration

## Moat (hard to copy)

| Capability | Why it matters |
|------------|----------------|
| Train → XP → coach intent loop | Daily engagement competitors lack |
| Household-gated comms | No coach→minor unsupervised DM (rules + callables) |
| VPC + consent records + minor retention | COPPA depth beyond checkbox waivers |
| Cell-isolated Firestore | Federation-scale tenant blast-radius control |
| RL adaptive homework (Epic 8) | Policy/heuristic drill queue on player HQ |

## Table stakes (shipped in code)

RSVP · registration-lite + Stripe path · roster invite · tryouts OS (reg → eval → callback → roster) · eligibility matrix · parent push/calendar · PWA install.

## Stage

- **Functional OS:** Wave 0–2 code **Done** ([`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md))
- **Next gate:** Full backend deploy to dev + owner QA ([`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md))
- **Revenue:** Pre-commercial · live-fire QA at https://sstracker.app

## Intentional gaps

No drag-and-drop club website CMS · no App Store binaries yet (PWA + Capacitor path) · no GotSport-grade 38-body federation API (CSV v1). See [NOTABLE_GAPS.md](./NOTABLE_GAPS.md).

## Stack

Svelte 5 Runes · SvelteKit · Firebase (Auth, Firestore cells, Functions v2, Hosting, FCM) · Stripe · Vitest · Playwright

## Diligence entry

→ [INDEX.md](./INDEX.md) · [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [PROSPECTUS.md](./PROSPECTUS.md) · [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
