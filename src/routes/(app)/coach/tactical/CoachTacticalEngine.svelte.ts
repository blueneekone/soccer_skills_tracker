import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { createTacticalWarRoom } from '$lib/components/coach/TacticalEngine.svelte.js';
import { db } from '$lib/firebase.js';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import type { TacticalToken } from '$lib/states/war-room/types.js';
import { fetchWarRoomRosterTokens } from '$lib/states/war-room/tacticalWarRoomApi.js';
import { page } from '$app/state';
import { untrack } from 'svelte';

export class CoachTacticalEngine {
	isSandbox: boolean = false;

	teamScope = new CoachTeamScope({
		preferUrlTeamId: () => page.url.searchParams.get('teamId'),
		includeDirector: true,
	});

	constructor(opts: { isSandbox?: boolean } = {}) {
		this.isSandbox = !!opts.isSandbox;
	}

	warRoomTool = $state<'DRAG' | 'ROUTE'>('DRAG');
	isHalfField = $state(false);
	isToolbarVisible = $state(true);

	wrBucketPitch = $state<TacticalToken[]>([]);
	wrBucketXi = $state<TacticalToken[]>([]);
	wrBucketBench = $state<TacticalToken[]>([]);
	wrOppPitch = $state<TacticalToken[]>([]);
	drawnRoutes = $state<unknown[]>([]);

	boardLoadComplete = $state(false);
	private _saveTimer: ReturnType<typeof setTimeout> | null = null;

	// TacticalGridHost wrapper
	host = {
		showTacticalOverlay: {
			get: () => true,
			set: (_v: boolean) => {},
		},
		warRoomTool: {
			get: () => this.warRoomTool,
			set: (v: 'DRAG' | 'ROUTE') => { this.warRoomTool = v; },
		},
		wrBucketPitch: {
			get: () => this.wrBucketPitch,
			set: (v: TacticalToken[]) => { this.wrBucketPitch = v; },
		},
		wrBucketXi: {
			get: () => this.wrBucketXi,
			set: (v: TacticalToken[]) => { this.wrBucketXi = v; },
		},
		wrBucketBench: {
			get: () => this.wrBucketBench,
			set: (v: TacticalToken[]) => { this.wrBucketBench = v; },
		},
		wrOppPitch: {
			get: () => this.wrOppPitch,
			set: (v: TacticalToken[]) => { this.wrOppPitch = v; },
		},
		drawnRoutes: {
			get: () => this.drawnRoutes,
			set: (v: unknown[]) => { this.drawnRoutes = v; },
		},
	};

	gridEngine = createTacticalWarRoom(this.host);

	async saveBoardState() {
		if (this.isSandbox) return;
		const tid = this.teamScope.selectedTeamId;
		const uid = authStore.user?.uid;
		if (!tid || !uid) return;
		try {
			const cartridge = this.gridEngine.serializeToCartridge();
			const docRef = doc(db, 'teams', tid, 'tactics', `wr_${uid}`);
			await setDoc(
				docRef,
				{
					name: 'warRoom',
					canvasState: JSON.stringify({ entities: cartridge.entities, routes: cartridge.routes }),
					createdBy: uid,
					updatedAt: serverTimestamp(),
					teamId: tid,
					clubId: this.teamScope.teamClubId || null,
					cartridge,
				},
				{ merge: true },
			);
		} catch (e) {
			console.error('[War Room] save error:', e);
		}
	}

	async deployPlay(cartridge: any) {
		if (this.isSandbox) return;
		const tid = this.teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId;
		const uid = authStore.user?.uid;
		if (!tid || !uid || !cartridge?.id) return;
		try {
			const shortId = String(cartridge.id).slice(0, 8).toUpperCase();
			const docRef = doc(db, 'teams', tid, 'tactics', cartridge.id);
			await setDoc(docRef, {
				id: cartridge.id,
				name: cartridge.title || `Tactical Play ${shortId}`,
				canvasState: JSON.stringify({ entities: cartridge.entities, routes: cartridge.routes }),
				createdBy: uid,
				updatedAt: serverTimestamp(),
				teamId: tid,
				clubId: this.teamScope.teamClubId || null,
				cartridge,
				deployedAt: serverTimestamp(),
			});
			await this.saveBoardState();
		} catch (e) {
			console.error('[War Room] deploy error:', e);
		}
	}

	scheduleSave() {
		if (!this.boardLoadComplete) return;
		if (this._saveTimer !== null) clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => {
			this._saveTimer = null;
			void this.saveBoardState();
		}, 1500);
	}

	async _loadBoardState(tid: string, uid: string) {
		if (this.isSandbox) {
			this.wrOppPitch = [];
			this.boardLoadComplete = true;
			return;
		}
		const isE2e = typeof localStorage !== 'undefined' && localStorage.getItem('sstracker_e2e_bypass') === 'true';
		if ((!db || !authStore.isAuthenticated) && !isE2e) return;
		this.boardLoadComplete = false;
		try {
			const snap = await getDoc(doc(db, 'teams', tid, 'tactics', `wr_${uid}`));
			if (snap.exists()) {
				const c = snap.data()?.cartridge;
				if (c && Array.isArray(c.entities)) {
					this.wrBucketPitch = c.entities
						.filter((e: any) => e.side !== 'opponent')
						.map((e: any) => ({ ...e }));
					// Completely purge legacy auto-seeded opponent tokens (opp_0 .. opp_10)
					this.wrOppPitch = c.entities
						.filter((e: any) => e.side === 'opponent' && !/^opp_\d+$/.test(e.id) && !e.id.startsWith('opp_'))
						.map((e: any) => ({
							...e,
							number: e.position || 'OP',
						}));
					this.drawnRoutes = Array.isArray(c.routes) ? c.routes.map((r: any) => ({ ...r })) : [];
				}
			} else {
				// Clean pitch on first open — start with zero opponent clutter
				this.wrOppPitch = [];
			}
		} catch (e) {
			console.error('[War Room] load error:', e);
			this.wrOppPitch = [];
		}
		this.boardLoadComplete = true;
	}

	async _loadRosters(tid: string) {
		const getTwoLetterInitials = (name: string): string => {
			if (!name) return 'PL';
			const parts = name.trim().split(/\s+/);
			if (parts.length >= 2) {
				return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
			}
			return name.slice(0, 2).toUpperCase() || 'PL';
		};

		if (this.isSandbox) {
			try {
				const mockData = await import('$lib/mock/trialRoster.json');
				const roster = mockData.default || mockData;

				this.wrBucketXi = roster.map((p: any) => ({
					id: p.id,
					name: p.name,
					number: p.jerseyNumber || getTwoLetterInitials(p.name),
					position: p.position || '',
					side: 'friendly',
					color: '#14b8a6'
				}));
			} catch (e) {
				console.error('[War Room Sandbox] mock roster load error:', e);
				this.wrBucketXi = [];
			}
			return;
		}

		const isE2e = typeof localStorage !== 'undefined' && localStorage.getItem('sstracker_e2e_bypass') === 'true';
		if ((!db || !authStore.isAuthenticated) && !isE2e) return;
		try {
			const effectiveTeamId = tid || this.teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId || '';
			if (!effectiveTeamId) return;

			const tokens = await fetchWarRoomRosterTokens(
				db,
				effectiveTeamId,
				getDocs,
				getDoc,
				collection,
				doc,
				query,
				where
			);
			this.wrBucketXi = tokens;
		} catch (e) {
			console.error('[War Room] roster load error:', e);
			this.wrBucketXi = [];
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				this.teamScope.syncSelectedTeam();
			});

			$effect(() => {
				this.wrBucketPitch; this.wrOppPitch; this.drawnRoutes;
				untrack(() => {
					this.scheduleSave();
				});
			});

			$effect(() => {
				const isE2e = typeof localStorage !== 'undefined' && localStorage.getItem('sstracker_e2e_bypass') === 'true';
				const tid = this.teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId || (isE2e ? 'e2e-team' : null);
				const uid = authStore.user?.uid || (isE2e ? 'e2e-user' : null);
				if (!tid || authStore.isLoading || !uid) return;
				untrack(() => {
					void this._loadBoardState(tid, uid);
				});
			});

			$effect(() => {
				const isE2e = typeof localStorage !== 'undefined' && localStorage.getItem('sstracker_e2e_bypass') === 'true';
				const tid = this.teamScope.selectedTeamId || authStore.teamId || authStore.user?.teamId || (isE2e ? 'e2e-team' : null);
				if (!tid) return;
				untrack(() => {
					void this._loadRosters(tid);
				});
			});

			return () => {
				if (this._saveTimer !== null) clearTimeout(this._saveTimer);
			};
		});
	}
}
