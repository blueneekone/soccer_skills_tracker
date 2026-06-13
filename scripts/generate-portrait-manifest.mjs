#!/usr/bin/env node
/**
 * Walk static/portrait/ SVG assets + approved precomposed busts, emit manifests.
 * Embeds svgInner (stripped inner markup) for inline compose — external <image href> breaks in {@html}.
 *
 * Usage: node scripts/generate-portrait-manifest.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORTRAIT_DIR = join(ROOT, 'static', 'portrait');
const CONFIG_PATH = join(PORTRAIT_DIR, 'catalog.config.json');
const PRECOMPOSED_CONFIG_PATH = join(PORTRAIT_DIR, 'precomposed.config.json');
const OUT_PATH = join(ROOT, 'src', 'lib', 'avatars', 'portraitParts.manifest.json');
const PRECOMPOSED_OUT_PATH = join(ROOT, 'src', 'lib', 'avatars', 'precomposedBusts.manifest.json');

const VALID_SLOTS = new Set(['face', 'hair', 'kit']);

/** @typedef {{ id: string; slot: string; label: string; renderKey: string; file: string; tone?: string; presentation?: string; ageBand?: string }} CatalogConfigRow */
/** @typedef {{ id: string; file: string; label: string; ageBand: string; hair: string; tone: string; kit: string; defaultForBodyScale?: string }} PrecomposedConfigRow */

/** @param {string} filePath @returns {string} */
function sha256File(filePath) {
	const buf = readFileSync(filePath);
	return createHash('sha256').update(buf).digest('hex');
}

/** @param {string} filePath @returns {string} */
function extractSvgInner(filePath) {
	const raw = readFileSync(filePath, 'utf-8');
	const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
	if (!match?.[1]) {
		console.error('[generate-portrait-manifest] Could not parse SVG inner markup:', filePath);
		process.exit(1);
	}
	return match[1].trim();
}

/** @param {PrecomposedConfigRow} row */
function matchPartsFromPrecomposedRow(row) {
	return {
		face: `portrait_face_${row.ageBand}_${row.tone}_default`,
		hair: `portrait_hair_${row.ageBand}_${row.hair}`,
		kit: `portrait_kit_${row.kit}`,
	};
}

function generatePartsManifest() {
	if (!existsSync(CONFIG_PATH)) {
		console.error('[generate-portrait-manifest] Missing catalog.config.json at', CONFIG_PATH);
		process.exit(1);
	}

	/** @type {CatalogConfigRow[]} */
	const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
	const seenIds = new Set();
	/** @type {Array<{ id: string; slot: string; label: string; renderKey: string; assetPath: string; contentHash: string; svgInner: string; tone?: string; presentation?: string; ageBand?: string }>} */
	const manifest = [];

	for (const row of config) {
		if (!row.id || !row.slot || !row.renderKey || !row.file) {
			console.error('[generate-portrait-manifest] Invalid config row:', row);
			process.exit(1);
		}
		if (!VALID_SLOTS.has(row.slot)) {
			console.error('[generate-portrait-manifest] Invalid slot (must be face|hair|kit):', row.slot, row);
			process.exit(1);
		}
		if (seenIds.has(row.id)) {
			console.error('[generate-portrait-manifest] Duplicate id:', row.id);
			process.exit(1);
		}
		seenIds.add(row.id);

		const assetFile = join(PORTRAIT_DIR, row.file);
		if (!existsSync(assetFile)) {
			console.error('[generate-portrait-manifest] Missing asset:', assetFile);
			process.exit(1);
		}

		const contentHash = sha256File(assetFile);
		const assetPath = `/portrait/${row.file}`;
		const svgInner = extractSvgInner(assetFile);

		manifest.push({
			id: row.id,
			slot: row.slot,
			label: row.label,
			renderKey: row.renderKey,
			assetPath,
			contentHash,
			svgInner,
			...(row.tone ? { tone: row.tone } : {}),
			...(row.presentation ? { presentation: row.presentation } : {}),
			...(row.ageBand ? { ageBand: row.ageBand } : {}),
		});
	}

	writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf-8');
	console.log(`[generate-portrait-manifest] Wrote ${manifest.length} entries → ${OUT_PATH}`);
}

function generatePrecomposedManifest() {
	if (!existsSync(PRECOMPOSED_CONFIG_PATH)) {
		writeFileSync(PRECOMPOSED_OUT_PATH, '[]\n', 'utf-8');
		console.log('[generate-portrait-manifest] No precomposed.config.json — wrote empty manifest');
		return;
	}

	/** @type {PrecomposedConfigRow[]} */
	const config = JSON.parse(readFileSync(PRECOMPOSED_CONFIG_PATH, 'utf-8'));
	const seenIds = new Set();
	/** @type {Array<{ id: string; label: string; assetPath: string; contentHash: string; ageBand: string; hair: string; tone: string; kit: string; matchParts: { face: string; hair: string; kit: string }; defaultForBodyScale?: string }>} */
	const manifest = [];

	for (const row of config) {
		if (!row.id || !row.file || !row.ageBand || !row.hair || !row.tone || !row.kit) {
			console.error('[generate-portrait-manifest] Invalid precomposed row:', row);
			process.exit(1);
		}
		if (seenIds.has(row.id)) {
			console.error('[generate-portrait-manifest] Duplicate precomposed id:', row.id);
			process.exit(1);
		}
		seenIds.add(row.id);

		const assetFile = join(PORTRAIT_DIR, row.file);
		if (!existsSync(assetFile)) {
			console.error('[generate-portrait-manifest] Missing precomposed asset:', assetFile);
			process.exit(1);
		}

		const contentHash = sha256File(assetFile);
		const assetPath = `/portrait/${row.file.replace(/\\/g, '/')}`;

		manifest.push({
			id: row.id,
			label: row.label ?? row.id,
			assetPath,
			contentHash,
			ageBand: row.ageBand,
			hair: row.hair,
			tone: row.tone,
			kit: row.kit,
			matchParts: matchPartsFromPrecomposedRow(row),
			...(row.defaultForBodyScale ? { defaultForBodyScale: row.defaultForBodyScale } : {}),
		});
	}

	writeFileSync(PRECOMPOSED_OUT_PATH, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf-8');
	console.log(`[generate-portrait-manifest] Wrote ${manifest.length} precomposed busts → ${PRECOMPOSED_OUT_PATH}`);
}

function main() {
	generatePartsManifest();
	generatePrecomposedManifest();
}

main();
