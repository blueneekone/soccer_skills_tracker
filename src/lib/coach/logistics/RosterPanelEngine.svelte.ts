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
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, arrayRemove, deleteField } from 'firebase/firestore';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export interface RosterPlayer {
	id: string;
	displayName: string;
	email: string;
	jersey?: string;
	parentName: string;
	parentPhone: string;
	parentEmail: string;
}

export interface RosterEditData {
	displayName: string;
	jersey: string;
	parentName: string;
	parentPhone: string;
	parentEmail: string;
}

export class RosterPanelEngine {
	isSandbox: boolean = false;

	constructor(opts: { isSandbox?: boolean } = {}) {
		this.isSandbox = !!opts.isSandbox;
	}

	// ── Reactive state ────────────────────────────────────────────────────────
	players = $state<RosterPlayer[]>([]);
	loading = $state(true);
	err = $state('');
	editingPlayerId = $state<string | null>(null);
	editData = $state<RosterEditData>({
		displayName: '',
		jersey: '',
		parentName: '',
		parentPhone: '',
		parentEmail: '',
	});

	private teamId = '';
	private unsubs: Array<() => void> = [];
	private rawLookupPlayers: RosterPlayer[] = [];
	private rawRosterNames: string[] = [];
	private rawJerseys: Record<string, string> = {};

	// ── Subscription ─────────────────────────────────────────────────────────

	subscribe(teamId: string): void {
		this.detach();

		if (this.isSandbox) {
			this.err = '';
			import('$lib/mock/trialRoster.json').then(mockData => {
				const roster = mockData.default || mockData;
				this.players = roster.map((p: any) => ({
					id: p.id,
					displayName: p.name,
					email: `${p.name.toLowerCase().replace(' ', '.')}@example.com`,
					jersey: p.jerseyNumber || '',
					parentName: `Parent of ${p.name}`,
					parentPhone: '555-0199',
					parentEmail: `parent_${p.name.toLowerCase().replace(' ', '.')}@example.com`
				}));
				this.loading = false;
			}).catch(e => {
				this.err = 'Sandbox roster failed to load.';
				this.loading = false;
			});
			return;
		}

		if (!db || !authStore.isAuthenticated) return;
		if (!isFirestoreReady() || !teamId) {
			this.players = [];
			this.loading = false;
			return;
		}
		this.teamId = teamId;
		this.loading = true;
		this.err = '';
		this.rawLookupPlayers = [];
		this.rawRosterNames = [];
		this.rawJerseys = {};

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
			(snap) => {
				if (snap && typeof snap.exists === 'function' && snap.exists()) {
					const data = snap.data();
					const raw = Array.isArray(data?.players) ? data.players : [];
					this.rawRosterNames = raw
						.map((p: any) => (typeof p === 'string' ? p : p?.name || p?.playerName || ''))
						.filter(Boolean);
					this.rawJerseys =
						data?.jerseys && typeof data.jerseys === 'object' ? data.jerseys : {};
				} else {
					this.rawRosterNames = [];
					this.rawJerseys = {};
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
			jersey: p.jersey || '',
			parentName: p.parentName,
			parentPhone: p.parentPhone,
			parentEmail: p.parentEmail || p.email || '',
		};
	}

	cancelEdit(): void {
		this.editingPlayerId = null;
	}

	async saveEdit(playerId: string): Promise<void> {
		if (!this.editingPlayerId) return;
		const name = this.editData.displayName.trim();
		const jersey = this.editData.jersey.trim();
		const parentEmail = this.editData.parentEmail.trim().toLowerCase();
		const parentPhone = this.editData.parentPhone.trim();
		const parentName = this.editData.parentName.trim();

		if (this.isSandbox) {
			this.players = this.players.map(p => {
				if (p.id === this.editingPlayerId) {
					return {
						...p,
						displayName: name,
						jersey,
						parentEmail,
						parentPhone,
						parentName
					};
				}
				return p;
			});
			this.editingPlayerId = null;
			return;
		}

		if (!db) return;

		// 1. Update jersey on roster document
		if (this.teamId) {
			const rosterRef = doc(db, 'rosters', this.teamId);
			const jerseyPayload: Record<string, any> = {};
			if (jersey) {
				jerseyPayload[`jerseys.${name}`] = jersey;
			} else {
				jerseyPayload[`jerseys.${name}`] = deleteField();
			}
			await setDoc(rosterRef, jerseyPayload, { merge: true }).catch(() => {});
		}

		// 2. Clean up old lookup doc ID if email or phone changed
		if (playerId && playerId !== parentEmail && !playerId.startsWith('player:')) {
			if (playerId.startsWith('phone_')) {
				await updateDoc(doc(db, 'player_lookup', playerId), { teamId: deleteField() }).catch(() => {});
			} else if (playerId.includes('@')) {
				await updateDoc(doc(db, 'player_lookup', playerId), { teamId: '' }).catch(() => {});
			}
		}

		// 3. Update player_lookup entry by email if provided
		if (parentEmail) {
			await setDoc(
				doc(db, 'player_lookup', parentEmail),
				{
					teamId: this.teamId,
					displayName: name,
					playerName: name,
					jersey: jersey || null,
					parentName,
					parentPhone,
					parentEmail,
				},
				{ merge: true },
			);
		}

		// 4. Update player_lookup entry by phone if provided
		const digits = parentPhone.replace(/\D/g, '');
		const phoneKey = digits.length >= 10 ? `phone_${digits.slice(-10)}` : '';
		if (phoneKey) {
			await setDoc(
				doc(db, 'player_lookup', phoneKey),
				{
					...(parentEmail ? {} : { teamId: this.teamId }),
					displayName: name,
					playerName: name,
					jersey: jersey || null,
					parentName,
					parentPhone,
					parentEmail,
				},
				{ merge: true },
			);
		}

		this.editingPlayerId = null;
	}

	async removePlayer(player: RosterPlayer): Promise<void> {
		if (this.isSandbox) {
			this.players = this.players.filter(p => p.id !== player.id);
			return;
		}

		if (!this.teamId || !player || !db) return;
		const name = player.displayName.trim();
		const rosterRef = doc(db, 'rosters', this.teamId);

		// 1. Remove from rosters document
		await updateDoc(rosterRef, {
			players: arrayRemove(name),
			[`jerseys.${name}`]: deleteField(),
		}).catch(() => {});

		// 2. Unlink from player_lookup
		if (player.id && !player.id.startsWith('player:')) {
			if (player.id.startsWith('phone_')) {
				await updateDoc(doc(db, 'player_lookup', player.id), { teamId: deleteField() }).catch(() => {});
			} else if (player.id.includes('@')) {
				await updateDoc(doc(db, 'player_lookup', player.id), { teamId: '' }).catch(() => {});
			}
		}
		if (player.parentEmail) {
			await updateDoc(doc(db, 'player_lookup', player.parentEmail.toLowerCase().trim()), { teamId: '' }).catch(() => {});
		}

		// 3. Invoke Cloud Function for authoritative license seat release
		try {
			const { functions } = await import('$lib/firebase.js');
			if (functions) {
				const { httpsCallable } = await import('firebase/functions');
				const secureRemovePlayerFn = httpsCallable(functions, 'secureRemovePlayer');
				await secureRemovePlayerFn({ teamId: this.teamId, playerName: name });
			}
		} catch (e) {
			console.warn('[RosterPanelEngine] secureRemovePlayer error', e);
		}
	}

	// ── Private snapshot handlers ─────────────────────────────────────────────

	private _recompute(): void {
		const playerMap = new Map<string, RosterPlayer>();

		// 1. Seed from raw roster names (official team roster list)
		for (const name of this.rawRosterNames) {
			const key = name.trim().toLowerCase();
			if (!key) continue;
			playerMap.set(key, {
				id: `player:${key}`,
				displayName: name.trim(),
				email: '',
				jersey: this.rawJerseys[name.trim()] || '',
				parentName: '',
				parentPhone: '',
				parentEmail: '',
			});
		}

		// 2. Merge all player_lookup records (phone lookups + email lookups) into the exact athlete entry
		for (const lookup of this.rawLookupPlayers) {
			const key = lookup.displayName.trim().toLowerCase();
			if (!key) continue;
			const existing = playerMap.get(key);
			const jersey = this.rawJerseys[lookup.displayName.trim()] || lookup.jersey || existing?.jersey || '';
			const email = lookup.email || lookup.parentEmail || existing?.email || existing?.parentEmail || '';
			const parentPhone = lookup.parentPhone || existing?.parentPhone || '';
			const parentName = lookup.parentName || existing?.parentName || '';

			playerMap.set(key, {
				id: lookup.id.includes('@') ? lookup.id : (existing?.id || lookup.id),
				displayName: lookup.displayName.trim() || existing?.displayName || key,
				email,
				jersey,
				parentName,
				parentPhone,
				parentEmail: email,
			});
		}

		this.players = Array.from(playerMap.values()).sort((a, b) =>
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
		const docId = (d.id as string).toLowerCase();
		const email = docId.includes('@') ? docId : (typeof data.playerEmail === 'string' ? data.playerEmail.trim().toLowerCase() : '');
		const displayName =
			(typeof data.displayName === 'string' && data.displayName.trim()) ||
			(typeof data.playerName === 'string' && data.playerName.trim()) ||
			(email ? email.split('@')[0] : docId);
		return {
			id: d.id,
			displayName,
			email,
			jersey: typeof data.jersey === 'string' ? data.jersey : '',
			parentName: typeof data.parentName === 'string' ? data.parentName : '',
			parentPhone: typeof data.parentPhone === 'string' ? data.parentPhone : '',
			parentEmail: typeof data.parentEmail === 'string' ? data.parentEmail : email,
		};
	}
}
