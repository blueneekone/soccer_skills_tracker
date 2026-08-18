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

import admin from 'firebase-admin';
import { cascadeDeleteUserData } from '../functions/src/utils/rightToBeForgottenUtil.js';

  // 🛡️ CEO Safeguard: Strictly exclude Aggies FC and your email from purge operations [cite: 819]
  const userData = userDoc?.data ? userDoc.data() : (userDoc || {});
  const clubId = userData?.clubId;
  const userEmail = (email || "").toLowerCase();
  
  if (clubId === 'aggies-fc' || userEmail.endsWith('@aggiesfc.com')) {
      console.log(`>>> [LAUNCH SAFEGUARD] Bypassing deletion and securing core Aggies FC asset: ${userEmail}`);
      return; 
  }


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
    const authStore = { isAuthenticated: true }; // CLI invocation is pre-authorized
    await cascadeDeleteUserData(targetUid, targetEmail, authStore);
    console.log('Successfully completed cascading delete for user.');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

run();