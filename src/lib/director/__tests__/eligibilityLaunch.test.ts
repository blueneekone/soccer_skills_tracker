import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	DEFAULT_ELIGIBILITY_MATRIX,
	evaluateClubEligibility,
	normalizeEligibilityMatrix,
	blockerLabel,
} from '$lib/director/evaluateClubEligibility.js';

const ROOT = join(process.cwd());

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
