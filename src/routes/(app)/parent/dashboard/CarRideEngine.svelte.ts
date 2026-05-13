/**
 * CarRideEngine.svelte.ts — Phase 4, Epic 8: The Car Ride Home Protocol
 * ───────────────────────────────────────────────────────────────────────
 * THE BRAIN (Vanguard Trinity Pattern)
 *
 * Responsibilities:
 *   1. Detect pending unattested match results for the linked player in the
 *      last 24 hours by querying `match_results_public` (no PII, no gate).
 *   2. On init, pre-target a fixtureId from the URL ?fixtureId= query param
 *      (set by the FCM deep link via the service worker).
 *   3. Execute EQ attestation: write a deterministic-ID `eq_attestations` doc,
 *      then re-fetch the now-unlocked `match_results/{fixtureId}` full doc.
 *   4. Expose empathetic conversation anchors keyed by match outcome (W/L/D).
 *
 * SECURITY
 * ─────────
 * `attest()` writes to `eq_attestations/{parentUid}_{fixtureId}`.
 * Firestore rules enforce:
 *   • parentUid == request.auth.uid (cannot forge another parent's attestation)
 *   • protocol == 'car_ride_home_v1'
 *   • doc ID == parentUid + '_' + fixtureId
 * The locked `match_results/{fixtureId}` doc is re-fetched after attestation;
 * the `parentAttestedForFixture()` rule function allows the read.
 */

import { db, auth } from '$lib/firebase.js';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
	Timestamp,
	where,
} from 'firebase/firestore';
import type { LeagueSchema } from '$lib/types/league.js';

// ── Conversation anchors ─────────────────────────────────────────────────────

const ANCHORS: Record<'W' | 'L' | 'D', string[]> = {
	W: [
		'"I love watching you play. How did it feel out there today?"',
		'"What was your favourite moment from the match?"',
		'"Is there anything you want to work on before next week?"',
	],
	L: [
		'"I love watching you play. How are you feeling right now?"',
		'"Every tough game teaches us something — what felt good about your effort today?"',
		'"You gave it everything. What do you need from me right now?"',
	],
	D: [
		'"I love watching you play. What was going through your mind during the match?"',
		'"That was a battle! How did it feel to compete like that?"',
		'"What would you love to focus on in training this week?"',
	],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublicScore {
	fixtureId: string;
	scoreHome: number;
	scoreAway: number;
	outcome: 'W' | 'L' | 'D';
	teamId: string;
}

export interface LockedMetrics {
	playerStats: Record<string, LeagueSchema.PlayerMatchStats>;
	coachNotes: string;
	highlights: string;
}

// ── CarRideEngine ─────────────────────────────────────────────────────────────

export class CarRideEngine {
	/** Firestore document ID of the fixture awaiting EQ attestation. */
	pendingFixtureId = $state<string | null>(null);

	/** Public score — visible before attestation. */
	publicScore = $state<PublicScore | null>(null);

	/** Per-player stats + coach notes — populated after successful attestation. */
	lockedMetrics = $state<LockedMetrics | null>(null);

	/** True once the parent has submitted and the full result is loaded. */
	attested = $state(false);

	/** Conversation anchor shown on the overlay, randomized per outcome. */
	conversationAnchor = $state('');

	isLoading = $state(false);
	isAttesting = $state(false);
	error = $state<string | null>(null);

	/** Derived: whether the interceptor overlay should be rendered. */
	readonly shouldIntercept = $derived(
		this.pendingFixtureId !== null && !this.attested,
	);

	// ── Private fields ─────────────────────────────────────────────────────────

	private _parentUid = '';
	private _parentEmail = '';
	private _linkedPlayerEmail = '';
	private _tenantId = '';
	private _clubId = '';

	// ── init ───────────────────────────────────────────────────────────────────

	/**
	 * Initialize the engine for the current parent session.
	 *
	 * @param linkedPlayerEmail - Child's lowercase email linked to this parent.
	 * @param tenantId          - Tenant/club ID for partition scoping.
	 * @param clubId            - Club ID for the attestation audit record.
	 * @param urlFixtureId      - Optional fixtureId from URL query param (FCM deep link).
	 */
	async init(
		linkedPlayerEmail: string,
		tenantId: string,
		clubId: string,
		urlFixtureId?: string | null,
	): Promise<void> {
		const user = auth.currentUser;
		if (!user) return;

		this._parentUid = user.uid;
		this._parentEmail = user.email?.toLowerCase() ?? '';
		this._linkedPlayerEmail = linkedPlayerEmail;
		this._tenantId = tenantId;
		this._clubId = clubId;
		this.isLoading = true;
		this.error = null;

		try {
			// Prefer the FCM deep-link fixture, otherwise find the most recent
			// unattested match from the last 24 hours.
			if (urlFixtureId) {
				await this._tryLoadFixture(urlFixtureId);
			} else {
				await this._detectPendingFixture();
			}
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load match data.';
		} finally {
			this.isLoading = false;
		}
	}

	// ── attest ─────────────────────────────────────────────────────────────────

	/**
	 * Submit the EQ attestation for the pending fixture and unlock metrics.
	 *
	 * Writes `eq_attestations/{parentUid}_{fixtureId}` with a deterministic ID
	 * so the Firestore rule can validate it in O(1) without a query.
	 * Then re-fetches `match_results/{fixtureId}` — now unlocked by rules.
	 */
	async attest(): Promise<void> {
		if (!this.pendingFixtureId || this.attested || this.isAttesting) return;

		this.isAttesting = true;
		this.error = null;

		try {
			const attId = `${this._parentUid}_${this.pendingFixtureId}`;

			await setDoc(doc(db, 'eq_attestations', attId), {
				parentUid: this._parentUid,
				parentEmail: this._parentEmail,
				linkedPlayerEmail: this._linkedPlayerEmail,
				fixtureId: this.pendingFixtureId,
				tenantId: this._tenantId,
				clubId: this._clubId,
				protocol: 'car_ride_home_v1',
				attestedAt: serverTimestamp(),
			});

			// Re-fetch the full result — now allowed by parentAttestedForFixture().
			const resultSnap = await getDoc(
				doc(db, 'match_results', this.pendingFixtureId),
			);

			if (resultSnap.exists()) {
				const d = resultSnap.data();
				this.lockedMetrics = {
					playerStats: (d.playerStats ?? {}) as Record<string, LeagueSchema.PlayerMatchStats>,
					coachNotes: d.coachNotes ?? '',
					highlights: d.highlights ?? '',
				};
			}

			this.attested = true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Attestation failed. Please try again.';
		} finally {
			this.isAttesting = false;
		}
	}

	// ── Private helpers ────────────────────────────────────────────────────────

	/** Load the public score for a specific fixture and check for prior attestation. */
	private async _tryLoadFixture(fixtureId: string): Promise<void> {
		const pubSnap = await getDoc(doc(db, 'match_results_public', fixtureId));
		if (!pubSnap.exists()) {
			// Fall back to scanning recent results.
			await this._detectPendingFixture();
			return;
		}

		const alreadyAttested = await this._checkAttestation(fixtureId);
		if (alreadyAttested) {
			// Nothing to intercept for this fixture; scan for others.
			await this._detectPendingFixture();
			return;
		}

		this._applyPublicDoc(fixtureId, pubSnap.data());
	}

	/**
	 * Query `match_results_public` for the most recent match involving this
	 * player in the last 24 hours that has not yet been attested.
	 */
	private async _detectPendingFixture(): Promise<void> {
		if (!this._linkedPlayerEmail || !this._tenantId) return;

		const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

		const snap = await getDocs(
			query(
				collection(db, 'match_results_public'),
				where('tenantId', '==', this._tenantId),
				where('playerEmails', 'array-contains', this._linkedPlayerEmail),
				where('recordedAt', '>=', since),
				orderBy('recordedAt', 'desc'),
				limit(5),
			),
		);

		for (const docSnap of snap.docs) {
			const alreadyAttested = await this._checkAttestation(docSnap.id);
			if (!alreadyAttested) {
				this._applyPublicDoc(docSnap.id, docSnap.data());
				return;
			}
		}

		// No pending unattested fixtures in the last 24h — nothing to intercept.
	}

	/** Check if an attestation doc already exists for this parent + fixture. */
	private async _checkAttestation(fixtureId: string): Promise<boolean> {
		const attSnap = await getDoc(
			doc(db, 'eq_attestations', `${this._parentUid}_${fixtureId}`),
		);
		return attSnap.exists();
	}

	/** Apply a public doc snapshot as the pending fixture to intercept. */
	private _applyPublicDoc(fixtureId: string, data: Record<string, unknown>): void {
		const outcome = (data.outcome as 'W' | 'L' | 'D') ?? 'D';
		this.pendingFixtureId = fixtureId;
		this.publicScore = {
			fixtureId,
			scoreHome: (data.scoreHome as number) ?? 0,
			scoreAway: (data.scoreAway as number) ?? 0,
			outcome,
			teamId: (data.teamId as string) ?? '',
		};
		this.conversationAnchor = this._pickAnchor(outcome);
	}

	/** Pick a random conversation anchor for the given outcome. */
	private _pickAnchor(outcome: 'W' | 'L' | 'D'): string {
		const pool = ANCHORS[outcome] ?? ANCHORS['D'];
		return pool[Math.floor(Math.random() * pool.length)];
	}
}
