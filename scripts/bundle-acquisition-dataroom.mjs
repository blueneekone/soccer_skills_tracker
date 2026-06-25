#!/usr/bin/env node
/**
 * Bundle acquisition data room zip for qualified buyers (post-NDA).
 *
 * Usage:
 *   npm run bundle:dataroom
 *
 * Output:
 *   dist/sstracker-dataroom.zip
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_ZIP = path.join(OUT_DIR, 'sstracker-dataroom.zip');
const ACQ_DIR = path.join(ROOT, 'docs', 'acquisition');

/** docs/acquisition/*.md except internal agent orchestration files */
const ACQ_EXCLUDE = new Set([
	'SLICE_LOG.md',
	'PARALLEL_STATUS.md',
	'PARALLEL_SUMMARY.md',
	'MERGE_ORDER.md',
	'LAUNCHED_AGENTS.json',
]);

/** Canonical docs linked from INDEX (outside docs/acquisition/) */
const CANONICAL_DOCS = [
	'docs/ARCHITECTURE.md',
	'docs/DATA_FLOW.md',
	'docs/PERSONA_ECOSYSTEM.md',
	'docs/SPORTS_CONFIGS.md',
	'docs/FUNCTIONS_DEPLOY.md',
	'docs/FUNCTIONAL_AUDIT_BACKLOG.md',
	'docs/QA_DEV_PERSONA_VERIFICATION.md',
	'docs/vision/FUNCTIONAL_MVP.md',
	'docs/vision/PRODUCT_SURFACE_REGISTRY.md',
	'docs/vision/PLATFORM_WORKFLOW_CANON.md',
	'docs/vision/OWNER_QA_CHECKLIST.md',
	'docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md',
	'docs/vision/COACH_OS_FOUNDATION.md',
	'docs/vision/PARENT_OS_FOUNDATION.md',
	'ROADMAP.md',
];

const STATIC_PDFS = [
	'static/acquisition/sstracker-executive-brief.pdf',
	'static/acquisition/sstracker-prospectus.pdf',
	'static/acquisition/sstracker-director-trust-brief.pdf',
];

function collectAcquisitionMarkdown() {
	const files = [];
	for (const ent of fs.readdirSync(ACQ_DIR, { withFileTypes: true })) {
		if (ent.isDirectory()) {
			if (ent.name === 'agents' || ent.name === '__tests__') continue;
			if (ent.name === 'legal') {
				for (const f of fs.readdirSync(path.join(ACQ_DIR, 'legal'))) {
					if (f.endsWith('.md')) files.push(path.join('docs', 'acquisition', 'legal', f));
				}
			}
			continue;
		}
		if (!ent.name.endsWith('.md')) continue;
		if (ACQ_EXCLUDE.has(ent.name)) continue;
		if (ent.name.startsWith('PARALLEL_')) continue;
		files.push(path.join('docs', 'acquisition', ent.name));
	}
	return files.sort();
}

function resolveExisting(relPaths) {
	const manifest = [];
	for (const rel of relPaths) {
		const normalized = rel.split('/').join(path.sep);
		const abs = path.join(ROOT, normalized);
		if (fs.existsSync(abs)) manifest.push(normalized);
		else console.warn(`[bundle:dataroom] skip missing: ${rel}`);
	}
	return manifest;
}

function buildZipWindows(manifest) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
	if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

	const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'sst-dataroom-'));
	try {
		for (const rel of manifest) {
			const src = path.join(ROOT, rel);
			const dest = path.join(staging, rel);
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.copyFileSync(src, dest);
		}

		const ps = [
			'Compress-Archive',
			`-Path "${staging}\\*"`,
			`-DestinationPath "${OUT_ZIP}"`,
			'-Force',
		].join(' ');

		const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], {
			stdio: 'inherit',
		});
		if (result.status !== 0) {
			throw new Error(`Compress-Archive exited with code ${result.status ?? 'unknown'}`);
		}
	} finally {
		fs.rmSync(staging, { recursive: true, force: true });
	}
}

function buildZipUnix(manifest) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
	if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

	const result = spawnSync('tar', ['-a', '-c', '-f', OUT_ZIP, ...manifest], {
		cwd: ROOT,
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		throw new Error(`tar exited with code ${result.status ?? 'unknown'}`);
	}
}

function buildZip(manifest) {
	if (process.platform === 'win32') buildZipWindows(manifest);
	else buildZipUnix(manifest);
}

function main() {
	const acqMd = collectAcquisitionMarkdown();
	const all = [...new Set([...acqMd, ...CANONICAL_DOCS, ...STATIC_PDFS])];
	const manifest = resolveExisting(all);

	buildZip(manifest);

	const stat = fs.statSync(OUT_ZIP);
	const sizeKb = (stat.size / 1024).toFixed(1);

	console.log('');
	console.log('SSTracker acquisition data room bundle');
	console.log('======================================');
	console.log(`Output: ${OUT_ZIP}`);
	console.log(`Size:   ${sizeKb} KB (${stat.size} bytes)`);
	console.log(`Files:  ${manifest.length}`);
	console.log('');
	console.log('Manifest:');
	for (const f of manifest) console.log(`  ${f.replace(/\\/g, '/')}`);
	console.log('');
	console.log('Excluded: docs/acquisition/agents/**, SLICE_LOG, PARALLEL_*, LAUNCHED_AGENTS.json');
}

try {
	main();
} catch (err) {
	console.error(err);
	process.exit(1);
}
