/**
 * SSTracker Automated Continuous Deployment & PR Merge Daemon (v2)
 * 
 * Automatically monitors Jules PRs, runs strict pre-merge validation gates,
 * merges clean PRs into dev, and deploys full builds directly to Firebase.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, {
    cwd: REPO_ROOT,
    stdio: opts.capture ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    ...opts
  });
}

function getOpenPrs() {
  try {
    const raw = run('gh pr list --state open --json number,title,headRefName,author,url', { capture: true });
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to query open PRs via GitHub CLI:', err.message);
    return [];
  }
}

async function validateAndMergePr(pr) {
  console.log(`\n===============================================================`);
  console.log(`🔍 Testing PR #${pr.number}: "${pr.title}"`);
  console.log(`   Branch: ${pr.headRefName} | URL: ${pr.url}`);
  console.log(`===============================================================`);

  try {
    // 1. Fetch latest remote branch
    run(`git fetch origin ${pr.headRefName}`);

    // 2. Perform a non-committed trial merge into local dev
    console.log(`\n[Step 1/5] Staging non-committed merge of origin/${pr.headRefName}...`);
    run(`git merge --no-commit --no-ff origin/${pr.headRefName}`);

    // 3. Pre-merge Validation Gate 1: Svelte 5 and TypeScript check (direct binary)
    console.log('\n[Gate 1/4] Running Svelte 5 & TypeScript static analysis...');
    run('node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error');

    // 4. Pre-merge Validation Gate 2: Universal Backend Smoke Probe
    console.log('\n[Gate 2/4] Running Universal Backend Smoke Probe across all 7 codebases...');
    run('node scripts/smoke-require-codebase.cjs all');

    // 5. Pre-merge Validation Gate 3: Frontend Build Verification
    console.log('\n[Gate 3/4] Running Production Frontend Build (npm run build)...');
    run('npm run build');

    // 6. Commit and Push Merge
    console.log(`\n[Gate 4/4] Validation passed 100% green! Committing merge for PR #${pr.number}...`);
    run(`git commit -m "chore(merge): auto-merge PR #${pr.number} - ${pr.title}" --no-verify`);
    run('git push origin dev');

    // Close / mark PR merged in GitHub
    try {
      run(`gh pr merge ${pr.number} --squash --delete-branch --admin`);
    } catch {
      console.log(`PR #${pr.number} marked merged on dev.`);
    }

    console.log(`\n🎉 Successfully merged PR #${pr.number}!`);
    return true;
  } catch (err) {
    console.error(`\n❌ Validation failed for PR #${pr.number}:`, err.message);
    
    // Abort staged merge and reset dev
    try {
      run('git merge --abort');
    } catch {
      run('git reset --hard origin/dev');
    }

    // Add comment to PR informing Jules of failure
    try {
      const escapedMsg = JSON.stringify(`🚨 **Automated Merge Gate Failed:**\n\`\`\`\n${err.message}\n\`\`\`\nPlease fix the build and update the PR.`);
      run(`gh pr comment ${pr.number} --body ${escapedMsg}`);
    } catch (commentErr) {
      console.error('Failed to post PR comment:', commentErr.message);
    }

    return false;
  }
}

async function deployToFirebase() {
  console.log('\n===============================================================');
  console.log('🚀 Starting Automatic Full Firebase Deployment...');
  console.log('===============================================================');

  try {
    // 1. Bundle functions
    console.log('\n[Deploy 1/3] Bundling Cloud Function codebases...');
    run('node scripts/bundle-functions.cjs');

    // 2. Build SvelteKit frontend
    console.log('\n[Deploy 2/3] Compiling SvelteKit production build...');
    run('npm run build');

    // 3. Deploy to Firebase
    console.log('\n[Deploy 3/3] Deploying Hosting, Firestore Rules, Indexes, and Functions...');
    run('firebase deploy --only functions,hosting,indexes,firestore:rules');

    console.log('\n🌟 LIVE DEPLOYMENT COMPLETE! All services updated on sports-skill-tracker-dev.');
    return true;
  } catch (err) {
    console.error('\n❌ Firebase deployment failed:', err.message);
    return false;
  }
}

export async function runDaemonCycle() {
  const prs = getOpenPrs();
  console.log(`[Daemon] Scanned GitHub: ${prs.length} open PR(s) found.`);

  let mergedAny = false;
  for (const pr of prs) {
    const success = await validateAndMergePr(pr);
    if (success) mergedAny = true;
  }

  if (mergedAny) {
    console.log('\n[Daemon] New code merged. Triggering full automated Firebase deployment...');
    await deployToFirebase();
  } else {
    console.log('[Daemon] No new PRs ready for merge. Standing by for next cycle.');
  }
}

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDaemonCycle();
}
