/**
 * Coach intent → Train handoff: drill resolution, focus mapping, session storage.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	where,
	type Firestore,
} from 'firebase/firestore';
import {
	repairIntentPrescription,
	type IntentPrescription,
} from '$lib/types/intent.js';
import { readRlPolicyCache } from './rlPolicyCache.js';

export type WorkoutFocus = 'technical' | 'physical' | 'tactical' | 'recovery';

export type MissionHandoffSource = 'coach_intent' | 'coach_homework';

/** RL / heuristic hints from getAdaptiveWorkoutPolicy — duration/RPE only on Train. */
export type MissionHandoffPolicyHints = {
	recommendedDrillId?: string;
	recommendedDurationMinutes?: number | null;
	recommendedTargetRpe?: number | null;
	mode?: 'policy' | 'heuristic';
};

export type MissionHandoff = {
	missionId: string;
	source: MissionHandoffSource;
	targetAttributeId?: string;
	requiredXp?: number;
	drillId?: string;
	drillTitle?: string;
	durationMinutes?: number;
	targetRpe?: number;
	focusArea?: WorkoutFocus;
	/** UTC ms when HQ stashed this handoff (for stale guard). */
	stashedAt?: number;
	/** Coach deploy prescription (PRESCRIPTION-schema). */
	prescription?: IntentPrescription;
	/** Policy/heuristic duration+RPE hints — never override prescription volume. */
	policyHints?: MissionHandoffPolicyHints;
};

/** Handoffs older than this are cleared on Train mount. */
export const MISSION_HANDOFF_MAX_AGE_MS = 86_400_000;

export type SuggestedDrill = {
	id: string;
	title: string;
	attributeId: string;
	tier?: string;
	mediaType?: string;
};

export const MISSION_HANDOFF_KEY = 'player_mission_handoff_v1';
export const LEGACY_MISSION_ID_KEY = 'player_active_mission_id';
export const LEGACY_ASSIGNMENT_ID_KEY = 'player_active_assignment_id';

function parseOptionalPositiveInt(value: unknown, max?: number): number | undefined {
	if (!Number.isFinite(Number(value))) return undefined;
	const n = Math.floor(Number(value));
	if (n <= 0) return undefined;
	if (max != null) return Math.max(1, Math.min(max, n));
	return n;
}

export function parsePolicyHints(raw: unknown): MissionHandoffPolicyHints | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const p = raw as Record<string, unknown>;
	const mode = p.mode === 'policy' || p.mode === 'heuristic' ? p.mode : undefined;
	const recommendedDrillId =
		typeof p.recommendedDrillId === 'string' && p.recommendedDrillId.trim() ?
			p.recommendedDrillId.trim()
		:	undefined;
	const recommendedDurationMinutes =
		p.recommendedDurationMinutes == null ?
			undefined
		: parseOptionalPositiveInt(p.recommendedDurationMinutes) ?? null;
	const recommendedTargetRpe =
		p.recommendedTargetRpe == null ?
			undefined
		: parseOptionalPositiveInt(p.recommendedTargetRpe, 10) ?? null;
	if (
		!mode &&
		!recommendedDrillId &&
		recommendedDurationMinutes == null &&
		recommendedTargetRpe == null
	) {
		return undefined;
	}
	return {
		mode,
		recommendedDrillId,
		recommendedDurationMinutes,
		recommendedTargetRpe,
	};
}

export function buildPolicyHintsFromResult(input: {
	mode?: 'policy' | 'heuristic' | string | null;
	recommendedDrillId?: string | null;
	recommendedDurationMinutes?: number | null;
	recommendedTargetRpe?: number | null;
} | null | undefined): MissionHandoffPolicyHints | undefined {
	if (!input) return undefined;
	return parsePolicyHints({
		mode: input.mode === 'policy' || input.mode === 'heuristic' ? input.mode : undefined,
		recommendedDrillId: input.recommendedDrillId ?? undefined,
		recommendedDurationMinutes: input.recommendedDurationMinutes ?? null,
		recommendedTargetRpe: input.recommendedTargetRpe ?? null,
	});
}

export function readCachedPolicyHints(): MissionHandoffPolicyHints | undefined {
	return buildPolicyHintsFromResult(readRlPolicyCache());
}

/** Priority: prescription.targetDurationMin → policyHints → handoff.durationMinutes → default. */
export function resolveHandoffDurationMinutes(
	handoff: MissionHandoff,
	defaultMinutes = 30,
): number {
	const rx = handoff.prescription;
	if (rx?.targetDurationMin != null && rx.targetDurationMin > 0) {
		return Math.max(1, Math.floor(rx.targetDurationMin));
	}
	const policyDur = handoff.policyHints?.recommendedDurationMinutes;
	if (policyDur != null && policyDur > 0) {
		return Math.max(1, Math.floor(policyDur));
	}
	if (handoff.durationMinutes != null && handoff.durationMinutes > 0) {
		return handoff.durationMinutes;
	}
	return defaultMinutes;
}

/** Priority: prescription.targetRpe → policyHints → handoff.targetRpe → default. */
export function resolveHandoffTargetRpe(handoff: MissionHandoff, defaultRpe = 5): number {
	const rx = handoff.prescription;
	if (rx?.targetRpe != null && rx.targetRpe > 0) {
		return Math.max(1, Math.min(10, Math.floor(rx.targetRpe)));
	}
	const policyRpe = handoff.policyHints?.recommendedTargetRpe;
	if (policyRpe != null && policyRpe > 0) {
		return Math.max(1, Math.min(10, Math.floor(policyRpe)));
	}
	if (handoff.targetRpe != null && handoff.targetRpe > 0) {
		return handoff.targetRpe;
	}
	return defaultRpe;
}

export const COACH_INTENT_HINT =
	'Coach sets the goal — we suggest a drill from team focus.';

const ATTRIBUTE_FOCUS: Record<string, WorkoutFocus> = {
	ball_mastery: 'technical',
	dribbling: 'technical',
	first_touch: 'technical',
	technical: 'technical',
	striking: 'technical',
	pace: 'physical',
	physical: 'physical',
	strength: 'physical',
	grit: 'physical',
	stamina: 'physical',
	scanning: 'tactical',
	tactical: 'tactical',
	vision: 'tactical',
	recovery: 'recovery',
};

export function attributeIdToWorkoutFocus(attributeId: string): WorkoutFocus {
	const key = String(attributeId || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '');
	return ATTRIBUTE_FOCUS[key] ?? 'technical';
}

export function formatSuggestedDrillLine(
	drillTitle: string,
	opts: { durationMinutes?: number | null; targetRpe?: number | null } = {},
): string {
	const duration =
		opts.durationMinutes != null && opts.durationMinutes > 0 ?
			`${opts.durationMinutes} min`
		:	'~30 min';
	const rpe =
		opts.targetRpe != null && opts.targetRpe > 0 ? ` · RPE ${opts.targetRpe}` : '';
	return `Suggested: ${drillTitle} · ${duration}${rpe}`;
}

export function isMissionHandoffStale(handoff: MissionHandoff): boolean {
	const stashedAt = Number(handoff.stashedAt);
	if (!Number.isFinite(stashedAt) || stashedAt <= 0) return false;
	return Date.now() - stashedAt > MISSION_HANDOFF_MAX_AGE_MS;
}

export function stashMissionHandoff(handoff: MissionHandoff): void {
	if (typeof sessionStorage === 'undefined') return;
	const payload: MissionHandoff = {
		...handoff,
		stashedAt: handoff.stashedAt ?? Date.now(),
	};
	sessionStorage.setItem(MISSION_HANDOFF_KEY, JSON.stringify(payload));
	if (handoff.source === 'coach_intent') {
		sessionStorage.setItem(LEGACY_MISSION_ID_KEY, handoff.missionId);
		sessionStorage.removeItem(LEGACY_ASSIGNMENT_ID_KEY);
	} else {
		sessionStorage.setItem(LEGACY_ASSIGNMENT_ID_KEY, handoff.missionId);
		sessionStorage.removeItem(LEGACY_MISSION_ID_KEY);
	}
}

export function readMissionHandoff(): MissionHandoff | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(MISSION_HANDOFF_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<MissionHandoff>;
			if (typeof parsed.missionId === 'string' && parsed.missionId.trim()) {
				return {
					missionId: parsed.missionId.trim(),
					source: parsed.source === 'coach_homework' ? 'coach_homework' : 'coach_intent',
					targetAttributeId:
						typeof parsed.targetAttributeId === 'string' ?
							parsed.targetAttributeId
						:	undefined,
					requiredXp:
						Number.isFinite(Number(parsed.requiredXp)) ?
							Math.max(0, Math.floor(Number(parsed.requiredXp)))
						:	undefined,
					drillId: typeof parsed.drillId === 'string' ? parsed.drillId : undefined,
					drillTitle:
						typeof parsed.drillTitle === 'string' ? parsed.drillTitle : undefined,
					durationMinutes:
						Number.isFinite(Number(parsed.durationMinutes)) ?
							Math.max(1, Math.floor(Number(parsed.durationMinutes)))
						:	undefined,
					targetRpe:
						Number.isFinite(Number(parsed.targetRpe)) ?
							Math.max(1, Math.min(10, Math.floor(Number(parsed.targetRpe))))
						:	undefined,
					focusArea:
						parsed.focusArea === 'physical' ||
						parsed.focusArea === 'tactical' ||
						parsed.focusArea === 'recovery' ||
						parsed.focusArea === 'technical' ?
							parsed.focusArea
						:	undefined,
					stashedAt:
						Number.isFinite(Number(parsed.stashedAt)) ?
							Math.floor(Number(parsed.stashedAt))
						:	undefined,
					prescription: repairIntentPrescription(parsed.prescription),
					policyHints: parsePolicyHints(parsed.policyHints),
				};
			}
		}
	} catch {
		/* fall through to legacy keys */
	}
	const legacyMissionId = sessionStorage.getItem(LEGACY_MISSION_ID_KEY);
	if (legacyMissionId?.trim()) {
		return { missionId: legacyMissionId.trim(), source: 'coach_intent' };
	}
	const legacyAssignmentId = sessionStorage.getItem(LEGACY_ASSIGNMENT_ID_KEY);
	if (legacyAssignmentId?.trim()) {
		return { missionId: legacyAssignmentId.trim(), source: 'coach_homework' };
	}
	return null;
}

export function clearMissionHandoff(): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(MISSION_HANDOFF_KEY);
	sessionStorage.removeItem(LEGACY_MISSION_ID_KEY);
	sessionStorage.removeItem(LEGACY_ASSIGNMENT_ID_KEY);
}

export function buildCoachIntentHandoff(input: {
	missionId: string;
	targetAttributeId: string;
	requiredXp?: number;
	drill?: Pick<SuggestedDrill, 'id' | 'title'> | null;
	durationMinutes?: number | null;
	targetRpe?: number | null;
	prescription?: IntentPrescription | null;
	policyHints?: MissionHandoffPolicyHints | null;
}): MissionHandoff {
	const focusArea = attributeIdToWorkoutFocus(input.targetAttributeId);
	const rx = input.prescription ? repairIntentPrescription(input.prescription) : undefined;
	const policyHints = input.policyHints ?? undefined;
	const durationMinutes =
		rx?.targetDurationMin != null && rx.targetDurationMin > 0 ?
			rx.targetDurationMin
		: input.durationMinutes != null && input.durationMinutes > 0 ?
			Math.max(1, Math.floor(input.durationMinutes))
		:	undefined;
	const targetRpe =
		rx?.targetRpe != null && rx.targetRpe > 0 ?
			Math.max(1, Math.min(10, Math.floor(rx.targetRpe)))
		: input.targetRpe != null && input.targetRpe > 0 ?
			Math.max(1, Math.min(10, Math.floor(input.targetRpe)))
		:	undefined;
	const drillTitle =
		input.drill?.title ?? rx?.drillTitle ?? undefined;
	return {
		missionId: input.missionId,
		source: 'coach_intent',
		targetAttributeId: input.targetAttributeId,
		requiredXp: input.requiredXp,
		drillId: input.drill?.id,
		drillTitle,
		durationMinutes,
		targetRpe,
		focusArea,
		prescription: rx,
		policyHints,
	};
}

/** Build + stash coach intent handoff from HQ surfaces (ActiveBounties, AdaptiveHomework). */
export function stashCoachIntentHandoffForAssignment(input: {
	missionId: string;
	targetAttributeId: string;
	requiredXp?: number;
	prescription?: unknown;
	drill?: Pick<SuggestedDrill, 'id' | 'title'> | null;
	durationMinutes?: number | null;
	targetRpe?: number | null;
	policyHints?: MissionHandoffPolicyHints | null;
}): void {
	const prescription = repairIntentPrescription(input.prescription);
	const policyHints = input.policyHints ?? readCachedPolicyHints();
	stashMissionHandoff(
		buildCoachIntentHandoff({
			missionId: input.missionId,
			targetAttributeId: input.targetAttributeId,
			requiredXp: input.requiredXp,
			drill: input.drill,
			prescription,
			durationMinutes: prescription?.targetDurationMin ?? input.durationMinutes ?? null,
			targetRpe: prescription?.targetRpe ?? input.targetRpe ?? null,
			policyHints,
		}),
	);
}

export function buildCoachHomeworkHandoff(input: {
	missionId: string;
	drillTitle: string;
	targetAttributeId?: string;
	durationMinutes?: number | null;
	targetRpe?: number | null;
}): MissionHandoff {
	const focusArea = attributeIdToWorkoutFocus(input.targetAttributeId ?? 'technical');
	return {
		missionId: input.missionId,
		source: 'coach_homework',
		targetAttributeId: input.targetAttributeId,
		drillTitle: input.drillTitle,
		durationMinutes: input.durationMinutes ?? 30,
		targetRpe: input.targetRpe ?? 5,
		focusArea,
	};
}

export async function resolveHeuristicDrill(
	firestore: Firestore,
	targetAttributeId: string,
	recentFrustration = 'low',
): Promise<SuggestedDrill | null> {
	const attr = String(targetAttributeId || '').trim();
	if (!attr) return null;
	try {
		const constraints = [where('attributeId', '==', attr)];
		if (recentFrustration === 'high') {
			constraints.push(where('tier', '==', 'beginner'));
		}
		const snap = await getDocs(query(collection(firestore, 'global_drills'), ...constraints));
		const drills = snap.docs.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				title: typeof data.title === 'string' ? data.title : 'Suggested drill',
				attributeId: typeof data.attributeId === 'string' ? data.attributeId : attr,
				tier: typeof data.tier === 'string' ? data.tier : undefined,
				mediaType: typeof data.mediaType === 'string' ? data.mediaType : undefined,
			} satisfies SuggestedDrill;
		});
		drills.sort((a, b) => {
			if (a.mediaType === 'tactical_svg' && b.mediaType !== 'tactical_svg') return -1;
			if (b.mediaType === 'tactical_svg' && a.mediaType !== 'tactical_svg') return 1;
			return 0;
		});
		return drills[0] ?? null;
	} catch {
		return null;
	}
}

export async function resolveDrillById(
	firestore: Firestore,
	drillId: string,
): Promise<SuggestedDrill | null> {
	const id = String(drillId || '').trim();
	if (!id) return null;
	try {
		const snap = await getDoc(doc(firestore, 'global_drills', id));
		if (!snap.exists()) return null;
		const data = snap.data();
		return {
			id: snap.id,
			title: typeof data.title === 'string' ? data.title : 'Suggested drill',
			attributeId: typeof data.attributeId === 'string' ? data.attributeId : '',
			tier: typeof data.tier === 'string' ? data.tier : undefined,
			mediaType: typeof data.mediaType === 'string' ? data.mediaType : undefined,
		};
	} catch {
		return null;
	}
}
