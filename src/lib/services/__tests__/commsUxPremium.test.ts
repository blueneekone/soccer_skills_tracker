/**
 * commsUxPremium.test.ts — COMMS-UX-RECOVERY + COMMS-TEAMOPS-UNIFY + COMMS-PREMIUM-V2 guards
 * Authority: COMMS_PLATFORM_STANDARDS.md · COMMS_UX_NAV_SPEC.md · COACH_OS_FOUNDATION.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REPO = join(ROOT, '..');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const LAYOUT = join(ROOT, 'routes/(app)/messages/+layout.svelte');
const LOGISTICS_VIEW = join(ROOT, 'lib/coach/logistics/CoachLogisticsView.svelte');
const TEAM_COMMS_PANEL = join(ROOT, 'lib/coach/logistics/CoachTeamCommsPanel.svelte');
const WORKSPACE_SHELL = join(ROOT, 'lib/components/comms/CommsWorkspaceShell.svelte');
const LOGISTICS_CHANNEL = join(ROOT, 'lib/components/comms/CommsLogisticsChannel.svelte');
const LOGISTICS_THREAD = join(ROOT, 'lib/components/comms/CommsLogisticsThread.svelte');
const THREAD_SHELL = join(ROOT, 'lib/components/comms/CommsThreadShell.svelte');
const PCDM_PANEL = join(ROOT, 'lib/components/comms/ParentCoachDmPanel.svelte');
const ROADMAP = join(REPO, 'ROADMAP.md');
const NAV_SPEC = join(REPO, 'docs/vision/COMMS_UX_NAV_SPEC.md');
const COMMS_HUB = join(REPO, 'docs/vision/COMMS_HUB.md');

const hubSrc = readFileSync(HUB, 'utf8');
const layoutSrc = readFileSync(LAYOUT, 'utf8');
const logisticsViewSrc = readFileSync(LOGISTICS_VIEW, 'utf8');
const logisticsChannelSrc = readFileSync(LOGISTICS_CHANNEL, 'utf8');

function forbidPillRadius(src: string, label: string) {
	it(`${label} forbids border-radius: 999px pill chrome`, () => {
		expect(src).not.toMatch(/border-radius:\s*999px/);
	});
}

describe('COMMS-UX-RECOVERY — hub premium chrome', () => {
	it('CommsHubShell removes native space select — pivot context label only', () => {
		expect(hubSrc).toMatch(/comms-hub-shell__space-context/);
		expect(hubSrc).not.toMatch(/comms-space-select/);
		expect(hubSrc).not.toMatch(/onSpacePickerChange/);
	});

	it('category rail uses labels only — no iconChar placeholders in shell', () => {
		expect(hubSrc).not.toMatch(/category-icon/);
		expect(hubSrc).not.toMatch(/iconChar/);
	});

	it('messages layout strap avoids operative / SIEM jargon', () => {
		expect(layoutSrc).not.toMatch(/Staff SIEM Inbox/);
		expect(layoutSrc).not.toMatch(/Operative Comms/);
		expect(layoutSrc).toMatch(/Team messages|Family messages|Club messages/);
	});
});

describe('COMMS-TEAMOPS-UNIFY — Team Ops native comms', () => {
	it('CoachLogisticsView mounts CoachTeamCommsPanel — zero /messages deep links', () => {
		expect(logisticsViewSrc).toMatch(/CoachTeamCommsPanel/);
		expect(logisticsViewSrc).not.toMatch(/href="\/messages/);
		expect(logisticsViewSrc).not.toMatch(/Open team comms/);
	});

	it('CoachTeamCommsPanel embeds compose + embedded logistics channel', () => {
		expect(existsSync(TEAM_COMMS_PANEL)).toBe(true);
		const panelSrc = readFileSync(TEAM_COMMS_PANEL, 'utf8');
		expect(panelSrc).toMatch(/ParentAnnouncementCompose/);
		expect(panelSrc).toMatch(/CommsLogisticsChannel/);
		expect(panelSrc).toMatch(/embedMode/);
		expect(panelSrc).not.toMatch(/href="\/messages/);
	});

	it('CommsLogisticsChannel uses button sub-tabs when embedMode — href only on hub', () => {
		expect(logisticsChannelSrc).toMatch(/embedMode/);
		expect(logisticsChannelSrc).toMatch(/bind:activeSub|\$bindable\('game-day'\)/);
		expect(logisticsChannelSrc).toMatch(/onclick=\{\(\) => selectSub/);
		expect(logisticsChannelSrc).toMatch(/href="\/messages\?channel=team_logistics/);
	});

	it('logistics channel uses thread shell stack — not MessagesTab', () => {
		expect(existsSync(LOGISTICS_THREAD)).toBe(true);
		expect(existsSync(THREAD_SHELL)).toBe(true);
		expect(logisticsChannelSrc).toMatch(/CommsLogisticsThread/);
		expect(logisticsChannelSrc).not.toMatch(/MessagesTab/);
		const threadSrc = readFileSync(LOGISTICS_THREAD, 'utf8');
		expect(threadSrc).toMatch(/CommsThreadShell/);
		expect(threadSrc).toMatch(/teams.*channels.*messages/s);
	});
});

describe('COMMS-PREMIUM-V2 — CommsWorkspaceShell coach-team embed', () => {
	it('CoachTeamCommsPanel mounts CommsWorkspaceShell with parent DM default', () => {
		const panelSrc = readFileSync(TEAM_COMMS_PANEL, 'utf8');
		expect(panelSrc).toMatch(/CommsWorkspaceShell/);
		expect(panelSrc).toMatch(/parent_coach_dm/);
		expect(panelSrc).toMatch(/activeChannel = \$state<CoachTeamChannel>\('parent_coach_dm'\)/);
		expect(panelSrc).toMatch(/ParentCoachDmPanel/);
		expect(panelSrc).toMatch(/workspaceMode/);
	});

	it('CommsWorkspaceShell exists with rail + mobile sheet + main slot', () => {
		expect(existsSync(WORKSPACE_SHELL)).toBe(true);
		const shellSrc = readFileSync(WORKSPACE_SHELL, 'utf8');
		expect(shellSrc).toMatch(/comms-workspace__rail/);
		expect(shellSrc).toMatch(/comms-workspace__mobile-picker/);
		expect(shellSrc).toMatch(/border-left-color: var\(--pd-data-cyan/);
		expect(shellSrc).toMatch(/coach-os-panel/);
	});

	it('ParentCoachDmPanel uses list-detail rows — not thread select', () => {
		const panelSrc = readFileSync(PCDM_PANEL, 'utf8');
		expect(panelSrc).toMatch(/pcdm-thread-list/);
		expect(panelSrc).toMatch(/pcdm-thread-row/);
		expect(panelSrc).not.toMatch(/pcdm-thread-select|<select[^>]*pcdm-thread/);
		expect(panelSrc).toMatch(/pcdm-layout/);
	});

	forbidPillRadius(readFileSync(TEAM_COMMS_PANEL, 'utf8'), 'CoachTeamCommsPanel');
	forbidPillRadius(logisticsViewSrc, 'CoachLogisticsView');
	forbidPillRadius(logisticsChannelSrc, 'CommsLogisticsChannel');
});

describe('COMMS-TEAMOPS-UNIFY — Sub C coach panel tokens', () => {
	it('CoachTeamCommsPanel uses ec-page + coach-os-panel — no comms-hub z4 strap', () => {
		const panelSrc = readFileSync(TEAM_COMMS_PANEL, 'utf8');
		expect(panelSrc).toMatch(/ec-page/);
		expect(panelSrc).toMatch(/coach-os-panel|coach-os-well/);
		expect(panelSrc).not.toMatch(/comms-hub-z4/);
		expect(panelSrc).not.toMatch(/comms-hub-persona-skins/);
	});

	it('Team Ops logistics route does not import comms-hub persona skins', () => {
		expect(logisticsViewSrc).not.toMatch(/comms-hub-persona-skins/);
		expect(logisticsViewSrc).not.toMatch(/comms-hub-z4-chrome/);
	});

	it('CommsLogisticsThread accepts embedMode for Team Ops flat thread context', () => {
		const threadSrc = readFileSync(LOGISTICS_THREAD, 'utf8');
		expect(threadSrc).toMatch(/embedMode/);
	});
});

describe('COMMS-DOCS-SYNC — vision doc guards', () => {

	it('COMMS_HUB does not describe coach logistics via hub deep link', () => {

		const hub = readFileSync(COMMS_HUB, 'utf8');

		expect(hub).not.toMatch(/hub deep link/i);

		expect(hub).toMatch(/CoachTeamCommsPanel|CommsWorkspaceShell/);

	});

});



describe('COMMS-PREMIUM-V2 — docs + sprint tracking', () => {
	it('COMMS_UX_NAV_SPEC §5 documents Team Ops CommsWorkspaceShell embed', () => {
		const spec = readFileSync(NAV_SPEC, 'utf8');
		expect(spec).toMatch(/CommsWorkspaceShell/);
		expect(spec).toMatch(/parent_coach_dm/);
		expect(spec).toMatch(/redirects/);
	});

	it('ROADMAP tracks COMMS-PREMIUM-V2 sprint row with owner VA gate', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toContain('COMMS-PREMIUM-V2');
		expect(roadmap).toContain('CommsWorkspaceShell');
		expect(roadmap).toMatch(/owner VA|owner screenshots/i);
	});
});

describe('COMMS-TEAMOPS-UNIFY — sprint tracking', () => {
	it('ROADMAP tracks COMMS-TEAMOPS-UNIFY sprint row', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toContain('COMMS-TEAMOPS-UNIFY');
		expect(roadmap).toContain('CoachTeamCommsPanel');
	});
});

describe('COMMS-UX-RECOVERY — sprint tracking', () => {
	it('ROADMAP tracks COMMS-UX-RECOVERY sprint row', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toContain('COMMS-UX-RECOVERY');
	});
});
