/**
 * compliance.ts — Sprint 2.2 Data Vaulting & TTL Hard Purge
 *
 * SensitivePII fields are shreddable after 24h inactivity and must route through
 * the vault encryption gateway before Firestore writes.
 *
 * ComplianceAttestation records (consents vault) are immutable legal artifacts
 * and must NEVER be included in shredder query scope.
 */

import type { ConsentRecord } from '$lib/types/coppa.js';

/** Firestore Timestamp shape for cross-environment compatibility. */
type FirestoreTimestamp = { toDate(): Date; seconds: number; nanoseconds: number };

/** Sentinel written by shredSensitiveData when a field has been purged. */
export const SHRED_SENTINEL = '__SHREDDED__';

/**
 * Fields that must be sealed via vaultSealPii before persisting to Firestore.
 * Disjoint from ComplianceAttestation — never shred consents collection docs.
 */
export const SENSITIVE_PII_FIELDS = [
	'playerName',
	'displayName',
	'email',
	'emailLower',
	'phoneNumber',
	'phoneE164',
	'dateOfBirth',
	'parentEmail',
	'emergencyName',
	'emergencyPhone',
	'medicalNotes',
	'waiverSignerLegalName',
	'verifiedAddress',
	'linkedPlayerEmail',
	'coachNotes',
] as const;

export type SensitivePiiField = (typeof SENSITIVE_PII_FIELDS)[number];

/** Server-side envelope stored on parent docs; plaintext never touches Firestore. */
export interface VaultEnvelope {
	vaultRef: string;
	algorithm: 'AES-256-GCM';
	keyVersion: string;
	sealedAt: FirestoreTimestamp | Date;
}

/** Shreddable PII shape — each field is a vault reference or null after purge. */
export type SensitivePII = Partial<Record<SensitivePiiField, VaultEnvelope | null>>;

/** Immutable COPPA / VPC consent attestation (maps to consents/{id}). */
export type ComplianceAttestation = ConsentRecord;

/** Shredder idempotency stamp on users / passports. */
export interface ShredStatus {
	shredStatus?: 'pending' | 'complete';
	shreddedAt?: FirestoreTimestamp | Date | null;
	shredRunId?: string | null;
}

/** Unified inactivity index for TTL shredder (server-maintained). */
export interface ActivityStamp {
	lastActiveAt?: FirestoreTimestamp | Date | null;
	lastActiveSource?: 'login' | 'workout' | 'drill' | 'passport' | 'vault';
}

/** Collections the shredder may touch — consents is explicitly excluded. */
export const SHREDDABLE_ROOT_COLLECTIONS = ['users', 'passports'] as const;

/** Collections exempt from automated purge (legal retention). */
export const PURGE_EXEMPT_COLLECTIONS = ['consents'] as const;

export function isSensitivePiiField(field: string): field is SensitivePiiField {
	return (SENSITIVE_PII_FIELDS as readonly string[]).includes(field);
}

/** Compile-time guard: attestation fields must not appear in shreddable field list. */
export function assertPiiAttestationDisjoint(): true {
	const attestationKeys = [
		'parentId',
		'childId',
		'consentDate',
		'ipAddress',
		'consentMethod',
		'coppaStatus',
		'clubId',
		'tokenRef',
	] as const;
	const overlap = attestationKeys.filter((k) =>
		(SENSITIVE_PII_FIELDS as readonly string[]).includes(k),
	);
	if (overlap.length > 0) {
		throw new Error(`ComplianceAttestation keys overlap SensitivePII: ${overlap.join(', ')}`);
	}
	return true;
}
