import { auth, db } from '$lib/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

export const logSecurityEvent = async (action, target, details = '') => {
	try {
		await addDoc(collection(db, 'security_audit'), {
			timestamp: new Date(),
			admin: auth.currentUser?.email || 'unknown',
			action,
			target,
			details
		});
	} catch (e) {
		console.error('Audit Log Failed:', e);
	}
};
