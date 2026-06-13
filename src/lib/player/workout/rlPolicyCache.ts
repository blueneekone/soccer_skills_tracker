/**
 * Client cache for getAdaptiveWorkoutPolicy — shared by HQ AdaptiveHomework and Train.
 * TTL ~24h so transitionRecorder can match workout_logs without duplicate callable spam.
 */

import type {
	ExplanationCode,
	GetAdaptiveWorkoutPolicyResult,
	PolicyMode,
} from '$lib/types/rlPolicy.js';

export const RL_POLICY_CACHE_KEY = 'player_rl_policy_cache_v1';
export const RL_POLICY_CACHE_TTL_MS = 86_400_000;

export type RlPolicyCacheEntry = {
	sportId: string;
	fetchedAt: number;
	result: GetAdaptiveWorkoutPolicyResult;
};

const inflightBySport = new Map<string, Promise<GetAdaptiveWorkoutPolicyResult | null>>();

const EXPLANATION_CODES = new Set<ExplanationCode>([
	'RESTING',
	'BUILDING',
	'PEAK',
	'RECOVERY_FORCED',
	'COACH_PRIORITY',
	'EXPLORATION',
]);

function parsePolicyMode(value: unknown): PolicyMode | null {
	return value === 'policy' || value === 'heuristic' ? value : null;
}

function parseExplanationCode(value: unknown): ExplanationCode | null {
	return typeof value === 'string' && EXPLANATION_CODES.has(value as ExplanationCode) ?
			(value as ExplanationCode)
		:	null;
}

export function normalizePolicyResult(raw: unknown): GetAdaptiveWorkoutPolicyResult | null {
	if (!raw || typeof raw !== 'object') return null;
	const p = raw as Record<string, unknown>;
	const mode = parsePolicyMode(p.mode);
	if (!mode) return null;
	return {
		mode,
		recommendedDrillId:
			typeof p.recommendedDrillId === 'string' ? p.recommendedDrillId : null,
		recommendedDurationMinutes:
			p.recommendedDurationMinutes == null || Number.isFinite(Number(p.recommendedDurationMinutes)) ?
				p.recommendedDurationMinutes == null ?
					null
				:	Math.max(0, Math.floor(Number(p.recommendedDurationMinutes)))
			:	null,
		recommendedTargetRpe:
			p.recommendedTargetRpe == null || Number.isFinite(Number(p.recommendedTargetRpe)) ?
				p.recommendedTargetRpe == null ?
					null
				:	Math.max(1, Math.min(10, Math.floor(Number(p.recommendedTargetRpe))))
			:	null,
		policyVersion:
			p.policyVersion == null || Number.isFinite(Number(p.policyVersion)) ?
				p.policyVersion == null ?
					null
				:	Math.floor(Number(p.policyVersion))
			:	null,
		explorationFlag: p.explorationFlag === true,
		explanationCode: parseExplanationCode(p.explanationCode),
		explanationText:
			typeof p.explanationText === 'string' ? p.explanationText : null,
	};
}

function parseCacheEntry(raw: string): RlPolicyCacheEntry | null {
	try {
		const parsed = JSON.parse(raw) as Partial<RlPolicyCacheEntry>;
		if (typeof parsed.sportId !== 'string' || !parsed.sportId.trim()) return null;
		if (!Number.isFinite(Number(parsed.fetchedAt))) return null;
		const result = normalizePolicyResult(parsed.result);
		if (!result) return null;
		return {
			sportId: parsed.sportId.trim(),
			fetchedAt: Math.floor(Number(parsed.fetchedAt)),
			result,
		};
	} catch {
		return null;
	}
}

export function isRlPolicyCacheFresh(
	entry: RlPolicyCacheEntry | null,
	sportId?: string,
	now = Date.now(),
): boolean {
	if (!entry) return false;
	if (now - entry.fetchedAt > RL_POLICY_CACHE_TTL_MS) return false;
	if (sportId && entry.sportId !== sportId) return false;
	return true;
}

/** Read cached policy when fresh. Omit sportId to accept any sport (ActiveBounties handoff). */
export function readRlPolicyCache(sportId?: string): GetAdaptiveWorkoutPolicyResult | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(RL_POLICY_CACHE_KEY);
	if (!raw) return null;
	const entry = parseCacheEntry(raw);
	if (!isRlPolicyCacheFresh(entry, sportId)) return null;
	return entry!.result;
}

export function writeRlPolicyCache(
	sportId: string,
	result: GetAdaptiveWorkoutPolicyResult,
	fetchedAt = Date.now(),
): void {
	if (typeof sessionStorage === 'undefined') return;
	const entry: RlPolicyCacheEntry = {
		sportId: sportId.trim() || 'soccer',
		fetchedAt: Math.floor(fetchedAt),
		result,
	};
	sessionStorage.setItem(RL_POLICY_CACHE_KEY, JSON.stringify(entry));
}

/**
 * Return cached policy or invoke fetchPolicy once per sport (deduped in-flight).
 * Silent null on fetch/parse failure — callers fall back to heuristic UX.
 */
export async function ensureRlPolicyCached(input: {
	sportId: string;
	fetchPolicy: (sportId: string) => Promise<unknown>;
	force?: boolean;
}): Promise<GetAdaptiveWorkoutPolicyResult | null> {
	const sportId = input.sportId.trim() || 'soccer';
	if (!input.force) {
		const cached = readRlPolicyCache(sportId);
		if (cached) return cached;
	}

	const inflight = inflightBySport.get(sportId);
	if (inflight) return inflight;

	const promise = (async () => {
		try {
			const raw = await input.fetchPolicy(sportId);
			const result = normalizePolicyResult(raw);
			if (result) writeRlPolicyCache(sportId, result);
			return result;
		} catch {
			return null;
		} finally {
			inflightBySport.delete(sportId);
		}
	})();

	inflightBySport.set(sportId, promise);
	return promise;
}
