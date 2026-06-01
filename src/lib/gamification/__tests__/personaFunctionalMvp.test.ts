/**
 * personaFunctionalMvp.test.ts — Sprint LAUNCH-functional-os (doc + gate guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');
const RESEARCH_README = join(ROOT, '..', 'docs/vision/references/ui/research/README.md');
const LAUNCH_FOCUS_RULE = join(ROOT, '..', '.cursor/rules/launch-focus.mdc');

describe('Sprint LAUNCH-functional-os — FUNCTIONAL_MVP.md', () => {
	it('FUNCTIONAL_MVP.md exists with persona acceptance sections', () => {
		expect(existsSync(FUNCTIONAL_MVP)).toBe(true);
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/## Player OS/);
		expect(doc).toMatch(/## Parent OS/);
		expect(doc).toMatch(/## Coach OS/);
		expect(doc).toMatch(/## Cross-persona/);
		expect(doc).toMatch(/## Gaps/);
		expect(doc).toMatch(/Login → HQ loads missions, identity, telemetry/);
		expect(doc).toMatch(/Logistics compose \+ send to parents/);
	});

	it('FUNCTIONAL_MVP.md documents audit gaps with sprint hints', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/\/coach\/logistics/);
		expect(doc).toMatch(/Epic 4\.1/);
		expect(doc).toMatch(/Epic 4\.2/);
		expect(doc).toMatch(/Epic 4\.4/);
	});
});

describe('Sprint LAUNCH-functional-os — ROADMAP', () => {
	const roadmap = readFileSync(ROADMAP, 'utf-8');

	it('ROADMAP lists LAUNCH-functional-os as current sprint', () => {
		expect(roadmap).toMatch(/Current sprint:\*\*\s*\*\*LAUNCH-functional-os\*\*/);
		expect(roadmap).toMatch(/\|\s*\*\*LAUNCH-functional-os\*\*\s*\|\s*\*\*In progress\*\*/i);
	});

	it('ROADMAP next build order includes 3.5k Done then Epic 4.1 comms', () => {
		expect(roadmap).toMatch(/3\.5k Done.*Epic 4\.1/s);
		expect(roadmap).toMatch(/4\.1.*4\.2.*4\.11.*4\.4.*4\.3/s);
	});

	it('ROADMAP documents personaFunctionalMvp test proof', () => {
		expect(roadmap).toMatch(/personaFunctionalMvp\.test\.ts/);
	});

	it('ROADMAP tables Platform visual system (Gemini research)', () => {
		expect(roadmap).toMatch(/TABLED.*Platform visual system.*Gemini research/is);
		expect(roadmap).toMatch(/Flow asset generation/);
		expect(roadmap).toMatch(/3\.6b\+/);
	});
});

describe('Sprint LAUNCH-functional-os — research README', () => {
	it('research/README tables visual system as post-launch', () => {
		expect(existsSync(RESEARCH_README)).toBe(true);
		const readme = readFileSync(RESEARCH_README, 'utf-8');
		expect(readme).toMatch(/TABLED/i);
		expect(readme).toMatch(/post-launch visual system/i);
		expect(readme).toMatch(/Gemini Deep Research/i);
		expect(readme).toMatch(/Do not wire/i);
	});
});

describe('Sprint LAUNCH-functional-os — launch-focus rule', () => {
	it('launch-focus.mdc exists with functional guardrails', () => {
		expect(existsSync(LAUNCH_FOCUS_RULE)).toBe(true);
		const rule = readFileSync(LAUNCH_FOCUS_RULE, 'utf-8');
		expect(rule).toMatch(/functionality over pixels/i);
		expect(rule).toMatch(/references\/ui\/research/);
		expect(rule).toMatch(/MUST NOT/i);
		expect(rule).toMatch(/avatar-builder-deferred/);
		expect(rule).toMatch(/Epic 4/);
	});
});
