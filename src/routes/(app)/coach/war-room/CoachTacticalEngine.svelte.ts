import { untrack } from 'svelte';
import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
import { createTacticalWarRoom } from '$lib/components/coach/TacticalEngine.svelte.js';
import { db } from '$lib/firebase.js';
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import type { TacticalToken } from '$lib/states/war-room/types.js';
import { page } from '$app/state';

export class CoachTacticalEngine {
	teamScope = new CoachTeamScope({
		preferUrlTeamId: () => page.url.searchParams.get('teamId'),
		includeDirector: false,
	});

	warRoomTool = $state<'DRAG' | 'ROUTE'>('DRAG');

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
		const tid = this.teamScope.selectedTeamId;
		const uid = authStore.user?.uid;
		if (!tid || !uid || !cartridge?.id) return;
		try {
			const shortId = String(cartridge.id).slice(0, 8).toUpperCase();
			const docRef = doc(db, 'teams', tid, 'tactics', `play_${shortId}_${Date.now()}`);
			await setDoc(docRef, {
				name: `Deployed ${shortId}`,
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
		this.boardLoadComplete = false;
		try {
			const snap = await getDoc(doc(db, 'teams', tid, 'tactics', `wr_${uid}`));
			if (snap.exists()) {
				const c = snap.data()?.cartridge;
				if (c && Array.isArray(c.entities)) {
					this.wrBucketPitch = c.entities
						.filter((e: any) => e.side !== 'opponent')
						.map((e: any) => ({ ...e }));
					this.wrOppPitch = c.entities
						.filter((e: any) => e.side === 'opponent')
						.map((e: any) => ({ ...e }));
					this.drawnRoutes = Array.isArray(c.routes) ? c.routes.map((r: any) => ({ ...r })) : [];
				}
			}
		} catch (e) {
			console.error('[War Room] load error:', e);
		}
		this.boardLoadComplete = true;
	}

	async _loadRosters(tid: string) {
		try {
			const snap = await getDoc(doc(db, 'rosters', tid));
			const rostersNames = (
				snap.exists() && Array.isArray(snap.data()?.players)
					? snap.data()!.players
					: []
			)
				.map((x: any) => String(x).trim())
				.filter(Boolean);

			if (rostersNames.length) {
				this.wrBucketXi = rostersNames.map((name: any, i: number) => ({
					id: `${tid}_p${i}`,
					name,
					number: String(i + 1).padStart(2, '0'),
					position: '',
					side: 'friendly',
					color: '#14b8a6',
				}));
				return;
			}

			if (!db || !authStore.isAuthenticated) return;
			const lookupSnap = await getDocs(
				query(collection(db, 'player_lookup'), where('teamId', '==', tid)),
			);

			if (lookupSnap.size > 0) {
				const tokens: TacticalToken[] = [];
				let idx = 0;
				lookupSnap.forEach((d) => {
					const data = d.data();
					const name =
						typeof data.playerName === 'string' && data.playerName.trim()
							? data.playerName.trim()
							: d.id;
					tokens.push({
						id: `${tid}_${d.id}`,
						name,
						number: String(++idx).padStart(2, '0'),
						position: typeof data.position === 'string' ? data.position : '',
						side: 'friendly',
						color: '#14b8a6',
					});
				});
				tokens.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
				this.wrBucketXi = tokens;
				return;
			}

			this.wrBucketXi = [];
		} catch (e) {
			console.error('[War Room] roster load error:', e);
			this.wrBucketXi = [];
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				untrack(() => {
					this.teamScope.syncSelectedTeam();
				});
			});

			$effect(() => {
				this.wrBucketPitch; this.wrOppPitch; this.drawnRoutes;
				this.scheduleSave();
			});

			$effect(() => {
				const tid = this.teamScope.selectedTeamId;
				if (!tid || authStore.isLoading || !authStore.user?.uid) return;
				untrack(() => void this._loadBoardState(tid, authStore.user!.uid));
			});

			$effect(() => {
				const tid = this.teamScope.selectedTeamId;
				if (!tid) return;
				untrack(() => void this._loadRosters(tid));
			});

			return () => {
				if (this._saveTimer !== null) clearTimeout(this._saveTimer);
			};
		});
	}
}
