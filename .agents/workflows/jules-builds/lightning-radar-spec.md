# ⚡ TECHNICAL SPECIFICATION: "TECH NOIR" TACTICAL LIGHTNING RADAR MATRIX
**Owner:** Executive Engineering Board & Chief Design Officer (CDO)  
**Priority:** P1 — High (Epic 2: Director OS Feature Gap)  
**Status:** PROPOSED BLUEPRINT  

---

## 🏛️ 1. ARCHITECTURAL OVERVIEWS & REALITY GAPS

A thorough review of our active **Master Roadmap (Epic 2: Director OS)** reveals that the **Logistics & Field Ops Matrix** is currently a **pending line item** [11]. While our marketing and demo scripts showcase a pristine *"Lightning Detected: Fields Auto-Locked"* alert [41], the functional code linking live meteorological telemetry with automated database lockdowns has not yet been deployed to production [11].

To bridge this gap and establish a visual, high-velocity differentiator that blows legacy platforms (like TeamSnap and SportsEngine) out of the water, we will construct a **Tactical Lightning Radar Matrix** [11]. This widget combines real-time Tomorrow.io lightning API feeds with an custom-themed Google Maps canvas to project a badass, high-contrast, military-grade storm tracking dashboard [11, 41].

---

## 🛰️ 2. THE VANGUARD TRINITY BLUEPRINT

In strict compliance with **@GEMINI.md §2 (Vanguard Trinity Pattern)**, the Tactical Radar must be fractured into four cooperating, low-resource files to prevent Svelte 5 context collapse [16, 42]:

### A. The Brain: `LightningRadarEngine.svelte.ts`
This TypeScript state controller manages the active live-data stream, distance sorting algorithms, and automated threshold states.
*   **Firestore State Gating:** Fully wrapped in our strict **B815 hydration check** (`isFirestoreReady()`) to prevent unauthenticated rendering loops during startup [12, 42].
*   **Svelte 5 Runes:** Uses `$state` to track active strike vectors and `$derived` to compute the immediate threat level (Red/Amber/Green) based on the closest strike [16, 43].
*   **Tomorrow.io Webhook Receiver:** Ingests low-latency JSON payloads representing direct cloud-to-ground strike coordinates, including polarity, peak current (kA), and exact GPS coordinates [11].
*   **The 80-Line Law:** Heavy geo-coordinate distance math (Haversine formula) must be extracted into `src/lib/utils/geoMath.ts` to keep the engine's main functions under our strict **80-line maximum limit** [16, 42].

### B. The Glass: `TacticalRadarArena.svelte`
The visual "guts" of the feature—a custom-styled Google Maps API container styled with our **"Nuclear Americana Tech Noir"** aesthetic [16].
*   **Map Styling (Void Black Theme):** The Google Map ID utilizes highly saturated black vectors (`#000000` base) with slate-blue roads and neon-cyan coastline highlights to eliminate visual halation [41, 42].
*   **Badass Radar Sweep (SVG Overlay):** An absolute-positioned, CSS-animated SVG radial radar sweep rotating continuously over the club’s active GPS coordinates:
    ```css
    @keyframes radar-sweep {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    ```
*   **Strike Bloom Render:** When a strike webhook is received, the map dynamically renders a pulsating red target ring at the coordinate utilizing a native SVG filter that matches our **glowing neon bloom** style [41, 43]:
    ```xml
    <filter id="strike-bloom">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    ``` [43]

### C. The HUD: `TacticalRadarHUD.svelte`
An asymmetric right-hand sidebar panel displaying live, high-density telemetry data [16, 42].
*   **Telemetry Readouts:** All numerical variables (distance, current strength, bearing) are rendered in **Geist Mono** with extra tracking to establish that clinical SIEM interface [16, 42]:
    ```html
    <div class="telemetry-readout tw-tracking-widest">
      STRIKE: {closestDistance.toFixed(2)} MILES
    </div>
    ``` [16]
*   **Tactical Colors:** Utilizes Atompunk Amber (`#f59e0b`) for active warnings (strikes 10–15 miles away) and flashes high-contrast, pure Red ONLY when a strike drops inside the critical **10-mile safety perimeter** [16, 31, 42].

### D. The Shell: `+page.svelte` (Route: `/director/logistics/radar`)
A lightweight, viewport-locked (`100dvh`) page container that imports and instantiates the other three files without housing inline logic, fully preventing layout scroll overflows [16, 43].

---

## 🚨 3. AUTOMATED SAFESPORT & COMPLIANCE LOCKDOWN SEQUENCE

When a lightning strike is confirmed within our **10-mile critical boundary** (per California youth sports safety best practices), the platform executes an automated, zero-touch safety action [11, 31]:

1.  **Immediate State Mutation:** The `LightningRadarEngine` immediately triggers a secure server-side transaction (`writeBatch` capped at 500 operations) to mutate `fieldStatus: "locked"` and `sessionStatus: "suspended"` on all active workouts [11, 42, 43].
2.  **Stripe Connect Interceptor:** Suspends active ticketing and Superdraw entry collections for the active session to prevent post-cancellation chargeback disputes [11].
3.  **The "Car Ride Home" Handshake:** Automatically triggers an emergency SMS and push-notification alert to all parents connected to the active roster via our **SafeSport Shadow CC triggered communications network**, instructing families to proceed directly to their vehicles [11, 41, 43].

---

## 🛠️ 4. TEST-DRIVEN DEVELOPMENT (TDD) VALIDATIONS

We operate under a **Pessimistic Definition of Done** [16]. Before Jules can commit this feature, the following Vitest and Playwright suites must run cleanly with a 100% success rate [16]:

*   **Test 1 (Integration):** Verify that injecting a mock Tomorrow.io strike payload at exactly `7.2` miles programmatically mutates the Firestore field status to `"locked"` in our local emulator [11, 16].
*   **Test 2 (Static Box Model):** Ensure the `TacticalRadarArena` bounding box does not overlap with our sidebar navigation, maintaining an absolute gap of `>=12px` to prevent layout squishing on mobile viewports [16, 42].
*   **Test 3 (Memory Leak Check):** Assert that Svelte 5 `$effect` blocks wrapping our Google Maps initialization and animation loops cleanly invoke destructor teardown hooks to prevent background browser memory leaks [16, 42, 43].
