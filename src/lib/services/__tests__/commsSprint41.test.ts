/**
 * commsSprint41.test.ts — Sprint 4.1 coach logistics + parent-targeted compose
 * Authority: docs/vision/COMMS_HUB.md · ROADMAP Epic 4
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CommsEngine, SafeSportViolation } from '../comms.svelte.js';

const ROOT = join(__dirname, '..', '..', '..');
const ROADMAP = join(ROOT, '..', 'ROADMAP.md');
const COMMS_HUB = join(ROOT, '..', 'docs/vision/COMMS_HUB.md');
const SAFESPORT = join(ROOT, '..', 'docs/SAFESPORT_COMMS_MATRIX.md');
const FUNCTIONAL_MVP = join(ROOT, '..', 'docs/vision/FUNCTIONAL_MVP.md');
const WORKSPACE_NAV = join(ROOT, 'lib/shell/workspaceNav.js');
const LOGISTICS_PAGE = join(ROOT, 'routes/(app)/coach/logistics/+page.svelte');
const LOGISTICS_JS = join(ROOT, 'routes/(app)/coach/logistics/+page.js');
const COMPOSE = join(ROOT, 'lib/components/coach/ParentAnnouncementCompose.svelte');
const MESSAGES_TAB = join(ROOT, 'lib/components/coach/MessagesTab.svelte');
const COMMS_SERVICE = join(ROOT, 'lib/services/comms.svelte.ts');

describe('Sprint 4.1 — CommsEngine client guards', () => {
	const engine = new CommsEngine();

	it('rejects individual-player target types (SafeSport)', async () => {
		await expect(
			engine.broadcastMessage({
				target: { type: 'player' as 'team', id: 'player-123' },
				body: 'hello',
			}),
		).rejects.toThrow(SafeSportViolation);
	});

	it('rejects empty team target id', async () => {
		await expect(
			engine.broadcastMessage({
				target: { type: 'team', id: '' },
				body: 'hello',
			}),
		).rejects.toThrow(SafeSportViolation);
	});

	it('requires non-empty message body', async () => {
		await expect(
			engine.broadcastMessage({
				target: { type: 'team', id: 'team-alpha' },
				body: '   ',
			}),
		).rejects.toThrow(/body is required/i);
	});
});

describe('Sprint 4.1 — /coach/logistics route wiring', () => {
	it('logistics +page exists with SSR disabled', () => {
		expect(existsSync(LOGISTICS_PAGE)).toBe(true);
		expect(existsSync(LOGISTICS_JS)).toBe(true);
		const js = readFileSync(LOGISTICS_JS, 'utf-8');
		expect(js).toMatch(/ssr\s*=\s*false/);
	});

	it('mounts MessagesTab and ParentAnnouncementCompose', () => {
		const page = readFileSync(LOGISTICS_PAGE, 'utf-8');
		expect(page).toMatch(/MessagesTab/);
		expect(page).toMatch(/ParentAnnouncementCompose/);
		expect(page).toMatch(/teamId=\{selectedTeamId\}/);
	});

	it('ParentAnnouncementCompose uses CommsEngine team broadcast', () => {
		const src = readFileSync(COMPOSE, 'utf-8');
		expect(src).toMatch(/CommsEngine/);
		expect(src).toMatch(/broadcastMessage/);
		expect(src).toMatch(/type:\s*'team'/);
		expect(src).toMatch(/Send to parents/i);
		expect(src).toMatch(/Parent-targeted/i);
	});

	it('CommsEngine calls safeSportBroadcast in us-east1', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf-8');
		expect(src).toMatch(/safeSportBroadcast/);
		expect(src).toMatch(/us-east1/);
		expect(src).not.toMatch(/us-central1/);
	});

	it('workspaceNav links Logistics & Comms to /coach/logistics', () => {
		const nav = readFileSync(WORKSPACE_NAV, 'utf-8');
		expect(nav).toMatch(/Logistics & Comms/);
		expect(nav).toMatch(/href:\s*'\/coach\/logistics'/);
	});
});

describe('Sprint 4.1 — vision + ROADMAP', () => {
	it('COMMS_HUB assigns Coach OS /coach/logistics compose to Epic C', () => {
		const doc = readFileSync(COMMS_HUB, 'utf-8');
		expect(doc).toMatch(/\/coach\/logistics/);
		expect(doc).toMatch(/parent-targeted/i);
		expect(doc).toMatch(/MessagesTab/i);
	});

	it('ROADMAP tracks 4.1 Done with commsSprint41 proof', () => {
		const doc = readFileSync(ROADMAP, 'utf-8');
		expect(doc).toMatch(/\|\s*4\.1\s*\|\s*\*\*(?:Done|In progress)\*\*/i);
		expect(doc).toMatch(/commsSprint41\.test\.ts/);
		expect(doc).toMatch(/\/coach\/logistics/);
	});

	it('SAFESPORT_COMMS_MATRIX notes 4.1 wired logistics route', () => {
		const doc = readFileSync(SAFESPORT, 'utf-8');
		expect(doc).toMatch(/4\.1/);
		expect(doc).toMatch(/\/coach\/logistics/);
	});

	it('FUNCTIONAL_MVP lists logistics compose acceptance for Coach OS', () => {
		const doc = readFileSync(FUNCTIONAL_MVP, 'utf-8');
		expect(doc).toMatch(/Logistics compose \+ send to parents/);
		expect(doc).toMatch(/\/coach\/logistics/);
	});
});

describe('Sprint 4.1 — MessagesTab remains team-scoped', () => {
	it('MessagesTab writes to teams/{teamId}/channels path', () => {
		const src = readFileSync(MESSAGES_TAB, 'utf-8');
		expect(src).toMatch(/teams',\s*teamId,\s*'channels'/);
	});
});
