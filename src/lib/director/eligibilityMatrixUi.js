import { DEFAULT_ELIGIBILITY_MATRIX } from '$lib/director/evaluateClubEligibility.js';

/** @type {(keyof typeof DEFAULT_ELIGIBILITY_MATRIX)[]} */
export const ELIGIBILITY_MATRIX_KEYS = Object.keys(DEFAULT_ELIGIBILITY_MATRIX);

/**
 * @param {Record<string, boolean> | null | undefined} matrix
 */
export function countActiveEligibilityGates(matrix) {
	if (!matrix || typeof matrix !== 'object') return 0;
	return ELIGIBILITY_MATRIX_KEYS.reduce((count, key) => count + (matrix[key] ? 1 : 0), 0);
}

/**
 * @param {Record<string, boolean> | null | undefined} matrix
 * @returns {{ level: 'ok' | 'warn'; message: string; activeCount: number; totalCount: number }}
 */
export function describeEligibilityMatrixValidation(matrix) {
	const totalCount = ELIGIBILITY_MATRIX_KEYS.length;
	const activeCount = countActiveEligibilityGates(matrix);
	if (activeCount === 0) {
		return {
			level: 'warn',
			activeCount,
			totalCount,
			message: 'No gates are enabled — every roster player will show as eligible.',
		};
	}
	return {
		level: 'ok',
		activeCount,
		totalCount,
		message: `${activeCount} of ${totalCount} gates active.`,
	};
}

/**
 * @param {unknown} error
 * @param {string} fallback
 */
export function formatEligibilityCallableError(error, fallback) {
	if (error && typeof error === 'object') {
		const err = /** @type {{ code?: string; message?: string }} */ (error);
		const code = typeof err.code === 'string' ? err.code.replace(/^functions\//, '') : '';
		const message = typeof err.message === 'string' ? err.message.trim() : '';
		if (code === 'permission-denied' && message) return message;
		if (code === 'not-found' && message) return message;
		if (code === 'invalid-argument' && message) return message;
		if (message) return message;
	}
	return fallback;
}
