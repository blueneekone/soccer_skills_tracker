/**
 * commsSprint47.test.ts — Epic 4.7 coach-delegated team ops (source-scan)
 * Authority: ROADMAP Epic 4.7 · docs/vision/TEAM_MANAGER_OS.md (v1 = coach-delegated, no team_manager JWT)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const LOGISTICS = join(ROOT, 'coach', 'logistics');
const RULES = join(ROOT, '..', '..', 'firestore.rules');
const NAV = join(ROOT, 'shell', 'workspaceNav.js');

const logisticsView = readFileSync(join(LOGISTICS, 'CoachLogisticsView.svelte'), 'utf8');
const schedulePanel = readFileSync(join(LOGISTICS, 'CoachTeamSchedulePanel.svelte'), 'utf8');
const rosterPanel = readFileSync(join(LOGISTICS, 'CoachTeamRosterPanel.svelte'), 'utf8');
const attendancePanel = readFileSync(join(LOGISTICS, 'CoachTeamAttendancePanel.svelte'), 'utf8');
const rules = readFileSync(RULES, 'utf8');
const nav = readFileSync(NAV, 'utf8');

describe('Epic 4.7 — Team Ops hub (CoachLogisticsView)', () => {
	it('mounts Comms, Schedule, Roster, and Attendance tabs', () => {
		expect(logisticsView).toMatch(/CoachTeamSchedulePanel/);
		expect(logisticsView).toMatch(/CoachTeamRosterPanel/);
		expect(logisticsView).toMatch(/CoachTeamAttendancePanel/);
		expect(logisticsView).not.toMatch(/MessagesTab/);
		expect(logisticsView).toMatch(/channel=team_logistics/);
	});

	it('uses tab nav with comms | schedule | roster | attendance', () => {
		expect(logisticsView).toMatch(/activeTab === 'comms'/);
		expect(logisticsView).toMatch(/activeTab === 'schedule'/);
		expect(logisticsView).toMatch(/activeTab === 'roster'/);
		expect(logisticsView).toMatch(/activeTab === 'attendance'/);
	});

	it('labels surface as Team Ops (coach-delegated v1)', () => {
		expect(logisticsView).toMatch(/Team Ops/);
		expect(logisticsView).toMatch(/Coach-delegated logistics/i);
		expect(logisticsView).toMatch(/team_manager role in v1/);
	});
});

describe('Epic 4.7 — Schedule panel', () => {
	it('reuses saveTeamScheduledEvent + reminder toggles + announce opt-in', () => {
		expect(schedulePanel).toMatch(/saveTeamScheduledEvent/);
		expect(schedulePanel).toMatch(/REMINDER_OPTIONS/);
		expect(schedulePanel).toMatch(/announceToTeam/);
		expect(schedulePanel).toMatch(/workoutsStore\.loadForTeam/);
	});
});

describe('Epic 4.7 — Roster panel', () => {
	it('reads live roster from player_lookup by teamId', () => {
		expect(rosterPanel).toMatch(/player_lookup/);
		expect(rosterPanel).toMatch(/where\(['"]teamId['"],\s*['"]==['"],\s*teamId\)/);
	});
});

describe('Epic 4.7 — Attendance panel', () => {
	it('writes teams/{teamId}/attendance_sessions with present|absent records', () => {
		expect(attendancePanel).toMatch(/attendance_sessions/);
		expect(attendancePanel).toMatch(/records:\s*marks/);
		expect(attendancePanel).toMatch(/createdBy:\s*auth\.currentUser\.uid/);
	});

	it('loads latest session ordered by createdAt desc', () => {
		expect(attendancePanel).toMatch(/orderBy\(['"]createdAt['"],\s*['"]desc['"]\)/);
	});
});

describe('Epic 4.7 — Firestore rules', () => {
	it('defines attendance_sessions under teams/{teamId}', () => {
		expect(rules).toMatch(/match \/attendance_sessions\/\{sessionId\}/);
		expect(rules).toMatch(/coachStaffCanAccessTeam\(teamId\)/);
	});

	it('requires coach write fields title, sessionDate, records, createdBy', () => {
		const block = rules.slice(rules.indexOf('attendance_sessions'));
		expect(block).toMatch(/hasAll\(\['title', 'sessionDate', 'records', 'createdBy'\]\)/);
		expect(block).toMatch(/request\.resource\.data\.teamId == teamId/);
	});
});

describe('Epic 4.7 — Nav + role boundary', () => {
	it('workspace nav labels coach logistics as Team Ops', () => {
		expect(nav).toMatch(/label:\s*['"]Team Ops['"]/);
		expect(nav).toMatch(/href:\s*['"]\/coach\/logistics['"]/);
	});

	it('does not introduce team_manager JWT role in workspace nav', () => {
		expect(nav).not.toMatch(/team_manager/);
	});
});
