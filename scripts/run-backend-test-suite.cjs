/**
 * Comprehensive Backend Logic & Cloud Functions Test Suite Runner
 * ─────────────────────────────────────────────────────────────
 * Executes all domain logic tests for SSTracker's 7 modular codebases:
 * - Compliance & COPPA 2.0 (Checkr, VPC, WebAuthn, Egress Guard)
 * - Commerce & Monetization (Stripe Connect, Dues Installments, Subscriptions)
 * - Communications & SafeSport (Shadow CC, Emergency Broadcasts, Voice Sessions)
 * - RL & Physio Telemetry (Adaptive Policies, Transition Recorders, XP Bounties)
 * - Logistics & Ingestion (Roster Parsing, Identity Sync, Cell Isolation)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT_DIR, 'functions', '__tests__');

const CRITICAL_TESTS = [
  'egressGuard.test.js',
  'complianceCheckr.guard.test.js',
  'complianceOpsVpc.test.js',
  'commerceWebhookInstallments.test.js',
  'subscriptionGate.test.js',
  'commsParentCoachDm.test.js',
  'commsParentVoiceSession.test.js',
  'commsPhase1.test.js',
  'commsPhase2.test.js',
  'commsPhase3b.test.js',
  'commsPhase3c.test.js',
  'commsPhase3d.test.js',
  'commsPhase4a.test.js',
  'commsPhase4b.test.js',
  'commsPhase4c.test.js',
  'cvBiomechanicsVerifier.test.js',
  'claimSyncParity.guard.test.js',
  'coachRosterIngestOps.test.js',
  'functionsDeploy.guard.test.js',
  'gamificationWorkoutXp.test.js',
  'ironVaultRBAC.test.js',
  'lossAvoidance.test.js',
  'ngbFormatAdapters.test.js',
  'platformCellIsolation.test.js',
  'profileSyncerTrials.guard.test.js',
  'rlBountyWiring.guard.test.js',
  'telemetryBoost.test.js',
  'trajectoryOps.test.js',
  'transitionRecorder.guard.test.js',
  'transitionRecorderReward.test.js'
];

console.log('═════════════════════════════════════════════════════════════════════');
console.log('🚀 SSTRACKER FULL BACKEND LOGIC & CLOUD FUNCTIONS VERIFICATION SUITE');
console.log('═════════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const testFile of CRITICAL_TESTS) {
  const filePath = path.join(TESTS_DIR, testFile);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: ${testFile} not found, skipping.`);
    continue;
  }

  process.stdout.write(`⏳ Running ${testFile.padEnd(40)} ... `);
  const result = spawnSync('node', ['--test', filePath], {
    cwd: ROOT_DIR,
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf-8'
  });

  if (result.status === 0) {
    process.stdout.write('✅ PASSED\n');
    passed++;
  } else {
    process.stdout.write('❌ FAILED\n');
    failed++;
    failures.push({ file: testFile, error: result.stderr || result.stdout });
  }
}

console.log('\n═════════════════════════════════════════════════════════════════════');
console.log(`📊 Summary: ${passed} Passed | ${failed} Failed out of ${CRITICAL_TESTS.length} Test Suites`);
console.log('═════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.error('❌ Failed Suites:');
  for (const f of failures) {
    console.error(`\n--- ${f.file} ---`);
    console.error(f.error.slice(0, 500));
  }
  process.exit(1);
} else {
  console.log('🎉 ALL BACKEND BUSINESS LOGIC & CLOUD FUNCTION GATES ARE 100% GREEN!\n');
  process.exit(0);
}
