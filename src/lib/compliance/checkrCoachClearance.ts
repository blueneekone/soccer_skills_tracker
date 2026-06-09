/**
 * Coach self-clearance presets and Checkr embed option builders for /compliance.
 *
 * Env (Vite — dev fallback when club doc fields unset):
 * - `VITE_CHECKR_ENV` — `staging` | `production` (default production)
 * - `VITE_CHECKR_PACKAGE_SLUG` — club coach package slug from Checkr dashboard
 * - `VITE_CHECKR_WORK_STATE` — primary work state, e.g. `CA` (optional)
 * - `VITE_CHECKR_WORK_CITY` — primary work city (optional)
 *
 * Production: prefer Firestore `clubs/{clubId}` fields via `checkrClubConfig.ts`.
 */

import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
import type { ClubCheckrConfig } from './checkrClubConfig.js';

export type CheckrEmbedStyles = Record<string, Record<string, string>>;

export type CheckrInvitationSuccessResponse = {
	candidate_id?: string;
	invitation?: { id?: string };
	[key: string]: unknown;
};

export type CoachClearanceContext = {
	uid: string;
	email: string;
	getSessionTokenHeaders: () => Promise<Record<string, string>>;
	onInvitationSuccess?: (response: CheckrInvitationSuccessResponse) => void;
	onInvitationError?: (response: { errors?: Record<string, string[]> }) => void;
};

const SESSION_TOKEN_PATH = '/api/compliance/checkr/session-tokens';

/** Default off — directors order screening; coaches complete Checkr-hosted apply only. */
export const COACH_SELF_START_ENABLED = false;

export type CoachClearanceStepState =
	| 'not_started'
	| 'invited'
	| 'in_progress'
	| 'cleared'
	| 'flagged';

export function deriveCoachClearanceStep(clearance?: ClearanceDoc | null): CoachClearanceStepState {
	if (!clearance) return 'not_started';
	if (clearance.status === 'cleared') return 'cleared';
	if (clearance.status === 'flagged') return 'flagged';
	if (clearance.invitationUrl || clearance.invitationId) return 'invited';
	if (clearance.checkrCandidateId) return 'in_progress';
	return 'not_started';
}

const STEP_LABELS: Record<CoachClearanceStepState, string> = {
	not_started: 'Not started',
	invited: 'Invitation sent',
	in_progress: 'In progress',
	cleared: 'Cleared',
	flagged: 'Needs review',
};

/** Human-readable clearance step for native coach status UI. */
export function coachClearanceStepLabel(step: CoachClearanceStepState): string {
	return STEP_LABELS[step];
}

/** Human-readable clearance source for native status panel. */
export function formatClearanceSource(source?: ClearanceDoc['source'] | string | null): string | null {
	if (!source || typeof source !== 'string') return null;
	switch (source) {
		case 'checkr':
			return 'Checkr';
		case 'qa_simulate':
			return 'QA simulation';
		case 'manual_override':
			return 'Manual override';
		case 'org_vault_propagation':
			return 'Organization vault';
		case 'ankored':
			return 'Legacy record';
		default:
			return source;
	}
}

/** Format Firestore Timestamp-like values for display. */
export function formatClearanceTimestamp(ts: unknown): string | null {
	if (!ts || typeof ts !== 'object') return null;
	try {
		const t = ts as Record<string, unknown>;
		const ms =
			typeof t.toMillis === 'function'
				? (t.toMillis as () => number)()
				: typeof t.seconds === 'number'
					? t.seconds * 1000
					: null;
		if (!ms) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(ms));
	} catch {
		return null;
	}
}

export function getCheckrEnv(): 'staging' | 'production' {
	return import.meta.env.VITE_CHECKR_ENV === 'staging' ? 'staging' : 'production';
}

/** Checkr Dashboard base URL — mirrors `VITE_CHECKR_ENV` (staging vs production). */
export function getCheckrDashboardBaseUrl(): string {
	return getCheckrEnv() === 'staging'
		? 'https://dashboard.checkr-staging.com'
		: 'https://dashboard.checkr.com';
}

/** Deep link to a candidate record in the Checkr Dashboard. */
export function getCheckrCandidateDashboardUrl(candidateId: string): string {
	const id = candidateId.trim();
	return `${getCheckrDashboardBaseUrl()}/candidates/${encodeURIComponent(id)}`;
}

export type ClearanceStatusSubLabel =
	| { kind: 'checkrCandidateId'; value: string }
	| { kind: 'invitationId'; value: string }
	| { kind: 'ankoredId'; value: string; legacy: true };

/** Status sub-label for director clearance matrix — prefers Checkr ids over legacy Ankored. */
export function getClearanceStatusSubLabel(
	clearance?: Pick<ClearanceDoc, 'checkrCandidateId' | 'invitationId' | 'ankoredId'> | null,
): ClearanceStatusSubLabel | null {
	if (!clearance) return null;
	const candidateId =
		typeof clearance.checkrCandidateId === 'string' ? clearance.checkrCandidateId.trim() : '';
	if (candidateId) return { kind: 'checkrCandidateId', value: candidateId };
	const invitationId =
		typeof clearance.invitationId === 'string' ? clearance.invitationId.trim() : '';
	if (invitationId) return { kind: 'invitationId', value: invitationId };
	const ankoredId = typeof clearance.ankoredId === 'string' ? clearance.ankoredId.trim() : '';
	if (ankoredId) return { kind: 'ankoredId', value: ankoredId, legacy: true };
	return null;
}

export function getCheckrPackageSlug(clubConfig?: Pick<ClubCheckrConfig, 'packageSlug'>): string | undefined {
	const slug = clubConfig?.packageSlug || import.meta.env.VITE_CHECKR_PACKAGE_SLUG;
	if (typeof slug === 'string' && slug.trim()) {
		return slug.trim();
	}
	if (import.meta.env.DEV && !clubConfig?.packageSlug) {
		console.warn(
			'[checkrCoachClearance] checkrPackageSlug unset — director must order screening or set club config.',
		);
	}
	return undefined;
}

export function getCheckrWorkLocation(
	clubConfig?: Pick<ClubCheckrConfig, 'workState' | 'workCity'>,
): { country: 'US'; state?: string; city?: string } | undefined {
	const state = clubConfig?.workState || import.meta.env.VITE_CHECKR_WORK_STATE;
	const city = clubConfig?.workCity || import.meta.env.VITE_CHECKR_WORK_CITY;
	const stateStr = typeof state === 'string' && state.trim() ? state.trim() : undefined;
	const cityStr = typeof city === 'string' && city.trim() ? city.trim() : undefined;
	if (!stateStr && !cityStr) return undefined;
	return {
		country: 'US',
		...(stateStr ? { state: stateStr } : {}),
		...(cityStr ? { city: cityStr } : {}),
	};
}

/** High-contrast light theme for readable coach self-screening embeds. */
export function buildCheckrEmbedStyles(): CheckrEmbedStyles {
	return {
		'.new-invitation': {
			'background-color': '#ffffff',
			color: '#111827',
			padding: '1.5rem',
			'border-radius': '8px',
		},
		'.header': {
			color: '#111827',
			'font-size': '1.125rem',
			'font-weight': '600',
		},
		'.form-label': {
			color: '#374151',
			'font-weight': '600',
		},
		'.form-control': {
			'background-color': '#f9fafb',
			color: '#111827',
			border: '1px solid #d1d5db',
			padding: '0.625rem 0.75rem',
			'border-radius': '6px',
		},
		'.form-control:focus, .form-control:focus-visible': {
			'border-color': '#2563eb',
			outline: 'none',
			'box-shadow': '0 0 0 3px rgba(37, 99, 235, 0.15)',
		},
		'.btn-primary': {
			'background-color': '#2563eb',
			color: '#ffffff',
			border: 'none',
			'border-radius': '6px',
			padding: '0.625rem 1.25rem',
			'font-weight': '600',
		},
		'.btn-submit': {
			'background-color': '#2563eb',
			color: '#ffffff',
			border: 'none',
			'border-radius': '6px',
			width: '100%',
			padding: '0.75rem',
			'font-weight': '600',
		},
		'.form-group': {
			'margin-bottom': '1rem',
		},
		'.success-view': {
			color: '#111827',
		},
	};
}

function buildReportsOverviewStyles(): CheckrEmbedStyles {
	return {
		'.reports-overview': {
			'background-color': '#ffffff',
			color: '#111827',
			padding: '1rem',
			border: '1px solid #e5e7eb',
			'border-radius': '8px',
		},
		'.bgc-package-name': {
			color: '#374151',
			'font-weight': '600',
		},
	};
}

export function buildNewInvitationOptions(
	ctx: CoachClearanceContext,
	clubConfig?: ClubCheckrConfig,
): Record<string, unknown> {
	const packageSlug = getCheckrPackageSlug(clubConfig);
	const workLocation = getCheckrWorkLocation(clubConfig);
	const checkrEnv = getCheckrEnv();

	return {
		sessionTokenPath: SESSION_TOKEN_PATH,
		sessionTokenRequestHeaders: ctx.getSessionTokenHeaders,
		externalCandidateId: ctx.uid,
		defaultEmail: ctx.email,
		presetEmail: ctx.email,
		hideBackButton: true,
		styles: buildCheckrEmbedStyles(),
		...(checkrEnv === 'staging' ? { env: 'staging' } : {}),
		...(packageSlug ? { presetPackageSlug: packageSlug } : {}),
		...(workLocation ? { presetWorkLocation: workLocation } : {}),
		...(ctx.onInvitationSuccess ? { onInvitationSuccess: ctx.onInvitationSuccess } : {}),
		...(ctx.onInvitationError ? { onInvitationError: ctx.onInvitationError } : {}),
	};
}

export function buildReportsOverviewOptions(ctx: CoachClearanceContext): Record<string, unknown> {
	const checkrEnv = getCheckrEnv();

	return {
		sessionTokenPath: SESSION_TOKEN_PATH,
		sessionTokenRequestHeaders: ctx.getSessionTokenHeaders,
		externalCandidateId: ctx.uid,
		styles: buildReportsOverviewStyles(),
		...(checkrEnv === 'staging' ? { env: 'staging' } : {}),
	};
}
