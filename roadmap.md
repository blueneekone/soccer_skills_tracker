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

## Next major phase — Sprint 6: The Quartermaster (The Player Reward Economy)

**Objective:** Gamify the Player OS through cosmetic progression to drive sustained engagement with telemetry logging.

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

---

## Next major phase — Sprint 7: The Dopamine Engine & Recruiting

- **Sprint 7.1:** The Global & Club XP Leaderboards.
- **Sprint 7.2:** TCG Loot Box Engine (XP tracking, digital pack-opening animations).
- **Sprint 7.3:** The Digital Binder (Pro Cards, Peer Cards, Holographic self-upgrades).
- **Sprint 7.4:** Scout Network & VPC Gating (Charge colleges SaaS fees to view verified player highlight reels).

---

## Next major phase — Sprint 8: Video Telemetry & Advanced Onboarding

**Objective:** Deepen the coach and player experience with **embedded video** in workout flows and **stronger onboarding**—contextual help first, then guided tours—while keeping **storage and infra costs flat** (no raw file hosting for VOD).

### Core features

**The VOD library (zero-cost video)**  
Add video to the **Workout Builder**: coaches paste unlisted YouTube or Vimeo URLs; the app parses and **embeds via iframe** on the Player OS. **No raw `.mp4` uploads** (protects storage and egress costs).

**Interactive app tours & Universal Intel**  
Deploy **universal [ ? ] help modals** across the platform, and eventually upgrade to **interactive, step-by-step tours** (e.g. [Shepherd.js](https://shepherdjs.dev/)) to guide new coaches through **complex drill design** and related workflows.

**Save & deploy**  
Save visual drills as **reusable templates** and **push** them to **specific player cohorts** (targeted delivery on top of the existing coach → squad flows).