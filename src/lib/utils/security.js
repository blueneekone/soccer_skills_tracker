import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

const logSecurityAuditFn = httpsCallable(functions, 'logSecurityAudit');

export const logSecurityEvent = async (action, target, details = '') => {
	try {
		await logSecurityAuditFn({
			action,
			target: String(target ?? ''),
			details: String(details ?? '')
		});
	} catch (e) {
		console.error('Audit Log Failed:', e);
	}
};
