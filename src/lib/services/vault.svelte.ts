/**
 * vault.svelte.ts — Sprint 2.2 client encryption gateway.
 *
 * Routes SensitivePII fields through server-side vaultSealPii / vaultUnsealPii
 * callables. Plaintext PII must never be written directly to Firestore.
 */

import { browser } from '$app/environment';
import { functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import {
	isSensitivePiiField,
	type SensitivePII,
	type SensitivePiiField,
	type VaultEnvelope,
} from '$lib/types/compliance.js';

type SealPayload = {
	ownerEmailKey: string;
	clubId?: string;
	fields: Record<string, string>;
};

type SealResult = {
	vaultRefs: Partial<Record<SensitivePiiField, VaultEnvelope>>;
	sealId: string;
};

type UnsealPayload = {
	vaultRefs: Array<string | { vaultRef: string; field?: string }>;
};

type UnsealResult = {
	values: Record<string, string | null>;
};

const vaultSealPiiFn = httpsCallable<SealPayload, SealResult>(functions, 'vaultSealPii');
const vaultUnsealPiiFn = httpsCallable<UnsealPayload, UnsealResult>(functions, 'vaultUnsealPii');

/**
 * Seal sensitive fields server-side and return VaultEnvelope refs for Firestore merge.
 */
export async function vaultWrite(
	ownerEmailKey: string,
	fields: Partial<Record<SensitivePiiField, string>>,
	opts: { clubId?: string } = {},
): Promise<Partial<Record<SensitivePiiField, VaultEnvelope>>> {
	if (!browser) return {};

	const sealFields: Record<string, string> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (!isSensitivePiiField(key) || value == null || String(value).trim() === '') continue;
		sealFields[key] = String(value);
	}
	if (Object.keys(sealFields).length === 0) return {};

	const result = await vaultSealPiiFn({
		ownerEmailKey: ownerEmailKey.toLowerCase().trim(),
		clubId: opts.clubId,
		fields: sealFields,
	});

	return result.data?.vaultRefs ?? {};
}

/**
 * Unseal vault envelopes for authorized session reads (cached per session by caller).
 */
export async function vaultRead(
	envelopes: Array<VaultEnvelope | null | undefined>,
): Promise<Record<string, string | null>> {
	if (!browser || envelopes.length === 0) return {};

	const vaultRefs = envelopes
		.filter((e): e is VaultEnvelope => !!e?.vaultRef)
		.map((e) => e.vaultRef);

	if (vaultRefs.length === 0) return {};

	const result = await vaultUnsealPiiFn({ vaultRefs });
	return result.data?.values ?? {};
}

/**
 * Strip plaintext sensitive keys from a patch — callers merge vaultWrite() refs instead.
 */
export function stripSensitivePlaintext<T extends Record<string, unknown>>(patch: T): T {
	const next = { ...patch };
	for (const key of Object.keys(next)) {
		if (isSensitivePiiField(key)) {
			delete next[key];
		}
	}
	return next;
}
