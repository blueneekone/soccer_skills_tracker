# VANGUARD PROTOCOL: MASTER DEVELOPMENT ROADMAP
**Project:** Nexus Command (Soccer Skills Tracker SaaS)
**Architecture:** Svelte 5 (Strict), Firebase (Auth, Firestore, Storage), Tailwind CSS
**Design Language:** SIEM / Tron / Cyberpunk (Dark mode, glassmorphism, mono-fonts)

## 📌 EPIC 1: THE TACTICAL WAR ROOM (Current Focus)
**Objective:** Finalize the interactive zero-gravity coaching board.
- [x] Establish fullscreen layout containment and Trinity Pattern structure.
- [ ] **Task 1.1:** Wire `onpointerdown`/`onpointermove` events to the Svelte 5 `$state` array for drawing tactical routes.
- [ ] **Task 1.2:** Connect Context Menu to spawn draggable player magnets (Entities).
- [ ] **Task 1.3:** Implement save/load functionality to push tactical layouts to Firestore (`/tactics/{tacticId}`).
- [ ] **Task 1.4:** Add playback animation capability (animating entities along drawn routes).

## 📌 EPIC 2: VANGUARD MISSION CONTROL (The Coach's Hub)
**Objective:** The central nervous system for coaches to manage rosters, evaluate talent, and assign development tracks.
- [ ] **Task 2.1:** Roster Grid: Build a high-density, `font-mono` data table for the active squad. Sortable by position, level, and recent activity.
- [ ] **Task 2.2:** Player Radar: Implement D3.js or pure SVG radar charts for player skill attributes (Pace, Passing, Shooting, Defense, Physical).
- [ ] **Task 2.3:** Attendance & Readiness Tracker: Quick-toggle interface for match-day and practice availability.
- [ ] **Task 2.4:** The Evaluation Engine: Form-based modal for coaches to log post-match performance grades, which feed directly into the player's XP.

## 📌 EPIC 3: THE PLAYER TERMINAL (Gamification Engine)
**Objective:** The player-facing interface where they track their progression, unlock achievements, and view coach feedback.
- [ ] **Task 3.1:** `LevelProgressRing`: Build the dynamic SVG ring using `$derived` math to calculate XP to the next tier.
- [ ] **Task 3.2:** The Skill Tree: A node-based UI where players can see unlocked skills (e.g., "Weak Foot Mastery", "Vision") and what is required to unlock the next node.
- [ ] **Task 3.3:** Mission Log: A quest-style interface displaying tasks assigned by the coach (e.g., "Log 30 mins of juggling this week").
- [ ] **Task 3.4:** Leaderboards (Opt-in only): Anonymous or alias-based ranking system for internal squad competition.

## 📌 EPIC 4: MULTI-TENANT SAAS & LEAGUE INFRASTRUCTURE
**Objective:** Architect the database and auth to support multiple independent clubs and leagues seamlessly.
- [ ] **Task 4.1:** Firebase Custom Claims: Implement Cloud Functions to assign `admin`, `coach`, or `player` roles, plus `tenantId` (Club ID) to auth tokens.
- [ ] **Task 4.2:** Invite System: Generate secure, time-limited magic links or codes for coaches to invite players to their specific roster.
- [ ] **Task 4.3:** Season/League Management: Data structures to archive past seasons and manage current league fixtures, opponent tracking, and match results.
- [ ] **Task 4.4:** Organization Dashboard: For club directors to manage multiple coaches and teams under one umbrella.

## 📌 EPIC 5: ZERO-TRUST SECURITY & COPPA COMPLIANCE
**Objective:** Lock down youth data with absolute strictness.
- [ ] **Task 5.1:** Firestore Security Rules (Strict Mode): Enforce rules so a user can *only* read data where `resource.data.tenantId == request.auth.token.tenantId`.
- [ ] **Task 5.2:** Data Masking: Ensure player PII (names, ages, contact info) is strictly segregated from public or cross-team analytics.
- [ ] **Task 5.3:** Parental Consent Flow: Implement a dual-auth verification step for accounts registered to players under 13.
- [ ] **Task 5.4:** Automated Audit Logs: Track whenever a coach modifies a player's core profile or evaluation data.

## 📌 EPIC 6: OPTIMIZATION & DEPLOYMENT TARGETS
**Objective:** Prepare the application for production launch with high performance.
- [ ] **Task 6.1:** SvelteKit SSR/CSR Tuning: Ensure the Mission Control dashboard is client-side rendered for immediate interactivity, while marketing pages are pre-rendered.
- [ ] **Task 6.2:** PWA Configuration: Add the Web App Manifest and Service Workers so players can install the tracker on their phones directly from the browser.
- [ ] **Task 6.3:** Firestore Pagination: Implement cursor-based pagination for the Roster and Event Logs to prevent massive document read spikes.
- [ ] **Task 6.4:** Final Deployment pipeline setup (GitHub Actions to Vercel/Firebase Hosting).

---
**Cursor AI Execution Protocol:**
When instructed to "execute next task", the AI must:
1. Parse this roadmap to find the first unchecked `[ ]` item.
2. Outline the intended Svelte 5 and Firestore architecture required for the task.
3. Wait for Architect (User) approval.
4. Write clean, non-appended code adhering to the Vanguard `.cursorrules`.
5. Mark the task `[x]` upon successful local compilation.