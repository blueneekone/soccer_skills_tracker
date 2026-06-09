/**
 * Coach intent module layout — Epic 8 lives under $lib/coach/intent (not routes).
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'src/lib/coach/intent');

describe('$lib/coach/intent module layout', () => {
	it('exports IntentEngine, UI shells, and Forge view from index', () => {
		const index = readFileSync(join(ROOT, 'index.ts'), 'utf-8');
		expect(index).toMatch(/IntentEngine/);
		expect(index).toMatch(/IntentArena/);
		expect(index).toMatch(/IntentHUD/);
		expect(index).toMatch(/CoachIntentEngineView/);
	});

	it('does not keep intent implementation under routes/assignments', () => {
		expect(existsSync(join(process.cwd(), 'src/routes/(app)/coach/assignments/IntentEngine.svelte.ts'))).toBe(
			false,
		);
		expect(existsSync(join(ROOT, 'IntentEngine.svelte.ts'))).toBe(true);
		expect(existsSync(join(ROOT, 'CoachIntentEngineView.svelte'))).toBe(true);
	});

	it('legacy assignments route only redirects to forge', () => {
		const redirect = readFileSync(
			join(process.cwd(), 'src/routes/(app)/coach/assignments/+page.js'),
			'utf-8',
		);
		expect(redirect).toMatch(/redirect\(308,\s*'\/coach\/forge'\)/);
		expect(existsSync(join(process.cwd(), 'src/routes/(app)/coach/assignments/+page.svelte'))).toBe(
			false,
		);
	});
});
