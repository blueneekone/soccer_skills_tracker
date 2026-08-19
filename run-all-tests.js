#!/usr/bin/env node

// =============================================================================
// SSTRACKER PIPELINE ORCHESTRATOR - run-all-tests.js
// Evaluates our comprehensive Svelte 5 and Firebase test suites locally.
// Designed specifically for simple, single-command terminal execution.
// =============================================================================

const { execSync } = require('child_process');

console.log("=============================================================");
console.log("🧪 INITIATING PLATFORM-WIDE REMEDIATION & VERIFICATION SWEEP...");
console.log("=============================================================\n");

try {
  // 1. Compile Svelte 5 & TS checking
  console.log("🧹 [1/3] Running strict Svelte-Check compilation passes...");
  execSync('npm run check || pnpm run check', { stdio: 'inherit' });
  console.log("🟢 Compilation checks completely successful with 0 errors.\n");

  // 2. Execute Backend Vitest specs
  console.log("🧠 [2/3] Executing Vitest backend logic verification suites...");
  execSync('npx vitest run', { stdio: 'inherit' });
  console.log("🟢 All backend unit and integration tests successfully verified.\n");

  // 3. Execute Front-End Playwright visual & behavioral checks
  console.log("🎨 [3/3] Launching Playwright browser-in-the-loop traversals...");
  execSync('npx playwright test tests/platform-cohesion-master.spec.ts --project=chromium --headed', { stdio: 'inherit' });
  console.log("🟢 All 6 Persona-specific visual layout and flow assertions passed.\n");

  console.log("=============================================================");
  console.log("🎉 PLATFORM COMPLIANCE SWEEP COMPLETE: 100% GREEN TESTS!");
  console.log("🚀 SSTRACKER IS OFFICIALLY LOCKED AND READY FOR DEPLOYMENT.");
  console.log("=============================================================");

} catch (error) {
  console.error("\n❌ [DevOps Error] Test Suite returned a failure state.");
  console.error("Please examine the trace outputs above and fix Svelte reactivity loops or layout overlaps before retrying.");
  process.exit(1);
}
