'use strict';

/**
 * Copy app gamification data into functions/ for Cloud Run deploy.
 * Monolith uploads only `functions/` — parent `src/lib/` paths do not exist on Cloud Run.
 *
 * Run: node scripts/sync-functions-vendor.cjs
 * Hook: firebase.json default codebase predeploy
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'src/lib/gamification/seasonOneData.js');
const DEST = path.join(REPO, 'functions/src/gamification/seasonOneData.js');

const EXPORT_NAMES = [
	'SEASON_STICKER_VARIANTS',
	'SEASON_ONE_ID',
	'SEASON_ONE_ALBUM_CAP',
	'seasonOneSets',
	'seasonOneCards',
	'getSeasonOneCardsForSet',
	'getSeasonOneCardsByConcept',
	'getSeasonOneSetById',
	'getSeasonOneCardById',
];

function toCommonJs(source) {
	let body = source.replace(/^export const /gm, 'const ');
	body = body.replace(/^export function /gm, 'function ');
	return `'use strict';\n/* Auto-synced from src/lib/gamification/seasonOneData.js — run sync-functions-vendor.cjs */\n\n${body}\n\nmodule.exports = {\n\t${EXPORT_NAMES.join(',\n\t')},\n};\n`;
}

if (!fs.existsSync(SRC)) {
	throw new Error(`Missing source catalog: ${SRC}`);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, toCommonJs(fs.readFileSync(SRC, 'utf8')), 'utf8');
console.log(`Synced ${path.relative(REPO, SRC)} → ${path.relative(REPO, DEST)}`);
