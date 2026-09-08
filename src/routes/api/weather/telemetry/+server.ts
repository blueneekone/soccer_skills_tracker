import { json, type RequestHandler } from '@sveltejs/kit';
import { getAdminDb } from '$lib/server/admin';
import * as admin from 'firebase-admin';

export const POST: RequestHandler = async ({ request }) => {
	// 🛡️ Ensure App Check token is provided
	const rawHeader = request.headers.get('x-firebase-appcheck');
	if (!rawHeader) {
		return json({ error: 'unauthenticated', message: 'App Check token is required.' }, { status: 401 });
	}

	try {
		// Initialize the admin app via getAdminDb (it ensures initialization)
		getAdminDb();
		// Validate the App Check token
		await admin.appCheck().verifyToken(rawHeader);
	} catch (err) {
		return json({ error: 'unauthenticated', message: 'Invalid App Check token.' }, { status: 401 });
	}

	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json({ error: 'invalid-argument', message: 'Invalid JSON body.' }, { status: 400 });
	}

	// Simulating Tomorrow.io Telemetry
	const telemetryData = {
		data: {
			timelines: [
				{
					intervals: [
						{
							startTime: new Date().toISOString(),
							values: {
								lightningStrike: true,
								lat: body.lat ? body.lat + (Math.random() - 0.5) * 0.1 : 39.8283 + (Math.random() - 0.5) * 0.1,
								lng: body.lng ? body.lng + (Math.random() - 0.5) * 0.1 : -98.5795 + (Math.random() - 0.5) * 0.1,
								peakCurrent: Math.floor(Math.random() * 100),
								polarity: Math.random() > 0.5 ? 1 : -1
							}
						}
					]
				}
			]
		}
	};

	return json({ success: true, ...telemetryData });
};
