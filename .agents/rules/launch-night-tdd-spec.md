# 🚀 SSTRACKER LAUNCH-NIGHT COMPREHENSIVE TDD SPECIFICATION INDEX
**Target Audience:** Google Jules (asynchronous cloud vm agent)
**Scope:** Standalone, decoupled feature blueprints with mandatory unit, integration, and security test gates [cite: 1117, 1118].
**Goal:** Mathematically verify and launch 100% of our sports SaaS backlog tonight [cite: 1146, 1213].

---

## 🛰️ MASTER DIRECTORY: THE 13 STANDALONE SPRINT BLUEPRINTS

1.  **Epic 2:** Tomorrow.io Lightning Radar Map & Auto-Lock [cite: 753]
2.  **Epic 3:** The Tron War Room HTML5 SVG Spatial Canvas [cite: 754]
3.  **Epic 3:** The Intent Engine physiological feedback rules [cite: 754]
4.  **Epic 3:** Dynamic Difficulty Scaling (ZPD Engine) [cite: 754]
5.  **Epic 4:** Biometric Digital Twin & 5:7 RPG TCG Cards [cite: 755]
6.  **Epic 4:** Vanguard Prism 6-Axis Radar Charts [cite: 755]
7.  **Epic 4:** Premium Video Trials CV Pipeline & Escrow Payouts [cite: 755]
8.  **Epic 5:** Checkr API Recruiter Background Vetting [cite: 756]
9.  **Epic 6:** Fan OS Auto-Tracking Camera Integration [cite: 757]
10. **Epic 6:** Interactive Broadcast Livestream MVP Overlay [cite: 757]
11. **Epic 6:** Stripe-Powered Superdraw Fundraising Engine [cite: 757]
12. **Epic 7:** Commissioner OS "God-Mode" Multi-Tenant Aggregator [cite: 752]
13. **Epic 7:** Tournament Operations, Brackets, & Standings Hub [cite: 752]

---

### 🚀 PROMPT 1: Tomorrow.io Lightning Radar Map & Auto-Lock (Epic 2)

```text
Task: Standalone TDD: Tomorrow.io Lightning Field Auto-Lockout

@jules, please implement and test the real-time lightning safety lockout system [cite: 753, 1079]:

1. THE BACKEND BRAIN (functions/src/domains/weatherOps.ts)
- Create 'processTomorrowIoAlert' as a secure Cloud Function [cite: jules-comprehensive-brain-audit.md].
- It receives tomorrow.io strike webhook payloads with latitude/longitude coordinates [cite: jules-comprehensive-brain-audit.md].
- Query the 'field_reservations' collection using the coordinates.
- If a lightning strike is confirmed within a 10-mile radius of a club's active facilities, update 'status' to "LOCKED_WEATHER_ALERT" across all field assets [cite: jules-comprehensive-brain-audit.md].

2. THE FRONTEND ENGINE (FieldOpsEngine.svelte.ts)
- Manage Tomorrow.io alert states using Svelte 5 runes [cite: 1141, 1142].
- Wrap map canvas listeners inside our strict B815 defensive hydration guard [cite: 341]:
  if (!db || !authStore.isAuthenticated) return;
- Enforce the 80-line function limit [cite: 339].

3. TDD SPECIFICATION
- Write 'functions/src/__tests__/weatherLockout.test.ts'.
- Mock a strike payload at exactly 4 miles from 'Fields Arena Alpha' and assert the reservation state is updated to locked [cite: jules-comprehensive-brain-audit.md].
- Mock a strike at 15 miles and assert the fields remain active [cite: jules-comprehensive-brain-audit.md].

Run 'pnpm run check' and 'pnpm test functions/weatherLockout'. Once green, commit as 'feat: implement Tomorrow.io lightning field auto-lockout'.
```

---

### 🚀 PROMPT 2: The Tron War Room HTML5 SVG Spatial Canvas (Epic 3)

```text
Task: Standalone TDD: HTML5 Spatial SVG Tactical Canvas

@jules, please implement the Coach OS War Room SVG tactical planner [cite: 754, 1075].

1. THE GLASS COMPONENT (TacticalArena.svelte)
- Implement screen-to-canvas coordinate mapping using native SVG matrix translations [cite: 845]:
  const pt = svgElement.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const cursorPoint = pt.matrixTransform(svgElement.getScreenCTM().inverse());
  [cite: 845]
- Ensure ALL player and ball identity discs use native SVG font-size and stroke attributes. Svelte/Tailwind font classes are strictly banned inside <svg> nodes [cite: 1153].
- Apply crisp 90-degree corners on adjacent panels (tw-rounded-none) [cite: 771, 1143].

2. THE FRONTEND ENGINE (CoachTacticalEngine.svelte.ts)
- Handle coordinate tracking and state proxies using Svelte 5 runes [cite: 1154].
- Prevent infinite rendering loops by wrapping event side-effects inside untrack() [cite: 340].

3. TDD SPECIFICATION
- Create 'src/routes/(app)/coach/war-room/__tests__/tacticalCanvas.test.ts'.
- Assert that pointer events correctly map client X/Y coordinates into absolute viewBox coordinates [cite: 845, 1153].

Run 'pnpm run check' and 'npx vitest run tacticalCanvas'. Once green, commit as 'feat: wire interactive Tron SVG tactical canvas'.
```

---

### 🚀 PROMPT 3: The Intent Engine Physiological Feedback Loop (Epic 3)

```text
Task: Standalone TDD: Intent Engine Physiological Feedback Rules

@jules, please build the Coach OS Intent Engine backend calculations to adjust drill volumes based on physiological thresholds [cite: 754].

1. THE STATE ENGINE (IntentEngine.svelte.ts)
- Create 'IntentEngine.svelte.ts' using Svelte 5 compile-time runes [cite: 1147].
- Implement calculated derived states tracking player heart-rate velocity (Hz) and workload fatigue coefficients.
- Apply an autonomous adjustment loop: if average heart-rate recovery falls below the target threshold, scale down active drill volumes by 15% to mitigate burnout.
- No function body may exceed 80 lines [cite: 339].

2. TDD SPECIFICATION
- Create 'src/routes/(app)/coach/war-room/__tests__/intentEngine.test.ts'.
- Mock input heart-rate arrays showing acute cardiac fatigue and assert that derived drill volume targets decrement mathematically [cite: 754].
- Assert that 'isFirestoreReady()' gates all state hydration listeners [cite: 1142].

Run 'pnpm run check' and 'npx vitest run intentEngine'. Once green, commit as 'feat: build Intent Engine physiological feedback rules'.
```

---

### 🚀 PROMPT 4: Dynamic Difficulty Scaling ZPD Engine (Epic 3)

```text
Task: Standalone TDD: Vygotsky Zone of Proximal Development Scaling

@jules, please build the real-time drill difficulty scaling engine based on the Zone of Proximal Development [cite: 754].

1. THE MATH UTILITY (zpdEngine.ts)
- Create 'src/lib/utils/zpdEngine.ts'.
- Implement a pure function 'calculateNextDifficulty(accuracy: number, speed: number, currentLevel: number): number' [cite: 123]:
  - If accuracy > 85% and speed exceeds baseline: increment difficulty level by 1 [cite: 123].
  - If accuracy < 60%: decrement level by 1 to deliver supportive scaffolding [cite: 131].
  - Ensure results remain strictly within our defined 1-10 boundary [cite: 131].
- Ensure the function body does not exceed 80 lines [cite: 339].

2. FRONTEND BINDING (VanguardProtocolPanel.svelte)
- Wire the derived difficulty state into the player HUD [cite: 920].
- Ensure all metric labels use Switzer, and numerical readouts use Geist Mono [cite: 770].

3. TDD SPECIFICATION
- Write 'src/lib/utils/__tests__/zpdEngine.test.ts'.
- Assert that high-accuracy trials scale up, and low-accuracy trials scale down difficulty safely [cite: 123, 131].

Run 'pnpm run check' and 'npx vitest run zpdEngine'. Once green, commit as 'feat: implement ZPD dynamic difficulty scaling'.
```

---

### 🚀 PROMPT 5: Biometric Digital Twin & 5:7 RPG TCG Cards (Epic 4)

```text
Task: Standalone TDD: Biometric Player Card Generator

@jules, please implement the frontend PlayerCard component using the sliced avatars and TCG layouts [cite: 755, 1061].

1. THE GLASS COMPONENT (PlayerCard.svelte)
- Implement a custom, high-fidelity 5:7 aspect ratio RPG-style collectible player card using the 60-30-10 palette [cite: 755, 1061].
- Enforce strict Atompunk UI chamfered grid panel clip-paths on the outer card wrapper [cite: 771, 1061]:
  style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"
- Exactly ONE Action Gold (#fbbf24) primary CTA button is permitted beneath the card in the viewport [cite: 771, 1061].

2. TDD SPECIFICATION
- Create 'src/lib/components/player/__tests__/playerCard.test.ts'.
- Assert that the rendered card dimensions maintain the strict 5:7 aspect ratio across mobile-portrait and desktop projects [cite: 1061].
- Check for zero compilation errors using Svelte 5 strict type checking [cite: jules-comprehensive-brain-audit.md].

Run 'pnpm run check' and 'npx vitest run playerCard'. Once green, commit as 'feat: deploy 5:7 RPG biometric PlayerCard'.
```

---

### 🚀 PROMPT 6: Vanguard Prism 6-Axis Radar Charts (Epic 4)

```text
Task: Standalone TDD: SVG 6-Axis Vanguard Prism Radar Chart

@jules, please implement the pure SVG Vanguard Prism radar chart to replace bloated canvas libraries [cite: 755, 920].

1. THE GLASS COMPONENT (VanguardPrism.svelte)
- Build 'VanguardPrism.svelte' using native SVG polygons governed by absolute coordinate calculations [cite: 1142].
- Plot the 6-axis "Scout's Six" values (Speed, Accuracy, Consistency, Agility, Power, Focus) on a coordinate space centered at (600, 400) within a viewBox of "0 0 1200 800" [cite: 755, 1142].
- You are strictly forbidden from using any Tailwind text sizes or external Chart.js plugins inside the SVG element [cite: 1153].

2. TDD SPECIFICATION
- Create 'src/lib/components/player/__tests__/vanguardPrism.test.ts'.
- Assert that the rendered output is pure SVG and that polygon points compute correctly based on normalized input metrics [cite: 1153].

Run 'pnpm run check' and 'npx vitest run vanguardPrism'. Once green, commit as 'feat: deploy SVG 6-axis Vanguard Prism'.
```

---

### 🚀 PROMPT 7: Premium Video Trials CV Pipeline & Escrow Payouts (Epic 4)

```text
Task: Standalone TDD: Computer Vision Video Upload & Escrow Payouts

@jules, please build the secure video-upload pipeline and escrow sponsorship transaction handlers [cite: 755].

1. THE BACKEND BRAIN (functions/src/domains/escrowOps.ts)
- Build a secure Cloud Function 'triggerEscrowPayout' [cite: 755].
- Upon verification of the video's scoutsSix metrics by our computer vision pipeline, execute an atomic server-side writeBatch transaction to debit the sponsoring brand's escrow and credit the local club's Stripe Connect balance [cite: 755, 1148].
- Ensure all function bodies are under 80 lines [cite: 339].

2. FRONTEND COORDINATION (PremiumVideoEngine.svelte.ts)
- Implement Svelte 5 states to manage file selections [cite: 755].
- Reject any video file exceeding our strict 50MB-cap immediately [cite: 755].
- Gated by our B815 defensive hydration check [cite: 341].

3. TDD SPECIFICATION
- Create 'functions/src/__tests__/escrowSponsorship.test.ts'.
- Mock a successful CV verified payload. Assert that the transaction updates the balance of the target club and sponsor atomically [cite: 755].

Run 'pnpm run check' and 'pnpm test functions/escrowSponsorship'. Once green, commit as 'feat: build Premium Video escrow payout pipeline'.
```

---

### 🚀 PROMPT 8: Checkr API Recruiter Background Vetting (Epic 5)

```text
Task: Standalone TDD: Checkr API Recruiter Search Gate

@jules, please build the security gates protecting minor athlete data from un-vetted scouts [cite: 756, 1062].

1. ONBOARDING STATUS POLLING (RecruiterOnboardingEngine.svelte.ts)
- Create 'RecruiterOnboardingEngine.svelte.ts' to track Checkr verification progress [cite: 1065, 1067].
- Implement 'isRecruiterCleared()' based on database profile flags. Return true ONLY when Checkr status is explicitly "clear" [cite: 1065, 1068].

2. SEARCH QUERY LOCKOUT (RecruiterSearchEngine.svelte)
- Open 'RecruiterSearchEngine.svelte' [cite: 1067].
- Inject a strict check at the entry of the search trigger:
  if (!isRecruiterCleared()) { return []; }
- Limit search results strictly using cursor pagination with a hard payload limit of 200KB [cite: 1068, 1148].

3. TDD SPECIFICATION
- Write 'src/lib/compliance/__tests__/checkrRecruiterGate.test.ts'.
- Assert that search requests return empty arrays for pending, consider, or suspended recruiter accounts, and execute successfully ONLY for cleared accounts [cite: 1068].

Run 'pnpm run check' and 'npx vitest run checkrRecruiterGate'. Once green, commit as 'feat: gate recruiter search behind Checkr vetting'.
```

---

### 🚀 PROMPT 9: Fan OS Auto-Tracking Camera Integration (Epic 6)

```text
Task: Standalone TDD: Smart Camera Broadcast Stream Hooks

@jules, please implement the secure software hooks for AI-driven smart cameras to automatically record and livestream matches [cite: 757].

1. THE DATA SCHEMA (src/lib/types/broadcast.ts)
- Define a strict TypeScript contract for 'SmartCameraNode': cameraId, venueId, currentStreamUrl, status ('ONLINE' | 'OFFLINE'), and streamResolution.
- All function bodies must be under 80 lines [cite: 339].

2. THE STATE CONTROLLER (SmartCameraEngine.svelte.ts)
- Build the real-time observer. Wrap all live database onSnapshot listeners inside B815 defensive hydration gates [cite: 341].
- Exclude any client-side calculations of stream latency [cite: 1148].

3. TDD SPECIFICATION
- Create 'src/lib/services/__tests__/smartCameraCohesion.test.ts'.
- Assert that if the database auth state drops, camera stream hooks immediately pause and return empty fallback states to prevent quota-exceeded loop errors [cite: 341].

Run 'pnpm run check' and 'npx vitest run smartCameraCohesion'. Once green, commit as 'feat: implement smart-camera livestream broadcast hooks'.
```

---

### 🚀 PROMPT 10: Interactive Broadcast Livestream MVP Overlay (Epic 6)

```text
Task: Standalone TDD: Stream MVP Voting Svelte 5 Controller

@jules, please build the Svelte 5 state controller for the interactive Fan OS stream overlay [cite: 757, 1119].

1. CONTROLLER RUNES (BroadcastEngine.svelte.ts)
- Create 'BroadcastEngine.svelte.ts' using Svelte 5 reactive states ('$state', '$derived') [cite: 1120].
- Manage voting states (votingActive, candidates, results: Record<string, number>) [cite: 1120].
- Implement 'submitVote(candidateId)':
  - Commit votes to Firestore via server-side 'writeBatch' transactions capped at 500 writes [cite: 1120, 1148].
  - Wrap database 'onSnapshot' listeners inside 'untrack()' to eliminate infinite rendering loops [cite: 1120, 1147].

2. COMPLIANCE & PRIVACY
- Protect minor player PII. When rendering candidates, map and display only pseudonymized metrics or vetted player-card profiles [cite: 771, 1120].

3. TDD SPECIFICATION
- Write 'src/routes/(app)/fan/watch/__tests__/broadcastEngine.test.ts'.
- Assert that rapid sequential votes are correctly batched and do not trigger reactivity loops [cite: 1120, 1148].

Run 'pnpm run check' and 'npx vitest run broadcastEngine'. Once green, commit as 'feat: build Fan OS live MVP voting engine'.
```

---

### 🚀 PROMPT 11: Stripe-Powered Superdraw Fundraising Engine (Epic 6)

```text
Task: Standalone TDD: 60-Minute Fundraising Superdraw

@jules, please build the backend and state models for the Fan OS Superdraw campaign [cite: 757].

1. DATABASE MODELS (broadcast.ts)
- Create 'src/lib/types/broadcast.ts'.
- Model 'SuperdrawCampaign': campaignId, endTime, totalPool, ticketPrice.

2. SECURE PURCHASE TRANSACTIONS (functions/src/domains/superdrawOps.js)
- Build a Cloud Function 'purchaseSuperdrawTickets' [cite: 757].
- Verify that ticket purchases are executed server-side via atomic transactions [cite: 757]:
  - Fetch target 'SuperdrawCampaign' and verify 'endTime' hasn't expired.
  - Create checkout session using our Stripe SDK helper.
  - Increment 'totalPool' in the database atomically upon successful payment.
- Limit function body to 80 lines [cite: 339].

3. TDD SPECIFICATION
- Create 'functions/src/__tests__/superdrawCampaign.test.ts'.
- Assert that tickets cannot be purchased after the campaign 'endTime' [cite: 757].
- Assert that successful mock payments increment 'totalPool' in a secure, server-side transaction block [cite: 757].

Run 'pnpm run check' and 'pnpm test functions/superdrawCampaign'. Once green, commit as 'feat: build Stripe-powered Superdraw fundraising engine'.
```

---

### 🚀 PROMPT 12: Commissioner OS "God-Mode" Multi-Tenant Aggregator (Epic 7)

```text
Task: Standalone TDD: God-Mode Federation Aggregator

@jules, please implement the read-only, cell-isolated Commissioner OS state federation aggregator [cite: 752].

1. CELL-ISOLATED FEDERATION READS (FederationEngine.svelte.ts)
- Create 'FederationEngine.svelte.ts' [cite: 752].
- Query children rosters across multiple 'clubIds' in the state federation [cite: 752].
- Direct Firestore 'getDocs' calls are banned. You must query via our custom isolated helper:
  const db = getActiveDb();
- Walled off strictly from global admin mutations [cite: 752, 1148].
- Gated by our B815 hydration checks [cite: 341].

2. TDD SPECIFICATION
- Create 'src/routes/(app)/commissioner/__tests__/federationAggregator.test.ts'.
- Assert that query filters are strictly read-only and constrained by the commissioner's master 'tenantId' [cite: 752].
- Ensure no single function body exceeds our 80-line limit [cite: 339].

Run 'pnpm run check' and 'npx vitest run federationAggregator'. Once green, commit as 'feat: implement Commissioner OS multi-tenant aggregator'.
```

---

### 🚀 PROMPT 13: Tournament Operations, Brackets, & Standings Hub (Epic 7)

```text
Task: Standalone TDD: Tournament Bracket Operations & Scheduling

@jules, please build the automated tournament scheduler and scoring hub [cite: 752].

1. AUTOMATED BRACKET GENERATION (TournamentEngine.svelte.ts)
- Create 'TournamentEngine.svelte.ts' to manage multi-venue bracket configurations [cite: 752].
- Implement a pure function 'generateDoubleEliminationBracket(teams: Team[]): Bracket' [cite: 752].
- No function body may exceed 80 lines [cite: 339].
- Gate all database state-loading methods using 'isFirestoreReady()' [cite: 1094].

2. REAL-TIME SCORING SYNC
- Implement 'updateLiveScore(matchId, scorePayload)' [cite: 752]. Ensure that as scores update, division standings are calculated server-side via writeBatch transactions and pushed instantly to the Fan and Player OS views [cite: 1148].

3. TDD SPECIFICATION
- Create 'src/routes/(app)/commissioner/__tests__/tournamentScheduler.test.ts'.
- Mock 8 teams. Assert bracket is generated with correct winner/loser paths [cite: 752].
- Assert score updates automatically recalculate and sync standings [cite: 752].

Run 'pnpm run check' and 'npx vitest run tournamentScheduler'. Once green, commit as 'feat: implement Tournament Operations bracket scheduling'.
```
