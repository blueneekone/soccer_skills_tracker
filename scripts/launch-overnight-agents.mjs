#!/usr/bin/env node
/**
 * Launch overnight Cloud Agents via Cursor API v1.
 *
 * Setup (PowerShell — do NOT commit the key):
 *   $env:CURSOR_API_KEY = "key-from-cursor-dashboard"
 *   $env:GITHUB_REPO_URL = "https://github.com/YOUR_USER/soccer_skills_tracker"
 *
 * Usage:
 *   node scripts/launch-overnight-agents.mjs --wave 3a [--dry-run]
 *   node scripts/launch-overnight-agents.mjs --wave 3b
 *   node scripts/launch-overnight-agents.mjs --wave 3c
 *   node scripts/launch-overnight-agents.mjs --wave orch
 *   node scripts/launch-overnight-agents.mjs --wave 4a [--dry-run]
 *   node scripts/launch-overnight-agents.mjs --wave 4b
 *   node scripts/launch-overnight-agents.mjs --wave 4c
 *   node scripts/launch-overnight-agents.mjs --wave orch4
 *   node scripts/launch-overnight-agents.mjs --agent payment-webhook
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'docs', 'acquisition', 'agents');
const LOG_PATH = path.join(ROOT, 'docs', 'acquisition', 'LAUNCHED_AGENTS.json');
const API = 'https://api.cursor.com/v1/agents';

const REPO_URL = process.env.GITHUB_REPO_URL ?? '';
const API_KEY = process.env.CURSOR_API_KEY ?? '';
const MODEL_ID = process.env.CURSOR_AGENT_MODEL ?? 'composer-2.5';

const WAVE_1 = [
	'01-docs-dataroom',
	'02-launch-p0',
	'03-p2-reg-roster',
	'04-p2-payments',
	'05-p2-tournament',
	'06-p2-checkr',
	'07-p2-tracker-nav',
	'08-check-routes',
	'09-check-components',
	'10-check-stores',
	'11-check-coach-dir',
	'13-check-player',
	'14-fed-ngb',
	'15-live-stream',
	'16-marketing-acq',
	'17-native-shell',
	'18-gemini-ingest-1',
	'19-gemini-ingest-2',
	'20-gemini-ingest-3',
	'21-orch',
];

const WAVE_LATE = ['12-check-parent-admin'];
const WAVE_2 = ['22-check-final', '23-vitest-ci', '24-deploy-verify'];

const WAVE_3A = [
	'smoke-dev-script',
	'deploy-gha-dev',
	'payment-webhook',
	'eligibility-ux',
	'fcm-broadcast',
	'checkr-webhooks',
	'fed-phase2',
	'tournament-p2',
	'player-rl-functional',
	'vitest-batch-hud',
	'vitest-batch-loadout',
	'vitest-batch-misc',
	'functional-mvp-doc-sync',
	'player-os-6f',
	'player-os-6j',
	'diegetic-modals',
];

const WAVE_3B = ['live-deploy-dev', 'post-deploy-guards'];

const WAVE_3C = ['gemini-ingest-2', 'gemini-ingest-3'];

const WAVE_ORCH = ['orch-wave3'];

const WAVE_4A = [
	'comp-competitive-doc-sync',
	'comp-roster-dragdrop',
	'comp-tournament-brackets',
	'comp-checkr-lifecycle',
];

const WAVE_4B = ['comp-federation-phase3', 'comp-streaming-schedule'];

const WAVE_4C = ['comp-capacitor-polish'];

const WAVE_ORCH4 = ['orch-wave4'];

function parseArgs() {
	const args = process.argv.slice(2);
	const out = { wave: null, agent: null, dryRun: false };
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--wave') {
			out.wave = args[++i];
		} else if (args[i] === '--agent') {
			out.agent = args[++i];
		} else if (args[i] === '--dry-run') {
			out.dryRun = true;
		}
	}
	return out;
}

function loadPrompt(agentFile) {
	const p = path.join(AGENTS_DIR, `${agentFile}.md`);
	if (!fs.existsSync(p)) {
		throw new Error(`Missing ${p}. See WAVE_3_MANIFEST.md or WAVE_4_MANIFEST.md.`);
	}
	return fs.readFileSync(p, 'utf8');
}

function branchForPrompt(promptText) {
	const m = promptText.match(
		/(?:\*\*)?Branch:(?:\*\*)?\s*`?((?:closure|competitive)\/[^\s`*]+)`?/,
	);
	if (!m) {
		throw new Error(
			`Prompt ${promptText.slice(0, 40)}… missing Branch: closure/... or competitive/...`,
		);
	}
	return m[1];
}

async function createCloudAgent(agentFile, promptText) {
	const branch = branchForPrompt(promptText);
	const prefix = branch.startsWith('competitive/') ? 'competitive-' : 'closure-';
	const name = `${prefix}${agentFile}`.slice(0, 100);

	const body = {
		name,
		prompt: { text: promptText },
		model: { id: MODEL_ID },
		repos: [{ url: REPO_URL, startingRef: branch }],
		workOnCurrentBranch: true,
		autoCreatePR: false,
		skipReviewerRequest: true,
	};

	const res = await fetch(API, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString('base64')}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(`${agentFile}: HTTP ${res.status} ${JSON.stringify(data)}`);
	}

	return {
		agentFile,
		branch,
		agentId: data.agent?.id ?? null,
		url: data.agent?.url ?? null,
		runId: data.run?.id ?? null,
	};
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	if (!API_KEY && !process.argv.includes('--dry-run')) {
		console.error('Missing CURSOR_API_KEY. Set: $env:CURSOR_API_KEY = "..."');
		process.exit(1);
	}
	if (!REPO_URL.startsWith('https://github.com/') && !process.argv.includes('--dry-run')) {
		console.error('Missing GITHUB_REPO_URL. Example: https://github.com/you/soccer_skills_tracker');
		process.exit(1);
	}
	if (!fs.existsSync(AGENTS_DIR)) {
		console.error(`Missing ${AGENTS_DIR}`);
		process.exit(1);
	}

	const { wave, agent, dryRun } = parseArgs();
	let queue = [];

	if (agent) {
		queue = [agent];
	} else if (wave === '1') {
		queue = WAVE_1;
	} else if (wave === 'late') {
		queue = WAVE_LATE;
	} else if (wave === '2') {
		queue = WAVE_2;
	} else if (wave === '3a' || wave === '3') {
		queue = WAVE_3A;
	} else if (wave === '3b') {
		queue = WAVE_3B;
	} else if (wave === '3c') {
		queue = WAVE_3C;
	} else if (wave === 'orch') {
		queue = WAVE_ORCH;
	} else if (wave === '4a') {
		queue = WAVE_4A;
	} else if (wave === '4b') {
		queue = WAVE_4B;
	} else if (wave === '4c') {
		queue = WAVE_4C;
	} else if (wave === 'orch4') {
		queue = WAVE_ORCH4;
	} else {
		console.error(
			'Usage: --wave 1|late|2|3a|3b|3c|orch|4a|4b|4c|orch4 | --agent <slice-id> [--dry-run]',
		);
		process.exit(1);
	}

	const launched = fs.existsSync(LOG_PATH)
		? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
		: [];

	console.log(`Queue: ${queue.length} agent(s)${dryRun ? ' (dry run)' : ''}`);

	for (const id of queue) {
		const prompt = loadPrompt(id);
		const branch = branchForPrompt(prompt);
		const preview = prompt.split('\n').slice(0, 6).join('\n');
		console.log(`\n→ ${id}`);
		console.log(`  branch: ${branch}`);
		console.log(`  prompt preview:\n${preview.split('\n').map((l) => `    ${l}`).join('\n')}`);

		if (dryRun) continue;

		try {
			const result = await createCloudAgent(id, prompt);
			launched.push({ ...result, launchedAt: new Date().toISOString() });
			fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
			fs.writeFileSync(LOG_PATH, JSON.stringify(launched, null, 2));
			console.log(`  OK ${result.agentId}`);
			if (result.url) console.log(`  ${result.url}`);
		} catch (err) {
			console.error(`  FAIL ${err.message}`);
		}

		await sleep(3000);
	}

	console.log('\nDone. See docs/acquisition/LAUNCHED_AGENTS.json');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
