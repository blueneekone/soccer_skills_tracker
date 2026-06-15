import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	DEFAULT_ELIGIBILITY_MATRIX,
	evaluateClubEligibility,
	normalizeEligibilityMatrix,
	blockerLabel,
} from '$lib/director/evaluateClubEligibility.js';
import {
	countActiveEligibilityGates,
	describeEligibilityMatrixValidation,
	formatEligibilityCallableError,
} from '$lib/director/eligibilityMatrixUi.js';

const ROOT = join(process.cwd());
const PANEL_SRC = readFileSync(
	join(ROOT, 'src/lib/components/director/ClubEligibilityMatrixPanel.svelte'),
	'utf-8',
);

describe('LAUNCH-eligibility-matrix — org-configurable requirements', () => {
	it('exports eligibility callables from eligibilityOps', () => {
		const ops = readFileSync(join(ROOT, 'functions/src/domains/eligibilityOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertClubEligibilityMatrix/);
		expect(ops).toMatch(/exports\.getClubEligibilityMatrix/);
		expect(ops).toMatch(/eligibilityMatrix/);
	});

	it('functions-core wires eligibility matrix callables', () => {
		const idx = readFileSync(join(ROOT, 'functions-core/index.js'), 'utf-8');
		expect(idx).toMatch(/upsertClubEligibilityMatrix/);
		expect(idx).toMatch(/getClubEligibilityMatrix/);
	});

	it('ComplianceTab mounts ClubEligibilityMatrixPanel', () => {
		const tab = readFileSync(
			join(ROOT, 'src/lib/components/director/ComplianceTab.svelte'),
			'utf-8',
		);
		expect(tab).toMatch(/ClubEligibilityMatrixPanel/);
		expect(tab).toMatch(/Eligible/);
	});

	it('loadComplianceRows evaluates against club matrix', () => {
		const loader = readFileSync(join(ROOT, 'src/lib/registrar/loadComplianceRows.js'), 'utf-8');
		expect(loader).toMatch(/evaluateClubEligibility/);
		expect(loader).toMatch(/eligible/);
	});

	it('evaluateClubEligibility applies configurable gates', () => {
		const matrix = normalizeEligibilityMatrix({
			requireWaiver: true,
			requirePassportVerified: false,
			requireVpcForMinors: false,
			requireGuardianLinked: true,
			requireSafeSportClearance: false,
		});
		const blocked = evaluateClubEligibility(
			{
				hasSignedWaiver: false,
				passportKind: 'ok',
				guardianLinked: false,
				clearanceStatus: 'CLEARED',
			},
			matrix,
		);
		expect(blocked.eligible).toBe(false);
		expect(blocked.blockers).toContain('waiver_missing');
		expect(blocked.blockers).toContain('guardian_not_linked');

		const clear = evaluateClubEligibility(
			{
				hasSignedWaiver: true,
				passportKind: 'muted',
				guardianLinked: true,
				clearanceStatus: 'CLEARED',
			},
			matrix,
		);
		expect(clear.eligible).toBe(true);
		expect(blockerLabel('vpc_not_verified')).toMatch(/VPC/i);
		expect(DEFAULT_ELIGIBILITY_MATRIX.requireWaiver).toBe(true);
	});
});

describe('B-04 — ClubEligibilityMatrixPanel UX edge cases', () => {
	it('shows empty state when no club is selected', () => {
		expect(PANEL_SRC).toMatch(/Select a club to configure eligibility requirements/);
		expect(PANEL_SRC).toMatch(/\{#if !hasClub\}/);
	});

	it('formats callable save/load errors for directors', () => {
		expect(PANEL_SRC).toContain('formatEligibilityCallableError');
		expect(
			formatEligibilityCallableError(
				{ code: 'functions/permission-denied', message: 'Matrix must belong to your club.' },
				'fallback',
			),
		).toBe('Matrix must belong to your club.');
		expect(formatEligibilityCallableError(new Error('network'), 'Could not save.')).toBe('network');
		expect(formatEligibilityCallableError(null, 'Could not save.')).toBe('Could not save.');
	});

	it('surfaces matrix validation feedback (active gate count + zero-gate warning)', () => {
		expect(PANEL_SRC).toContain('describeEligibilityMatrixValidation');
		expect(PANEL_SRC).toMatch(/em-panel__validation/);
		expect(PANEL_SRC).toMatch(/role=\{validation\.level === 'warn' \? 'alert' : 'status'\}/);

		const allOff = normalizeEligibilityMatrix({
			requireWaiver: false,
			requirePassportVerified: false,
			requireVpcForMinors: false,
			requireGuardianLinked: false,
			requireSafeSportClearance: false,
		});
		expect(countActiveEligibilityGates(allOff)).toBe(0);
		expect(describeEligibilityMatrixValidation(allOff)).toMatchObject({
			level: 'warn',
			activeCount: 0,
		});

		const partial = normalizeEligibilityMatrix({
			requireWaiver: true,
			requirePassportVerified: false,
			requireVpcForMinors: true,
			requireGuardianLinked: false,
			requireSafeSportClearance: false,
		});
		expect(describeEligibilityMatrixValidation(partial)).toMatchObject({
			level: 'ok',
			activeCount: 2,
			message: '2 of 5 gates active.',
		});
	});

	it('does not regress upsertClubEligibilityMatrix wiring', () => {
		expect(PANEL_SRC).toMatch(/upsertClubEligibilityMatrix/);
		const ops = readFileSync(join(ROOT, 'functions/src/domains/eligibilityOps.js'), 'utf-8');
		expect(ops).toMatch(/exports\.upsertClubEligibilityMatrix/);
	});
});
