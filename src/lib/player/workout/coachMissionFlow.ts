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
	repairDrillEntry,
	resolveCoachIntentDisplayCadence,
	type IntentPrescription,
	type PrescriptionDrillEntry,
} from '$lib/types/intent.js';
import {
	categoryToAttributeId,
	loadTeamDrillsForIntent,
	resolveTeamDrillById,
} from '$lib/coach/teamDrillLibrary.js';
import { loadPlatformBasics } from '$lib/coach/platformDrillLibrary.js';
import { readRlPolicyCache } from './rlPolicyCache.js';

export type WorkoutFocus = 'technical' | 'physical' | 'tactical' | 'recovery';

export type MissionHandoffSource = 'coach_intent' | 'coach_homework' | 'adaptive_homework';

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
	/** When true, Train mount may auto-apply this handoff (explicit Start session / Continue). */
	armExplicit?: boolean;
	/** Coach deploy prescription (PRESCRIPTION-schema). */
	prescription?: IntentPrescription;
	/** Policy/heuristic duration+RPE hints — never override prescription volume. */
	policyHints?: MissionHandoffPolicyHints;
	/** Demo video URL from prescription — shown on Train page when present. */
	videoUrl?: string;
	/** Coaching cues from prescription — shown on Train page when present. */
	cues?: string;
	/** Per-assignment cadence from prescription — shown on Train + mission card. */
	cadence?: { sessionsPerWindow: number; windowDays: number };
	/**
	 * B3 bundle drills from prescription.drills — ordered array passed to the Train stepper.
	 * Absent when the assignment is a single-drill prescription (unchanged behaviour).
	 */
	drills?: PrescriptionDrillEntry[];
	/**
	 * B4a — coach opt-in: when true, player sees optional "Send proof to parent"
	 * affordance after logging the session. Advisory only — never gates XP.
	 */
	requiresParentVerification?: boolean;
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

/**
 * B3: Sanitize drills[] from sessionStorage JSON — each entry repaired with
 * repairDrillEntry; invalid entries silently dropped; max 8 enforced.
 * Returns undefined when array is absent, empty, or not an array.
 */
export function parseBundleDrills(raw: unknown): PrescriptionDrillEntry[] | undefined {
	if (!Array.isArray(raw) || raw.length === 0) return undefined;
	const repaired = raw
		.map(repairDrillEntry)
		.filter((e): e is PrescriptionDrillEntry => e !== undefined)
		.slice(0, 8);
	return repaired.length > 0 ? repaired : undefined;
}

export function parseCadence(
	raw: unknown,
): { sessionsPerWindow: number; windowDays: number } | undefined {
	if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	const c = raw as Record<string, unknown>;
	const spw =
		typeof c.sessionsPerWindow === 'number' && Number.isFinite(c.sessionsPerWindow)
			? Math.floor(c.sessionsPerWindow)
			: 0;
	const wd =
		typeof c.windowDays === 'number' && Number.isFinite(c.windowDays)
			? Math.floor(c.windowDays)
			: 0;
	if (spw >= 1 && spw <= 21 && wd >= 1 && wd <= 30) {
		return { sessionsPerWindow: spw, windowDays: wd };
	}
	return undefined;
}

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
	'Coach set this session — review the prescription, add notes if needed, then log.';

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

/** Only explicit stash paths (Start session, Continue, AdaptiveHomework) may auto-arm Train. */
export function shouldAutoArmHandoff(handoff: MissionHandoff | null | undefined): boolean {
	if (!handoff?.missionId?.trim()) return false;
	if (isMissionHandoffStale(handoff)) return false;
	return handoff.armExplicit === true;
}

/** Clears accept-only / legacy sessionStorage handoffs that must not auto-arm Train. */
export function clearNonExplicitMissionHandoff(): void {
	const handoff = readMissionHandoff();
	if (handoff && !shouldAutoArmHandoff(handoff)) {
		clearMissionHandoff();
	}
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
	} else if (handoff.source === 'coach_homework') {
		sessionStorage.setItem(LEGACY_ASSIGNMENT_ID_KEY, handoff.missionId);
		sessionStorage.removeItem(LEGACY_MISSION_ID_KEY);
	} else {
		sessionStorage.removeItem(LEGACY_MISSION_ID_KEY);
		sessionStorage.removeItem(LEGACY_ASSIGNMENT_ID_KEY);
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
					source:
						parsed.source === 'coach_homework' ? 'coach_homework'
						: parsed.source === 'adaptive_homework' ? 'adaptive_homework'
						: 'coach_intent',
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
					armExplicit: parsed.armExplicit === true ? true : undefined,
			prescription: repairIntentPrescription(parsed.prescription),
			policyHints: parsePolicyHints(parsed.policyHints),
			videoUrl: typeof parsed.videoUrl === 'string' && parsed.videoUrl.trim() ? parsed.videoUrl.trim() : undefined,
			cues: typeof parsed.cues === 'string' && parsed.cues.trim() ? parsed.cues.trim() : undefined,
			cadence: parseCadence(parsed.cadence),
			drills: parseBundleDrills(parsed.drills),
			// B4a: strict boolean — undefined when absent or falsy.
			requiresParentVerification: parsed.requiresParentVerification === true ? true : undefined,
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

export function resolveMissionHandoffDisplayCadence(
	handoff: MissionHandoff | null | undefined,
	requiredXp?: number | null,
): { sessionsPerWindow: number; windowDays: number } | undefined {
	if (handoff?.source === 'coach_intent') {
		const xp =
			requiredXp != null && requiredXp > 0 ? requiredXp : (handoff.requiredXp ?? 0);
		return resolveCoachIntentDisplayCadence(xp, handoff.prescription);
	}
	return handoff?.prescription?.cadence ?? handoff?.cadence;
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
	const drillId =
		input.drill?.id ??
		rx?.drillId ??
		rx?.teamDrillId ??
		rx?.clubDrillId ??
		input.missionId;
	const videoUrl = rx?.videoUrl ?? undefined;
	const cues = rx?.cues ?? undefined;
	const cadence = resolveCoachIntentDisplayCadence(input.requiredXp ?? 0, rx);
	// B3: forward repaired drills[] from prescription to handoff.
	const drills =
		Array.isArray(rx?.drills) && rx.drills.length > 0 ? rx.drills : undefined;
	// B4a: carry coach opt-in flag — advisory only, never gates XP.
	const requiresParentVerification = rx?.requiresParentVerification === true ? true : undefined;
	return {
		missionId: input.missionId,
		source: 'coach_intent',
		targetAttributeId: input.targetAttributeId,
		requiredXp: input.requiredXp,
		drillId,
		drillTitle,
		durationMinutes,
		targetRpe,
		focusArea,
		prescription: rx,
		policyHints,
		...(videoUrl ? { videoUrl } : {}),
		...(cues ? { cues } : {}),
		...(cadence ? { cadence } : {}),
		...(drills ? { drills } : {}),
		...(requiresParentVerification ? { requiresParentVerification } : {}),
	};
}

/** Build + stash coach intent handoff from HQ mission rail (ActiveBounties). */
export function stashCoachIntentHandoffForAssignment(input: {
	missionId: string;
	targetAttributeId: string;
	requiredXp?: number;
	prescription?: unknown;
	drill?: Pick<SuggestedDrill, 'id' | 'title'> | null;
	durationMinutes?: number | null;
	targetRpe?: number | null;
	policyHints?: MissionHandoffPolicyHints | null;
	armExplicit?: boolean;
}): MissionHandoff {
	const prescription = repairIntentPrescription(input.prescription);
	const policyHints = input.policyHints ?? readCachedPolicyHints();
	const handoff = buildCoachIntentHandoff({
		missionId: input.missionId,
		targetAttributeId: input.targetAttributeId,
		requiredXp: input.requiredXp,
		drill: input.drill,
		prescription,
		durationMinutes: prescription?.targetDurationMin ?? input.durationMinutes ?? null,
		targetRpe: prescription?.targetRpe ?? input.targetRpe ?? null,
		policyHints,
	});
	const payload: MissionHandoff = {
		...handoff,
		...(input.armExplicit === true ? { armExplicit: true } : {}),
	};
	stashMissionHandoff(payload);
	return payload;
}

/** RL / heuristic adaptive homework — never binds to team_assignments or coach cadence. */
export function buildAdaptiveHomeworkHandoff(input: {
	targetAttributeId: string;
	drill?: Pick<SuggestedDrill, 'id' | 'title'> | null;
	policyHints?: MissionHandoffPolicyHints | null;
}): MissionHandoff {
	const targetAttributeId = input.targetAttributeId.trim();
	const focusArea = attributeIdToWorkoutFocus(targetAttributeId);
	const policyHints = input.policyHints ?? undefined;
	const durationMinutes =
		policyHints?.recommendedDurationMinutes != null && policyHints.recommendedDurationMinutes > 0
			? Math.max(1, Math.floor(policyHints.recommendedDurationMinutes))
			: undefined;
	const targetRpe =
		policyHints?.recommendedTargetRpe != null && policyHints.recommendedTargetRpe > 0
			? Math.max(1, Math.min(10, Math.floor(policyHints.recommendedTargetRpe)))
			: undefined;
	const drillId = input.drill?.id ?? `adaptive-${targetAttributeId}`;
	const drillTitle = input.drill?.title;
	return {
		missionId: `adaptive-homework-${targetAttributeId}`,
		source: 'adaptive_homework',
		targetAttributeId,
		drillId,
		drillTitle,
		durationMinutes,
		targetRpe,
		focusArea,
		policyHints,
	};
}

/** Stash adaptive HQ suggestion for explicit Train arm (no coach intentId / cadence). */
export function stashAdaptiveHomeworkHandoff(input: {
	targetAttributeId: string;
	drill?: Pick<SuggestedDrill, 'id' | 'title'> | null;
	policyHints?: MissionHandoffPolicyHints | null;
}): MissionHandoff {
	const handoff = buildAdaptiveHomeworkHandoff(input);
	const payload: MissionHandoff = { ...handoff, armExplicit: true };
	stashMissionHandoff(payload);
	return payload;
}

/** Pick the RPG attribute with the lowest xpByAttribute total (solo adaptive focus). */
export function pickWeakestAttributeId(
	xpByAttribute: Record<string, number> | undefined,
	attributeIds: string[],
	fallback = 'ball_mastery',
): string {
	if (!attributeIds.length) return fallback;
	let weakest = attributeIds[0];
	let minXp = Infinity;
	for (const id of attributeIds) {
		const xp = Math.max(0, Math.floor(Number(xpByAttribute?.[id]) || 0));
		if (xp < minXp) {
			minXp = xp;
			weakest = id;
		}
	}
	return weakest;
}

/** Stash sessionStorage handoff when player explicitly starts Train for a mission-rail quest. */
export async function stashQuestTrainHandoff(
	firestore: Firestore | null,
	quest: {
		id: string;
		source: string;
		title: string;
		targetAttributeId?: string;
	},
	ctx: {
		intentRow?: Record<string, unknown>;
		homeworkRow?: Record<string, unknown>;
		drillPreview?: { id: string; title: string } | null;
		clubId?: string;
		armExplicit?: boolean;
	},
): Promise<MissionHandoff | null> {
	const armExplicit = ctx.armExplicit === true;
	if (quest.source === 'coach_intent') {
		const row = ctx.intentRow ?? {};
		const targetAttributeId =
			(typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '') ||
			(typeof quest.targetAttributeId === 'string' ? quest.targetAttributeId.trim() : '');
		const requiredXp = Math.max(0, Math.floor(Number(row.requiredXp) || 0));
		const preview = ctx.drillPreview;
		const prescription = repairIntentPrescription(row.prescription);
		const coachDrill = prescription?.drillTitle
			? {
					id:
						prescription.teamDrillId ??
						prescription.clubDrillId ??
						prescription.drillId ??
						preview?.id ??
						quest.id,
					title: prescription.drillTitle,
				}
			: preview ? { id: preview.id, title: preview.title }
			: targetAttributeId ? { id: quest.id, title: quest.title }
			: null;
		return stashCoachIntentHandoffForAssignment({
			missionId: quest.id,
			targetAttributeId,
			requiredXp,
			prescription,
			drill: coachDrill,
			policyHints: readCachedPolicyHints(),
			armExplicit,
		});
	}
	if (quest.source === 'coach_homework') {
		const row = ctx.homeworkRow ?? {};
		const drillId =
			typeof row.drillId === 'string' && row.drillId.trim() ? row.drillId.trim() : undefined;
		let drillTitle =
			typeof row.drillTitle === 'string' && row.drillTitle.trim() ?
				row.drillTitle.trim()
			: typeof row.title === 'string' && row.title.trim() ?
				row.title.trim()
			: quest.title;
		const teamId =
			typeof row.teamId === 'string' && row.teamId.trim() ? row.teamId.trim() : '';
		const clubId = typeof ctx.clubId === 'string' ? ctx.clubId.trim() : '';
		if (firestore && drillId && drillTitle === quest.title) {
			const resolved = await resolveDrillTitleById(firestore, drillId, { teamId, clubId });
			if (resolved) drillTitle = resolved;
		}
		const handoff = buildCoachHomeworkHandoff({
			missionId: quest.id,
			drillTitle,
			drillId,
			targetAttributeId:
				typeof row.targetAttributeId === 'string' ? row.targetAttributeId : undefined,
		});
		const payload: MissionHandoff = {
			...handoff,
			...(armExplicit ? { armExplicit: true } : {}),
		};
		stashMissionHandoff(payload);
		return payload;
	}
	return null;
}

/** Train Continue — stash explicit coach intent handoff from team_assignments row. */
export function stashCoachIntentHandoffFromAssignmentRow(
	row: Record<string, unknown> & { id: string },
	policyHints?: MissionHandoffPolicyHints | null,
): MissionHandoff {
	const targetAttributeId =
		typeof row.targetAttributeId === 'string' ? row.targetAttributeId.trim() : '';
	const requiredXp = Math.max(0, Math.floor(Number(row.requiredXp) || 0));
	return stashCoachIntentHandoffForAssignment({
		missionId: row.id,
		targetAttributeId,
		requiredXp,
		prescription: row.prescription,
		policyHints: policyHints ?? readCachedPolicyHints(),
		armExplicit: true,
	});
}

export function buildCoachHomeworkHandoff(input: {
	missionId: string;
	drillTitle: string;
	drillId?: string;
	targetAttributeId?: string;
	durationMinutes?: number | null;
	targetRpe?: number | null;
}): MissionHandoff {
	const focusArea = attributeIdToWorkoutFocus(input.targetAttributeId ?? 'technical');
	return {
		missionId: input.missionId,
		source: 'coach_homework',
		targetAttributeId: input.targetAttributeId,
		drillId: input.drillId ?? input.missionId,
		drillTitle: input.drillTitle,
		durationMinutes: input.durationMinutes ?? 30,
		targetRpe: input.targetRpe ?? 5,
		focusArea,
	};
}

async function resolveDrillTitleById(
	firestore: Firestore,
	drillId: string,
	opts: { teamId?: string; clubId?: string },
): Promise<string | null> {
	const id = drillId.trim();
	if (!id) return null;
	const teamId = String(opts.teamId || '').trim();
	const clubId = String(opts.clubId || '').trim();
	if (teamId) {
		const teamRow = await resolveTeamDrillById(firestore, teamId, id, clubId || undefined);
		if (teamRow?.title) return teamRow.title;
	}
	try {
		const platformSnap = await getDoc(doc(firestore, 'drills', id));
		if (platformSnap.exists()) {
			const data = platformSnap.data();
			if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
		}
	} catch {
		/* fall through */
	}
	const globalDrill = await resolveDrillById(firestore, id);
	return globalDrill?.title ?? null;
}

export type AdaptiveDrillResolveInput = {
	teamId?: string;
	clubId?: string;
	targetAttributeId: string;
	prescription?: IntentPrescription | null;
	recentFrustration?: string;
	sportId?: string;
	recommendedDrillId?: string | null;
};

/** Resolve drill title/id across team → club → platform → global (club-first cascade). */
export async function resolveAdaptiveDrill(
	firestore: Firestore,
	input: AdaptiveDrillResolveInput,
): Promise<SuggestedDrill | null> {
	const attr = String(input.targetAttributeId || '').trim();
	if (!attr) return null;
	const teamId = String(input.teamId || '').trim();
	const clubId = String(input.clubId || '').trim();
	const sportId = (input.sportId || 'soccer').trim();
	const frustration = input.recentFrustration === 'high' ? 'high' : 'low';
	const rx = input.prescription ? repairIntentPrescription(input.prescription) : undefined;

	const rxDrillId = rx?.teamDrillId ?? rx?.clubDrillId;
	if (rxDrillId && teamId) {
		const row = await resolveTeamDrillById(firestore, teamId, rxDrillId, clubId || undefined);
		if (row) {
			return {
				id: row.id,
				title: row.title,
				attributeId: row.attributeId || attr,
			};
		}
	}
	if (rx?.drillId) {
		const byId = await resolveDrillByIdAcrossLibraries(firestore, rx.drillId, {
			teamId,
			clubId,
			sportId,
		});
		if (byId) return byId;
	}
	if (input.recommendedDrillId) {
		const byPolicy = await resolveDrillByIdAcrossLibraries(firestore, input.recommendedDrillId, {
			teamId,
			clubId,
			sportId,
		});
		if (byPolicy) return byPolicy;
	}
	if (teamId) {
		const teamRows = await loadTeamDrillsForIntent(firestore, teamId, {
			attributeId: attr,
			clubId: clubId || undefined,
		});
		if (teamRows.length) {
			const pick = teamRows[0];
			return { id: pick.id, title: pick.title, attributeId: pick.attributeId };
		}
	}
	try {
		const platform = await loadPlatformBasics(firestore, sportId);
		const match = platform.filter((p) => categoryToAttributeId(p.category) === attr);
		if (match.length) {
			return { id: match[0].id, title: match[0].title, attributeId: attr };
		}
	} catch {
		/* platform optional */
	}
	return resolveHeuristicDrill(firestore, attr, frustration);
}

async function resolveDrillByIdAcrossLibraries(
	firestore: Firestore,
	drillId: string,
	opts: { teamId?: string; clubId?: string; sportId?: string },
): Promise<SuggestedDrill | null> {
	const id = String(drillId || '').trim();
	if (!id) return null;
	const teamId = String(opts.teamId || '').trim();
	const clubId = String(opts.clubId || '').trim();
	if (teamId) {
		const teamRow = await resolveTeamDrillById(firestore, teamId, id, clubId || undefined);
		if (teamRow) {
			return { id: teamRow.id, title: teamRow.title, attributeId: teamRow.attributeId };
		}
	}
	try {
		const platformSnap = await getDoc(doc(firestore, 'drills', id));
		if (platformSnap.exists()) {
			const data = platformSnap.data();
			return {
				id: platformSnap.id,
				title: typeof data.title === 'string' ? data.title : 'Suggested drill',
				attributeId:
					typeof data.attributeId === 'string' ?
						data.attributeId
					: categoryToAttributeId(typeof data.category === 'string' ? data.category : ''),
			};
		}
	} catch {
		/* fall through */
	}
	return resolveDrillById(firestore, id);
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
