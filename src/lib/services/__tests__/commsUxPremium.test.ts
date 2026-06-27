/**
 * commsUxPremium.test.ts — COMMS-UX-RECOVERY premium hub + Team Ops native guards
 * Authority: COMMS_PLATFORM_STANDARDS.md · COMMS_UX_NAV_SPEC.md · PARENT_OS_FOUNDATION.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const REPO = join(ROOT, '..');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const LAYOUT = join(ROOT, 'routes/(app)/messages/+layout.svelte');
const LOGISTICS_VIEW = join(ROOT, 'lib/coach/logistics/CoachLogisticsView.svelte');
const LOGISTICS_CHANNEL = join(ROOT, 'lib/components/comms/CommsLogisticsChannel.svelte');
const LOGISTICS_THREAD = join(ROOT, 'lib/components/comms/CommsLogisticsThread.svelte');
const THREAD_SHELL = join(ROOT, 'lib/components/comms/CommsThreadShell.svelte');
const ROADMAP = join(REPO, 'ROADMAP.md');

const hubSrc = readFileSync(HUB, 'utf8');
const layoutSrc = readFileSync(LAYOUT, 'utf8');
const logisticsViewSrc = readFileSync(LOGISTICS_VIEW, 'utf8');
const logisticsChannelSrc = readFileSync(LOGISTICS_CHANNEL, 'utf8');

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

describe('COMMS-UX-RECOVERY — Team Ops native comms', () => {
	it('CoachLogisticsView embeds compose + single team comms CTA', () => {
		expect(logisticsViewSrc).toMatch(/ParentAnnouncementCompose/);
		expect(logisticsViewSrc).toMatch(/Open team comms/);
		const linkMatches = logisticsViewSrc.match(/href="\/messages/g) ?? [];
		expect(linkMatches.length).toBeLessThanOrEqual(1);
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

describe('COMMS-UX-RECOVERY — sprint tracking', () => {
	it('ROADMAP tracks COMMS-UX-RECOVERY sprint row', () => {
		const roadmap = readFileSync(ROADMAP, 'utf8');
		expect(roadmap).toContain('COMMS-UX-RECOVERY');
	});
});
