const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const API_FOOTBALL_KEY = defineSecret('API_FOOTBALL_KEY');
const LISTENNOTES_API_KEY = defineSecret('LISTENNOTES_API_KEY');

const TTL_HOURS = 4;
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

exports.fetchDailyIntel = onCall(
	{
		secrets: [API_FOOTBALL_KEY, LISTENNOTES_API_KEY],
	},
	async (request) => {
		const auth = request.auth;
		if (!auth) {
			throw new HttpsError('unauthenticated', 'User must be authenticated.');
		}
		
		const role = auth.token.role;
		if (role !== 'coach' && role !== 'global_admin' && role !== 'super_admin' && role !== 'director') {
			throw new HttpsError('permission-denied', 'Only coaches and directors can access daily intel.');
		}

		const db = admin.firestore();
		const cacheRef = db.collection('external_cache').doc('daily_intel');

		try {
			const cacheDoc = await cacheRef.get();
			const now = Date.now();
			
			if (cacheDoc.exists) {
				const data = cacheDoc.data();
				const updatedAt = data.updatedAt ? data.updatedAt.toMillis() : 0;
				
				// Return cache if within TTL
				if (now - updatedAt < TTL_MS && data.intel) {
					return { source: 'cache', data: data.intel };
				}
			}

			// Simulate external API fetch using the secrets
			const footballKey = API_FOOTBALL_KEY.value();
			const listennotesKey = LISTENNOTES_API_KEY.value();
			
			if (!footballKey || !listennotesKey) {
				console.warn('[dailyIntelOps] Missing secrets for external APIs');
			}

			// Mock data generation (since actual fetch is omitted for this scope)
			const freshIntel = {
				headlines: ['Champions League Draw', 'Tactical Analysis: High Press'],
				podcasts: ['The Coachs Voice', 'Tifo Football Podcast'],
				timestamp: new Date().toISOString()
			};

			await cacheRef.set({
				intel: freshIntel,
				updatedAt: admin.firestore.FieldValue.serverTimestamp()
			}, { merge: true });

			return { source: 'fresh', data: freshIntel };
		} catch (error) {
			console.error('[dailyIntelOps] Error fetching external intel:', error);
			
			// Stale-While-Error Fallback
			try {
				const fallbackDoc = await cacheRef.get();
				if (fallbackDoc.exists && fallbackDoc.data().intel) {
					return { source: 'stale_cache', data: fallbackDoc.data().intel };
				}
			} catch (cacheErr) {
				console.error('[dailyIntelOps] Cache fallback failed:', cacheErr);
			}

			throw new HttpsError('internal', 'Failed to retrieve daily intel and no fallback cache is available.');
		}
	}
);
