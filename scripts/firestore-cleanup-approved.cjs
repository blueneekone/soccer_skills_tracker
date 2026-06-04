'use strict';

/**
 * Owner-approved Firestore deletes. Default is dry-run.
 *
 *   node scripts/firestore-cleanup-approved.cjs --tier-a
 *   node scripts/firestore-cleanup-approved.cjs --tier-a --execute
 *   node scripts/firestore-cleanup-approved.cjs --collections auth_challenges --older-than-days 7 --execute
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or `npx firebase-tools@latest login --reauth`
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PROJECT = 'sports-skill-tracker-dev';
const BATCH_MAX = 500;
const ARTIFACTS = path.resolve(__dirname, '..', 'artifacts');

/** Blocked unless a safe filter is provided (see isBlocked). */
const TIER_C_BLOCK = new Set([
  'users', 'households', 'player_lookup', 'coach_lookup', 'registrar_lookup',
  'organizations', 'clubs', 'teams', 'license_entitlements', 'team_assignments',
  'bounties', 'audit_logs', 'security_audit', 'consent_records', 'consent_tokens',
  'consent_logs', 'consents', 'pii_vault', 'passports', 'player_stats', 'rosters',
]);

const TIER_A_STEPS = [
  { label: 'auth_challenges (>7d)', collectionId: 'auth_challenges', olderThanDays: 7 },
  { label: 'gateway_idempotency (>24h)', collectionId: 'gateway_idempotency', olderThanDays: 1 },
  { label: 'gateway_rate_buckets (>24h)', collectionId: 'gateway_rate_buckets', olderThanDays: 1 },
  {
    label: 'magic_uplinks (consumed/expired/revoked >30d)',
    collectionId: 'magic_uplinks',
    filterMode: 'stale-uplink',
    olderThanDays: 30,
  },
  { label: 'magic_uplink_audit (>30d)', collectionId: 'magic_uplink_audit', olderThanDays: 30 },
  { label: 'sports (empty only)', collectionId: 'sports', emptyOnly: true },
  { label: 'recruiters (empty only)', collectionId: 'recruiters', emptyOnly: true },
  {
    label: 'passkey_challenges (expired / >1d)',
    collectionGroup: 'passkey_challenges',
    olderThanDays: 1,
    useExpiresAt: true,
  },
];

const argv = process.argv.slice(2);
const execute = argv.includes('--execute');
const dryRun = !execute;
const tierA = argv.includes('--tier-a');

function argValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

const projectId = argValue('--project') || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT;
const collectionsArg = argValue('--collections');
const olderThanDays = Number(argValue('--older-than-days') || '0');
const filterMode = argValue('--filter') || '';
const emptyOnly = argv.includes('--empty-only');

function isBlocked(collectionId, filter) {
  if (!TIER_C_BLOCK.has(collectionId)) return false;
  return !filter;
}

function resolveFirebaseToolsRoot() {
  try {
    return path.dirname(require.resolve('firebase-tools/package.json'));
  } catch {
    const npxRoot = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
    for (const dir of fs.readdirSync(npxRoot)) {
      const pkg = path.join(npxRoot, dir, 'node_modules', 'firebase-tools', 'package.json');
      if (fs.existsSync(pkg)) return path.dirname(pkg);
    }
    throw new Error('firebase-tools not found; run: npx firebase-tools@latest login --reauth');
  }
}

async function getAccessToken() {
  const ftRoot = resolveFirebaseToolsRoot();
  const { getGlobalDefaultAccount, getAccessToken } = require(path.join(ftRoot, 'lib', 'auth'));
  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('Run: npx firebase-tools@latest login --reauth');
  }
  const token = await getAccessToken(account.tokens.refresh_token, [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/datastore',
  ]);
  return token.access_token;
}

function apiBase(project) {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

async function listRootDocs(project, accessToken, collectionId) {
  const refs = [];
  let pageToken;
  const base = `${apiBase(project)}/${collectionId}`;
  while (refs.length < 50_000) {
    const url = new URL(base);
    url.searchParams.set('pageSize', '500');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`list ${collectionId}: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      refs.push({ name: doc.name, fields: doc.fields || {} });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return refs;
}

async function listCollectionGroupDocs(project, accessToken, collectionId) {
  const refs = [];
  let nextPageToken;
  const url = `${apiBase(project)}:runQuery`;
  while (refs.length < 50_000) {
    const body = {
      structuredQuery: {
        from: [{ collectionId, allDescendants: true }],
      },
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`runQuery ${collectionId}: ${res.status}`);
    const data = await res.json();
    for (const row of data || []) {
      if (row.document) refs.push({ name: row.document.name, fields: row.document.fields || {} });
    }
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }
  return refs;
}

function fieldTs(fields, key) {
  const f = fields[key];
  if (!f?.timestampValue) return null;
  return new Date(f.timestampValue).getTime();
}

function fieldStr(fields, key) {
  return fields[key]?.stringValue ?? '';
}

function shouldDelete(doc, step, cutoffMs) {
  const { fields } = doc;
  const mode = step.filterMode || filterMode;

  if (step.useExpiresAt) {
    const exp = fieldTs(fields, 'expiresAt');
    if (exp && exp < Date.now()) return true;
    const created = fieldTs(fields, 'createdAt');
    return step.olderThanDays > 0 && created != null && created < cutoffMs;
  }

  if (mode === 'consumed') {
    const consumed = fieldTs(fields, 'consumedAt');
    return consumed != null && consumed < cutoffMs;
  }

  if (mode === 'expired') {
    const st = fieldStr(fields, 'status');
    const exp = fieldTs(fields, 'expiresAt');
    if (!['expired', 'revoked'].includes(st)) return false;
    return exp ? exp < cutoffMs : true;
  }

  if (mode === 'stale-uplink') {
    const st = fieldStr(fields, 'status');
    if (!['consumed', 'expired', 'revoked'].includes(st)) return false;
    const consumed = fieldTs(fields, 'consumedAt');
    const exp = fieldTs(fields, 'expiresAt');
    const anchor = consumed || exp;
    return anchor != null && anchor < cutoffMs;
  }

  const recorded = fieldTs(fields, 'recordedAt')
    || fieldTs(fields, 'createdAt')
    || fieldTs(fields, 'mintedAt')
    || fieldTs(fields, 'timestamp');
  if (step.olderThanDays > 0 && recorded) return recorded < cutoffMs;
  return step.olderThanDays <= 0;
}

async function deleteBatch(project, accessToken, docNames) {
  if (!docNames.length) return;
  const url = `${apiBase(project)}:commit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes: docNames.map((name) => ({ delete: name })) }),
  });
  if (!res.ok) throw new Error(`commit ${res.status}: ${await res.text()}`);
}

function writeBackup(manifest, step, docNames) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const file = path.join(ARTIFACTS, `tier-a-backup-${manifest.runId}.json`);
  manifest.steps.push({
    step: step.label || step.collectionId || step.collectionGroup,
    docIds: docNames.map((n) => n.split('/').pop()),
    paths: docNames,
    count: docNames.length,
  });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
}

async function runStep(project, accessToken, step, manifest) {
  const cutoffMs = step.olderThanDays > 0
    ? Date.now() - step.olderThanDays * 24 * 60 * 60 * 1000
    : 0;

  const collectionId = step.collectionId || step.collectionGroup;
  if (step.collectionId && isBlocked(step.collectionId, step.filterMode || filterMode)) {
    throw new Error(`Blocked collection: ${step.collectionId}`);
  }

  const docs = step.collectionGroup
    ? await listCollectionGroupDocs(project, accessToken, step.collectionGroup)
    : await listRootDocs(project, accessToken, step.collectionId);

  if (step.emptyOnly || emptyOnly) {
    if (docs.length > 0) {
      console.log(`[cleanup] ${collectionId}: skip empty-only (${docs.length} docs present)`);
      return 0;
    }
    console.log(`[cleanup] ${collectionId}: empty — nothing to delete`);
    return 0;
  }

  const targets = docs.filter((d) => shouldDelete(d, step, cutoffMs));
  console.log(`[cleanup] ${step.label || collectionId}: ${targets.length}/${docs.length} selected`);

  const names = targets.map((d) => d.name);
  if (names.length) writeBackup(manifest, step, names);

  for (let i = 0; i < names.length; i += BATCH_MAX) {
    const chunk = names.slice(i, i + BATCH_MAX);
    if (dryRun) {
      chunk.slice(0, 3).forEach((n) => console.log(`  would delete: ${n}`));
      if (chunk.length > 3) console.log(`  ... +${chunk.length - 3} more`);
    } else {
      await deleteBatch(project, accessToken, chunk);
      console.log(`  deleted ${chunk.length} (batch ${Math.floor(i / BATCH_MAX) + 1})`);
    }
  }
  return names.length;
}

async function main() {
  console.log(`[cleanup] project=${projectId} mode=${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);

  const accessToken = await getAccessToken();
  const manifest = {
    runId: new Date().toISOString().replace(/[:.]/g, '-'),
    projectId,
    mode: dryRun ? 'dry-run' : 'execute',
    approved: 'Tier A',
    steps: [],
  };

  let total = 0;

  if (tierA) {
    console.log('[cleanup] Running Tier A step bundle (see docs/FIRESTORE_INVENTORY.md)');
    for (const step of TIER_A_STEPS) {
      total += await runStep(projectId, accessToken, step, manifest);
    }
  } else {
    if (!collectionsArg) {
      console.error('Usage: --tier-a | --collections a,b [--older-than-days N] [--filter consumed|expired|stale-uplink] [--empty-only] [--execute]');
      process.exit(1);
    }
    const cols = collectionsArg.split(',').map((s) => s.trim()).filter(Boolean);
    for (const collectionId of cols) {
      if (isBlocked(collectionId, filterMode)) {
        console.error(`Blocked: ${collectionId}`);
        process.exit(1);
      }
      total += await runStep(projectId, accessToken, {
        collectionId,
        olderThanDays,
        filterMode,
        label: collectionId,
      }, manifest);
    }
  }

  console.log(`[cleanup] total ${dryRun ? 'would delete' : 'deleted'}: ${total}`);
  if (manifest.steps.length) {
    console.log(`[cleanup] backup manifest: artifacts/tier-a-backup-${manifest.runId}.json`);
  }
  if (dryRun) console.log('[cleanup] Re-run with --execute to apply.');
}

main().catch((err) => {
  console.error('[cleanup] failed:', err.message || err);
  process.exit(1);
});
