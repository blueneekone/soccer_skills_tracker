#!/usr/bin/env node

/**
 * admin-scripts/triggerRightToBeForgotten.js
 * CLI script to securely simulate the PII Shredder ("Right to be Forgotten")
 *
 * PREREQUISITES
 * ─────────────
 * 1. Download a Firebase service account key JSON.
 * 2. Point Node at the key via GOOGLE_APPLICATION_CREDENTIALS:
 *    export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *
 * HOW TO RUN
 * ──────────
 * node admin-scripts/triggerRightToBeForgotten.js <targetUid> <targetEmail>
 */

const admin = require('firebase-admin');
const { cascadeDeleteUserData } = require('../functions/src/utils/rightToBeForgottenUtil');

if (process.argv.length < 4) {
  console.error('Usage: node triggerRightToBeForgotten.js <targetUid> <targetEmail>');
  process.exit(1);
}

const targetUid = process.argv[2];
const targetEmail = process.argv[3];

admin.initializeApp();

async function run() {
  console.log(`Executing Right To Be Forgotten...`);
  console.log(`Target UID: ${targetUid}, Target Email: ${targetEmail}`);

  try {
    await cascadeDeleteUserData(targetUid, targetEmail);
    console.log('Successfully completed cascading delete for user.');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

run();
