### SSTRACKER (PROJECT PHOENIX) - THE ULTIMATE MASTER ROADMAP v2.0
**Mission:** A multi-billion-dollar youth sports SaaS platform engineered for a 12x ARR Private Equity exit [cite: 752]. This roadmap serves as the absolute, non-negotiable architectural, aesthetic, and behavioral blueprint for all autonomous AI agents (Jules, Antigravity) [cite: 752, 1228]. Deviations from this document are strictly prohibited.

---

#### 🏛️ PART 1: GLOBAL ENTERPRISE ARCHITECTURE & SECURITY MANDATES
All agents must run these checks before any code is committed. We do not merge red pipelines [cite: 897].

**1. Svelte 5 Strictness & Reactivity**
*   **Runes Only:** Exclusively use Svelte 5 compile-time reactivity (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) [cite: 1229].
*   **Infinite Loop Prevention:** Any programmatic routing or side-effects invoked within an `$effect` block MUST be wrapped in an `untrack()` enclosure to prevent memory leaks [cite: 1175, 1229].
*   **The Vanguard Trinity Pattern:** Monolithic files are forbidden [cite: 1200, 1229]. Every interactive screen must fracture into: The Shell (`+page.svelte`), The Brain (`*Engine.svelte.ts`), The Glass (`*Arena.svelte`), and The HUD (`*HUD.svelte`) [cite: 1200, 1229].
*   **The 80-Line Limit:** Function bodies are mathematically restricted to a maximum of 80 lines [cite: 1229]. Complex parsing must be extracted into `src/lib/utils/` [cite: 1229].

**2. Zero-Trust Security & Database Physics (Firebase v10)**
*   **Payload Stripping:** The frontend client is inherently compromised [cite: 412]. Agents must write backend rules to explicitly strip protected RBAC fields (e.g., `role`, `clubId`) from all payloads before database mutation [cite: 412, 1212].
*   **B815 Defensive Hydration:** All raw Firestore `getDocs` or `onSnapshot` queries MUST be wrapped with strict hydration guards (`if (!db || !authStore.isAuthenticated) return;`) to prevent Quota Exceeded loops [cite: 1165, 1198, 1245].
*   **Atomic Batching:** All session updates must be dispatched server-side via atomic Firestore `writeBatch` transactions, mathematically capped at a hard limit of 500 operations per batch using cursor pagination [cite: 1186, 1230].

**3. Visual Aesthetic & The 12-Column Bento Grid**
*   **Strict Visual Compliance:** Execution of the Microscopic Visual & Aesthetic Auto-Fix protocol to mathematically enforce strict UI rules across all agent builds [cite: 2000].
*   **Color Taxonomy (60-30-10 Rule):** 60% Void Black (`#000000`) and Navy Slate (`#0f172a`); 30% Structural Grey (`#334155`); 10% Data Cyan (`#14b8a6`) [cite: 773]. Exactly ONE Action Gold (`#fbbf24`) CTA permitted per viewport [cite: 773].
*   **Anti-Squish Math:** Symmetrical grids are banned for dashboards [cite: 1235]. You must utilize a 12-column asymmetric Bento Grid topology locked with fluid clamp math (`grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));`) [cite: 776, 1235].
*   **Micro-Typography:** Use Geist Mono for telemetry, Switzer for body copy, and Geist Sans for headers [cite: 774].

---

#### 🔒 PART 2: IDENTITY, B2B ONBOARDING, & THE COMPLIANCE VAULT
This replaces all generic registration flows. Mandatory Firebase MFA and 1-hour ID Token timeouts with secure background refresh logic must govern all elevated RBAC roles [cite: 338, 770].

**1. B2B Registration Pipeline (The Dual-Track)**
*   **Independent Director Track:** Frictionless self-serve onboarding that provisions a standalone `tenantId` and `clubId`, immediately kicking off Stripe Connect onboarding [cite: 141, 830]. Requires uploading a government-issued photo ID or business license for Account Ownership Verification [cite: 271, 385].
*   **Governed Director Track:** Registration via single-use Federation invite links, automatically nesting the new `clubId` under the Commissioner's master `tenantId` [cite: 309, 310].

**2. Legal Gateway & The Zero-Trust Document Vault**
All data collection must pass through these legal gates before a user accesses the platform [cite: 878, 1231]:
*   **Parents & Players:** 
    [x] **COPPA 2.0 / VPC:** Verifiable Parental Consent tied to WebAuthn Biometric Enclaves (FaceID/TouchID) [cite: 1231] - Completed by Agent.
    *   **HIPAA & Medical:** Emergency contact and health insurance data collection requiring an integrated HIPAA release form [cite: 617].
    *   **Assumption of Risk & Waivers:** Liability waivers detailing sport-specific hazards [cite: 610, 613].
    *   **Photo/Video Release:** Granular opt-in/opt-out for the Fan OS streaming and Player OS video trials [cite: 618].
    *   [x] **E-Sign Act Enforcement:** The backend must silently capture and encrypt the user's IP address, date, timestamp, and email verification for every signed document [cite: 878] - Completed by Agent.
*   **Coaches & Volunteers:** 
    *   **AB 506 Live Scan:** Checkr API integration mandating National Criminal Database clearance before accessing minor data [cite: 280, 285].
    *   **Mandated Reporter & SafeSport:** Upload gates for annual child abuse prevention training certificates [cite: 284].
*   [x] **Data Minimization (GDPR/CCPA):** An automated 24-hour PII Shredder script for ghost data, while preserving the `consents` collection for multi-year legal audits [cite: 1231].

---

#### ⚙️ PART 3: THE SEVEN EMPIRE OPERATING SYSTEMS

##### [x] 🚀 EPIC 1: GLOBAL ADMIN OS (THE COMMAND PLANE)
**Mission:** Total multi-tenant infrastructure control, absolute observability, and system safety [cite: 754].
*   [x] **Account Impersonation:** Securely mint custom JWT tokens to troubleshoot Commissioner/Director accounts without exposing passwords [cite: 754].
*   [x] **Telemetry Single Pane:** Aggregated read-only dashboard pulling MAU and Stripe Connect Revenue metrics to defuse NoSQL read-bombs [cite: 754].
*   [x] **System Kill Switches:** Admin scripts to trigger the Right to Be Forgotten and database defragmentation [cite: 886].
*   [x] **User Role Mutations:** Extracted `updateUserRole` to a secure Cloud Function and removed client-side mutate capabilities.
*   [x] **Platform Deployment:** Resolved ghost export `vampireIngestRows` and trigger mismatch `onChannelCreated` failing deployments.
*   [x] **Visual Styling Lock (Admin OS)**: Audit Passed.

##### [x] 🏛️ EPIC 7: COMMISSIONER OS (THE FEDERATION COMMAND)
**Mission:** State-wide governance, macro-logistics, and absolute talent oversight.
*   [x] **Visual Styling Lock (Commissioner OS)**: Audit Passed.
*   ✅ **Visual Styling Lock (public OS)**: Audit Passed.
*   [x] **Visual Styling Lock (Player OS)**: Audit Passed.
*   [x] **Master Tenant Architecture:** Read-only "God-mode" aggregation of all child `clubId`s within a state federation, strictly walled off from Epic 1 global admin scripts. Completed implementation of FederationEngine.svelte.ts and its TDD test suite.
*   [x] **The ODP Talent Pipeline:** Unlocks deep-dive analytics into player-level 1000Hz telemetry and 6-axis Vanguard Prism charts across all managed clubs for Olympic Development Programs.
*   [x] **Federation Compliance Matrix:** High-level visual matrix (Green/Amber/Red) tracking SafeSport, background checks, and COPPA 2.0 compliance across every club and coach in the state.
*   [x] **Tournament Operations & Live Results Hub:** Automated multi-venue bracket scheduling, team registration, digital game sheets, and live scorekeeping that instantly pushes results to the Fan and Player OS.
*   [x] **Tournament Bracket Operations & Scheduling TDD implemented and verified.**
*   [x] **Commissioner OS Master Dashboard and ODP Analytics implemented.**

##### [x] 🏢 EPIC 2: DIRECTOR OS & B2B REVENUE ENGINE
*   [x] **Visual Styling Lock (Director OS)**: Audit Passed.
*   [x] Rebuild Marketing Landing Page
**Mission:** Multi-sport club scaling, logistical domination, and embedded finance [cite: 755].
*   [x] **Transaction-Based Monetization:** $0 platform base fee monetized via Stripe Connect transaction fees [cite: 755].
*   [x] **The Vampire Importer:** Frictionless headless CSV ingestion to steal legacy rosters from competitors [cite: 755].
*   [x] **Logistics & Field Ops Matrix:** Google Maps API integration with Tomorrow.io Webhooks to auto-lock field status upon lightning strikes [cite: 755].
*   **Compliance Health Scoring:** Visual indicators tracking VPC and SafeSport statuses at the club level [cite: 755].

##### [x] 📋 EPIC 3: COACH OS (THE SIDELINE SIEM)
*   [x] **Visual Styling Lock (Coach OS)**: Audit Passed.
**Mission:** Figma-grade tactical tools, RL-driven accountability, and expanded staff controls [cite: 756].
*   [x] **The Tron War Room:** HTML5 Spatial Drill Designer featuring flawless 1:1 SVG drag-and-drop physics, Vantablack identity discs, and neonBloom light trails using `matrixTransform(getScreenCTM().inverse())` [cite: 756, 1184] - Completed by Agent.
*   [x] **Match Day Integration:** Wired Halftime Athlete Choice Planner directly into the Coach Match Day portal.
*   [x] **The Intent Engine & The Forge:** Reinforcement Learning (RL) algorithms that autonomously adjust drill volume based on physiological feedback [cite: 756].
*   **Dynamic Difficulty Scaling (ZPD Engine):** Leverages Vygotsky’s Zone of Proximal Development to scale drill difficulty via 14ms-latency inference [cite: 756].

##### [x] 🎮 EPIC 4: PLAYER OS (THE DOPAMINE ENGINE)
**Mission:** Absolute retention, habit-forming gamification, and verifiable athletic proof [cite: 757].
*   [x] **40% Void Black Gaming HUD:** Cinematic operative command deck utilizing chamfered clip-path corners [cite: 757].
*   [x] **Biometric Digital Twin & TCG Cards:** 5:7 aspect ratio "Ultimate Team" player cards dynamically generated from verified 1000Hz physical data [cite: 757].
*   [x] **Vanguard Prism Charts:** 6-axis radar charts tracking the "Scout's Six" physical attributes [cite: 757].
*   [x] **The Dopamine Engine:** Dynamic streak counters with 2% daily skill decay. `canvas-confetti` particle explosions firing STRICTLY on verified backend database commits to prevent spoofing [cite: 757, 1187].
*   [x] **Premium Video Trials & Escrow Sponsorships:** 50MB-capped upload pipelines where Computer Vision verification triggers real-world escrow payouts from local brands [cite: 757].

##### 🛡️ EPIC 5: PARENT OS & RECRUITER MARKETPLACE (THE SHIELD)
**Mission:** Legal compliance, financial escrow, emotional safety, and global scouting monetization [cite: 758].
*   ✅ **Visual Styling Lock (Parent OS)**: Audit Passed.
*   [x] **SafeSport Comms (Shadow CC):** Immutable server-side Firestore triggers that automatically intercept coach-to-player direct messages, resolve the minor's household, and CC the parent email mathematically preventing 1:1 adult/minor channels [cite: 758, 1191].
*   [x] **The Car Ride Home Protocol (EQ):** Suppresses raw metric dashboards for 15 minutes post-match to protect beginner self-worth [cite: 758].
*   [x] **Vetted Recruiter Engine:** Checkr API integration mandating National Criminal Database vetting before external scouts gain platform access to prospect data [cite: 758, 1168].
*   [x] **Checkr API Recruiter Search Gate:** Strict `isRecruiterCleared` security gates and cursor pagination size constraints protecting minor athlete data from un-vetted scouts [cite: 756, 1062, 1068].

##### 🏟️ EPIC 6: FAN OS & BROADCAST MONETIZATION
**Mission:** Turn every club into a media franchise, eliminating fundraising friction [cite: 759].
*   [x] **Auto-Tracking Camera Integration:** Seamless software hooks for AI-driven smart cameras to automatically record and livestream matches [cite: 759].
*   [x] **Interactive Broadcast Engine:** Gamification overlays on live streams allowing remote fans to vote on MVP and react with digital confetti [cite: 759].
*   [x] **Frictionless Digital Ticketing & Superdraws:** Embedded QR-code ticketing and 60-minute digital fundraising campaigns [cite: 759].
*   [x] **Stripe-powered Superdraw Fundraising Engine:** Implemented backend transactions, campaign endTime validation, and secure Stripe SDK integration.
*   [x] **Testing Improvement:** Added catch block test for auth routeByFirestoreRole fetch failure.
*   [x] **Testing Improvement:** Added comprehensive edge case tests for `evaluateClubEligibility.js` to ensure 100% logic coverage.
*   [x] **Testing Improvement:** Added missing branch test for valid SafeSport clearance in `evaluateClubEligibility.js`.


*   [x] **Jules Comprehensive Brain Audit:** Rigorous Codebase Audit, Zero-Trust Verification, and Roadmap Gap Analysis completed.
*   [x] **Coach Expanded Staff Controls:** Implement team-isolated staff permissions, update Firestore security rules, and generate the corresponding integration tests.
