# Epic 5 — Enterprise Logistics Engine — Status Audit

Concise sprint-by-sprint checkpoint against roadmap intent (**Epic 5** in [`roadmap.md`](../roadmap.md)). Evidence is grounded in repo search (April 2026).

| Sprint | Roadmap intent | Status | Evidence |
|--------|----------------|--------|-----------|
| **5.1** | Household provisioning, COPPA lock, parent-first invites, operative (minor) login model | **Partial** | [`src/routes/(app)/parent/household/+page.svelte`](../src/routes/(app)/parent/household/+page.svelte) — `coppaSigned`, household workflow, operative rows; [`functions/index.js`](../functions/index.js) — `households`, [`linkHousehold`](../functions/index.js) (~2908), VPC/parent/consent flows ([`parentGrantVpcConsent`](../functions/index.js) ~3411+, [`directorApproveVpc`](../functions/index.js) ~3203), COPPA stamping ([`Parent: digital COPPA`](../functions/index.js) ~8133+); login split [`src/routes/login/+page.svelte`](../src/routes/login/+page.svelte). “Tear down open signup entirely” vs invite-only remains a product/policy question—not fully evidenced as a lock. |
| **5.2** | Retire standalone `/registrar`; Compliance Matrix inside Director OS | **Partial** | Director: [`src/routes/(app)/director/+page.svelte`](../src/routes/(app)/director/+page.svelte) — `ComplianceTab`, `HouseholdComplianceTab`, registrar invite tab; **`/registrar` still ships** [`src/routes/(app)/registrar/+page.svelte`](../src/routes/(app)/registrar/+page.svelte) with roster/registrar tooling (not removed). Consolidation is **parallel surfaces**, not a single replacement app. |
| **5.3** | Facility vault (GPS/maps), tactical deployment calendar | **Partial** | Facility / field UX: [`src/lib/components/director/os/FieldOpsModule.svelte`](../src/lib/components/director/os/FieldOpsModule.svelte); maps/vault [`src/lib/components/director/os/LogisticsMap.svelte`](../src/lib/components/director/os/LogisticsMap.svelte), [`src/lib/components/field-ops/FacilityMapVault.svelte`](../src/lib/components/field-ops/FacilityMapVault.svelte); server [`exports.directorUpsertField`](../functions/index.js) (~1840); nav [`src/lib/shell/workspaceNav.js`](../src/lib/shell/workspaceNav.js) Field Ops → `/director?tab=field`. **Dedicated practice/match deployment calendar** not evidenced under director surfaces (no calendar module found in codebase search). |
| **5.4** | Weather/lightning integration; field LOCKED within radius | **Not evidenced** | No `Tomorrow.io`, `StrikeAlert`, or lightning-distance lock logic surfaced in **`functions/`** or **`src/`** grep; weather-driven field status appears **planned only** (compare roadmap). |
| **5.5** | FCM, broadcast/coach/director pushes, Safe-Comms triad | **Partial** | [`functions/index.js`](../functions/index.js) — `device_tokens` collection (~7447+, ~7523+); `sendMulticast` for missions/drills/trials (~7642+, ~7705+, ~7784+, ~7851+); staff→athlete messaging with parent CC hooks (~3558+) in [`functions/index.js`](../functions/index.js); channel repair + **`messaging_audit`** references (~3722+). **Full broadcast product** vs targeted FCM triggers is mixed; evaluate against roadmap wording. |
| **5.6** | Stripe (B2B/B2C), logic gate compliance/billing ↔ Player OS | **Partial** | Stripe: [`exports.createStripeCheckoutSession`](../functions/index.js) (~7145), [`exports.stripeWebhook`](../functions/index.js) (~7247); client [`src/lib/components/pricing/PricingTable.svelte`](../src/lib/components/pricing/PricingTable.svelte); read-only subscription UX [`src/lib/components/director/DirectorReadOnlyBanner.svelte`](../src/lib/components/director/DirectorReadOnlyBanner.svelte), club license fields in admin org UI. End-to-end **“Player OS lockout from billing/compliance gate”** is not clearly isolated in one surface—Stripe + entitlements exist; treat full matrix as ongoing. |

**Notes**

- Canonical workout logging for XP remains in **`workout_logs`** and callable flows ([`functions/index.js`](../functions/index.js), `logTrainingSession` creates `workout_logs` docs ~4354+)—relevant background for Epic 5 telemetry bus and downstream Phase 9 specs.
- This document is descriptive, not scope approval; align priorities with [`roadmap.md`](../roadmap.md).

---

## Remaining build (Epic 5 — tracked deliverables)

| Item | Status | Artifacts |
|------|--------|-----------|
| **5.6** Player OS billing gate | **Shipped (client)** | [`src/lib/enterprise/playerOsAccess.js`](../src/lib/enterprise/playerOsAccess.js) (`computePlayerOsBlocked`); [`src/lib/components/shell/PlayerShell.svelte`](../src/lib/components/shell/PlayerShell.svelte) + [`src/lib/components/shell/PlayerReadOnlyBillingBanner.svelte`](../src/lib/components/shell/PlayerReadOnlyBillingBanner.svelte). Entitlements via [`src/lib/stores/licenseEntitlement.svelte.js`](../src/lib/stores/licenseEntitlement.svelte.js); Stripe field names from [`functions/index.js`](../functions/index.js) `stripeWebhook` / `license_entitlements`. |
| **5.2** Registrar / Director consolidation | **Doc + optional redirect** | [`docs/REGISTRAR_DIRECTOR_MIGRATION.md`](REGISTRAR_DIRECTOR_MIGRATION.md); [`src/routes/(app)/registrar/+layout.svelte`](../src/routes/(app)/registrar/+layout.svelte) → `/director?tab=registrars`; `registrar` on [`src/lib/auth/route-policies.js`](../src/lib/auth/route-policies.js) `/director`. |
| **5.3** Deployment calendar | **Scaffold** | [`docs/DEPLOYMENT_CALENDAR_SCHEMA.md`](DEPLOYMENT_CALENDAR_SCHEMA.md); [`src/lib/components/director/os/DeploymentCalendarPanel.svelte`](../src/lib/components/director/os/DeploymentCalendarPanel.svelte) in Field Ops; [`firestore.rules`](../firestore.rules), [`firestore.indexes.json`](../firestore.indexes.json). |
| **5.4** Weather lock | **Doc only** | [`docs/WEATHER_LOCK_DESIGN.md`](WEATHER_LOCK_DESIGN.md). |
| **5.5** Messaging audit | **Inventory** | [`docs/FCM_AND_MESSAGING_MATRIX.md`](FCM_AND_MESSAGING_MATRIX.md). |
| **5.1** COPPA / signup matrix | **Doc** | [`docs/COPPA_SIGNUP_MATRIX.md`](COPPA_SIGNUP_MATRIX.md). |

**Manual / follow-up:** Stripe and weather provider secrets; deploy Firestore index for `deployment_calendar_entries`; optional `evaluateFieldWeatherLock` implementation per weather doc; full registrar parity QA before removing `/registrar` pages.
