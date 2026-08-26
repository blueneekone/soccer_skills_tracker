import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolve the cellId dynamically for Firestore multi-tenancy
// For standard instances or default DBs, passing undefined falls back to (default)
function resolveCellId(cellId?: string): string {
	return cellId && cellId !== 'default' ? cellId : '(default)';
}

export function getAdminDb(cellId?: string) {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			const svc = JSON.parse(saJson);
			initializeApp({ credential: cert(svc) });
		} else {
			try {
				const keyPath = resolve(process.cwd(), 'serviceAccountKey.json');
				const json = readFileSync(keyPath, 'utf8');
				initializeApp({ credential: cert(JSON.parse(json)) });
			} catch (e) {
				initializeApp({ credential: applicationDefault() });
			}
		}
	}
	return getFirestore(resolveCellId(cellId));
}
