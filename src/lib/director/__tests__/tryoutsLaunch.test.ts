import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('LAUNCH-tryouts-a — program + public registration', () => {
	it('exports tryout callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutProgram/);
		expect(ops).toMatch(/exports\.getPublicTryoutProgram/);
		expect(ops).toMatch(/exports\.registerForTryout/);
		expect(ops).toMatch(/waitlisted/);
	});

	it('functions-core wires tryout callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/upsertTryoutProgram/);
		expect(idx).toMatch(/registerForTryout/);
	});

	it('Firestore rules gate tryout_programs collections', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/tryout_programs\/\{programId\}/);
		expect(rules).toMatch(/match \/registrations\/\{registrationId\}/);
	});

	it('Field Ops mounts TryoutsProgramsPanel', () => {
		const mod = readFileSync(
			join(ROOT, 'src/lib/components/director/os/FieldOpsModule.svelte'),
			'utf-8',
		);
		expect(mod).toMatch(/TryoutsProgramsPanel/);
	});

	it('public tryouts page calls registerForTryout', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/getPublicTryoutProgram/);
		expect(page).toMatch(/registerForTryout/);
	});
});

describe('LAUNCH-tryouts-b — sessions, RSVP, check-in', () => {
	it('exports session + check-in callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutSession/);
		expect(ops).toMatch(/exports\.assignTryoutSession/);
		expect(ops).toMatch(/exports\.setTryoutSessionRsvp/);
		expect(ops).toMatch(/exports\.checkInTryoutRegistration/);
		expect(ops).toMatch(/checked_in/);
	});

	it('functions-core wires tryout phase B callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/upsertTryoutSession/);
		expect(idx).toMatch(/checkInTryoutRegistration/);
	});

	it('Firestore rules gate tryout sessions subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/sessions\/\{sessionId\}/);
	});

	it('Field Ops mounts TryoutSessionsPanel via TryoutsProgramsPanel', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutsProgramsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/TryoutSessionsPanel/);
	});

	it('public tryouts page supports session RSVP', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/setTryoutSessionRsvp/);
	});
});

describe('LAUNCH-tryouts-c — eval plan + coach sheets', () => {
	it('exports eval plan callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertTryoutPlan/);
		expect(ops).toMatch(/exports\.submitTryoutEvaluation/);
		expect(ops).toMatch(/evaluated/);
	});

	it('Firestore rules gate tryout evaluations subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/evaluations\/\{registrationId\}/);
	});

	it('TryoutSessionsPanel saves eval plan', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/upsertTryoutPlan/);
	});

	it('Coach scouting mounts tryout eval panel', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(app)/coach/scouting/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/CoachTryoutEvalPanel/);
	});
});

describe('LAUNCH-tryouts-d — callbacks, offers, roster pipeline', () => {
	it('exports pipeline + roster callables from tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.setTryoutPipelineStatus/);
		expect(ops).toMatch(/exports\.respondTryoutOffer/);
		expect(ops).toMatch(/exports\.promoteTryoutToRoster/);
		expect(ops).toMatch(/exports\.getPublicTryoutRegistration/);
		expect(ops).toMatch(/roster_pending/);
	});

	it('TryoutSessionsPanel wires pipeline and roster promotion', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/setTryoutPipelineStatus/);
		expect(panel).toMatch(/promoteTryoutToRoster/);
		expect(panel).toMatch(/mintMagicUplink/);
	});

	it('promoteTryoutToRoster links existing household operative by name', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/linkHouseholdOperativeToTeam/);
		expect(ops).toMatch(/operativeLinked/);
	});

	it('public tryouts page supports offer response', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/respondTryoutOffer/);
	});
});

describe('LAUNCH-staff-roster-transfer — registrarTransferPlayer UI', () => {
	it('RegistrarRosterTransferPanel calls registrarTransferPlayer', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/RegistrarRosterTransferPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/registrarTransferPlayer/);
		expect(panel).toMatch(/targetTeamId/);
	});

	it('director and admin roster mount RegistrarRosterTransferPanel', () => {
		const directorSrcPath = join(ROOT, 'src/routes/(app)/director/dashboard/+page.svelte');
		const director = existsSync(directorSrcPath) ? readFileSync(directorSrcPath, 'utf-8') : '';
		const admin = readFileSync(
			join(ROOT, 'src/routes/(app)/admin/organizations/[clubId]/teams/[teamId]/roster/+page.svelte'),
			'utf-8',
		);
		expect(director).toMatch(/RegistrarRosterTransferPanel/);
		expect(admin).toMatch(/RegistrarRosterTransferPanel/);
	});

	it('functions-compliance exports registrarTransferPlayer', () => {
		const idx = readFileSync(join(ROOT, 'functions-compliance/index.js'), 'utf-8');
		expect(idx).toMatch(/registrarTransferPlayer/);
	});
});

describe('LAUNCH-tryouts-e — automated comms', () => {
	it('exports dispatchTryoutComms and mail hooks in tryoutsOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/tryoutsOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.dispatchTryoutComms/);
		expect(ops).toMatch(/registration_confirm/);
		expect(ops).toMatch(/collection\('mail'\)/);
	});

	it('Firestore rules gate tryout comms audit subcollection', () => {
		const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/comms\/\{commId\}/);
	});

	it('TryoutSessionsPanel can resend session notices', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/os/TryoutSessionsPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/dispatchTryoutComms/);
	});
});
