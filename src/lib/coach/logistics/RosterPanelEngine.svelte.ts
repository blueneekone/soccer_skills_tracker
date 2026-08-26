/**
 * RosterPanelEngine.svelte.ts
 * ────────────────────────────
 * Vanguard Trinity — Brain layer for CoachTeamRosterPanel.
 *
 * Owns all Firestore reads (onSnapshot) and writes (setDoc) for the roster.
 * Zero UI concerns — the Glass layer (RosterPlayerRow.svelte) handles rendering.
 *
 * b815 Rule: subscribe() returns early if isFirestoreReady() is false,
 * preventing Quota Exceeded loops on unauthenticated renders.
 */

import { db } from '$lib/firebase.js';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export interface RosterPlayer {
	id: string;
	displayName: string;
	email: string;
	parentName: string;
	parentPhone: string;
	parentEmail: string;
}

export interface RosterEditData {
	displayName: string;
	parentName: string;
	parentPhone: string;
	parentEmail: string;
}

export class RosterPanelEngine {
	// ── Reactive state ────────────────────────────────────────────────────────
	players = $state<RosterPlayer[]>([]);
	loading = $state(true);
	err = $state('');
	editingPlayerId = $state<string | null>(null);
	editData = $state<RosterEditData>({
		displayName: '',
		parentName: '',
		parentPhone: '',
		parentEmail: '',
	});

	private unsubs: Array<() => void> = [];
	private rawLookupPlayers: RosterPlayer[] = [];
	private rawRosterNames: string[] = [];

	// ── Subscription ─────────────────────────────────────────────────────────

	subscribe(teamId: string): void {
		this.detach();
		if (!db || !authStore.isAuthenticated) return;
		if (!isFirestoreReady() || !teamId) {
			this.players = [];
			this.loading = false;
			return;
		}
		this.loading = true;
		this.err = '';
		this.rawLookupPlayers = [];
		this.rawRosterNames = [];

		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsubLookup = onSnapshot(
			q,
			(snap) => {
				this.rawLookupPlayers = snap.docs.map(this._mapDoc.bind(this));
				this._recompute();
			},
			(e) => this._onError(e),
		);
		this.unsubs.push(unsubLookup);

		const rosterDocRef = doc(db, 'rosters', teamId);
		const unsubRoster = onSnapshot(
			rosterDocRef,
			(snap: any) => {
				if (typeof snap?.exists === 'function' ? snap.exists() : Boolean(snap?.exists)) {
					const data = typeof snap?.data === 'function' ? snap.data() : snap;
					const raw = Array.isArray(data?.players) ? data.players : [];
					this.rawRosterNames = raw
						.map((p: any) => (typeof p === 'string' ? p : p?.name || p?.playerName || ''))
						.filter(Boolean);
				} else {
					this.rawRosterNames = [];
				}
				this._recompute();
			},
			() => {
				/* non-fatal if rosters doc is missing */
			},
		);
		this.unsubs.push(unsubRoster);
	}

	detach(): void {
		this.unsubs.forEach((u) => u());
		this.unsubs = [];
	}

	// ── Edit actions ─────────────────────────────────────────────────────────

	startEdit(p: RosterPlayer): void {
		this.editingPlayerId = p.id;
		this.editData = {
			displayName: p.displayName,
			parentName: p.parentName,
			parentPhone: p.parentPhone,
			parentEmail: p.parentEmail,
		};
	}

	cancelEdit(): void {
		this.editingPlayerId = null;
	}

	async saveEdit(playerId: string): Promise<void> {
		if (!this.editingPlayerId) return;
		await setDoc(
			doc(db, 'player_lookup', playerId),
			{
				displayName: this.editData.displayName,
				playerName: this.editData.displayName,
				parentName: this.editData.parentName,
				parentPhone: this.editData.parentPhone,
				parentEmail: this.editData.parentEmail,
			},
			{ merge: true },
		);
		this.editingPlayerId = null;
	}

	// ── Private snapshot handlers ─────────────────────────────────────────────

	private _recompute(): void {
		const nameSet = new Set(this.rawLookupPlayers.map((p) => p.displayName.trim().toLowerCase()));
		const nameOnlyPlayers: RosterPlayer[] = this.rawRosterNames
			.filter((n) => !nameSet.has(n.trim().toLowerCase()))
			.map((name) => ({
				id: `nameonly:${name.trim().toLowerCase()}`,
				displayName: name,
				email: '',
				parentName: '',
				parentPhone: '',
				parentEmail: '',
			}));
		this.players = [...this.rawLookupPlayers, ...nameOnlyPlayers].sort((a, b) =>
			a.displayName.localeCompare(b.displayName),
		);
		this.loading = false;
	}

	private _onError(e: Error): void {
		this.err = e.message || 'Could not load roster.';
		this.loading = false;
	}

	private _mapDoc(d: any): RosterPlayer {
		const data = d.data();
		const email = (d.id as string).toLowerCase();
		const displayName =
			(typeof data.displayName === 'string' && data.displayName.trim()) ||
			(typeof data.playerName === 'string' && data.playerName.trim()) ||
			email.split('@')[0];
		return {
			id: d.id,
			displayName,
			email,
			parentName: typeof data.parentName === 'string' ? data.parentName : '',
			parentPhone: typeof data.parentPhone === 'string' ? data.parentPhone : '',
			parentEmail: typeof data.parentEmail === 'string' ? data.parentEmail : '',
		};
	}
}
