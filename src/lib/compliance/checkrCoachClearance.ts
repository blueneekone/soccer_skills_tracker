/**
 * Coach self-clearance presets and Checkr embed option builders for /compliance.
 *
 * Env (Vite — set in `.env` or hosting build env):
 * - `VITE_CHECKR_ENV` — `staging` | `production` (default production)
 * - `VITE_CHECKR_PACKAGE_SLUG` — club coach package slug from Checkr dashboard (recommended)
 * - `VITE_CHECKR_WORK_STATE` — primary work state, e.g. `CA` (optional)
 * - `VITE_CHECKR_WORK_CITY` — primary work city (optional)
 */

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

export function getCheckrEnv(): 'staging' | 'production' {
	return import.meta.env.VITE_CHECKR_ENV === 'staging' ? 'staging' : 'production';
}

export function getCheckrPackageSlug(): string | undefined {
	const slug = import.meta.env.VITE_CHECKR_PACKAGE_SLUG;
	if (typeof slug === 'string' && slug.trim()) {
		return slug.trim();
	}
	if (import.meta.env.DEV) {
		console.warn(
			'[checkrCoachClearance] VITE_CHECKR_PACKAGE_SLUG unset — package field will appear in the embed.',
		);
	}
	return undefined;
}

export function getCheckrWorkLocation():
	| { country: 'US'; state?: string; city?: string }
	| undefined {
	const state = import.meta.env.VITE_CHECKR_WORK_STATE;
	const city = import.meta.env.VITE_CHECKR_WORK_CITY;
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

export function buildNewInvitationOptions(ctx: CoachClearanceContext): Record<string, unknown> {
	const packageSlug = getCheckrPackageSlug();
	const workLocation = getCheckrWorkLocation();
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
