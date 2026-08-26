const fs = require('fs');
const { execSync } = require('child_process');

const ALL_PERSONAS = ['admin', 'commissioner', 'director', 'coach', 'player', 'parent'];
const targetArg = process.argv[2]?.toLowerCase() || 'all';

console.log('🌐 ==============================================================');
console.log('🌐 SSTRACKER PORTABLE SWARM INITIATOR');
console.log('🌐 Spawns cloud virtual machines in parallel to test and verify');
console.log('🌐 personas & interactive E2E workflows without consuming local credits.');
console.log('🌐 ==============================================================\n');

function dispatchMasterSwarm() {
  const title = `Swarm Master E2E Interactive Audit & Self-Heal`;
  const body = `@jules, please spin up a sandboxed cloud VM and execute our full platform interactive audit workflow.

### 🏛️ MANDATORY WORKFLOW REFERENCE:
- Follow \`.agents/workflows/jules-builds/jules-all-personas-e2e-audit-and-repair.md\`
- Execute the full interactive Playwright suite:
  \`pnpm playwright test tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium\`
- Enforce strict Svelte 5 runes, B815 defensive hydration, and 80-line function limits.
- Save audit artifacts to \`/audit-artifacts/platform-e2e/\` and open a clean Pull Request into \`dev\`.`;

  console.log(`🚀 Dispatching Master Interactive E2E Swarm...`);
  try {
    const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;
    execSync(command, { stdio: 'inherit' });
    console.log(`   ✅ Master Swarm spawned successfully.\n`);
  } catch (err) {
    console.error(`   ❌ Failed to dispatch Master Swarm: ${err.message}\n`);
  }
}

function dispatchPersonaSwarm(persona) {
  const title = `Swarm Visual Audit & Self-Heal: ${persona.toUpperCase()} OS`;
  const body = `@jules, please spin up a sandboxed cloud VM and run our visual and functional tests for the **${persona.toUpperCase()} OS** persona.

### 🏛️ MANDATORY INSTRUCTIONS:
1. **Core Skills to Enforce:** Ensure you follow \`.agents/skills/vanguard-trinity/\`, \`.agents/skills/svelte5-strictness/\`, \`.agents/skills/b815-hydration/\`, and \`.agents/skills/zero-trust/\` during the audit.
2. **Anti-Looping Circuit Breaker:** You are restricted to a maximum of 3 test-and-repair loops. If you fail to achieve 100% green compilation after 3 passes, revert, log the error under \`/audit-artifacts/${persona}/\`, and stop.
3. **Authentication:** Do not use manual logins. Mint a Custom JWT token using \`admin.auth().createCustomToken(uid)\` and programmatically inject it to bypass client auth walls.
4. **Layout Verification (Playwright):** 
   - Execute: \`pnpm playwright test tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium --grep "@persona-${persona}"\`
   - Verify Svelte 5 state reactivity and check design token compliance.
   - Assert the 12-column asymmetric Bento Grid topology is intact, Geist Mono is used for technical readouts, and the 60-30-10 palette is enforced.
5. **Artifact Capture:** Capture layout screenshots and visual recordings of successful navigations, saving them cleanly to \`/audit-artifacts/${persona}/\` before opening a clean Pull Request.`;

  console.log(`🚀 Dispatching cloud VM issue for: ${persona.toUpperCase()} OS...`);
  try {
    const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;
    execSync(command, { stdio: 'inherit' });
    console.log(`   ✅ Spawned successfully.\n`);
  } catch (err) {
    console.error(`   ❌ Failed to dispatch. Ensure you are authenticated in gh CLI. Error: ${err.message}\n`);
  }
}

function dispatchExhaustive360Swarm() {
  const title = `Swarm 360-Degree Platform Audit: Stripe, Tournaments, Gamification & Personas`;
  const body = `@jules, please spin up a sandboxed cloud VM and execute our 360-degree exhaustive platform audit workflow.

### 🏛️ MANDATORY WORKFLOW REFERENCE:
- Follow \`.agents/workflows/jules-builds/jules-exhaustive-platform-audit-and-monetization.md\`
- Execute the complete exhaustive Playwright suite:
  \`pnpm playwright test tests/platform-exhaustive-master.spec.ts tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium\`
- Audit:
  1. Public Marketing & ROI Calculators
  2. Stripe Connect & Subscriptions
  3. Tournaments & Commissioner Brackets
  4. Player Gamification, Skill Trees & Habit Streaks
  5. Recruiter Directory & Checkr Clearance
  6. Fan Broadcast & Ticketing
  7. Private Coaching Marketplace
- Save audit artifacts to \`/audit-artifacts/platform-exhaustive/\` and open a clean Pull Request into \`dev\`.`;

  console.log(`🚀 Dispatching 360-Degree Exhaustive Platform Swarm...`);
  try {
    const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;
    execSync(command, { stdio: 'inherit' });
    console.log(`   ✅ 360 Swarm spawned successfully.\n`);
  } catch (err) {
    console.error(`   ❌ Failed to dispatch 360 Swarm: ${err.message}\n`);
  }
}

if (targetArg === 'master') {
  dispatchMasterSwarm();
} else if (targetArg === '360' || targetArg === 'exhaustive' || targetArg === 'full') {
  dispatchExhaustive360Swarm();
} else if (ALL_PERSONAS.includes(targetArg)) {
  dispatchPersonaSwarm(targetArg);
} else {
  // Dispatch all persona swarms and the 360 exhaustive suite
  dispatchExhaustive360Swarm();
  dispatchMasterSwarm();
  ALL_PERSONAS.forEach((p) => dispatchPersonaSwarm(p));
}

console.log('🎯 DISPATCH COMPLETED! Jules is now building and auditing in the cloud.');
