/**
 * forge.layout.test.ts — Forge hosts Epic 8 Intent Engine
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const VIEW = join(process.cwd(), 'src/lib/coach/intent/CoachIntentEngineView.svelte');
const INDEX = join(process.cwd(), 'src/lib/coach/intent/index.ts');
const src = readFileSync(PAGE, 'utf-8');
const viewSrc = readFileSync(VIEW, 'utf-8');

describe('/coach/forge — Intent Engine shell', () => {
	it('forge route imports from $lib/coach/intent barrel', () => {
		expect(src).toMatch(/\$lib\/coach\/intent/);
		expect(src).toMatch(/CoachIntentEngineView/);
		expect(src).toMatch(/showDrillLibraryLink=\{true\}/);
	});

	it('intent barrel re-exports deploy UI', () => {
		const barrel = readFileSync(INDEX, 'utf-8');
		expect(barrel).toMatch(/IntentEngine/);
		expect(barrel).toMatch(/CoachIntentEngineView/);
	});

	it('shared intent view wires IntentArena and inline ForgeDeployPanel', () => {
		expect(viewSrc).toMatch(/IntentArena/);
		expect(viewSrc).toMatch(/ForgeDeployPanel/);
		expect(viewSrc).toMatch(/refreshIntents/);
		expect(viewSrc).not.toMatch(/IntentHUD/);
	});
});

describe('/coach/assignments — legacy redirect', () => {
	const redirect = readFileSync(join(__dirname, '..', '..', 'assignments', '+page.js'), 'utf-8');

	it('redirects to /coach/forge', () => {
		expect(redirect).toMatch(/redirect\(308,\s*'\/coach\/forge'\)/);
	});
});
