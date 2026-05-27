#!/usr/bin/env node
/**
 * Walk static/portrait/ SVG assets, SHA-256 hash each file, emit portraitParts.manifest.json.
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
const OUT_PATH = join(ROOT, 'src', 'lib', 'avatars', 'portraitParts.manifest.json');

const VALID_SLOTS = new Set(['face', 'hair', 'kit']);

/** @typedef {{ id: string; slot: string; label: string; renderKey: string; file: string }} CatalogConfigRow */

/** @param {string} filePath @returns {string} */
function sha256File(filePath) {
	const buf = readFileSync(filePath);
	return createHash('sha256').update(buf).digest('hex');
}

function main() {
	if (!existsSync(CONFIG_PATH)) {
		console.error('[generate-portrait-manifest] Missing catalog.config.json at', CONFIG_PATH);
		process.exit(1);
	}

	/** @type {CatalogConfigRow[]} */
	const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
	const seenIds = new Set();
	/** @type {Array<{ id: string; slot: string; label: string; renderKey: string; assetPath: string; contentHash: string }>} */
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

		manifest.push({
			id: row.id,
			slot: row.slot,
			label: row.label,
			renderKey: row.renderKey,
			assetPath,
			contentHash,
		});
	}

	writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf-8');
	console.log(`[generate-portrait-manifest] Wrote ${manifest.length} entries → ${OUT_PATH}`);
}

main();
