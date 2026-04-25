# PROJECT PHOENIX (SSTRACKER) - THE BILLION-DOLLAR ROADMAP
**Vision:** The dominant Global Sports Data Ecosystem, eclipsing PlayMetrics and HUDL. 
**Core Philosophy:** Enterprise UI (SIEM/SOAR standard), secure multi-tenant data, and addictive gamification (TCG dynamics).

## COMPLETED EPICS
- **Epic 1:** Foundation & Stability (Svelte 5 Runes, Firebase Multi-Tenant Auth).
- **Epic 2:** The Tactical UI (Global Shell Refactor, Context Switcher).
- **Epic 3:** The Gamification Engine (Player Command Center, Operative Dossier UI).
- **Epic 4:** The Coach OS (Tactical Board, Roster Telemetry, Mission Dispatch).

## CURRENT PHASE: EPIC 5 - THE ENTERPRISE LOGISTICS ENGINE
**Architecture Shift:** Unified Telemetry Bus, Zero-Trust COPPA Compliance, Safe-Comms Triad.

### Sprint 5.1: The Household Provisioning Engine (COPPA Lock) [ ACTIVE ]
- Tear down standard open-signup flows.
- Build Parent-First invite flow, liability waiver digital signatures, and `coppaSigned` verification.
- Build the Operative Generation system (Parents spawn child login credentials).

### Sprint 5.2: Director OS & Registrar Consolidation
- Nuke the standalone `/registrar` application.
- Build the "Compliance Matrix" into the Director OS to track Household onboarding and billing states.

### Sprint 5.3: The Logistics & Scheduling Matrix
- Build the Facility Vault (where Directors map field GPS coordinates).
- Build the tactical deployment calendar for practice and match scheduling.

### Sprint 5.4: The Meteorological Defense System
- Integrate a Weather API (Tomorrow.io / StrikeAlert) with Firebase Cloud Functions.
- Logic Lock: If Lightning Strike = True AND distance to Field Coordinates <= 6 miles THEN Field Status = LOCKED.

### Sprint 5.5: Safe-Comms & FCM Push Network
- Implement Firebase Cloud Messaging (FCM).
- Build the Broadcast system for Coaches/Directors.
- Build the Triad Protocol (Player + Parent + Coach). ZERO 1-on-1 private messaging allowed for minors.

### Sprint 5.6: Stripe Monetization Engine & Director Portal
- Integrate Stripe for B2B Club licensing and B2C Parent dues. 
- Build the Logic Gate: Tie compliance/billing status to the Player OS lockout function.

## FUTURE PHASE: EPIC 6 - THE DOPAMINE ENGINE & RECRUITING
- **Sprint 6.1:** The Global & Club XP Leaderboards.
- **Sprint 6.2:** TCG Loot Box Engine (XP tracking, digital pack-opening animations).
- **Sprint 6.3:** The Digital Binder (Pro Cards, Peer Cards, Holographic self-upgrades).
- **Sprint 6.4:** Scout Network & VPC Gating (Charge colleges SaaS fees to view verified player highlight reels).

---

## Next major phase — Sprint 6: The Quartermaster (The Player Reward Economy)

**Objective:** Gamify the Player OS through cosmetic progression to drive sustained engagement with telemetry logging.

**Note:** This phase name shares the “Sprint 6” label with the epic list above; treat the Quartermaster as the **Player OS reward-economy** track (cosmetics + spendable currency from real activity). Leaderboards / TCG / recruiting items in Epic 6 can run in parallel or be sequenced after logistics (Epic 5) as capacity allows.

### Core features

**The XP engine**  
Convert logged workouts and Game Day stats into a spendable digital currency (e.g. **Credits** or **Rep**).

**The Armory (cosmetic shop)**  
A UI where players spend that currency on non-pay-to-win upgrades.

**Avatar upgrades**  
Unlock new [DiceBear](https://www.dicebear.com/) API styles (e.g. move from `bottts` to `pixel-art`, `lorelei`, or other packs) as rewards.

**ID card themes**  
Unlock new Tailwind-driven border styles and background effects for the 3D flipping Operative ID card (e.g. **Neon Demon**, **Glitch-Hacked**).

### Architecture rules

- Store **only string references** for unlocked / equipped cosmetics on the user’s Firestore document (e.g. `equippedTheme: 'neon'`, `avatarStyle: 'pixel-art'`), keyed from a small server- or client-side catalog.
- **Zero extra storage overhead** for asset binaries: cosmetics are rendered from known presets + API params, not uploaded files.