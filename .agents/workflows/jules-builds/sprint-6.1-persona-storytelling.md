---
name: sprint-6.1-persona-marketing-storytelling
description: Phase 6 Sprint 6.1 — Comprehensive persona storytelling, landingContent expansion, and narrative messaging for SSTracker.
---

# 🚀 Phase 6 / Sprint 6.1: Persona Storytelling & Marketing Blueprint
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Elevate the public-facing narrative of SSTracker across all 8 personas. The product must tell an irresistible story of friction-free club operations, athletic gamification, and ironclad SafeSport/COPPA compliance:
1. **Coach OS (Sideline SIEM)**: Tactical whiteboard, real-time match attribution, lightning strike radar, 3-second mistake logging, and SafeSport Shadow CC.
2. **Director OS (B2B Revenue Panopticon)**: Vampire Roster CSV importer, instant seat monetization, multi-sport tenant management, zero-trust vault.
3. **Player OS (The Dopamine Engine)**: Scout's Six hexagon radar, Level/XP progression, daily streaks, 2% skill decay loss-avoidance, and Armory avatars.
4. **Parent OS (Compliance Shield)**: Household roster graph, assistant coach delegation, 1-tap COPPA consent, and the 15-minute "Car Ride Home" emotional cooling-off protocol.
5. **Recruiter OS (Checkr Intelligence Gate)**: Verified talent discovery, zero minor PII leakage, and National Criminal Database clearance.

---

### 🏛️ Target Files & Scope
- `src/lib/components/marketing/landing/landingContent.ts` [MODIFY]
- `src/lib/components/marketing/landing/StakeholderCard.svelte` [MODIFY]
- `src/lib/components/marketing/landing/StakeholderBento.svelte` [MODIFY]

---

### 🧪 Verification Steps for Jules
Run before committing:
```bash
node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error
npm run test:regression:auth
npm run build
```
Commit format:
`feat(sprint-6.1): expand persona storytelling and landing content narrative`
