/** @type {Record<string, boolean>} */
export const DEFAULT_ELIGIBILITY_MATRIX = {
	requireWaiver: true,
	requirePassportVerified: true,
	requireVpcForMinors: true,
	requireGuardianLinked: false,
	requireSafeSportClearance: true,
};

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {Record<string, boolean>}
 */
export function normalizeEligibilityMatrix(raw) {
	/** @type {Record<string, boolean>} */
	const out = { ...DEFAULT_ELIGIBILITY_MATRIX };
	if (!raw || typeof raw !== 'object') return out;
	for (const key of Object.keys(DEFAULT_ELIGIBILITY_MATRIX)) {
		if (typeof raw[key] === 'boolean') out[key] = raw[key];
	}
	return out;
}

/**
 * @typedef {object} EligibilityEvalInput
 * @property {boolean} hasSignedWaiver
 * @property {'ok' | 'bad' | 'warn' | 'muted'} passportKind
 * @property {boolean} guardianLinked
 * @property {string | null} clearanceStatus
 * @property {boolean} [isMinor]
 * @property {string | null} [vpcStatus]
 */

/**
 * @param {EligibilityEvalInput} row
 * @param {Record<string, boolean>} matrix
 */
export function evaluateClubEligibility(row, matrix) {
	/** @type {string[]} */
	const blockers = [];

	if (matrix.requireGuardianLinked && !row.guardianLinked) {
		blockers.push('guardian_not_linked');
	}
	if (matrix.requireWaiver && !row.hasSignedWaiver) {
		blockers.push('waiver_missing');
	}
	if (matrix.requirePassportVerified && row.passportKind !== 'ok') {
		blockers.push('passport_not_verified');
	}
	if (matrix.requireSafeSportClearance && row.guardianLinked) {
		if (row.clearanceStatus === 'RED_CARD') blockers.push('suspended');
		else if (row.clearanceStatus === 'PENDING_SAFESPORT') blockers.push('safesport_pending');
	}
	if (matrix.requireVpcForMinors && row.isMinor === true) {
		if (row.vpcStatus !== 'verified') blockers.push('vpc_not_verified');
	}

	return {
		eligible: blockers.length === 0,
		blockers,
	};
}

/**
 * @param {string} code
 */
export function blockerLabel(code) {
	const labels = {
		guardian_not_linked: 'No guardian account',
		waiver_missing: 'Waiver missing',
		passport_not_verified: 'Passport not verified',
		suspended: 'Suspended',
		safesport_pending: 'SafeSport pending',
		vpc_not_verified: 'VPC not verified',
	};
	return labels[/** @type {keyof typeof labels} */ (code)] || code.replace(/_/g, ' ');
}
