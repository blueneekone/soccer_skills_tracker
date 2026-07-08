import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';

// Resolve the cellId dynamically for Firestore multi-tenancy
// For standard instances or default DBs, passing undefined falls back to (default)
function resolveCellId(cellId) {
	return cellId && cellId !== 'default' ? cellId : '(default)';
}

export function getAdminDb(cellId) {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			const svc = JSON.parse(saJson);
			initializeApp({ credential: cert(svc) });
		} else {
			initializeApp({ credential: applicationDefault() });
		}
	}
	return getFirestore(resolveCellId(cellId));
}
