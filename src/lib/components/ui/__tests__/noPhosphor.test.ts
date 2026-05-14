/**
 * noPhosphor.test.ts
 * Greps the src/ tree for any reintroduced Phosphor icon usage.
 * Acts as a runtime guard complementing the scripts/check-no-phosphor.mjs prebuild hook.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_ROOT = join(__dirname, '..', '..', '..', '..'); // src/

/** Patterns that indicate Phosphor icon usage in rendered HTML */
const PHOSPHOR_PATTERNS = [
	/<i\s+class="ph\s+ph-/,
	/<i\s+class="ph-[a-z]/,
	/unpkg\.com\/@phosphor-icons/,
];

/** Files that may contain ph-* as doc examples/comments (allowlist). */
const DOC_ALLOWLIST = new Set(['Icon.svelte']);

function* walkSrc(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === 'node_modules' || entry === '.svelte-kit' || entry === 'dist') continue;
			yield* walkSrc(full);
		} else {
			const ext = extname(entry);
			if (ext === '.svelte' || ext === '.html') {
				if (!DOC_ALLOWLIST.has(entry)) yield full;
			}
		}
	}
}

describe('Phosphor icon purge — no reintroduction', () => {
	it('finds zero Phosphor icon references in src/**/*.svelte and *.html', () => {
		const violations: Array<{ file: string; line: number; text: string }> = [];

		for (const filePath of walkSrc(SRC_ROOT)) {
			const lines = readFileSync(filePath, 'utf-8').split('\n');
			lines.forEach((line, idx) => {
				for (const pattern of PHOSPHOR_PATTERNS) {
					if (pattern.test(line)) {
						violations.push({ file: filePath.replace(SRC_ROOT, 'src'), line: idx + 1, text: line.trim() });
					}
				}
			});
		}

		if (violations.length > 0) {
			const report = violations.map((v) => `  ${v.file}:${v.line} — ${v.text}`).join('\n');
			expect.fail(`Phosphor icon(s) reintroduced:\n${report}`);
		}

		expect(violations).toHaveLength(0);
	});
});
