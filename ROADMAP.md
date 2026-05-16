MASTER BUILD ROADMAP: NEXUS COMMAND & PLAYER OS
Architecture Philosophy: Zero-Liability PII, Exception-Only Administration, Dynamic Multi-Sport Scaling, Uncompromised RPG Gamification, and Deep Emotional Intelligence (EQ) Protections.

PHASE 1: FOUNDATIONAL STABILIZATION & ENTERPRISE SCALABILITY
Objective: Eradicate legacy technical debt, secure database boundaries, and establish an un-squished, ultra-premium visual baseline capable of enterprise scale.

Epic 1: The Tactical SIEM Architecture & Strategic Minimalism

Transition all dashboard layouts to a responsive CSS Bento Grid utilizing clamp() spacing functions to prevent mobile squishing, allocating spatial weight to critical KPIs.

Execute a global aesthetic overhaul: purge all neon gradients, pure black backgrounds, and heavy glassmorphism on data cards. Replace with deep slate/navy backgrounds and thin, precise borders to ensure text legibility.

Integrate the Geist Mono typeface for all metrics, tables, and numerical readouts to establish a highly technical, mission-control environment.

Standardize all UI micro-interactions (buttons, hovers, state changes) to a strict 150-250ms duration to project a lightning-fast, premium feel.

Implement Cloud Firestore atomic batch writes and increment operators to guarantee offline synchronization.

Cell-Based Routing: Architect the backend API gateways to support routing ultra-large state governing bodies to isolated, dedicated database cells to prevent "noisy neighbor" throttling.

Epic 2: Embedded Finance and Ancillary Revenue

Transition the core platform pricing to a transaction-based model (0$ platform fee, micro-percentage on volume) to eliminate off-season financial friction for clubs.

Integrate API endpoints for digital ticketing and housing/hotel block rebates to turn the management software into a profit center for the NGBs.

Epic 3: Context-Aware COPPA 2.0 & Household Engine

Establish passwordless Magic Uplinks exclusively via Email using single-use, time-locked invite tokens to eliminate SMS costs and prevent SIM-swapping vulnerabilities.

Integrate native Firebase Phone Number Verification for a frictionless, one-tap mobile login experience that verifies the number directly with the carrier, completely bypassing SMS.

Integrate native WebAuthn Biometric Enclave Attestation (navigator.credentials.create()) to bind legally mandated COPPA consent directly to on-device hardware biometrics.

[IMPLEMENTED — Phase 1, Epic 3 / Phase 2 Epic 3] Passwordless WebAuthn (passkey) + Magic Link auth fully shipped. Password form permanently removed from /login. Four Cloud Functions deployed (webauthnRegisterStart/Finish, webauthnLoginStart/Finish, us-east1). LoginEngine.svelte.ts (Vanguard Trinity Brain) wires @simplewebauthn/browser to Firebase custom token pattern. Magic link callback at /auth/magic-link/callback. Passkey credentials stored in users/{uid}/passkeys/{credentialId} (Admin SDK write-only; Firestore rules: client read-only). Operative OTP flow (kids) preserved alongside new passwordless surface. Login card: Strategic Minimalism — slate-900 bg, 1px vanguard-border, Geist Mono, 150ms transitions, zero glassmorphism.

Enforce COPPA 2.0 Compliance (2026): Implement strict opt-in consent architectures for teens aged 13-16 and hard-code database interceptors to explicitly block individual-specific targeted advertising data sharing.  

PHASE 3: MULTI-SPORT INFRASTRUCTURE & OCTALYSIS RPG ENGINE
Objective: Decouple rigid sport schemas and launch an addictive, consequence-driven real-life leveling loop fueled by behavioral economics.

Epic 4: AI-Driven Dynamic Workouts

Initialize dynamic configuration trees (sports_configs) allowing the OS to scale instantly to basketball, lacrosse, volleyball, etc.

Implement Reinforcement Learning (RL) Algorithms: Transition from static training plans to dynamic engines that adjust the volume and difficulty of daily prescribed workouts based on continuous physiological feedback and historical adherence.

Epic 5: The Octalysis Progression Loop

Activate Core Drive 2 (Accomplishment): Construct multi-attribute hex trees using a Composite Snowflake visual layout branching outward from a central core to support the "Fog of War" masking.

Implement a Hybrid Data Model for the skill tree. The frontend UI must strictly render Synthetic Authored Nodes (abstract action abstractions like "Pace" or "Vision") to prevent cognitive overload. The Firestore backend must utilize a competency knowledge graph to map these synthetic nodes to the raw "Drill-as-Node" curriculum. Operating in the space of action abstractions rather than primitive actions is mathematically required for the Reinforcement Learning algorithms to efficiently calculate and converge on the optimal training paths.

Activate Core Drive 8 (Loss Avoidance): Deploy rigorous daily habit streaks; program automated Skill Decay algorithms that drain fractions of inactive XP after consecutive missed days, triggering urgent re-engagement alerts.

	[IMPLEMENTED — Phase 3, Epic 5.4] Integrate Parent Co-Op mechanics, empowering parents to fund real-world rewards via automated escrow Bounties (Tremendous API, pay-as-you-go) alongside one-tap telemetry XP boosts (1.5×/2×/3×). Objective-only verification via automated CF triggers on existing reps/workout/streak/mastery/GPA telemetry collections. CV biomechanics criterion (cv_verified_drill) schema-slotted and deferred behind feature_cv_bounty_enabled Remote Config flag.

Epic 6: Vertical Comparison & Trajectory Tracking

Deploy Time-Lapse Memory Capsules that autonomously surface historical baselines during plateaus to prove personal capability.

Implement the Growth Velocity Index to heavily celebrate rapid month-over-month learning rates for beginners over raw lifetime volume.

Epic 7: Psychological Safety & Scaffolding

Implement an asymmetric UI Fog of War masking intermediate/advanced skill trees to prevent cognitive overload for complete beginners.

Introduce Grit XP explicitly rewarding failed attempts on highly complex moves to permanently eliminate the shame of dropping the ball.

Hook the Dopamine Engine (visual particle explosions) directly to verified database commits to permanently reinforce the habit loop of logging difficult training sessions.

Epic 8: Adult EQ Interceptors

Build intent-based homework triggers allowing coaches to assign single macro-goals while the backend autonomously serves individualized, RL-optimized drills per player.

Engineer "The Car Ride Home" Protocol firing mandatory push notifications to parents 15 minutes post-match, locking metrics behind an attestation to prioritize emotional safety and providing highly empathetic conversation anchors.

PHASE 5: ALPHA REMEDIATION & SIEM POLISH
Objective: Eradicate "AI Slop" aesthetics, fix CSS boundary blowouts, eliminate wasted space, and enforce progressive disclosure to establish an ultra-premium enterprise feel.

Epic 9: The Tactical SIEM UI/UX Overhaul

Sprint 9.1 (High-Density Spatial Weighting): Restructure the Player OS into a true asymmetric 12-column Bento Grid. Eliminate wasted whitespace. Apply min-w-0 to all flex/grid children to permanently fix boundary blowouts. Move "Quick View Stats" (XP, Level, Streak) to the very top left/center.

Sprint 9.2 (Routing & Redundancy Fix): Fix the routing collision between "Today's Quests" and "Initialize Operative." Build "Initialize Operative" as a distinct one-time setup modal. Delete the redundant "Active Missions / Alerts" card to free up grid space, moving alerts to the top-nav notification bell.

Sprint 9.3 (Deterministic Avatars): Install bauhaus-avatar-generator. Replace all abstract profile image placeholders with deterministic SVGs seeded by the player's UID. Constrain the avatar wrapper with aspect-square, object-cover, and rounded-full within a strict maximum width.

Sprint 9.4 (Strategic Minimalism & Typography): Audit the entire dashboard to purge any remaining neon glows. Enforce deep slate backgrounds (#0B0F19) with border-slate-800 1px borders. Apply Geist Mono exclusively to all data points. Constrain all buttons with w-fit inline-flex (44x44px minimum tap target).

PHASE 6: THE AI TRAINING ENGINE
Objective: Replace static, template-based workout loggers with an intelligent, adaptive Execution Terminal.

Epic 10: The RL Execution Terminal

Sprint 10.1 (Terminal UI Construction): Delete the legacy workout selection interface. Build the "Execution Terminal" UI, styled like a SIEM command prompt. It must feature sliders/inputs for Time on Task and Rate of Perceived Exertion (RPE intensity 1-10).

Sprint 10.2 (Adaptive Logic Scaffolding): Wire the UI to support dynamic workout parameters (volume, intensity, rest). Frame the data payload so the backend Reinforcement Learning (RL) Markov Decision Process can autonomously adjust tomorrow's recommended drills based on today's RPE and completion metrics.