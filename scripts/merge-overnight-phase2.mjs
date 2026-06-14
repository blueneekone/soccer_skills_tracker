#!/usr/bin/env node
/**
 * Merge Phase 2 overnight branches into overnight/base.
 */
import { execSync } from 'child_process';

const branches = [
  'check-parent-admin',
  'check-final',
  'vitest-ci',
  'deploy-verify',
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

function resolveCiYml(branch) {
  const ours = run('git show :2:.github/workflows/ci.yml');
  const theirs = run('git show :3:.github/workflows/ci.yml');

  // Prefer union: keep typecheck job from check-final, vitest expansion from vitest-ci
  const hasTypecheck = (text) => /name: Type-check \(svelte-check\)/.test(text);
  const hasVitest129 = (text) => /129 green files/.test(text);

  let merged = ours;
  if (branch === 'vitest-ci' && hasVitest129(theirs) && !hasVitest129(ours)) {
    merged = theirs;
    if (hasTypecheck(ours) && !hasTypecheck(theirs)) {
      // Re-insert typecheck job from ours before unit tests job
      const typecheckBlock = ours.match(
        /  # JOB 0[\s\S]*?^  unit-tests:/m,
      )?.[0];
      if (typecheckBlock) {
        const unitIdx = merged.indexOf('  # JOB 1');
        if (unitIdx > -1) {
          merged =
            merged.slice(0, unitIdx) +
            typecheckBlock.replace(/\n  unit-tests:$/, '\n') +
            merged.slice(unitIdx);
        }
      }
    }
  }

  if (branch === 'check-final' && hasTypecheck(theirs) && !hasTypecheck(ours)) {
    merged = theirs;
  }

  return merged;
}

function resolve(branch) {
  for (const file of conflicts()) {
    if (file === 'docs/acquisition/SLICE_LOG.md') {
      run(`node scripts/resolve-slice-log-conflict.mjs ${branch}`);
      run(`git add "${file}"`);
    } else if (file === 'docs/acquisition/CHECK_ZERO_STATUS.md') {
      run('node scripts/resolve-check-zero-conflict.mjs');
      run(`git add "${file}"`);
    } else if (file === '.github/workflows/ci.yml') {
      const merged = resolveCiYml(branch);
      fs.writeFileSync(file, merged);
      run(`git add "${file}"`);
    } else if (file === 'package.json') {
      throw new Error(`Manual package.json conflict during ${branch}`);
    } else if (
      file === 'src/lib/admin/organizationsLoad.ts' ||
      file === 'src/lib/admin/overviewCharts.ts'
    ) {
      // check-final supersedes check-parent-admin on same fixes
      run(`git checkout --theirs "${file}"`);
      run(`git add "${file}"`);
    } else {
      throw new Error(`Unresolved conflict in ${file} during ${branch}`);
    }
  }
  run('git add -u');
  run('git commit --no-edit');
}

import fs from 'fs';

for (const branch of branches) {
  console.log(`\n=== MERGE overnight/${branch} ===`);
  try {
    run(`git merge --no-edit origin/overnight/${branch}`);
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

console.log('\n=== Phase 2 merges complete ===');
console.log(run('git log --oneline -5'));
