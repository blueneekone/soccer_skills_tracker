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
