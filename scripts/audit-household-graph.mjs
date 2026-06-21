#!/usr/bin/env node
/**
 * Read-only audit: find household graph disconnects between admin-visible
 * linkage (player_lookup + users.householdId) and callable gates
 * (households.playerEmails / parentEmails).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/audit-household-graph.mjs
 *   node scripts/audit-household-graph.mjs --project sports-skill-tracker-dev
 */

import admin from 'firebase-admin';

const projectId =
  process.argv.includes('--project') ?
    process.argv[process.argv.indexOf('--project') + 1] :
    process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'sports-skill-tracker-dev';

if (!admin.apps.length) {
  admin.initializeApp({projectId});
}

const db = admin.firestore();

function normEmail(v) {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function emailList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => normEmail(String(x))).filter(Boolean))];
}

/** @type {Array<Record<string, unknown>>} */
const issues = [];

async function main() {
  console.log(`[audit-household-graph] project=${projectId}\n`);

  const households = await db.collection('households').get();
  const lookupSnap = await db.collection('player_lookup').get();

  for (const hdoc of households.docs) {
    const hid = hdoc.id;
    const h = hdoc.data() || {};
    const players = emailList(h.playerEmails);
    const parents = emailList(h.parentEmails);

    for (const pem of players) {
      const u = await db.collection('users').doc(pem).get();
      const uhid =
        u.exists && typeof u.data().householdId === 'string' ?
          u.data().householdId.trim() :
          '';
      if (uhid && uhid !== hid) {
        issues.push({
          kind: 'player_users_household_mismatch',
          householdId: hid,
          playerEmail: pem,
          userHouseholdId: uhid,
        });
      }
    }

    for (const par of parents) {
      const u = await db.collection('users').doc(par).get();
      const uhid =
        u.exists && typeof u.data().householdId === 'string' ?
          u.data().householdId.trim() :
          '';
      if (uhid && uhid !== hid) {
        issues.push({
          kind: 'parent_users_household_mismatch',
          householdId: hid,
          parentEmail: par,
          userHouseholdId: uhid,
        });
      }
    }
  }

  for (const ldoc of lookupSnap.docs) {
    const pem = ldoc.id;
    const l = ldoc.data() || {};
    const plHid = typeof l.householdId === 'string' ? l.householdId.trim() : '';
    const plParents = emailList(l.parentEmails);
    if (!plHid || plParents.length === 0) continue;

    const hs = await db.collection('households').doc(plHid).get();
    if (!hs.exists) {
      issues.push({
        kind: 'lookup_household_missing',
        playerEmail: pem,
        lookupHouseholdId: plHid,
        lookupParents: plParents,
      });
      continue;
    }

    const pe = emailList(hs.data().playerEmails);
    const hp = emailList(hs.data().parentEmails);

    if (!pe.includes(pem)) {
      issues.push({
        kind: 'admin_visible_but_not_in_household_players',
        playerEmail: pem,
        householdId: plHid,
        lookupParents: plParents,
        fix: 'repairHouseholdMembership or director linkHousehold',
      });
    }

    for (const par of plParents) {
      if (!hp.includes(par)) {
        issues.push({
          kind: 'lookup_parent_not_on_household',
          playerEmail: pem,
          householdId: plHid,
          parentEmail: par,
          fix: 'repairHouseholdMembership or director linkHousehold',
        });
      }
    }
  }

  const byKind = new Map();
  for (const row of issues) {
    const k = String(row.kind);
    byKind.set(k, (byKind.get(k) || 0) + 1);
  }

  console.log(`Total issues: ${issues.length}\n`);
  for (const [kind, count] of [...byKind.entries()].sort()) {
    console.log(`  ${kind}: ${count}`);
  }
  console.log('\nSample rows (up to 25):\n');
  console.log(JSON.stringify(issues.slice(0, 25), null, 2));
}

main().catch((err) => {
  console.error('[audit-household-graph] failed:', err);
  process.exit(1);
});
