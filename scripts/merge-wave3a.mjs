#!/usr/bin/env node
/**
 * Merge Wave 3A closure branches into dev.
 */
import { execSync } from 'child_process';
import fs from 'fs';

const branches = [
  'functional-mvp-doc-sync',
  'deploy-gha-dev',
  'payment-webhook',
  'eligibility-ux',
  'fcm-broadcast',
  'checkr-webhooks',
  'fed-phase2',
  'tournament-p2',
  'player-rl-functional',
  'vitest-batch-misc',
  'vitest-batch-loadout',
  'vitest-batch-hud',
  'diegetic-modals',
  'player-os-6f',
  'player-os-6j',
  'smoke-dev-script',
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
    } else if (file === '.github/workflows/ci.yml') {
      // Keep union: prefer theirs for vitest paths if larger
      const ours = run('git show :2:.github/workflows/ci.yml');
      const theirs = run('git show :3:.github/workflows/ci.yml');
      const pick = theirs.length >= ours.length ? theirs : ours;
      fs.writeFileSync(file, pick);
      run(`git add "${file}"`);
    } else if (file === 'package.json') {
      throw new Error(`package.json conflict on ${branch}`);
    } else {
      run(`git checkout --theirs "${file}"`);
      run(`git add "${file}"`);
    }
  }
  run('git add -u');
  run('git commit --no-edit');
}

for (const branch of branches) {
  console.log(`\n=== MERGE closure/${branch} ===`);
  try {
    run(`git merge --no-edit origin/closure/${branch}`);
    console.log('OK');
  } catch (err) {
    const pending = conflicts();
    if (!pending.length) {
      console.error(err.stderr || err.message);
      process.exit(1);
    }
    console.log(`Conflicts: ${pending.join(', ')}`);
    resolve(branch);
    console.log('OK (resolved)');
  }
}

console.log('\n=== Wave 3A merges complete ===');
console.log(run('git log --oneline -3'));
