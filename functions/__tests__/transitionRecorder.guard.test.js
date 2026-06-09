/**
 * transitionRecorder.guard.test.js — Sprint RL-transition-guards
 *
 * Source-scan regression guards for the RL transition pipeline:
 *   workout_logs create → rlOnWorkoutLogCreated → match rl_inference_log (24h prior) → rl_transitions
 *
 * Launch note: abPercent=0 → getAdaptiveWorkoutPolicy heuristic → no rl_inference_log → no transitions (expected).
 *
 * Run: node --test functions/__tests__/transitionRecorder.guard.test.js
 */

'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {join} = require('node:path');

const FUNCTIONS_ROOT = join(__dirname, '..');
const INDEX = join(FUNCTIONS_ROOT, 'index.js');
const TRANSITION_RECORDER = join(FUNCTIONS_ROOT, 'src/ml/transitionRecorder.js');
const RL_OPS = join(FUNCTIONS_ROOT, 'rlOps.js');
const FEATURE_BUILDER = join(FUNCTIONS_ROOT, 'src/ml/featureBuilder.js');

describe('RL transition chain — module exports', () => {
  it('transitionRecorder.js exists and exports onWorkoutLogCreated + onPhysioReportCreated', () => {
    assert.ok(existsSync(TRANSITION_RECORDER));
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(src, /exports\.onWorkoutLogCreated\s*=\s*onDocumentCreated/);
    assert.match(src, /exports\.onPhysioReportCreated\s*=\s*onDocumentCreated/);
    assert.match(src, /document:\s*'workout_logs\/\{logId\}'/);
    assert.match(src, /document:\s*'physio_self_reports\/\{uid\}\/daily\/\{dateDoc\}'/);
  });

  it('functions-rl/index.js wires rlOnWorkoutLogCreated and rlOnPhysioReportCreated', () => {
    const rlIndex = join(FUNCTIONS_ROOT, '..', 'functions-rl', 'index.js');
    assert.ok(existsSync(rlIndex));
    const index = readFileSync(rlIndex, 'utf-8');
    // functions-rl is a self-contained bundle (DEPLOY-O): scripts/bundle-functions.cjs
    // copies domain sources into functions-rl/src/ml/, so the require path is the
    // local bundled copy (./src/ml/...), not the dev cross-package path (../functions/src/ml/...).
    assert.match(index, /require\(['"]\.(?:\.\/functions)?\/src\/ml\/transitionRecorder['"]\)/);
    assert.match(index, /exports\.rlOnWorkoutLogCreated\s*=\s*transitionRecorder\.onWorkoutLogCreated/);
    assert.match(index, /exports\.rlOnPhysioReportCreated\s*=\s*transitionRecorder\.onPhysioReportCreated/);
  });

  it('functions/index.js does not re-export RL transition triggers (DEPLOY-N)', () => {
    assert.ok(existsSync(INDEX));
    const index = readFileSync(INDEX, 'utf-8');
    assert.doesNotMatch(index, /exports\.rlOnWorkoutLogCreated/);
    assert.doesNotMatch(index, /exports\.rlOnPhysioReportCreated/);
  });
});

describe('RL transition chain — inference log gate (24h)', () => {
  it('onWorkoutLogCreated looks up rl_inference_log within 24h prior to workout timestamp', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(src, /rl_inference_log/);
    assert.match(src, /24 \* DAY_MS/);
    assert.match(src, /lookbackTs/);
    assert.match(src, /Only record a transition if we have a matching inference log/);
    assert.match(src, /if \(!inferLog\) return;/);
  });

  it('writes rl_transitions with nextState null when inference log matches', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(src, /collection\('rl_transitions'\)/);
    assert.match(src, /nextState:\s*null/);
    assert.match(src, /inferenceLogId:\s*inferLog\.id/);
  });

  it('onPhysioReportCreated patches nextState on most recent open transition', () => {
    const src = readFileSync(TRANSITION_RECORDER, 'utf-8');
    assert.match(src, /where\('nextState', '==', null\)/);
    assert.match(src, /nextState,/);
    assert.match(src, /patchedAt:/);
  });
});

describe('RL transition chain — launch heuristic (abPercent=0)', () => {
  it('getAdaptiveWorkoutPolicy returns heuristic before rl_inference_log when abPercent is 0', () => {
    assert.ok(existsSync(RL_OPS));
    const src = readFileSync(RL_OPS, 'utf-8');
    assert.match(src, /policyState\.abPercent === 0/);
    assert.match(src, /return heuristic\(\)/);
    assert.match(src, /rl_inference_log/);
    // Inference log write sits after policy-path guards — heuristic exits early.
    const heuristicAbZeroIdx = src.indexOf('policyState.abPercent === 0');
    const inferLogWriteIdx = src.indexOf("collection('rl_inference_log')");
    assert.ok(heuristicAbZeroIdx >= 0 && inferLogWriteIdx >= 0);
    assert.ok(heuristicAbZeroIdx < inferLogWriteIdx);
  });
});

// T1-9 guard: completedAssignments30d query/count must agree on status + timestamp field.
describe('featureBuilder — completedAssignments30d query/count coherence (T1-9)', () => {
  it('assignments query filters status==completed (matches count predicate)', () => {
    assert.ok(existsSync(FEATURE_BUILDER));
    const src = readFileSync(FEATURE_BUILDER, 'utf-8');
    // The assignments fetch block must contain a status=='completed' filter
    assert.match(src, /\.where\('status',\s*'==',\s*'completed'\)/);
  });

  it('assignments query applies 30-day window on completedAt (matches writer field)', () => {
    const src = readFileSync(FEATURE_BUILDER, 'utf-8');
    // 30-day cutoff applied to completedAt — the field trainingOps.js writes on completion
    assert.match(src, /\.where\('completedAt',\s*'>=',\s*admin\.firestore\.Timestamp\.fromDate\(cutoff30\)\)/);
  });

  it('assignments query orders by completedAt (consistent with range filter field)', () => {
    const src = readFileSync(FEATURE_BUILDER, 'utf-8');
    assert.match(src, /\.orderBy\('completedAt',\s*'desc'\)/);
  });

  it('count predicate uses status===completed — same value as query filter', () => {
    const src = readFileSync(FEATURE_BUILDER, 'utf-8');
    // Count in completedAssignments30d must filter 'completed', aligning with query
    assert.match(src, /assignDocs\.filter\(\(a\)\s*=>\s*a\.status\s*===\s*'completed'\)/);
  });

  it('assignments collection query does NOT filter status==active (writer never sets active)', () => {
    const src = readFileSync(FEATURE_BUILDER, 'utf-8');
    // Isolate the assignments (not team_assignments) query block and assert no 'active' status filter
    const startIdx = src.indexOf("collection('assignments')");
    assert.ok(startIdx >= 0, "featureBuilder must query 'assignments' collection");
    const querySnippet = src.slice(startIdx, src.indexOf('.get()', startIdx));
    assert.doesNotMatch(querySnippet, /\.where\('status',\s*'==',\s*'active'\)/);
    assert.match(querySnippet, /\.where\('status',\s*'==',\s*'completed'\)/);
  });
});
