'use strict';

/**
 * Read-only Firestore root collection inventory for hygiene audits.
 *
 *   node scripts/firestore-inventory-report.cjs
 *   node scripts/firestore-inventory-report.cjs --project sports-skill-tracker-dev
 *   node scripts/firestore-inventory-report.cjs --out docs/FIRESTORE_INVENTORY.json
 *
 * Requires Application Default Credentials (firebase login) or GOOGLE_APPLICATION_CREDENTIALS.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const COUNT_CAP = 10_000;
const SAMPLE_DOCS = 3;

const argv = process.argv.slice(2);
function argValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

const projectId = argValue('--project') || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT;
const outPath = argValue('--out');
const forceCliAuth = argv.includes('--cli-auth') || !process.env.GOOGLE_APPLICATION_CREDENTIALS;

/** Root-level collections with explicit `match /name/` in firestore.rules (not subcollections). */
const RULES_ROOT_COLLECTIONS = new Set([
  'users', 'households', 'operative_dispatches', 'auth_challenges', 'clubs', 'teams',
  'rosters', 'roster_drop_requests', 'coach_lookup', 'registrar_lookup', 'player_lookup',
  'team_workouts', 'schedules', 'public_player_profiles', 'trial_scores', 'drills',
  'assignments', 'missions', 'assigned_missions', 'workouts', 'reps', 'trials',
  'player_stats', 'evaluations', 'passports', 'security_audit', 'recruiters', 'config',
  'consent_records', 'minor_retention_queue', 'vpc_requests', 'in_app_messages',
  'messaging_audit', 'seasons', 'player_eligibility', 'roster_links', 'affinity_ingest_raw',
  'affinity_webhook_events', 'deployment_calendar_entries', 'license_entitlements',
  'team_entitlements', 'team_stats', 'fields', 'coach_invites', 'licenses', 'sports',
  'player_metrics', 'device_tokens', 'organizations', 'invites', 'audit_logs',
  'platform_config', 'opponents', 'fixtures', 'match_results', 'match_results_public',
  'eq_attestations', 'consent_tokens', 'consent_logs', 'consents', 'pii_vault',
  'alpha_feedback', 'pending_deletions', 'team_broadcasts', 'academic_records',
  'tutor_assignments', 'recruiter_watchlist', 'recruiter_handshakes', 'stat_history',
  'facilities', 'facility_bookings', 'season_registrations', 'transfer_tokens',
  'transfer_history', 'clearance_records', 'drill_completions', 'grit_awards', 'cells',
  'gateway_idempotency', 'gateway_rate_buckets', 'cell_promotion_queue', 'pricing_policy',
  'pricing_policy_audit', 'platform_fee_ledger', 'tickets', 'hotel_rebates',
  'recruiter_accounts', 'recruiter_export_log', 'tournament_events', 'partner_webhook_log',
  'hotel_partners', 'magic_uplinks', 'magic_uplink_audit', 'coppa_attestations',
  'ad_block_audit', 'egress_block_audit', 'sports_configs', 'sport_audit_report',
  'rl_inference_log', 'rl_transitions', 'rl_policy_state', 'rl_training_runs',
  'rl_safety_overrides', 'physio_self_reports', 'reengagement_alerts', 'bounties',
  'bounty_completions', 'bounty_audit', 'team_assignments',
]);

/** Known in code but no root rules match (catch-all deny for clients). */
const CODE_NO_RULES = new Set([
  'active_missions', 'club_playbooks', 'intrinsic_journals', 'system_telemetry',
  'global_drills', 'mail',
]);

/** Overlap sets — never auto-delete; report for consolidation. */
const OVERLAP_GROUPS = {
  assignments_vs_team_assignments: ['assignments', 'team_assignments'],
  missions_family: ['missions', 'assigned_missions', 'active_missions'],
  sports_vs_sports_configs: ['sports', 'sports_configs'],
  recruiters_vs_recruiter_accounts: ['recruiters', 'recruiter_accounts'],
  top_level_vs_team_drills: ['drills', 'workouts', 'team_workouts'],
};

function loadCanonicalFromRepo() {
  const rulesPath = path.join(REPO_ROOT, 'firestore.rules');
  const rulesSrc = fs.readFileSync(rulesPath, 'utf8');
  const fromRules = new Set();
  const re = /match \/([a-zA-Z_][a-zA-Z0-9_]*)\/\{/g;
  let m;
  while ((m = re.exec(rulesSrc)) !== null) {
    if (m[1] !== 'databases' && m[1] !== 'document') fromRules.add(m[1]);
  }
  return fromRules;
}

function grepCollectionRefs(collectionName) {
  const patterns = [
    `collection(db, '${collectionName}'`,
    `collection(db, "${collectionName}"`,
    `.collection('${collectionName}')`,
    `.collection("${collectionName}")`,
    `match /${collectionName}/`,
    `'${collectionName}/`,
    `"${collectionName}/`,
  ];
  let srcHits = 0;
  let fnHits = 0;
  const dirs = [
    { root: path.join(REPO_ROOT, 'src'), label: 'src' },
    { root: path.join(REPO_ROOT, 'functions'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-platform'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-rl'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-commerce'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-compliance'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-integrations'), label: 'functions' },
    { root: path.join(REPO_ROOT, 'functions-core'), label: 'functions' },
  ];
  for (const { root, label } of dirs) {
    if (!fs.existsSync(root)) continue;
    for (const pat of patterns) {
      try {
        const out = execSync(
          `rg -l --glob "!**/node_modules/**" --glob "!**/.svelte-kit/**" -F "${pat.replace(/"/g, '\\"')}" "${root}"`,
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
        ).trim();
        const n = out ? out.split('\n').filter(Boolean).length : 0;
        if (label === 'src') srcHits += n;
        else fnHits += n;
      } catch {
        /* no matches */
      }
    }
  }
  return { src: srcHits > 0, functions: fnHits > 0 };
}

async function countCollection(db, colRef) {
  let total = 0;
  let lastId = null;
  const pageSize = 500;
  while (total < COUNT_CAP) {
    let q = colRef.orderBy('__name__').limit(pageSize);
    if (lastId) q = q.startAfter(lastId);
    const snap = await q.get();
    if (snap.empty) break;
    total += snap.size;
    lastId = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  const approx = total >= COUNT_CAP ? `${COUNT_CAP}+` : String(total);
  return { count: total, approx };
}

async function sampleDocIds(colRef, n = SAMPLE_DOCS) {
  const snap = await colRef.limit(n).get();
  return snap.docs.map((d) => d.id);
}

function classifyVerdict(name, refs, hasRules, docCount) {
  if (Object.values(OVERLAP_GROUPS).some((g) => g.includes(name))) return 'REVIEW';
  if (['users', 'households', 'player_lookup', 'coach_lookup', 'registrar_lookup',
    'organizations', 'clubs', 'teams', 'license_entitlements', 'team_assignments',
    'bounties', 'audit_logs', 'security_audit', 'consent_records', 'consent_tokens',
    'consent_logs', 'consents', 'pii_vault', 'magic_uplinks', 'magic_uplink_audit'].includes(name)) {
    return 'KEEP';
  }
  if (CODE_NO_RULES.has(name)) return 'REVIEW';
  if (!refs.src && !refs.functions && !hasRules && docCount === 0) return 'DELETE_CANDIDATE';
  if (!refs.src && !refs.functions && !hasRules) return 'DELETE_CANDIDATE';
  if (!refs.src && !refs.functions) return 'REVIEW';
  return 'KEEP';
}

function resolveFirebaseToolsRoot() {
  try {
    return path.dirname(require.resolve('firebase-tools/package.json'));
  } catch {
    const npxRoot = path.join(
      process.env.LOCALAPPDATA || '',
      'npm-cache',
      '_npx',
    );
    if (!fs.existsSync(npxRoot)) throw new Error('firebase-tools not found; run: npx firebase-tools@latest login');
    const hits = [];
    for (const dir of fs.readdirSync(npxRoot)) {
      const pkg = path.join(npxRoot, dir, 'node_modules', 'firebase-tools', 'package.json');
      if (fs.existsSync(pkg)) hits.push(path.dirname(pkg));
    }
    if (!hits.length) throw new Error('firebase-tools not found in npx cache; run: npx firebase-tools@latest login');
    return hits[0];
  }
}

async function getFirebaseCliAccessToken() {
  const ftRoot = resolveFirebaseToolsRoot();
  const { getGlobalDefaultAccount, getAccessToken } = require(path.join(ftRoot, 'lib', 'auth'));
  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('firebase login required (no refresh token in configstore)');
  }
  const token = await getAccessToken(account.tokens.refresh_token, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/datastore',
  ]);
  return token.access_token;
}

async function firestoreRest(project, accessToken) {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  async function listRootCollections() {
    const res = await fetch(`${base}:listCollectionIds`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    if (!res.ok) {
      throw new Error(`listCollectionIds ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return (data.collectionIds || []).sort();
  }
  async function countCollection(collectionId) {
    const body = {
      structuredAggregationQuery: {
        aggregations: [{ alias: 'n', count: {} }],
        structuredQuery: { from: [{ collectionId }] },
      },
    };
    const res = await fetch(`${base}:runAggregationQuery`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return countCollectionPaginate(collectionId);
    }
    const data = await res.json();
    const n = Number(data[0]?.result?.aggregateFields?.n?.integerValue
      ?? data.result?.aggregateFields?.n?.integerValue
      ?? 0);
    return Math.min(n, COUNT_CAP);
  }
  async function countCollectionPaginate(collectionId) {
    let total = 0;
    let pageToken;
    const pageSize = 500;
    while (total < COUNT_CAP) {
      const url = new URL(`${base}/${collectionId}`);
      url.searchParams.set('pageSize', String(pageSize));
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await fetch(url, { headers: { Authorization: headers.Authorization } });
      if (!res.ok) throw new Error(`list ${collectionId} ${res.status}`);
      const data = await res.json();
      const docs = data.documents || [];
      total += docs.length;
      pageToken = data.nextPageToken;
      if (!pageToken || docs.length < pageSize) break;
    }
    return total;
  }
  async function sampleDocIds(collectionId, n = SAMPLE_DOCS) {
    const res = await fetch(`${base}/${collectionId}?pageSize=${n}`, {
      headers: { Authorization: headers.Authorization },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map((d) => d.name.split('/').pop());
  }
  return { listRootCollections, countCollection, countCollectionPaginate, sampleDocIds };
}

async function main() {
  const rulesFromFile = loadCanonicalFromRepo();
  console.error(`[inventory] project=${projectId} (read-only)`);

  let names = [];
  let useRest = false;
  let rest;
  /** @type {import('firebase-admin').firestore.Firestore | null} */
  let adminDb = null;

  if (forceCliAuth) {
    console.error('[inventory] Using Firebase CLI OAuth + Firestore REST (no ADC)');
    const accessToken = await getFirebaseCliAccessToken();
    rest = await firestoreRest(projectId, accessToken);
    names = await rest.listRootCollections();
    useRest = true;
  } else {
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({ projectId, credential: admin.credential.applicationDefault() });
      }
      adminDb = admin.firestore();
      const rootCols = await adminDb.listCollections();
      names = rootCols.map((c) => c.id).sort();
    } catch (adcErr) {
      console.error(`[inventory] ADC failed (${adcErr.message}); falling back to Firebase CLI + REST`);
      const accessToken = await getFirebaseCliAccessToken();
      rest = await firestoreRest(projectId, accessToken);
      names = await rest.listRootCollections();
      useRest = true;
    }
  }

  const rows = [];
  for (const name of names) {
    let count;
    let sampleIds;
    if (useRest) {
      count = await rest.countCollection(name).catch(() => rest.countCollectionPaginate(name));
      sampleIds = await rest.sampleDocIds(name);
    } else {
      const colRef = adminDb.collection(name);
      ({ count } = await countCollection(adminDb, colRef));
      sampleIds = await sampleDocIds(colRef);
    }
    const approx = count >= COUNT_CAP ? `${COUNT_CAP}+` : String(count);
    const refs = grepCollectionRefs(name);
    const hasRules = RULES_ROOT_COLLECTIONS.has(name) || rulesFromFile.has(name);
    const verdict = classifyVerdict(name, refs, hasRules, count);
    rows.push({
      collection: name,
      docCount: approx,
      docCountNumeric: count,
      hasRulesMatch: hasRules,
      referencedInSrc: refs.src,
      referencedInFunctions: refs.functions,
      referencedInRules: hasRules,
      sampleDocIds,
      verdict,
    });
    console.error(`  ${name}: ${approx}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    readOnly: true,
    countCap: COUNT_CAP,
    totalRootCollections: rows.length,
    overlapGroups: OVERLAP_GROUPS,
    collections: rows,
    rulesRootCount: RULES_ROOT_COLLECTIONS.size,
    codeNoRulesKnown: [...CODE_NO_RULES],
  };

  const json = JSON.stringify(report, null, 2);
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json);
    console.error(`[inventory] wrote ${outPath}`);
  }
  console.log(json);
}

main().catch((err) => {
  console.error('[inventory] failed:', err.message || err);
  process.exit(1);
});
