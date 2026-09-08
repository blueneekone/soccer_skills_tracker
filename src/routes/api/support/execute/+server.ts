import { json } from '@sveltejs/kit';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

function getAdminApp() {
	if (!getApps().length) {
		const saJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
		if (saJson) {
			const svc = JSON.parse(saJson);
			return initializeApp({ credential: cert(svc) });
		} else {
			return initializeApp({ credential: applicationDefault() });
		}
	}
	return getApps()[0];
}

export async function POST({ request }: RequestEvent) {
	try {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return json({ error: 'Missing or invalid authorization token' }, { status: 401 });
		}

		const idToken = authHeader.split('Bearer ')[1];
		const app = getAdminApp();
		const auth = getAuth(app);
		
		const decodedToken = await auth.verifyIdToken(idToken);
		const cellId = (decodedToken.cellId as string) || '(default)';
		const db = getFirestore(app, cellId);
		// Verify if the user is a global or super admin
		const userDoc = await db.collection('users').doc(decodedToken.uid).get();
		if (!userDoc.exists) {
			return json({ error: 'User record not found.' }, { status: 403 });
		}
		
		const role = userDoc.data()?.role;
		if (role !== 'global_admin' && role !== 'super_admin') {
			return json({ error: 'Insufficient privileges. Support Chat is for Support Agents (Admins).' }, { status: 403 });
		}

		const body = await request.json();
		const cmdStr = (body.command || '').trim();

		if (!cmdStr) {
			return json({ error: 'No command provided.' }, { status: 400 });
		}

		// Support Agent Command Parsing
		if (cmdStr.startsWith('/sync-roster')) {
			// e.g. /sync-roster clubId=xyz
			const match = cmdStr.match(/clubId=([a-zA-Z0-9_-]+)/);
			const clubId = match ? match[1] : null;
			
			if (!clubId) {
				return json({ reply: "Usage: /sync-roster clubId=<id>" });
			}
			
			// Mock sync logic: update an audit document
			await db.collection('audit_logs').add({
				action: 'admin_sync_roster',
				clubId,
				agentId: decodedToken.uid,
				timestamp: new Date()
			});

			return json({ reply: `Roster synchronization successfully queued for club: ${clubId}.` });
		}

		if (cmdStr.startsWith('/clear-queue')) {
			const match = cmdStr.match(/clubId=([a-zA-Z0-9_-]+)/);
			const clubId = match ? match[1] : null;
			if (!clubId) {
				return json({ reply: "Usage: /clear-queue clubId=<id>" });
			}
			
			// Simulate clearing the queue
			return json({ reply: `Compliance queues flushed for club: ${clubId}.` });
		}

		return json({ reply: `Command not recognized: ${cmdStr.split(' ')[0]}. Available commands: /sync-roster, /clear-queue` });

	} catch (err: unknown) {
		console.error('Support API Error:', err);
		return json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
	}
}
