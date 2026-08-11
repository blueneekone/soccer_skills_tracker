/**
 * CHECKR-QA-ADMIN — admin coach clearance route guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', '+page.svelte');
const PANOPTICON_ARENA = join(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'compliance',
	'CoachClearanceArena.svelte',
);
const PANOPTICON = join(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'compliance',
	'CoachClearancePanopticon.svelte',
);
const ARENA = join(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'compliance',
	'CoachClearanceArena.svelte',
);
const ENGINE = join(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'lib',
	'components',
	'compliance',
	'CoachClearanceEngine.svelte.ts',
);
const WORKSPACE_NAV = join(__dirname, '..', '..', '..', '..', '..', 'lib', 'shell', 'workspaceNav.js');

const pageSrc = readFileSync(PAGE, 'utf-8');
const panopticonArenaSrc = readFileSync(PANOPTICON_ARENA, 'utf-8');
const panopticonSrc = readFileSync(PANOPTICON, 'utf-8');
const arenaSrc = readFileSync(ARENA, 'utf-8');
const engineSrc = readFileSync(ENGINE, 'utf-8');
const navSrc = readFileSync(WORKSPACE_NAV, 'utf-8');

describe('/admin/coach-clearance — CHECKR-QA-ADMIN', () => {
	it('route exists and gates super_admin / global_admin only', () => {
		expect(pageSrc).toMatch(/CoachClearancePanopticon/);
		expect(pageSrc).toMatch(/super_admin/);
		expect(pageSrc).toMatch(/global_admin/);
		expect(pageSrc).toMatch(/\/admin\/overview/);
	});

	it('reuses shared CoachClearanceArena with admin header copy', () => {
		expect(pageSrc).toMatch(/GLOBAL ADMIN — COACH CLEARANCE/);
		expect(panopticonArenaSrc).toMatch(/simulateClearance/);
	});

	it('panopticon uses Checkr dashboard copy (CHECKR-PANOPTICON-COPY)', () => {
		expect(panopticonArenaSrc).toMatch(/Open Checkr dashboard/i);
		expect(panopticonArenaSrc).toMatch(/Simulate clearance \(QA\)/i);
		expect(panopticonArenaSrc).toMatch(/clearanceStatusSubLabelTitle/);
		expect(panopticonArenaSrc).not.toMatch(/app\.ankored\.com/);
		expect(panopticonArenaSrc).not.toMatch(/\bAnkored\b/i);
	});

	it('admin nav links Coach clearance to /admin/coach-clearance', () => {
		expect(navSrc).toMatch(/Coach clearance/);
		expect(navSrc).toMatch(/href:\s*'\/admin\/coach-clearance'/);
	});

	it('director nav separates player passports from staff clearance', () => {
		expect(navSrc).toMatch(/Player passports/);
		expect(navSrc).toMatch(/Staff clearance/);
		expect(navSrc).toMatch(/href:\s*'\/director\/compliance'/);
	});
});
