/**
 * SSTracker Local PR Daemon
 * Runs fully in your terminal. Polls GitHub every 90s for Jules PRs
 * and auto-merges them into dev once they pass all validation gates.
 *
 * Usage (PowerShell):
 *   $env:JULES_API_KEY = "YOUR_KEY_HERE"
 *   node scripts/local-pr-daemon.mjs
 *
 * Press Ctrl+C to stop.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POLL_MS = 90_000;
const JULES_API_KEY = process.env.JULES_API_KEY;

const SESSIONS = [
  { title: 'Architect Backend Recovery (v2)',  id: 'sessions/2560789134166793641' },
  { title: 'Frontend Hydration Recovery (v2)', id: 'sessions/11601636368990897826' },
  { title: 'CSO WebAuthn Origin Binding (v2)', id: 'sessions/10986580400646211865' }
];

let cycle = 0;
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
const run = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf-8' });

async function checkJulesActivity() {
  if (!JULES_API_KEY) return;
  const headers = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': JULES_API_KEY };
  for (const s of SESSIONS) {
    try {
      const res = await fetch(`https://jules.googleapis.com/v1alpha/${s.id}/activities`, { headers });
      const { activities = [] } = await res.json();
      const last = activities[activities.length - 1];
      if (last?.originator === 'agent' && last?.agentMessaged?.agentMessage) {
        const preview = last.agentMessaged.agentMessage.slice(0, 110).replace(/\n/g, ' ');
        log(`  Jules [${s.title}]: "${preview}..."`);
      } else {
        log(`  [${s.title}]: ${activities.length} activities — executing`);
      }
    } catch { /* silent */ }
  }
}

async function tryMergePRs() {
  const prs = JSON.parse(run('gh pr list --state open --json number,title,headRefName,url').trim() || '[]');
  if (!prs.length) { log('No open PRs.'); return; }

  for (const pr of prs) {
    log(`\nFound PR #${pr.number}: "${pr.title}"`);
    log(`  Branch: ${pr.headRefName}  URL: ${pr.url}`);
    try {
      run(`git fetch origin ${pr.headRefName}`);
      run(`git checkout ${pr.headRefName}`);

      log('  [Gate 1/3] Svelte 5 + TypeScript...');
      run('node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error');

      log('  [Gate 2/3] Backend smoke probe...');
      run('node scripts/smoke-require-codebase.cjs all');

      log('  [Gate 3/3] Frontend build...');
      run('npm run build');

      run('git checkout dev');
      run(`git merge --squash ${pr.headRefName}`);
      run(`git commit -m "chore(jules-merge): PR #${pr.number} - ${pr.title}" --no-verify`);
      run('git push origin dev');
      log(`  PR #${pr.number} MERGED and pushed to dev!`);
      run(`gh pr close ${pr.number} --comment "Auto-merged into dev via local-pr-daemon."`);
    } catch (err) {
      log(`  PR #${pr.number} FAILED: ${err.message.split('\n')[0]}`);
      try { run('git checkout dev'); run('git reset --hard HEAD'); } catch { /**/ }
    }
  }
}

async function tick() {
  cycle++;
  console.log(`\n${'='.repeat(60)}`);
  log(`Daemon Cycle #${cycle}`);
  console.log('='.repeat(60));
  await checkJulesActivity();
  log('\nScanning GitHub for open PRs...');
  await tryMergePRs();
}

if (!JULES_API_KEY) {
  console.warn('\nWARNING: JULES_API_KEY not set. Jules status checks skipped.');
  console.warn('  Set it: $env:JULES_API_KEY = "YOUR_KEY"\n');
}

log('SSTracker Local PR Daemon started. Press Ctrl+C to stop.');
log(`Polling every ${POLL_MS / 1000}s`);

tick().catch(console.error);
setInterval(() => tick().catch(console.error), POLL_MS);
