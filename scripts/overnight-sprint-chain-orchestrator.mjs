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

const SPRINT_QUEUE = [
  {
    "id": "sprint-5.2",
    "name": "sprint-5.2",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-5.2.md",
    "dispatched": false
  },
  {
    "id": "sprint-5.3",
    "name": "sprint-5.3",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-5.3.md",
    "dispatched": false
  },
  {
    "id": "sprint-r2",
    "name": "sprint-r2",
    "sessionId": "10718623827822778892",
    "workflowFile": ".agents/workflows/jules-builds/sprint-r2.md",
    "dispatched": true
  },
  {
    "id": "sprint-r3",
    "name": "sprint-r3",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-r3.md",
    "dispatched": false
  },
  {
    "id": "sprint-r4",
    "name": "sprint-r4",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-r4.md",
    "dispatched": false
  },
  {
    "id": "sprint-ds6",
    "name": "sprint-ds6",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-ds6.md",
    "dispatched": false
  },
  {
    "id": "sprint-m1",
    "name": "sprint-m1",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m1.md",
    "dispatched": false
  },
  {
    "id": "sprint-m2",
    "name": "sprint-m2",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m2.md",
    "dispatched": false
  },
  {
    "id": "sprint-m3",
    "name": "sprint-m3",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m3.md",
    "dispatched": false
  },
  {
    "id": "sprint-m4",
    "name": "sprint-m4",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m4.md",
    "dispatched": false
  },
  {
    "id": "sprint-m5",
    "name": "sprint-m5",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m5.md",
    "dispatched": false
  },
  {
    "id": "sprint-m6",
    "name": "sprint-m6",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m6.md",
    "dispatched": false
  },
  {
    "id": "sprint-m7",
    "name": "sprint-m7",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-m7.md",
    "dispatched": false
  },
  {
    "id": "sprint-d1",
    "name": "sprint-d1",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-d1.md",
    "dispatched": false
  },
  {
    "id": "sprint-d2",
    "name": "sprint-d2",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-d2.md",
    "dispatched": false
  },
  {
    "id": "sprint-d3",
    "name": "sprint-d3",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-d3.md",
    "dispatched": false
  },
  {
    "id": "sprint-d4",
    "name": "sprint-d4",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-d4.md",
    "dispatched": false
  },
  {
    "id": "sprint-6.1",
    "name": "sprint-6.1",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-6.1.md",
    "dispatched": false
  },
  {
    "id": "sprint-6.3",
    "name": "sprint-6.3",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-6.3.md",
    "dispatched": false
  },
  {
    "id": "sprint-6.4",
    "name": "sprint-6.4",
    "sessionId": null,
    "workflowFile": ".agents/workflows/jules-builds/sprint-6.4.md",
    "dispatched": false
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

  // If no sprints are currently dispatched, kick off the first one
  if (!SPRINT_QUEUE.some(s => s.dispatched)) {
    dispatchNextSprint();
  }

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
        
        console.log(`🚀 [DEPLOY] Deploying verified build to Firebase Hosting...`);
        run('firebase deploy --only hosting');
        
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

        console.log(`🚀 [DEPLOY] Deploying verified build to Firebase Hosting...`);
        run('firebase deploy --only hosting');

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
