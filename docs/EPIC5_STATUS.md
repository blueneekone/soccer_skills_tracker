# Epic 5 — Enterprise Logistics Engine — Status Audit

> **Naming note:** Epic 5 **in this doc** = Enterprise Logistics (Director OS). This is **not** the same as lettered Product Epic E in [`ROADMAP.md`](../ROADMAP.md) or the old ROADMAP Epic 5 (State Association APIs).

Concise sprint-by-sprint checkpoint against roadmap intent. Evidence is grounded in repo search (April 2026).

| Sprint | Roadmap intent | Status | Evidence |
|--------|----------------|--------|-----------|
| **5.1** | Household provisioning, COPPA lock, parent-first invites, operative (minor) login model | **Done (gates)** | Household + VPC routes; `epic51CoppaSignup.test.ts`. Open-signup teardown = product policy (not code lock). |
| **5.2** | Retire standalone `/registrar`; Compliance Matrix inside Director OS | **Done** | `/registrar` → `/director?tab=compliance`; `ComplianceTab` + `loadComplianceTable`; `epic52RegistrarConsolidation.test.ts`. |
| **5.3** | Facility vault (GPS/maps), tactical deployment calendar | **Done** | Field Ops split: [`DeploymentCalendar.svelte`](../src/lib/components/director/os/DeploymentCalendar.svelte) + [`FacilityMapVault.svelte`](../src/lib/components/field-ops/FacilityMapVault.svelte) in [`FieldOpsModule.svelte`](../src/lib/components/director/os/FieldOpsModule.svelte); `deployment_calendar_entries` rules + index; family announce toggle → Epic 4.5 `onDeploymentCalendarEntryCreated`. |
| **5.4** | Weather/lightning integration; field LOCKED within radius | **Partial (scaffold)** | `evaluateFieldWeatherLock` scheduled CF + `field_weather_status` rules; Field Ops banner + deployment create block; provider API stub until secrets. |
| **5.5** | FCM, broadcast/coach/director pushes, Safe-Comms triad | **Done (infra audit)** | [`docs/FCM_AND_MESSAGING_MATRIX.md`](FCM_AND_MESSAGING_MATRIX.md); `epic55MessagingAudit.test.ts`. Product delivery → Epic 4. |
| **5.6** | Stripe (B2B/B2C), logic gate compliance/billing ↔ Player OS | **Done (client gate)** | `playerOsAccess.js` + `PlayerShell` billing banner; Stripe callables + `subscriptionGate.test.js`. |

**Notes**

- Canonical workout logging for XP remains in **`workout_logs`** and callable flows ([`functions/index.js`](../functions/index.js), `logTrainingSession` creates `workout_logs` docs ~4354+)—relevant background for Epic 5 telemetry bus and downstream Phase 9 specs.
- This document is descriptive, not scope approval; align priorities with [`ROADMAP.md`](../ROADMAP.md).

---

## Remaining build (Epic 5 — tracked deliverables)

| Item | Status | Artifacts |
|------|--------|-----------|
| **5.6** Player OS billing gate | **Shipped (client)** | [`src/lib/enterprise/playerOsAccess.js`](../src/lib/enterprise/playerOsAccess.js) (`computePlayerOsBlocked`); [`src/lib/components/shell/PlayerShell.svelte`](../src/lib/components/shell/PlayerShell.svelte) + [`src/lib/components/shell/PlayerReadOnlyBillingBanner.svelte`](../src/lib/components/shell/PlayerReadOnlyBillingBanner.svelte). Entitlements via [`src/lib/stores/licenseEntitlement.svelte.js`](../src/lib/stores/licenseEntitlement.svelte.js); Stripe field names from [`functions/index.js`](../functions/index.js) `stripeWebhook` / `license_entitlements`. |
| **5.2** Registrar / Director consolidation | **Done** | [`docs/REGISTRAR_DIRECTOR_MIGRATION.md`](REGISTRAR_DIRECTOR_MIGRATION.md); [`src/routes/(app)/registrar/+page.js`](../src/routes/(app)/registrar/+page.js); `epic52RegistrarConsolidation.test.ts`. |
| **5.3** Deployment calendar | **Done** | [`docs/DEPLOYMENT_CALENDAR_SCHEMA.md`](DEPLOYMENT_CALENDAR_SCHEMA.md); [`DeploymentCalendar.svelte`](../src/lib/components/director/os/DeploymentCalendar.svelte); [`epic53DeploymentCalendar.test.ts`](../src/lib/components/director/os/__tests__/epic53DeploymentCalendar.test.ts). |
| **5.4** Weather lock | **Partial (scaffold)** | [`docs/WEATHER_LOCK_DESIGN.md`](WEATHER_LOCK_DESIGN.md); [`weatherOps.js`](../functions/src/domains/weatherOps.js); [`epic54WeatherLock.test.ts`](../src/lib/components/director/os/__tests__/epic54WeatherLock.test.ts). |
| **5.1** COPPA / signup matrix | **Done (doc + gates)** | [`docs/COPPA_SIGNUP_MATRIX.md`](COPPA_SIGNUP_MATRIX.md); `epic51CoppaSignup.test.ts`. |
| **5.5** Messaging audit | **Done (inventory)** | [`docs/FCM_AND_MESSAGING_MATRIX.md`](FCM_AND_MESSAGING_MATRIX.md); `epic55MessagingAudit.test.ts`. |

**Manual / follow-up:** Bind `TOMORROW_IO_API_KEY` + deploy `evaluateFieldWeatherLock`; deploy Firestore rules/indexes for deployment calendar + weather status.
