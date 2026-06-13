#!/usr/bin/env node
/**
 * Launch overnight Cloud Agents via Cursor API v1.
 *
 * Setup (PowerShell — do NOT commit the key):
 *   $env:CURSOR_API_KEY = "key-from-cursor-dashboard"
 *   $env:GITHUB_REPO_URL = "https://github.com/YOUR_USER/soccer_skills_tracker"
 *
 * Usage:
 *   node scripts/launch-overnight-agents.mjs --wave 1
 *   node scripts/launch-overnight-agents.mjs --wave late
 *   node scripts/launch-overnight-agents.mjs --wave 2
 *   node scripts/launch-overnight-agents.mjs --agent 14-fed-ngb
 *   node scripts/launch-overnight-agents.mjs --wave 1 --dry-run
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
const MODEL_ID = process.env.CURSOR_AGENT_MODEL ?? 'composer-2';

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

function parseArgs() {
	const args = process.argv.slice(2);
	const out = { wave: null, agent: null, dryRun: false };
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--wave') {
			const v = args[++i];
			out.wave = v === 'late' ? 'late' : Number(v);
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
		throw new Error(`Missing ${p}. Run RUNNER-0 first.`);
	}
	return fs.readFileSync(p, 'utf8');
}

function branchForPrompt(promptText) {
	const m = promptText.match(/Branch:\s*`?(overnight\/[^\s`]+)`?/);
	if (!m) {
		throw new Error('Prompt file missing "Branch: overnight/..." line');
	}
	return m[1];
}

async function createCloudAgent(agentFile, promptText) {
	const branch = branchForPrompt(promptText);
	const name = `overnight-${agentFile}`.slice(0, 100);

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
	if (!API_KEY) {
		console.error('Missing CURSOR_API_KEY. Set it in PowerShell: $env:CURSOR_API_KEY = "..."');
		process.exit(1);
	}
	if (!REPO_URL || !REPO_URL.startsWith('https://github.com/')) {
		console.error('Missing GITHUB_REPO_URL. Example: https://github.com/you/soccer_skills_tracker');
		process.exit(1);
	}
	if (!fs.existsSync(AGENTS_DIR)) {
		console.error(`Missing ${AGENTS_DIR}. Run RUNNER-0 first.`);
		process.exit(1);
	}

	const { wave, agent, dryRun } = parseArgs();
	let queue = [];

	if (agent) {
		queue = [agent];
	} else if (wave === 1) {
		queue = WAVE_1;
	} else if (wave === 'late') {
		queue = WAVE_LATE;
	} else if (wave === 2) {
		queue = WAVE_2;
	} else {
		console.error('Usage: --wave 1 | --wave late | --wave 2 | --agent 14-fed-ngb [--dry-run]');
		process.exit(1);
	}

	const launched = fs.existsSync(LOG_PATH)
		? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
		: [];

	console.log(`Queue: ${queue.length} agent(s)${dryRun ? ' (dry run)' : ''}`);

	for (const id of queue) {
		const prompt = loadPrompt(id);
		const branch = branchForPrompt(prompt);
		console.log(`\n→ ${id} on ${branch}`);

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

	console.log('\nDone. See docs/acquisition/LAUNCHED_AGENTS.json and cursor.com/agents');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
