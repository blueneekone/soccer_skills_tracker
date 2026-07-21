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

	private unsub: (() => void) | null = null;

	// ── Subscription ─────────────────────────────────────────────────────────

	subscribe(teamId: string): void {
		this.unsub?.();
		if (!teamId || !isFirestoreReady()) {
			this.players = [];
			this.loading = false;
			return;
		}
		this.loading = true;
		this.err = '';
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		this.unsub = onSnapshot(q, this._onSnapshot.bind(this), this._onError.bind(this));
	}

	detach(): void {
		this.unsub?.();
		this.unsub = null;
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

	private _onSnapshot(snap: any): void {
		this.players = snap.docs.map(this._mapDoc).sort(
			(a: RosterPlayer, b: RosterPlayer) => a.displayName.localeCompare(b.displayName),
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
