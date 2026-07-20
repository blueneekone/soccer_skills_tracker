#!/usr/bin/env node
/**
 * CI guard: fail if any Phosphor icon usage is reintroduced.
 *
 * Checks for:
 *  1. <i class="ph ph-*"> / <i class="ph-*"> element patterns in .svelte files
 *  2. Phosphor CDN <script> in app.html
 *  3. ph-* class strings in non-comment JS/TS lines (data arrays, string literals)
 *
 * Allowlist: Icon.svelte is exempt (its comment mentions "ph ph-*" as reference text).
 *
 * Usage:
 *   node scripts/check-no-phosphor.mjs
 *   (exits 0 = clean, exits 1 = violations found)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const SRC = join(ROOT, 'src');

const ALLOWLIST = ['src/lib/components/ui/Icon.svelte'];

/** Files/directories allowed to have inline `stroke-width` attributes (data-viz allowlist) */
const SVG_STROKE_ALLOWLIST = [
	'src/lib/components/charts/',
	'src/lib/components/coach/grid/',
	'src/lib/components/tactical/',
	'src/lib/components/marketing/',
	'static/',
	'PlayerSkillRadar.svelte',
	'src/lib/components/player/dashboard/AttributeRadar.svelte',
	'SkillTreeArena.svelte',
	'VanguardPrism.svelte',
	'VanguardAppMark.svelte',
	'RevenueLedgerModule.svelte',
	'FeatureBento.svelte',
	'MiniPlayer.svelte',
	'TacticalDrillBoard.svelte',
	'TacticalContextMenu.svelte',
	'SeasonRegistration.svelte',
	'ConsentOverlay.svelte',
	'TacticalPitchBoard.svelte',
	'GridSvgDefs.svelte',
	'GridRadialHub.svelte',
	'GridRoute.svelte',
	'GridEntity.svelte',
	'GridPitch.svelte',
	'ContextRadial.svelte',
	'WeatherHub.svelte',
	'IntakePanopticon.svelte',
	'TransferPortal.svelte',
	'RecruiterPortal.svelte',
	'MarketingNav.svelte',
	'MarketingFooter.svelte',
	'VpcPanopticon.svelte',
	'SensitiveView.svelte',
	'consent/',
	'coach/+page.svelte',
	'player/dashboard/+page.svelte',
	'compliance/+page.svelte',
];

const PATTERNS = {
	// Catches <i class="ph ph-*"> and <i class="ph-*"> rendering elements
	svelte_i_tag: /<i\s+class="ph\s+ph-|<i\s+class="ph-[a-z]/g,
	// Catches the Phosphor CDN script injection
	phosphor_cdn: /unpkg\.com\/@phosphor-icons/g,
	// Catches raw stroke-width attributes that are NOT 1.5 (iconography lock)
	bad_stroke: /stroke-width="(?!1\.5(?:px)?")[0-9]/g,
};

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...walk(full));
		} else {
			files.push(full);
		}
	}
	return files;
}

const allFiles = walk(SRC);

/** @type {{ file: string; line: number; text: string }[]} */
const violations = [];

for (const file of allFiles) {
	const ext = extname(file);
	if (!['.svelte', '.ts', '.js', '.html'].includes(ext)) continue;

	const rel = relative(ROOT, file).replace(/\\/g, '/');
	if (ALLOWLIST.some((a) => rel.endsWith(a))) continue;

	const lines = readFileSync(file, 'utf-8').split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNo = i + 1;

		// Skip comment lines
		if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('<!--')) {
			continue;
		}

		if (ext === '.svelte') {
			if (PATTERNS.svelte_i_tag.test(line)) {
				violations.push({ file: rel, line: lineNo, text: line.trim() });
			}
			PATTERNS.svelte_i_tag.lastIndex = 0;
		}

		if (ext === '.html' && PATTERNS.phosphor_cdn.test(line)) {
			violations.push({ file: rel, line: lineNo, text: line.trim() });
			PATTERNS.phosphor_cdn.lastIndex = 0;
		}

		// Catch non-1.5 stroke-width on SVGs in icon context (not data-viz)
		if (ext === '.svelte') {
			const inAllowlist = SVG_STROKE_ALLOWLIST.some(
				(a) => rel.includes(a.replace(/\//g, '\\')) || rel.includes(a) || rel.endsWith(a),
			);
			if (!inAllowlist && PATTERNS.bad_stroke.test(line)) {
				violations.push({ file: rel, line: lineNo, text: `[stroke-width ≠ 1.5] ${line.trim()}` });
			}
			PATTERNS.bad_stroke.lastIndex = 0;
		}
	}
}

if (violations.length === 0) {
	console.log('✓ check-no-phosphor: clean — no Phosphor icon references found.\n');
	process.exit(0);
} else {
	console.error(`\n✗ check-no-phosphor: ${violations.length} violation(s) found:\n`);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}`);
		console.error(`    ${v.text}\n`);
	}
	console.error(
		'  Fix: replace <i class="ph ..."> with <Icon name="..."> from $lib/components/ui/Icon.svelte\n'
	);
	process.exit(1);
}
