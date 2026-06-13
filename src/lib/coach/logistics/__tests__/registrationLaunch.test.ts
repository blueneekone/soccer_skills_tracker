import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());

describe('LAUNCH-registration-lite — club registration loop', () => {
	it('exports getPublicRegistrationProgram from registrationOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/registrationOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.getPublicRegistrationProgram/);
		expect(ops).toMatch(/invoker: 'public'/);
	});

	it('functions-core wires getPublicRegistrationProgram and claimRosterSpot', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/getPublicRegistrationProgram/);
		expect(idx).toMatch(/claimRosterSpot/);
	});

	it('createRegistrationIntent accepts household playerEmail for parents', () => {
		const commerce = readFileSync(join(ROOT, 'functions/commerce.js'), 'utf-8');
		expect(commerce).toMatch(/playerEmail: rawPlayerEmail/);
		expect(commerce).toMatch(/household-linked athlete/);
	});

	it('CommerceEngine passes playerEmail to createRegistrationIntent', () => {
		const src = readFileSync(join(ROOT, 'src/lib/services/commerce.svelte.ts'), 'utf-8');
		expect(src).toMatch(/playerEmail: this\.playerEmail/);
	});

	it('director panel exposes public registration link', () => {
		const panel = readFileSync(
			join(ROOT, 'src/lib/components/director/DirectorActiveSeasonPanel.svelte'),
			'utf-8',
		);
		expect(panel).toMatch(/\/register\//);
		expect(panel).toMatch(/registrationOpen/);
	});

	it('marketing register route loads program via callable', () => {
		const page = readFileSync(
			join(ROOT, 'src/routes/(marketing)/register/[clubId]/+page.svelte'),
			'utf-8',
		);
		expect(page).toMatch(/getPublicRegistrationProgram/);
		expect(page).toMatch(/\/parent\/payments/);
	});
});
