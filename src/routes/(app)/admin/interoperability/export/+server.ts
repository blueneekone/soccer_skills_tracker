import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { env } from '$env/dynamic/private';
import { resolveCellId } from '$lib/types/cells';

// NOTE: This route requires a SvelteKit server-side adapter like adapter-node.
// It uses firebase-admin to safely stream huge exports without crashing the browser.

function getAdminDb(cellId?: string) {
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

export const GET = async ({ request, url }: RequestEvent) => {
	const authHeader = request.headers.get('authorization') ?? '';
	if (!authHeader.startsWith('Bearer ')) {
		throw error(401, 'Authorization token required.');
	}
	
	// Mock auth check since we passed DUMMY_TOKEN_FOR_NOW from the frontend
	// In production, we'd do:
	// const idToken = authHeader.slice(7);
	// const decodedToken = await getAuth().verifyIdToken(idToken);
	// if (!['director', 'super_admin', 'global_admin'].includes(decodedToken.role)) throw error(403);
	// For demo, we just allow it if the token is present (we are mimicking the Global Admin).

	const format = url.searchParams.get('format') || 'csv';
	const collectionName = url.searchParams.get('collection') || 'users';

	const db = getAdminDb();
	const snapshot = await db.collection(collectionName).limit(1000).get(); // Limit to 1000 for safety in this demo
	
	const records = snapshot.docs.map(d => {
		const data = d.data();
		return {
			id: d.id,
			email: data.email || '',
			firstName: data.firstName || '',
			lastName: data.lastName || '',
			role: data.role || 'player',
			createdAt: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString() : ''
		};
	});

	if (format === 'json') {
		return new Response(JSON.stringify(records, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${collectionName}_export.json"`
			}
		});
	} else if (format === 'csv') {
		if (records.length === 0) {
			return new Response('', { headers: { 'Content-Type': 'text/csv' } });
		}
		const headers = Object.keys(records[0]).join(',');
		const rows = records.map(r => 
			Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
		).join('\n');
		
		return new Response(`${headers}\n${rows}`, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${collectionName}_export.csv"`
			}
		});
	} else if (format === 'pdf') {
		// Mock PDF generation response
		return new Response(`PDF Export for ${collectionName}\nTotal Records: ${records.length}`, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${collectionName}_export.pdf"`
			}
		});
	}

	throw error(400, 'Unsupported format');
};
