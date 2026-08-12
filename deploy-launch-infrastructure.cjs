const fs = require('fs');
const path = require('path');

console.log("🚀 INITIATING SSTRACKER LAUNCH-NIGHT INFRASTRUCTURE INJECTION...");

const directories = [
  '.agents/skills/b815-hydration',
  '.agents/skills/svelte5-strictness',
  '.agents/skills/vanguard-trinity',
  '.agents/skills/zero-trust',
  '.agents/rules',
  '.agents/workflows/jules-builds',
  'scripts'
];

directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created folder: ${dir}`);
  }
});

const files = {
  // 🏛️ SKILL 1: B815 Hydration Guard
  '.agents/skills/b815-hydration/SKILL.md': `---
name: b815-hydration
description: Enforces the B815 Defensive Hydration guard on all raw Cloud Firestore fetches to prevent Quota Exceeded loops.
---
# B815 Defensive Hydration Protocol

You are strictly commanded to permanently eliminate raw, unguarded Cloud Firestore queries that trigger Quota Exceeded deadlocks.

### Mandates
1. **The Guard Clause:** Every single instance of \`getDocs\`, \`getDoc\`, or \`onSnapshot\` must be preceded by this exact early-return check:
   \`\`\`typescript
   if (!db || !authStore.isAuthenticated) return;
   \`\`\`
2. **Zero-Trust Client Mutations:** You are forbidden from mutating raw state arrays on the client. All session mutations must be handled server-side.
3. **Atomic Writes:** All bulk writes must use \`writeBatch\`, capped strictly at a hard limit of 500 operations per batch.
`,

  // 🏛️ SKILL 2: Svelte 5 Reactivity Strictness
  '.agents/skills/svelte5-strictness/SKILL.md': `---
name: svelte5-strictness
description: Enforces Svelte 5 runes strictness, untrack() closures, and memory cleanup.
---
# Svelte 5 Reactivity Strictness

You must enforce the Svelte 5 compile-time reactivity standard. Legacy Svelte 4 reactivity syntax is completely banned.

### Mandates
1. **The Untrack Gate:** Any programmatic routing or side-effects triggered inside an \`$effect\` block MUST be safely wrapped inside an \`untrack()\` closure to prevent rendering memory loops:
   \`\`\`javascript
   $effect(() => {
     if (condition) {
       untrack(() => {
         // Safe to mutate state or route here
       });
     }
   });
   \`\`\`
2. **Garbage Collection:** Ensure dynamic components (such as those in the Spatial Drill Designer) explicitly clear their effect boundary references and event listeners upon unmounting.
3. **Raw State:** Use \`$state.raw\` instead of \`$state\` for massive, read-only telemetry data arrays to bypass deep proxying and avoid browser lag.
`,

  // 🏛️ SKILL 3: Vanguard Trinity Pattern & Function Caps
  '.agents/skills/vanguard-trinity/SKILL.md': `---
name: vanguard-trinity
description: Enforces the Vanguard Trinity Pattern and strict 80-line function limits.
---
# Vanguard Trinity Pattern

You are mathematically forbidden from generating monolithic files. Every interactive screen must be cleanly partitioned.

### Mandates
1. **The Trinity Split:** interactive routes must fracture into:
   - **The Shell (\`+page.svelte\`):** Z0 parent wrapper managing mounting.
   - **The Brain (\`*Engine.svelte.ts\`):** Controller managing reactive states via runes.
   - **The Glass (\`*Arena.svelte\`):** Pure interactive view layer.
   - **The HUD (\`*HUD.svelte\`):** Telemetry readout and control deck.
2. **The 80-Line Function Limit:** No single function body or Svelte script block may exceed a hard limit of 80 lines. Extract complex conditionals or mapping functions to \`src/lib/utils/\`.
`,

  // 🏛️ SKILL 4: Zero-Trust Security Payload Stripper
  '.agents/skills/zero-trust/SKILL.md': `---
name: zero-trust
description: Enforces Zero-Trust Security by stripping protected RBAC fields from client-side payloads.
---
# Zero-Trust Security

The frontend client is inherently compromised. You must never trust the client to self-assert roles or credentials.

### Mandates
1. **Payload Stripping:** Explicitly strip all protected RBAC fields (specifically \`role\` and \`clubId\`) from client-side payloads before database mutations are attempted.
2. **Cloud Function Gates:** All role modifications, streak freeze grants, and background invitations must route exclusively through secure server-side Cloud Functions that verify caller Custom JWT Claims.
`,

  // 🛰️ WORKFLOW 1: Admin OS Audit
  '.agents/workflows/jules-builds/audit-admin-os.md': `---
name: audit-admin-os
description: Asynchronous Cloud VM workflow to audit, secure, and design the Global Admin Console.
---
# Swarm Audit: Global Admin Console (Z4)

@jules, please execute the visual and functional audit for the Global Admin Console.

### Rules & Gates
1. Apply \`.agents/skills/b815-hydration\` and \`.agents/skills/zero-trust\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/admin/\`, and stop.

### Execution Sequence
- **Architecture:** Wrap all \`getDocs\` and \`onSnapshot\` calls in B815 guards. Maintain the 80-line limit.
- **Security:** Ensure account impersonation routes securely mint custom JWTs via \`admin.auth().createCustomToken(uid)\`.
- **Design:** Implement the strict 12-column asymmetric Bento Grid with fluid clamp math. Standardize the data tables with crisp 1px borders (#334155) and Geist Mono numbers.
- **QA:** Run Playwright and Vitest. Save visual artifacts to \`/audit-artifacts/admin/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 2: Player OS Audit
  '.agents/workflows/jules-builds/audit-player-os.md': `---
name: audit-player-os
description: Asynchronous Cloud VM workflow to audit and design the Gamified Player OS.
---
# Swarm Audit: Player OS (Dopamine Engine)

@jules, please execute the visual and functional audit for the Player OS.

### Rules & Gates
1. Apply \`.agents/skills/svelte5-strictness\` and \`.agents/skills/b815-hydration\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/player/\`, and stop.

### Execution Sequence
- **Architecture:** Apply B815 hydration guards. Wrap Svelte 5 state mutations inside \`untrack()\` closures to eliminate infinite loops.
- **Gamification:** Wire the Dopamine Engine streak freezes and daily 2% decay to verified Firestore database commits. Do not trigger confetti optimistically.
- **Design:** Overhaul the UI into an aggressive 40% Void Black Gaming HUD with outer chamfered clip-paths. Render pure SVG Vanguard Prism radar charts.
- **QA:** Run visual regression tests. Deposit visual proof to \`/audit-artifacts/player/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 3: Coach OS Audit
  '.agents/workflows/jules-builds/audit-coach-os.md': `---
name: audit-coach-os
description: Asynchronous Cloud VM workflow to audit and design the Coach OS Sideline SIEM.
---
# Swarm Audit: Coach OS (Sideline SIEM)

@jules, please execute the visual and functional audit for the Coach OS.

### Rules & Gates
1. Apply \`.agents/skills/vanguard-trinity\` and \`.agents/skills/zero-trust\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/coach/\`, and stop.

### Execution Sequence
- **Architecture:** Fracture the Roster panel and New Message Modals into the strict Vanguard Trinity Pattern. Enforce the 80-line limit.
- **Security:** Strip client-side parent email lookups. Securely wire the SafeSport Shadow CC trigger to the backend \`onChannelCreated\` Firestore Cloud Function.
- **Design:** Wire the "Tron War Room" field designer shell. Ensure SVG coordinate mappings use \`matrixTransform(getScreenCTM().inverse())\`.
- **QA:** Run unit and E2E specs. Save screenshots and recordings to \`/audit-artifacts/coach/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 4: Director OS Audit
  '.agents/workflows/jules-builds/audit-director-os.md': `---
name: audit-director-os
description: Asynchronous Cloud VM workflow to audit and design the Director OS B2B Revenue Engine.
---
# Swarm Audit: Director OS (B2B Revenue Engine)

@jules, please execute the visual and functional audit for the Director OS.

### Rules & Gates
1. Apply \`.agents/skills/svelte5-strictness\` and \`.agents/skills/b815-hydration\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/director/\`, and stop.

### Execution Sequence
- **Architecture:** Fix Svelte 5 reactivity loops by wrapping dashboard tab mutations inside strict \`untrack()\` gates. 
- **Security:** Wire Stripe Connect checkout session mappings server-side.
- **Design:** Render the 12-column asymmetric Bento Grid for logistics and field matrix slots. Implement color-coded compliance scoring dots on the Compliance Tab.
- **QA:** Ensure svelte-check returns 0 errors. Deposit visual proof to \`/audit-artifacts/director/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 5: Parent OS Audit
  '.agents/workflows/jules-builds/audit-parent-os.md': `---
name: audit-parent-os
description: Asynchronous Cloud VM workflow to audit and design the Parent OS Compliance Vault.
---
# Swarm Audit: Parent OS (Compliance Vault)

@jules, please execute the visual and functional audit for the Parent OS.

### Rules & Gates
1. Apply \`.agents/skills/vanguard-trinity\` and \`.agents/skills/b815-hydration\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/parent/\`, and stop.

### Execution Sequence
- **Architecture:** Audit and purge any unused Firebase SDK zombie imports. Ensure the HIPAA gate layout is fractured into Trinity structures.
- **Security:** Securely bind COPPA 2.0 parental consent enforcers to WebAuthn Biometric enclaves. 
- **Design:** Enforce a calm, flat trust aesthetic. Re-style standard panel borders to use 24px border radii. Apply the 15-minute post-match EQ metric embargo.
- **QA:** Run aesthetics-verification tests. Save visual proof to \`/audit-artifacts/parent/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 6: Commissioner OS Audit
  '.agents/workflows/jules-builds/audit-commissioner-os.md': `---
name: audit-commissioner-os
description: Asynchronous Cloud VM workflow to audit and design the Commissioner OS.
---
# Swarm Audit: Commissioner OS (Federation Command)

@jules, please execute the visual and functional audit for the Commissioner OS.

### Rules & Gates
1. Apply \`.agents/skills/b815-hydration\` and \`.agents/skills/zero-trust\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/commissioner/\`, and stop.

### Execution Sequence
- **Architecture:** Enforce B815 defensive hydration on multi-tenant federation queries. Walled off read-only ODP lookups from Admin global scripts.
- **Design:** Render dense data-analytics panels with strict 90-degree corners. Ensure absolutely no gamification chamfers are used.
- **QA:** Run tournament operations and scheduling E2E tests. Save visual proof to \`/audit-artifacts/commissioner/\`. Open a non-conflicting PR.
`,

  // 🛰️ WORKFLOW 7: Fan OS Audit
  '.agents/workflows/jules-builds/audit-fan-os.md': `---
name: audit-fan-os
description: Asynchronous Cloud VM workflow to audit and design the Fan OS.
---
# Swarm Audit: Fan OS (Broadcast Monetization)

@jules, please execute the visual and functional audit for the Fan OS.

### Rules & Gates
1. Apply \`.agents/skills/b815-hydration\`.
2. **Circuit Breaker:** Authorized max of 3 attempts. If failing, revert, log to \`/audit-artifacts/fan/\`, and stop.

### Execution Sequence
- **Architecture:** Securely bind the Stripe-powered Superdraw Fundraising trigger, verifying campaign endTime validation.
- **Design:** Implement high-contrast broadcast overlay HUDs. Allow live fan interaction emoji particle streams to render on top of live video feeds.
- **QA:** Run visual regression tests. Deposit visual proof to \`/audit-artifacts/fan/\`. Open a non-conflicting PR.
`,

  // 🚀 MASTER DISPATCHER: start-master-swarm.cjs (CommonJS for SvelteKit ESM compatibility)
  'start-master-swarm.cjs': `const { execSync } = require('child_process');

const personas = ["admin", "player", "coach", "director", "parent", "commissioner", "fan"];

console.log("⚡ INITIATING MASTER PARALLEL SWARM DISPATCH SEQUENCE...");

personas.forEach((persona, index) => {
  const title = `Swarm Audit & Recovery: ${persona.toUpperCase()} OS`;
  const body = `@jules, please execute the workflow defined in .agents/workflows/jules-builds/audit-${persona}-os.md`;
  const command = \`gh issue create --title "${title}" --body "${body}" --label "jules"\`;

  console.log(\`[${index + 1}/${personas.length}] Spawning cloud VM for: ${persona.toUpperCase()} OS...\`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(\`✅ Spawned successfully for ${persona.toUpperCase()} OS.\\n\`);
  } catch (err) {
    console.error(\`❌ Failed to spawn VM for ${persona.toUpperCase()} OS: \`, err.message);
  }
});

console.log("🎯 ALL 7 PLATFORM PERSOAS DISPATCHED IN PARALLEL! YOU CAN CLOSE YOUR LAPTOP.");
`
};

Object.entries(files).forEach(([filePath, content]) => {
  const absolutePath = path.join(process.cwd(), filePath);
  fs.writeFileSync(absolutePath, content.trim(), 'utf8');
  console.log(`✏️ Written file: ${filePath}`);
});

console.log("\n✅ ALL INFRASTRUCTURE SKILLS AND PIPELINE SPAWNERS SUCCESSFULLY INSTALLED!");
console.log("👉 Next Step: Run 'node start-master-swarm.cjs' in your terminal to deploy your entire parallel cloud engineering team.");
