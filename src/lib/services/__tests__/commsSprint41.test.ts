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
const TEAM_COMMS_PANEL = join(ROOT, 'lib/coach/logistics/CoachTeamCommsPanel.svelte');
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

	it('mounts CoachLogisticsView with native Team Ops Comms embed', () => {
		const page = readFileSync(LOGISTICS_PAGE, 'utf-8');
		expect(page).toMatch(/\$lib\/coach\/logistics/);
		expect(page).toMatch(/CoachLogisticsView/);
		const view = readFileSync(join(ROOT, 'lib/coach/logistics/CoachLogisticsView.svelte'), 'utf-8');
		expect(view).toMatch(/CoachTeamCommsPanel/);
		expect(view).toMatch(/activeTab === 'comms'|id: 'comms'/);
		expect(view).not.toMatch(/MessagesTab/);
		expect(view).not.toMatch(/href="\/messages/);
		const panel = readFileSync(TEAM_COMMS_PANEL, 'utf-8');
		expect(panel).toMatch(/CommsWorkspaceShell|CoachTeamCommsPanel/);
		expect(panel).toMatch(/ParentAnnouncementCompose/);
	});

	it('ParentAnnouncementCompose uses CommsEngine team broadcast', () => {
		const src = readFileSync(COMPOSE, 'utf-8');
		expect(src).toMatch(/CommsEngine/);
		expect(src).toMatch(/broadcastMessage/);
		expect(src).toMatch(/type:\s*'team'/);
		expect(src).toMatch(/Publish announcement/i);
		expect(src).toMatch(/DeliveryReceipt/);
	});

	it('CommsEngine calls safeSportBroadcast in us-east1', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf-8');
		expect(src).toMatch(/safeSportBroadcast/);
		expect(src).toMatch(/us-east1/);
		expect(src).not.toMatch(/us-central1/);
	});

	it('workspaceNav links Team Ops + Team Comms field pin', () => {
		const nav = readFileSync(WORKSPACE_NAV, 'utf-8');
		expect(nav).toMatch(/Team Ops/);
		expect(nav).toMatch(/href:\s*'\/coach\/logistics'/);
		expect(nav).toMatch(/coachTeamCommsNavItem/);
		expect(nav).toMatch(/label:\s*'Team Comms'/);
		expect(nav).toMatch(/href:\s*'\/coach\/logistics\?tab=comms'/);
	});
});

describe('Sprint 4.1 — vision + ROADMAP', () => {
	it('COMMS_HUB assigns Coach OS Team Ops native comms embed to Epic C', () => {
		const doc = readFileSync(COMMS_HUB, 'utf-8');
		expect(doc).toMatch(/\/coach\/logistics\?tab=comms/);
		expect(doc).toMatch(/parent-targeted/i);
		expect(doc).toMatch(/CoachTeamCommsPanel|CommsWorkspaceShell/);
		expect(doc).not.toMatch(/MessagesTab/i);
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

// ── T0-8a guards ─────────────────────────────────────────────────────────────

describe('T0-8a — coach inbox teamId filter (RQ-1)', () => {
	const MESSAGES_PAGE = join(ROOT, 'routes/(app)/messages/+page.svelte');

	it('coach inbox query includes teamId filter alongside fromEmail', () => {
		const src = readFileSync(MESSAGES_PAGE, 'utf-8');
		// Both where clauses must appear in the coach branch to satisfy the Firestore rule
		expect(src).toMatch(/where\('fromEmail'/);
		expect(src).toMatch(/where\('teamId',\s*'==',\s*tid\)/);
	});

	it('coach inbox no longer post-filters teamId client-side', () => {
		const src = readFileSync(MESSAGES_PAGE, 'utf-8');
		// The redundant client-side guard was removed
		expect(src).not.toMatch(/x\.teamId\s*===\s*tid/);
	});
});

describe('T0-8a — sendCoachPlayerMessage client path', () => {
	it('CommsEngine exports sendCoachPlayerMessage wrapper calling the callable', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf-8');
		expect(src).toMatch(/sendCoachPlayerMessage/);
		// Wrapper must call the callable registered under the same function name
		expect(src).toMatch(/httpsCallable\([^,]+,\s*'sendCoachPlayerMessage'\)/);
	});

	it('CommsEngine sendCoachPlayerMessage validates teamId, playerName, body', () => {
		const src = readFileSync(COMMS_SERVICE, 'utf-8');
		expect(src).toMatch(/teamId and playerName are required/);
		expect(src).toMatch(/Message body is required/);
	});

	it('MessagesTab imports CommsEngine and invokes sendCoachPlayerMessage', () => {
		const src = readFileSync(MESSAGES_TAB, 'utf-8');
		expect(src).toMatch(/CommsEngine/);
		expect(src).toMatch(/sendCoachPlayerMessage/);
	});

	it('MessagesTab DM compose only shown for coach or director roles', () => {
		const src = readFileSync(MESSAGES_TAB, 'utf-8');
		// canSendDm guard must reference coach and director roles
		expect(src).toMatch(/canSendDm/);
		expect(src).toMatch(/coach/);
		expect(src).toMatch(/director/);
	});
});

// ── T0-8b guards ─────────────────────────────────────────────────────────────
// Announcements get a dedicated, higher-priority surface SEPARATE from DM inbox.

const ANNOUNCEMENTS_INBOX = join(ROOT, 'lib/components/comms/AnnouncementsInbox.svelte');
const FIRESTORE_RULES = join(ROOT, '..', 'firestore.rules');
const FIRESTORE_INDEXES = join(ROOT, '..', 'firestore.indexes.json');
const MESSAGES_PAGE = join(ROOT, 'routes/(app)/messages/+page.svelte');

describe('T0-8b — AnnouncementsInbox component reads team_broadcasts', () => {
	it('AnnouncementsInbox.svelte exists under comms components', () => {
		expect(existsSync(ANNOUNCEMENTS_INBOX)).toBe(true);
	});

	it('AnnouncementsInbox subscribes to team_broadcasts collection', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf-8');
		expect(src).toMatch(/team_broadcasts/);
		expect(src).toMatch(/onSnapshot/);
	});

	it('parent query uses ccParentEmails array-contains', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf-8');
		expect(src).toMatch(/ccParentEmails.*array-contains/);
	});

	it('player/staff query uses teamId equality filter', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf-8');
		expect(src).toMatch(/where\('teamId',\s*'==',\s*teamId\)/);
	});

	it('queries are ordered by createdAt descending with limit', () => {
		const src = readFileSync(ANNOUNCEMENTS_INBOX, 'utf-8');
		expect(src).toMatch(/orderBy\('createdAt',\s*'desc'\)/);
		expect(src).toMatch(/limit\(20\)/);
	});
});

describe('T0-8b — announcements surface is separate from DM inbox', () => {
	it('/messages page mounts CommsHubShell (Epic 4.13a)', () => {
		const src = readFileSync(MESSAGES_PAGE, 'utf-8');
		expect(src).toMatch(/CommsHubShell/);
	});

	it('CommsHubShell includes announcements channel with DeliveryReceipt compose path', () => {
		const hub = readFileSync(join(ROOT, 'lib/components/comms/CommsHubShell.svelte'), 'utf-8');
		expect(hub).toMatch(/AnnouncementsInbox/);
		expect(hub).toMatch(/ParentAnnouncementCompose/);
		expect(hub).toMatch(/direct_mail/);
	});
});

describe('T0-8b — Firestore rules include parent read branch on team_broadcasts', () => {
	it('firestore.rules has isParent() branch for team_broadcasts read', () => {
		const src = readFileSync(FIRESTORE_RULES, 'utf-8');
		expect(src).toMatch(/parentRecipientEmails/);
		expect(src).toMatch(/ccParentEmails/);
	});

	it('firestore.rules still preserves coach/director/player branch', () => {
		const src = readFileSync(FIRESTORE_RULES, 'utf-8');
		expect(src).toMatch(/isCoach\(\)\s*\|\|\s*isDirector\(\)\s*\|\|\s*isPlayer\(\)/);
	});
});

describe('T0-8b — composite indexes for team_broadcasts queries', () => {
	it('firestore.indexes.json has teamId + createdAt DESC index for team_broadcasts', () => {
		const idx = JSON.parse(readFileSync(FIRESTORE_INDEXES, 'utf-8'));
		const found = idx.indexes.some(
			(ix: { collectionGroup: string; fields: Array<{ fieldPath: string; order?: string }> }) =>
				ix.collectionGroup === 'team_broadcasts' &&
				ix.fields.some((f) => f.fieldPath === 'teamId' && f.order === 'ASCENDING') &&
				ix.fields.some((f) => f.fieldPath === 'createdAt' && f.order === 'DESCENDING'),
		);
		expect(found).toBe(true);
	});

	it('firestore.indexes.json has ccParentEmails ARRAY_CONTAINS + createdAt DESC index', () => {
		const idx = JSON.parse(readFileSync(FIRESTORE_INDEXES, 'utf-8'));
		const found = idx.indexes.some(
			(ix: {
				collectionGroup: string;
				fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }>;
			}) =>
				ix.collectionGroup === 'team_broadcasts' &&
				ix.fields.some(
					(f) => f.fieldPath === 'ccParentEmails' && f.arrayConfig === 'CONTAINS',
				) &&
				ix.fields.some((f) => f.fieldPath === 'createdAt' && f.order === 'DESCENDING'),
		);
		expect(found).toBe(true);
	});

	it('firestore.indexes.json has parentRecipientEmails ARRAY_CONTAINS + createdAt DESC index', () => {
		const idx = JSON.parse(readFileSync(FIRESTORE_INDEXES, 'utf-8'));
		const found = idx.indexes.some(
			(ix: {
				collectionGroup: string;
				fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }>;
			}) =>
				ix.collectionGroup === 'team_broadcasts' &&
				ix.fields.some(
					(f) => f.fieldPath === 'parentRecipientEmails' && f.arrayConfig === 'CONTAINS',
				) &&
				ix.fields.some((f) => f.fieldPath === 'createdAt' && f.order === 'DESCENDING'),
		);
		expect(found).toBe(true);
	});
});
