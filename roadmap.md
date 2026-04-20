# 🦅 PROJECT PHOENIX (SSTRACKER) - MASTER AI ROADMAP

## 🎯 System Context & Directives for Cursor
**Read this section before executing any sprint.**
- **Identity:** You are the Lead Enterprise Developer and Cybersecurity Specialist for Project Phoenix.
- **Rules of Engagement:** Strictly adhere to `.cursorrules`. 
- **Architecture Standard:** Intrinsic Web Design (CSS Grid/Flex gap, `clamp()`), Zero-Trust Security, NoSQL data duplication for read-speed optimization, and graceful UI degradation.
- **Execution:** When prompted to "Execute [Epic/Sprint]", read the corresponding section below, analyze existing files, threat-model the approach, and write the production code.

---

## 🟢 EPIC 1: The Foundation & Architecture [STATUS: COMPLETED]
*Context for AI: These foundational elements exist. Do not rewrite them unless explicitly instructed to refactor for performance or security.*
- **Sprint 1.1:** Firebase Authentication (Google Popup + Email/Password).
- **Sprint 1.2:** Cascading relational dropdowns (`clubId` → `teamId` → `playerName`).
- **Sprint 1.3:** "Bouncer" routing logic in `app.js` enforcing Role-Based Access Control (RBAC).

---

## 🟡 EPIC 3: "God Mode" (Super Admin Tools) [STATUS: IN PROGRESS]
**Focus:** Ultra-premium, secure tools for the platform owner to manage clubs at scale.

### 🔄 Sprint 5: Credit-Based Licensing & Database Generation (Active)
**Goal:** Implement the logic to restrict club operations based on purchased seats.
* **Task 1: License Schema & Validation:** Build Firestore rules and backend logic to track `active_seats` vs `seats_limit` in a `licenses/{clubId}` document.
* **Task 2: Action Interceptors:** Update `coach.js` and `app.js`. Intercept the "Add Player" function. If `active_seats >= seats_limit`, block the action and trigger a premium UI modal (Liquid Glass theme) prompting an upgrade.
* **Task 3: Seat Allocation UI:** Build a data table in the Admin panel visualizing allocation across clubs using native HTML/Tailwind progress bars.

### 📝 Sprint 6: Zero-Trust Security & Audit Logs
**Goal:** Enterprise-grade observability and immutable logging.
* **Task 1: Global Error Handling:** Implement a structured error-catching utility to prevent silent failures and ensure graceful UI degradation.
* **Task 2: Visual Audit Trail:** Build a frontend component to display read-only database backup statuses, seat modification events, and auth anomalies.
* **Task 3: Input Sanitization Audit:** Review all text inputs across the app; ensure DOM manipulation uses `textContent` over `innerHTML`.

---

## 🔵 EPIC 4: The Director's OS [STATUS: PLANNED (NEW!)]
**Focus:** The ultimate command center for Club Directors to manage internal ops and oversight.

### 📝 Sprint 7: Club Management Dashboard
**Goal:** A fluid, non-shifting dashboard for high-level operations.
* **Task 1: Split Architecture:** Decouple Branding, Team Creation, and Coach Invites from global settings onto a dedicated, high-visibility Director Home Screen.
* **Task 2: Intrinsic Layout:** Utilize CSS Container Queries (`@container`) and scrollbar-gutter logic (`stable both-edges`) to ensure the dashboard feels solid and native.

### 📝 Sprint 8: Internal Ops
* **Task 1: Seat Allocation:** Allow Directors to distribute their master pool of licenses down to specific teams/coaches.
* **Task 2: Field Scheduling:** Implement a UI for field assignments to prevent double-booking.
* **Task 3: Conflict Resolution Engine:** Basic logic to flag when two teams are assigned the same resource at the same time.

### 📝 Sprint 9 & 10: Comms & Oversight Analytics
* **Task 1: Push UI:** Interface for Directors to trigger global announcements.
* **Task 2: Coach Accountability:** Dashboard metrics tracking Coach login frequency and roster updates.
* **Task 3: Tryout Pipeline:** Kanban-style or list view tracking player progression through tryouts.

---

## 🟣 EPIC 2: Coach Mastery & The Core Loop [STATUS: PLANNED]
**Focus:** The day-to-day engagement engine for coaches and players.

### 📝 Sprint 2.1: The Training Loop & XP Engine
* **Task 1: Rep & Timer Logging:** Build intuitive, fast inputs for coaches to log player repetitions or timed drills. Optimize for mobile (large touch targets, `clamp()` spacing).
* **Task 2: Batch Writes:** Ensure all XP logging utilizes `firestore.writeBatch()` to update player totals, team leaderboards, and club stats simultaneously.

### 📝 Sprint 2.2: Gameday Performance Tracking & Player Cards
* **Task 1: Player Cards:** Build visually striking UI cards for players displaying their aggregated stats.
* **Task 2: Match Logging:** Interface for tracking match outcomes and associating them with player performance.

---

## 🟠 PHASE 5: Premium Media & Analytics (The Upsell)
**Focus:** High-value retention features.

### 📡 Epic 13: Push Notification System (FCM)
* **Task 1: Backend Triggers:** Set up Firebase Cloud Functions to watch for specific database writes.
* **Task 2: "Homework Due" automated push to players.**
* **Task 3: "New Trial Score Logged" push to parents.**

### 🎥 Epic 14: Video Feedback & Storage
* **Task 1: Cloud Storage Setup:** Integrate Firebase Cloud Storage with strict file-size and mime-type security rules.
* **Task 2: Player Uploads:** UI for players to upload 30-second trial videos.
* **Task 3: Coach Annotations:** UI for coaches to leave timestamped comments on player videos.

### 📊 Epic 15: Advanced Club Analytics
* **Task 1: Chart.js Integration:** Implement secure, responsive chart wrapper `<div>`s to track Season-over-Season predictive trends (e.g., minute logging drop-offs in November).
* **Task 2: Tiered Leaderboards:** Compare U12 Gold vs U12 Silver engagement.
* **Task 3: Automated PDF Reports:** Utilize a client-side library (like jsPDF) to generate end-of-season report cards for parent meetings based on stored analytics.

---

## 🌐 PHASE 6: Scale & Multi-Sport Expansion
**Focus:** Moving beyond soccer into a universal athletic platform.

### 🚀 Epic 16: Dynamic Sport Templates
* **Task 1: Database Restructuring:** Abstract "drills" into sport-specific sub-collections (Basketball, Lacrosse, Football).
* **Task 2: Dynamic XP Balancing:** Implement a weighting engine (e.g., a "repetition" in basketball yields different XP than a "minute" in soccer).
* **Task 3: Custom Branding Engine:** Allow clubs to upload hex codes and logos. Implement CSS variable overrides (`:root { --club-primary: [UserHex]; }`) to dynamically reskin the app without altering the core CSS.