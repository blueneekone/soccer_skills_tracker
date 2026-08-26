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

### 🏛️ MANDATORY WORKFLOW & PROTOCOL ENFORCEMENT:
1. **Reference Workflow**: \`.agents/workflows/jules-builds/jules-all-personas-e2e-audit-and-repair.md\`
2. **Anti-Looping Circuit Breaker (CRITICAL)**:
   - You are restricted to a **hard maximum of 3 test-and-repair iterations**.
   - If a failure persists after 3 passes, you MUST immediately halt, capture the error log and screenshot in \`/audit-artifacts/platform-e2e/\`, and report the blocker rather than looping.
3. **Multi-Persona Protocol**:
   - Verify all 7 core personas (Coach, Director, Parent, Player, Commissioner, Admin, Fan/Recruiter).
   - Use automated JWT / LocalStorage token injection to bypass login walls.
4. **Bounded-Tests Law (\`.agents/rules/jules-focus.md\`)**:
   - Isolate test sweeps strictly to the targeted routes without getting blocked by legacy rot.
5. **Execution Command**:
   \`pnpm playwright test tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium\`
6. **Definition of Done**: 0 Svelte compilation errors (\`npm run check\`), green tests, screenshots saved, clean PR opened into \`dev\`.`;

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
1. **Core Skills to Enforce:** Follow \`.agents/skills/vanguard-trinity/\`, \`.agents/skills/svelte5-strictness/\`, \`.agents/skills/b815-hydration/\`, and \`.agents/skills/zero-trust/\`.
2. **Anti-Looping Circuit Breaker (CRITICAL):**
   - Hard maximum of **3 test-and-repair loops**.
   - If green tests are not achieved within 3 iterations, stop, log to \`/audit-artifacts/${persona}/\`, and exit gracefully.
3. **Authentication:** Do not use manual logins. Mint a Custom JWT token using \`admin.auth().createCustomToken(uid)\` or inject mock LocalStorage auth to bypass client auth walls.
4. **Layout Verification (Playwright):** 
   - Execute: \`pnpm playwright test tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium --grep "@persona-${persona}"\`
   - Verify Svelte 5 runes reactivity and design token compliance (Geist Mono, 12-col Bento Grid, 60-30-10 palette).
5. **Artifact Capture:** Save layout screenshots to \`/audit-artifacts/${persona}/\` before opening a clean Pull Request.`;

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

### 🏛️ MANDATORY WORKFLOW & CIRCUIT BREAKERS:
1. **Reference Workflow**: \`.agents/workflows/jules-builds/jules-exhaustive-platform-audit-and-monetization.md\`
2. **Anti-Looping Circuit Breaker (CRITICAL)**:
   - Hard maximum of **3 test-and-repair iterations**.
   - If any domain fails after 3 passes, record the failure snapshot in \`/audit-artifacts/platform-exhaustive/\` and exit without infinite loops.
3. **7 Operational Domains Tested**:
   - **Public Marketing & Funnels** (Hero CTA, Pricing Tiers, ROI Calculator)
   - **Stripe Commerce & Subscriptions** (Stripe Connect, Seat Billing, Fee Splits)
   - **Tournaments & Federation Matrix** (Bracket seeding, pitch scheduling, sanctions)
   - **Player Gamification** (Scout's Six Radars, Skill Trees, XP Streaks, Skill Decay)
   - **Recruiter Directory** (Talent search, Checkr background verification)
   - **Fan Hub** (Sideline streaming, digital ticketing, Superdraws)
   - **Tutoring Marketplace** (Coach booking, Stripe microcharge splits)
4. **Execution Command**:
   \`pnpm playwright test tests/platform-exhaustive-master.spec.ts tests/persona-interactive-e2e.spec.ts tests/platform-cohesion-master.spec.ts --project=chromium\`
5. **Definition of Done**: 0 compilation errors, green assertions, screenshots captured in \`/audit-artifacts/platform-exhaustive/\`, PR opened into \`dev\`.`;

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
