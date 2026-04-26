# PROJECT PHOENIX (SSTRACKER) - THE BILLION-DOLLAR ROADMAP

## Product Vision & Ecosystem

North-star **Core Ecosystem Directives** for every product decision, feature, and sprint. All future development should trace back to these four pillars: (1) Player OS, (2) Coach OS, (3) Parent OS, and (4) agnostic multi-sport architecture—plus the **Ultimate Metric** below, which governs prioritization and tradeoffs.

### The Ultimate Metric (Player & Parent First)

Every feature must be evaluated through this lens:

- **Does it increase a player’s physical engagement and skill development?**
- **Does it provide tangible ROI and security peace-of-mind for the parent?**

Administrative ease is **secondary** to user growth. Staff tooling and back-office efficiency matter, but they must not outrank player/parent value when priorities collide.

### Player OS (Weaponized Gamification)

Implement deep RPG progression mechanics. At-home physical training must be converted into **XP**, unlocking **ranks**, **visual ID card upgrades**, and **Quartermaster** currency. The goal is to maximize **daily active engagement** and **physical outdoor activity**.

### Coach OS (Tactical Telemetry)

Move beyond static scheduling. Create **automated feedback loops** where game-day statistical deficiencies seamlessly generate at-home training **Bounties** for the roster.

### Parent OS (ROI & Security)

Provide parents with visual **Skill Trees** tracking their athlete’s development, wrapped in an **impenetrable, zero-trust COPPA compliance vault**.

### Agnostic Multi-Sport Architecture

The platform is **not** strictly a soccer app. All database schemas, telemetry loggers, Player ID cards, and Tactical Boards must be **sport-agnostic**. UI elements and stat tracking must **dynamically populate** from a central configuration mapping—e.g. terminology, court or pitch SVGs, and sport-specific metrics driven by the active team’s **`sport`** attribute. **Never** hardcode sport-specific strings into core components.

**Long-term scaling:** When a new sport is added, its configuration block **must** ship as a complete **5-Pillar Sport Payload**:

1. **Taxonomy** — Positions (and any sport-specific role/lineup model).
2. **Telemetry Dictionary** — Game stats and event vocabulary the loggers and dashboards understand.
3. **Combine Metrics** — Recruiting baselines and measurable benchmarks for that sport.
4. **Tactical Assets** — Pitch/court SVGs, tokens, and board chrome for the tactical surfaces.
5. **Baseline Workout Libraries** — Sport-specific drills wired into the gamification engine (XP, bounties, progression).

This payload is the contract between “multi-sport” branding and real product depth: no sport ships as a thin rename of another.

### The Admin AI Generator (Enterprise / future)

**Admin OS — future Enterprise feature:** a **generative AI** tool that automatically researches and formats the **5-Pillar Sport Payload** for any new sport a Director requests—reducing or eliminating manual hardcoding of sport packs. Logged here as a north-star capability for platform scale, not a near-term commitment date.

---

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

---

## Phase 9: The Automated Dispatch Engine (AI Coach)

**Mission profile:** Close the loop between **field performance** and **at-home execution** without adding staff overhead. The platform becomes a **tactical co-pilot**: every logged workout is a **signal**; the system responds with **targeted, standards-aligned homework**—while preserving **Command authority** as non-negotiable.

### Core loop (Gen 2 server surface)

- **Trigger:** A **Gen 2 Firebase Cloud Function** named **`onWorkoutLogged`**, bound to the canonical path where **player workout submissions** land (e.g. `workout_logs` / training-session writes, aligned with existing `logTrainingSession` and Player OS mirrors).
- **Evaluate:** The function **scores or classifies** the submission against **performance thresholds** (per sport pack, per team policy, and per athlete baseline where configured)—not a black-box “AI score,” but a **rules engine + optional model tier** you can audit.
- **Dispatch:** On a match condition, the engine **injects** a **targeted homework payload** into the athlete’s **`activeAssignments` / Action Inbox** surface (same contract the Player OS already reads for “drills due”), so the **next best rep** is always one tap away.
- **Observability:** Every injection is **traceable** (function run id, source workout id, threshold branch, target assignment id)—**Enterprise SOAR** standard: no silent state changes in production.

### The Command Override Protocol

**This is a hard rule, not a preference.**

- **Human Coach curriculum is sovereign.** If a **Coach** has **active manual assignments** for a player or team, or a **curriculum / drill track locked in** (explicit scope: player, roster, or team), the Automated Dispatch Engine **must not** overwrite, supersede, or “fight” that contract.
- **Deferral path (default when Command is in control):** The Cloud Function **defers to the Coach’s parameters**—thresholds, suggested homework, and delivery windows are **reconciled** against what Command already published.
- **Assisted path (when auto-dispatch would add value without seizing the roster):** If the engine proposes homework that is **not** already covered by a locked curriculum, the pipeline **routes the suggestion to the Coach** (Director OS / Coach surface) for **one-click approval** before it is written as a player-facing assignment. **No auto-assignment** to the athlete without that gate when an override or lock is active.
- **Rationale:** Minors, liability, and club trust require **an accountable human** on the field side of the wire. Automation **augments** Command; it does **not** replace the **Chain of Command**.

**Principle:** *Instrument everything. Decide nothing over a Coach that has already staked the curriculum.*