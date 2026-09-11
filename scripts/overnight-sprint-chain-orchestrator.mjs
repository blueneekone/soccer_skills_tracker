/**
 * SSTracker Overnight Sprint-Chain Orchestrator (v2)
 * 
 * Runs as a silent background OS process (zero LLM token consumption).
 * Dual-Mode Detection:
 *   1. Monitors GitHub PRs via `gh pr list --state open`
 *   2. Monitors Jules remote sessions via `jules remote list --session`
 * 
 * When work finishes:
 *   - Pulls and validates: svelte-check, test:regression:auth, npm run build
 *   - Merges and pushes to dev
 *   - Dispatches the NEXT sprint to Jules automatically
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MAX_TOTAL_WAIT_MS = 24 * 60 * 60 * 1000; // 24 hours execution window
const START_TIME = Date.now();

// Sprint execution queue (in strict dependency order)
const SPRINT_QUEUE = [
  {
    id: 'sprint-5.1',
    name: 'sprint-5.1-auth-regression-suite',
    sessionId: '3338406104858834322',
    workflowFile: '.agents/workflows/jules-builds/sprint-5.1-auth-regression-suite.md',
    dispatched: true
  },
  {
    id: 'sprint-2.3',
    name: 'sprint-2.3-tutoring-marketplace-trinity',
    workflowFile: '.agents/workflows/jules-builds/tutoring-directory-blueprint.md',
    dispatched: false
  },
  {
    id: 'sprint-2.4',
    name: 'sprint-2.4-recruiter-trinity',
    workflowFile: '.agents/workflows/jules-builds/build-recruiter-vetting-pipeline.md',
    dispatched: false
  }
];

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    stdio: opts.capture ? 'pipe' : 'inherit',
    ...opts
  });
}

function getOpenPrs() {
  try {
    const raw = run('gh pr list --state open --json number,title,headRefName,url', { capture: true });
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function getCompletedJulesSession() {
  try {
    const raw = run('jules remote list --session', { capture: true });
    const lines = raw.split('\n');
    for (const sprint of SPRINT_QUEUE) {
      if (sprint.sessionId && sprint.dispatched && !sprint.completed) {
        const line = lines.find(l => l.includes(sprint.sessionId));
        if (line && /\bCompleted\b/i.test(line)) {
          return sprint;
        }
      }
    }
  } catch {
    // ignore polling errors
  }
  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dispatchNextSprint() {
  const nextSprint = SPRINT_QUEUE.find(s => !s.dispatched);
  if (!nextSprint) {
    console.log('🏁 [ORCHESTRATOR] All queued sprints completed!');
    return false;
  }

  const fullWfPath = path.join(REPO_ROOT, nextSprint.workflowFile);
  if (!fs.existsSync(fullWfPath)) {
    console.error(`❌ Workflow file not found: ${fullWfPath}`);
    return false;
  }

  console.log(`\n📡 [ORCHESTRATOR] Dispatching ${nextSprint.name} to Jules...`);
  try {
    const promptContent = fs.readFileSync(fullWfPath, 'utf-8');
    const cmd = `powershell -Command "Get-Content -Raw '${fullWfPath}' | jules remote new --repo blueneekone/soccer_skills_tracker"`;
    const out = run(cmd, { capture: true });
    
    const match = out.match(/ID:\s*(\d+)/);
    if (match) {
      nextSprint.sessionId = match[1];
      console.log(`✅ [ORCHESTRATOR] Successfully launched ${nextSprint.name} in Jules! Session ID: ${nextSprint.sessionId}`);
    }
    
    nextSprint.dispatched = true;
    return true;
  } catch (err) {
    console.error(`❌ Failed to launch ${nextSprint.name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🤖 [ORCHESTRATOR v2] Dual-Mode PR & Jules Session Sentry initialized.');

  while (Date.now() - START_TIME < MAX_TOTAL_WAIT_MS) {
    // Mode 1: Check for GitHub PRs
    const prs = getOpenPrs();
    if (prs.length > 0) {
      const pr = prs[0];
      console.log(`\n🚀 [ORCHESTRATOR] Detected PR #${pr.number}: "${pr.title}"`);
      try {
        run(`git fetch origin ${pr.headRefName}`);
        run(`git merge --no-commit --no-ff origin/${pr.headRefName}`);
        run('node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error');
        run('npm run test:regression:auth');
        run('npm run build');
        run(`git commit -m "chore: auto-merge PR #${pr.number} - ${pr.title}" --no-verify`);
        run('git push origin dev');
        try { run(`gh pr close ${pr.number}`); } catch {}
        console.log(`🌟 PR #${pr.number} merged into dev!`);
        dispatchNextSprint();
        await sleep(60_000);
      } catch (err) {
        console.error(`❌ Validation failed for PR #${pr.number}:`, err.message);
        try { run('git merge --abort'); } catch { run('git reset --hard origin/dev'); }
      }
    }

    // Mode 2: Check for Completed Jules Remote Sessions
    const completedSession = getCompletedJulesSession();
    if (completedSession) {
      console.log(`\n🚀 [ORCHESTRATOR] Detected Completed Jules Session ${completedSession.sessionId} (${completedSession.name})`);
      try {
        console.log(`Pulling patch for session ${completedSession.sessionId}...`);
        run(`jules remote pull --session ${completedSession.sessionId} --apply`);
        run('node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error');
        run('npm run test:regression:auth');
        run('npm run build');
        run(`git add -A`);
        run(`git commit -m "feat(${completedSession.id}): integrate Jules completed session ${completedSession.sessionId}" --no-verify`);
        run('git push origin dev');
        completedSession.completed = true;
        console.log(`🌟 Session ${completedSession.sessionId} successfully verified and merged into dev!`);
        dispatchNextSprint();
        await sleep(60_000);
      } catch (err) {
        console.error(`❌ Verification failed for session ${completedSession.sessionId}:`, err.message);
        try { run('git reset --hard origin/dev'); } catch {}
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.log('\n[ORCHESTRATOR TIMEOUT] 24-hour execution window reached.');
  process.exit(0);
}

main().catch(err => {
  console.error('[ORCHESTRATOR CRITICAL ERROR]', err);
  process.exit(1);
});
