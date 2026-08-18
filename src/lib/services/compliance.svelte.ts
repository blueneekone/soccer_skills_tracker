// 🛡️ SafeSport Compliance Mandate: Parent OS Compliance Gateway
/**
 * compliance.svelte.ts — Compliance Vault & Embargo Gateway
 * ────────────────────────────────────────────────────────
 * Provides strict 15-minute embargo gates for post-match youth metrics
 * and unauthenticated lockout checks.
 */

import { auth } from '$lib/firebase.js';
import { CarRideEngine } from '../../routes/(app)/parent/dashboard/CarRideEngine.svelte.js';

const EMBARGO_DURATION_MS = 15 * 60 * 1000; // 15 minutes post-match

/**
 * Mathematically checks if match metrics are currently within the 15-minute embargo period.
 */
export function isMatchEmbargoed(recordedAtMillis: number | null | undefined): boolean {
	if (!recordedAtMillis) return false;
	return (Date.now() - recordedAtMillis) < EMBARGO_DURATION_MS;
}

/**
 * Returns empty/unhydrated metric state if unauthenticated or currently embargoed.
 */
export function getEmbargoedMatchMetrics(
	recordedAtMillis: number | null | undefined,
	metricsData: Record<string, unknown> | null,
): Record<string, unknown> | null {
	if (!auth?.currentUser) return null;
	if (isMatchEmbargoed(recordedAtMillis)) return null;
	return metricsData;
}

export { CarRideEngine };
