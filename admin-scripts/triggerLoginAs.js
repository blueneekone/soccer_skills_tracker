#!/usr/bin/env node

/**
 * admin-scripts/triggerLoginAs.js
 * CLI script to securely simulate Account Impersonation ("Login As")
 *
 * PREREQUISITES
 * ─────────────
 * 1. Download a Firebase service account key JSON.
 * 2. Point Node at the key via GOOGLE_APPLICATION_CREDENTIALS:
 *    export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *
 * HOW TO RUN
 * ──────────
 * node admin-scripts/triggerLoginAs.js <adminUid> <adminEmail> <targetUid> <targetEmail>
 */

const admin = require('firebase-admin');
const { mintImpersonationToken } = require('../functions/src/utils/loginAsUtil');

if (process.argv.length < 6) {
  console.error('Usage: node triggerLoginAs.js <adminUid> <adminEmail> <targetUid> <targetEmail>');
  process.exit(1);
}

const adminUid = process.argv[2];
const adminEmail = process.argv[3];
const targetUid = process.argv[4];
const targetEmail = process.argv[5];

admin.initializeApp();

async function run() {
  console.log(`Simulating Login As...`);
  console.log(`Admin UID: ${adminUid}, Admin Email: ${adminEmail}`);
  console.log(`Target UID: ${targetUid}, Target Email: ${targetEmail}`);

  try {
    const customToken = await mintImpersonationToken(adminUid, adminEmail, targetUid, targetEmail, 'CLI');
    console.log('Successfully minted custom token:');
    console.log(customToken);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

run();
