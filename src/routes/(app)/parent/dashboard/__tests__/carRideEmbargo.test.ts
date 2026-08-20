import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarRideEngine } from '../CarRideEngine.svelte.js';
import { Timestamp } from 'firebase/firestore';

vi.mock('$lib/firebase.js', () => ({
	db: {},
	auth: {
		currentUser: {
			uid: 'test-parent-uid',
			email: 'parent@example.com'
		}
	}
}));

vi.mock('$lib/utils/firestoreGuard.js', () => ({
	isFirestoreReady: () => true
}));

describe('CarRideEngine — 15-Minute Post-Match Embargo & Conversation Anchors', () => {
	let engine: CarRideEngine;

	beforeEach(() => {
		engine = new CarRideEngine();
	});

	it('identifies match as temporally embargoed if recorded within 15 minutes', () => {
		const recentMillis = Date.now() - 5 * 60 * 1000; // 5 mins ago
		engine.publicScore = {
			fixtureId: 'fix-1',
			scoreHome: 2,
			scoreAway: 1,
			outcome: 'W',
			teamId: 'team-1',
			recordedAt: Timestamp.fromMillis(recentMillis)
		};

		expect(engine.isTemporallyEmbargoed).toBe(true);
	});

	it('identifies match as NOT embargoed if recorded more than 15 minutes ago', () => {
		const oldMillis = Date.now() - 20 * 60 * 1000; // 20 mins ago
		engine.publicScore = {
			fixtureId: 'fix-1',
			scoreHome: 2,
			scoreAway: 1,
			outcome: 'W',
			teamId: 'team-1',
			recordedAt: Timestamp.fromMillis(oldMillis)
		};

		expect(engine.isTemporallyEmbargoed).toBe(false);
	});

	it('blocks attestation when match is temporally embargoed', async () => {
		const recentMillis = Date.now() - 5 * 60 * 1000;
		engine.pendingFixtureId = 'fix-1';
		engine.publicScore = {
			fixtureId: 'fix-1',
			scoreHome: 1,
			scoreAway: 2,
			outcome: 'L',
			teamId: 'team-1',
			recordedAt: Timestamp.fromMillis(recentMillis)
		};

		await engine.attest();

		expect(engine.attested).toBe(false);
		expect(engine.error).toContain('15 minutes');
	});
});
