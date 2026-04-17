---
name: SSTRACKER Unified Execution Plan
overview: "The absolute, unified roadmap for SSTRACKER. This plan merges the necessary SvelteKit/Svelte 5 architectural migration (Foundation) with the strict 2026 PE-Exit Feature Roadmap defined by the CEO. Do not omit any AI, Biomechanical, or Compliance features listed here."
isProject: true
---

# SSTRACKER 2026: Master Execution Plan

This document is the **single source of truth** for project execution. It enforces the SvelteKit migration required by `.cursorrules` while strictly maintaining the CEO's 4-Epic business feature roadmap.

## 🏗️ PHASE 0: The SvelteKit & RBAC Foundation (Prerequisite)
*Cursor must complete this phase before initiating any Epic sprints.*

* **0.1 SvelteKit Scaffold:** Port the current vanilla PWA (`index.html`, `app.js`) into a SvelteKit (adapter-static) architecture.
* **0.2 Liquid Glass Preservation:** Import the existing `style.css` globally to preserve the `clamp()` anti-squish variables and 24px radii, then incrementally scope styles to `.svelte` components.
* **0.3 Auth & Claims:** Restore `signInWithPopup`. Implement Firebase Custom Claims (`role`, `teamId`) via Cloud Functions to establish true server-side RBAC.
* **0.4 Firestore Rules:** Author strict `firestore.rules` to lock down the data plane based on the new custom claims.

---

## 💎 EPIC 1: Foundation, UI Polish & Compliance (Immediate Follow-Up)
**Goal:** Eradicate technical debt, finalize the "Billion-Dollar" visual identity in Svelte, and meet April 2026 FTC COPPA deadlines.

* **Sprint 1.1: Cryptographic Cache Busting:** Utilize Vite's file-hash versioning for the PWA Service Worker. Eliminate all legacy `?v=` query strings.
* **Sprint 1.2: Bento Grid UI Finalization:** Ensure all new Svelte components utilize responsive CSS Grids and multi-layered, specular drop shadows defined in the Liquid Glass UI protocol.
* **Sprint 1.3: Ironclad COPPA 2026 Engine:** * Deprecate `<canvas>` signatures for U13 athletes. 
    * Build Verifiable Parental Consent (VPC) gateway flows.
    * Implement automated TTL data purging for offboarded minors.
* **Sprint 1.4: SafeSport & Privacy:** Default minor accounts to maximum privacy. Engineer in-app messaging to automatically CC parent/guardian accounts to prevent 1-on-1 adult-to-minor communication.

---

## 🛡️ EPIC 2: Coach Command Center & UYSA Sync
**Goal:** Eliminate manual data entry via governing body APIs and provide elite spatial design tools.

* **Sprint 2.1: Affinity/UYSA Interoperability:** * Build OAuth pipelines to Affinity Sports API. 
    * Map `SIDCODE`/`SeasonID` to pull verified rosters and staff.
* **Sprint 2.2: Digital Match Day Operations:** Generate auto-updating digital match cards that explicitly flag players lacking SafeSport or concussion clearance ("Not Eligible").
* **Sprint 2.3: Database Bridge (Strategy Canvas):** Extract X/Y coordinates from the Fabric.js Strategy Board and write to Firestore for serialized tactical sharing.
* **Sprint 2.4: Advanced Workout Builder:** Implement SortableJS for drag-and-drop curriculum building. Persist as canonical JSON schemas.

---

## 📈 EPIC 3: Gamification & The Digital Resume
**Goal:** Maximize Net Revenue Retention (NRR) by transforming the utility into an indispensable athlete career asset.

* **Sprint 3.1: Pro-Style Longitudinal Player Cards:** Transform stats into "Pro Cards" using Chart.js radar/spider charts to track YoY physical/technical growth. Implement verified coach signatures.
* **Sprint 3.2: Collegiate Recruitment Portal:** B2B tier for scouts to filter the global database by graduation year and verified metrics. Allow players to generate shareable QR portfolios.
* **Sprint 3.3: Deep Engagement Mechanics:** Multi-day streak badges, FCM push notification rewards, and team leaderboards, adhering strictly to privacy opt-ins.

---

## 🤖 EPIC 4: The AI-Native Ecosystem (Enterprise Valuation Multiplier)
**Goal:** Deploy bleeding-edge architecture (RAG, ML, Computer Vision) to outpace legacy competitors.

* **Sprint 4.1: Tactical RAG LLM Integration:** Firebase AI Logic/Genkit over Epic 2/3 payloads. Coaches prompt AI for counter-tactics, generating structured JSON practice plans.
* **Sprint 4.2: Biomechanical Kinematic Analysis:** Integrate ML computer vision APIs to analyze uploaded smartphone video of shooting mechanics, comparing joint angles to pro baselines.
* **Sprint 4.3: Predictive Load Management:** Train an ML model on historical telemetry (minutes/reps) to forecast injury probabilities and alert Directors to rest players.

---

## 🚦 Execution Guardrails (Cursor Instructions)
1.  **Do Not Omit Features:** Epic 3 (Player Cards) and Epic 4 (Biomechanics/Load Management) are mandatory for the PE exit strategy. Do not abstract them away.
2.  **Strict Dependencies:** Do not build Epic 4 (AI) until Epic 2 (JSON Curriculum schemas) is complete. Do not pull Affinity PII (Epic 2) until Epic 1 (COPPA/RBAC) is secure.