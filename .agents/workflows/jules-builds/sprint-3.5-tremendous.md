### Sprint 3.5: Tremendous API Rewards Integration (Dopamine Engine)

**Context**: We are gamifying the Parent OS. Parents can issue Tremendous digital gift cards to their children upon reaching milestones. You are executing this build.

**Jules Prompt**:
1. **Backend (`functions-commerce`)**:
   - Run `pnpm install tremendous` inside `functions-commerce`.
   - Create `functions-commerce/src/domains/tremendousOps.js`. Implement `listRewardCatalog` (fetches available rewards) and `issueMilestoneReward` (issues reward to child, verifying household claims and B815 hydration guards).
   - **Funding Constraint**: Parents must fund their own rewards. Do NOT build a central SSTracker invoicing system. You must implement a flow where the parent funds their own Tremendous orders using their own payment method.
   - **Trigger Constraint**: By default, rewards must be manually approved. Add support for an `autoApproveRewards` boolean flag on the household document for automatic issuance.
   - Create `functions-commerce/src/webhooks/tremendousWebhook.js` to listen to `reward.redeemed` and update `system_telemetry`.
   - Write comprehensive TDD tests in `functions-commerce/__tests__/tremendousOps.test.js` covering permission denied across households and successful idempotency.

2. **Frontend (`src/routes/(app)/parent/rewards/`)**:
   - Create the Vanguard Trinity components for the Rewards dashboard:
     - `+page.svelte` (Shell)
     - `RewardsEngine.svelte.ts` (Brain) - Must use Svelte 5 `$state` and `$effect` closures.
     - `RewardsArena.svelte` (Glass) - 12-column Bento Grid UI for the reward catalog.
     - `RewardsHUD.svelte` (HUD) - Action Gold CTA for manual reward approval, AND a toggle switch to enable "Auto-Approve Rewards".
   - Verify layout using standard Vitest `jsdom` testing.

3. **Admin Settings (`src/routes/(app)/admin/system-settings/SystemSettingsArena.svelte`)**:
   - Move `Tremendous` to the active `integrationSpecs` array with the `TREMENDOUS_API_KEY` secret.

**Definition of Done**:
- 0 Svelte/TypeScript compiler warnings.
- 100% Green on all Vitest runs for the frontend.
- 100% Green on `node --test` for the backend.
