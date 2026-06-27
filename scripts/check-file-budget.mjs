#!/usr/bin/env node
/**
 * CI guard: file line budgets + blank-line corruption detection.
 *
 * 1. Walk src/** for .svelte, .ts, .js (exclude node_modules, .svelte-kit)
 * 2. Count total lines; blankLineRatio = whitespace-only / total
 * 3. FAIL if blankLineRatio > 0.40 (double-newline agent corruption)
 *
 * Limits for non-grandfathered files:
 *   .svelte → max 800 (warn at 400)
 *   .ts / .js → max 700 (warn at 350)
 *
 * GRANDFATHER map: fail only if file EXCEEDS ceiling (allows shrink, blocks growth).
 *
 * Usage:
 *   node scripts/check-file-budget.mjs
 *   (exits 0 = clean, exits 1 = violations found)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const SRC = join(ROOT, 'src');

/** blankLineRatio threshold — catches every-other-line blank corruption */
const BLANK_RATIO_MAX = 0.4;

const LIMITS = {
	'.svelte': { max: 800, warn: 400 },
	'.ts': { max: 700, warn: 350 },
	'.js': { max: 700, warn: 350 },
};

/** Grandfather ceilings (relative to ROOT) */
const GRANDFATHER = new Map([
	['src/routes/(app)/player/workout/+page.svelte', 1400],
	['src/routes/(app)/player/armory/+page.svelte', 950],
	['src/lib/components/hud/ActiveBounties.svelte', 850],
	['src/lib/components/stats/ProPlayerCard.svelte', 700],
	['src/lib/components/player/OperativeLoadoutStudio.svelte', 700],
]);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir)) {
		if (entry === 'node_modules' || entry === '.svelte-kit') continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			files.push(...walk(full));
		} else {
			files.push(full);
		}
	}
	return files;
}

/** @param {string} content */
function blankLineRatio(content) {
	const lines = content.split('\n');
	const total = lines.length;
	if (total === 0) return 0;
	const blank = lines.filter((l) => l.trim() === '').length;
	return blank / total;
}

const allFiles = walk(SRC);
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

for (const file of allFiles) {
	const ext = extname(file);
	if (!['.svelte', '.ts', '.js'].includes(ext)) continue;

	const rel = relative(ROOT, file).replace(/\\/g, '/');
	const content = readFileSync(file, 'utf-8');
	const lineCount = content.split('\n').length;
	const ratio = blankLineRatio(content);

	// Skip ratio on tiny stubs (e.g. +page.js re-exports) where 1–2 blanks dominate
	if (lineCount >= 20 && ratio > BLANK_RATIO_MAX) {
		errors.push(
			`${rel}: blankLineRatio ${(ratio * 100).toFixed(1)}% > ${BLANK_RATIO_MAX * 100}% (${lineCount} lines)`,
		);
	}

	const limits = LIMITS[ext];
	const ceiling = GRANDFATHER.get(rel);
	const warnAt = limits.warn;

	if (ceiling != null) {
		if (lineCount > ceiling) {
			errors.push(`${rel}: ${lineCount} lines exceeds grandfather ceiling ${ceiling}`);
		}
	} else if (lineCount > limits.max) {
		warnings.push(`${rel}: ${lineCount} lines exceeds max ${limits.max} (not grandfathered — shrink or add to GRANDFATHER)`);
	} else if (lineCount > warnAt) {
		warnings.push(`${rel}: ${lineCount} lines (warn threshold ${warnAt})`);
	}
}

if (warnings.length > 0) {
	console.warn(`⚠ check-file-budget: ${warnings.length} warning(s):\n`);
	for (const w of warnings) {
		console.warn(`  ${w}`);
	}
	console.warn('');
}

if (errors.length === 0) {
	console.log('✓ check-file-budget: clean — line budgets and blank-line ratios OK.\n');
	process.exit(0);
}

console.error(`\n✗ check-file-budget: ${errors.length} violation(s):\n`);
for (const e of errors) {
	console.error(`  ${e}`);
}
console.error(
	'\n  Fix: normalize double-newline corruption; split or shrink files over budget.\n',
);
process.exit(1);
