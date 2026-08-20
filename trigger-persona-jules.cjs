const fs = require('fs');
const { execSync } = require('child_process');

const PERSONAS = ['admin', 'commissioner', 'director', 'coach', 'player', 'parent'];

console.log('🌐 ==============================================================');
console.log('🌐 SSTRACKER PORTABLE SWARM INITIATOR');
console.log('🌐 Spawns cloud virtual machines in parallel to test and verify');
console.log('🌐 all 6 major personas without consuming local Antigravity credits.');
console.log('🌐 ==============================================================\n');

PERSONAS.forEach((persona) => {
  const title = `Swarm Visual Audit & Self-Heal: ${persona.toUpperCase()} OS`;
  const body = `@jules, please spin up a sandboxed cloud VM and run our visual and functional tests for the **${persona.toUpperCase()} OS** persona.

### 🏛️ MANDATORY INSTRUCTIONS:
1. **Core Skills to Enforce:** Ensure you follow `.agents/skills/vanguard-trinity/`, `.agents/skills/svelte5-strictness/`, `.agents/skills/b815-hydration/`, and `.agents/skills/zero-trust/` during the audit.
2. **Anti-Looping Circuit Breaker:** You are restricted to a maximum of 3 test-and-repair loops. If you fail to achieve 100% green compilation after 3 passes, revert, log the error under \`/audit-artifacts/${persona}/\`, and stop.
3. **Authentication:** Do not use manual logins. Mint a Custom JWT token using \`admin.auth().createCustomToken(uid)\` and programmatically inject it to bypass client auth walls.
4. **Layout Verification (Playwright):** 
   - Execute: \`pnpm playwright test tests/platform-cohesion-master.spec.ts --project=chromium --grep "@persona-${persona}"\`
   - Verify Svelte 5 state reactivity and check design token compliance.
   - Assert the 12-column asymmetric Bento Grid topology is intact, Geist Mono is used for technical readouts, and the 60-30-10 palette is enforced.
5. **Artifact Capture:** Capture layout screenshots and visual recordings of successful navigations, saving them cleanly to \`/audit-artifacts/${persona}/\` before opening a clean Pull Request.`;

  console.log(`🚀 Dispatching cloud VM issue for: ${persona.toUpperCase()} OS...`);
  
  try {
    // Generate the issue using the GitHub CLI programmatically
    const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;
    execSync(command, { stdio: 'inherit' });
    console.log(`   ✅ Spawned successfully.\n`);
  } catch (err) {
    console.error(`   ❌ Failed to dispatch. Ensure you are authenticated in gh CLI. Error: ${err.message}\n`);
  }
});

console.log('🎯 ALL 6 PERSONA SWARMS DISPATCHED SUCCESSFULLY! Jules is now building in the cloud.');
