import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

	it('public tryouts page supports offer response', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/tryouts/[programId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/respondTryoutOffer/);
	});
});
