/**
 * CHECKR-PANOPTICON-COPY — Checkr dashboard URL + clearance sub-label helpers
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	getCheckrDashboardBaseUrl,
	getCheckrCandidateDashboardUrl,
	getClearanceStatusSubLabel,
	clearanceStatusSubLabelTitle,
	coachClearanceStepLabel,
	formatClearanceSource,
	deriveCoachClearanceStep,
} from '../checkrCoachClearance.js';

describe('checkrCoachClearance — dashboard URLs', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('defaults to production dashboard', () => {
		vi.stubEnv('VITE_CHECKR_ENV', '');
		expect(getCheckrDashboardBaseUrl()).toBe('https://dashboard.checkr.com');
	});

	it('uses staging dashboard when VITE_CHECKR_ENV=staging', () => {
		vi.stubEnv('VITE_CHECKR_ENV', 'staging');
		expect(getCheckrDashboardBaseUrl()).toBe('https://dashboard.checkr-staging.com');
	});

	it('builds candidate deep links from env base', () => {
		vi.stubEnv('VITE_CHECKR_ENV', 'staging');
		expect(getCheckrCandidateDashboardUrl('abc-123')).toBe(
			'https://dashboard.checkr-staging.com/candidates/abc-123',
		);
	});
});

describe('checkrCoachClearance — clearance status sub-label', () => {
	it('prefers checkrCandidateId over invitationId and ankoredId', () => {
		expect(
			getClearanceStatusSubLabel({
				status: 'pending',
				checkrCandidateId: 'cand_1',
				invitationId: 'inv_1',
				ankoredId: 'ANKORED-OLD',
			}),
		).toEqual({ kind: 'checkrCandidateId', value: 'cand_1' });
	});

	it('falls back to invitationId when no candidate id', () => {
		expect(
			getClearanceStatusSubLabel({
				status: 'pending',
				invitationId: 'inv_2',
				ankoredId: 'ANKORED-OLD',
			}),
		).toEqual({ kind: 'invitationId', value: 'inv_2' });
	});

	it('shows legacyRecordId with legacy flag only when no Checkr ids', () => {
		expect(
			getClearanceStatusSubLabel({
				status: 'cleared',
				ankoredId: 'LEGACY-SIM',
			}),
		).toEqual({ kind: 'legacyRecordId', value: 'LEGACY-SIM', legacy: true });
	});

	it('clearanceStatusSubLabelTitle avoids vendor names for legacy records', () => {
		expect(clearanceStatusSubLabelTitle('legacyRecordId')).toBe('Legacy screening record ID');
		expect(clearanceStatusSubLabelTitle('checkrCandidateId')).toBe('Checkr candidate ID');
	});
});

describe('checkrCoachClearance — native status labels', () => {
	it('maps clearance steps to human-readable labels', () => {
		expect(coachClearanceStepLabel('not_started')).toBe('Not started');
		expect(coachClearanceStepLabel('invited')).toBe('Invitation sent');
		expect(coachClearanceStepLabel('cleared')).toBe('Cleared');
	});

	it('formats qa_simulate and checkr sources', () => {
		expect(formatClearanceSource('qa_simulate')).toBe('QA simulation');
		expect(formatClearanceSource('checkr')).toBe('Checkr');
	});

	it('derives invited step from invitationUrl without SDK', () => {
		expect(
			deriveCoachClearanceStep({
				status: 'pending',
				invitationUrl: 'https://apply.checkr.com/inv/abc',
			}),
		).toBe('invited');
	});
});
