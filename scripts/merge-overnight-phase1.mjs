#!/usr/bin/env node
/**
 * Merge overnight feature branches into overnight/base with auto conflict resolution.
 * Usage: node scripts/merge-overnight-phase1.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';

const branches = [
  'live-stream',
  'check-stores',
  'check-coach-dir',
  'check-player',
  'check-routes',
  'check-components',
  'gemini-ingest-1',
  'native-shell',
  'orch',
];

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function conflicts() {
  try {
    return run('git diff --name-only --diff-filter=U').split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function resolve(branch) {
  for (const file of conflicts()) {
    if (file === 'docs/acquisition/SLICE_LOG.md') {
      run(`node scripts/resolve-slice-log-conflict.mjs ${branch}`);
      run(`git add "${file}"`);
    } else if (file === 'docs/acquisition/CHECK_ZERO_STATUS.md') {
      run('node scripts/resolve-check-zero-conflict.mjs');
      run(`git add "${file}"`);
    } else if (file === 'package.json') {
      throw new Error(`Manual package.json conflict during ${branch}`);
    } else {
      throw new Error(`Unresolved conflict in ${file} during ${branch}`);
    }
  }
  run('git add -u');
  run('git commit --no-edit');
}

for (const branch of branches) {
  console.log(`\n=== MERGE overnight/${branch} ===`);
  try {
    run(`git merge --no-edit origin/overnight/${branch}`);
    console.log('OK (fast-forward or clean merge)');
  } catch (err) {
    const pending = conflicts();
    if (!pending.length) {
      console.error(err.stderr || err.message);
      process.exit(1);
    }
    console.log(`Conflicts: ${pending.join(', ')}`);
    try {
      resolve(branch);
      console.log('OK (resolved)');
    } catch (resolveErr) {
      console.error(resolveErr.message);
      process.exit(1);
    }
  }
}

console.log('\n=== DONE ===');
console.log(run('git log --oneline -3'));
