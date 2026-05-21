import { describe, expect, it } from 'vitest';
import {
	assertPiiAttestationDisjoint,
	PURGE_EXEMPT_COLLECTIONS,
	SENSITIVE_PII_FIELDS,
	SHREDDABLE_ROOT_COLLECTIONS,
	SHRED_SENTINEL,
	isSensitivePiiField,
} from '$lib/types/compliance.js';

describe('compliance types (Sprint 2.2)', () => {
	it('SensitivePII and ComplianceAttestation field sets are disjoint', () => {
		expect(assertPiiAttestationDisjoint()).toBe(true);
	});

	it('consents is exempt from shreddable root collections', () => {
		expect(SHREDDABLE_ROOT_COLLECTIONS).not.toContain('consents');
		expect(PURGE_EXEMPT_COLLECTIONS).toContain('consents');
	});

	it('isSensitivePiiField identifies known PII keys', () => {
		expect(isSensitivePiiField('playerName')).toBe(true);
		expect(isSensitivePiiField('consentMethod')).toBe(false);
		expect(isSensitivePiiField('childId')).toBe(false);
	});

	it('SENSITIVE_PII_FIELDS excludes consent attestation keys', () => {
		const attestationKeys = ['parentId', 'childId', 'ipAddress', 'consentDate', 'tokenRef'];
		for (const key of attestationKeys) {
			expect(SENSITIVE_PII_FIELDS as readonly string[]).not.toContain(key);
		}
	});

	it('SHRED_SENTINEL is a stable sentinel string', () => {
		expect(SHRED_SENTINEL).toBe('__SHREDDED__');
	});
});
