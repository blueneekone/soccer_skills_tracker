<svelte:head>
	<!-- Prevent accidental pinch-zoom on the tactical board touch canvas -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
</svelte:head>

<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { CoachTeamScope } from '$lib/coach/context/coachTeamScope.svelte.js';
	import { createTacticalWarRoom } from '$lib/components/coach/TacticalEngine.svelte.ts';
	import '$lib/styles/coach-tactics-stratagem.css';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { db } from '$lib/firebase.js';
	import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/** @typedef {import('$lib/states/war-room/types').TacticalToken} TacticalToken */
	/** @typedef {import('$lib/states/war-room/types').TacticalCartridge} TacticalCartridge */

	let selectedTeamId = $state('');
	let warRoomTool = $state(/** @type {'DRAG' | 'ROUTE'} */ ('DRAG'));

	const teamScope = new CoachTeamScope({
		preferUrlTeamId: () => page.url.searchParams.get('teamId'),
		includeDirector: false,
	});
	$effect(() => {
		teamScope.syncSelectedTeam();
		selectedTeamId = teamScope.selectedTeamId;
	});

	// War-room token pools
	let wrBucketPitch = $state(/** @type {TacticalToken[]} */ ([]));
	let wrBucketXi = $state(/** @type {TacticalToken[]} */ ([]));
	let wrBucketBench = $state(/** @type {TacticalToken[]} */ ([]));
	let wrOppPitch = $state(/** @type {TacticalToken[]} */ ([]));
	let drawnRoutes = $state(/** @type {unknown[]} */ ([]));

	// ── Persistence ───────────────────────────────────────────────────────────
	// Board state is persisted to teams/{teamId}/tactics/wr_{uid} — a per-coach
	// singleton inside the existing `tactics` sub-collection, which already has
	// coach/director-scoped rules (Epic 2.3).  Using a per-coach doc ID avoids
	// the createdBy ownership conflict in the update rule.

	/** Set to true once the initial Firestore load attempt has completed. Prevents
	 *  the auto-save effect from saving half-hydrated state on first render. */
	let boardLoadComplete = $state(false);
	/** @type {ReturnType<typeof setTimeout> | null} */
	let _saveTimer = null;

	/** Persist current board state to Firestore (debounce-called). */
	async function saveBoardState() {
		const tid = selectedTeamId;
		const uid = authStore.user?.uid;
		if (!tid || !uid) return;
		try {
			const cartridge = engine.serializeToCartridge();
			const docRef = doc(db, 'teams', tid, 'tactics', `wr_${uid}`);
			await setDoc(
				docRef,
				{
					name: 'warRoom',
					canvasState: JSON.stringify({ entities: cartridge.entities, routes: cartridge.routes }),
					createdBy: uid,
					updatedAt: serverTimestamp(),
					teamId: tid,
					clubId: teamScope.teamClubId || null,
					cartridge,
				},
				{ merge: true },
			);
		} catch (e) {
			console.error('[War Room] save error:', e);
		}
	}

	/** DEPLOY PLAY — persist a named tactic snapshot (rules-compliant create). */
	async function deployPlay(cartridge) {
		const tid = selectedTeamId;
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
				clubId: teamScope.teamClubId || null,
				cartridge,
				deployedAt: serverTimestamp(),
			});
			// Keep the working board in sync with the deployed snapshot.
			await saveBoardState();
		} catch (e) {
			console.error('[War Room] deploy error:', e);
		}
	}

	/** Schedule a debounced save (1.5 s quiet period). Skipped before initial load. */
	function scheduleSave() {
		if (!boardLoadComplete) return;
		if (_saveTimer !== null) clearTimeout(_saveTimer);
		_saveTimer = setTimeout(() => {
			_saveTimer = null;
			void saveBoardState();
		}, 1500);
	}

	// Auto-save: re-runs whenever any of the three board state signals change.
	// Each of these is a $state array that is *replaced* (not mutated) by the engine,
	// so accessing the variables registers reactive dependencies correctly.
	$effect(() => {
		// Accessing these signals registers them as dependencies.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		wrBucketPitch; wrOppPitch; drawnRoutes;
		scheduleSave();
	});

	// Load board state from Firestore when the selected team becomes known.
	// Hydrates pitch + opp tokens and routes directly so wrBucketXi (roster)
	// is left untouched — the roster load effect populates Xi independently.
	$effect(() => {
		const tid = selectedTeamId;
		if (!tid) return;

		boardLoadComplete = false;

		void (async () => {
			try {
				const uid = authStore.user?.uid;
				if (uid) {
					const snap = await getDoc(doc(db, 'teams', tid, 'tactics', `wr_${uid}`));
					if (snap.exists()) {
						const c = /** @type {any} */ (snap.data()?.cartridge);
						if (c && Array.isArray(c.entities)) {
							wrBucketPitch = c.entities
								.filter(/** @param {any} e */ (e) => e.side !== 'opponent')
								.map(/** @param {any} e */ (e) => ({ ...e }));
							wrOppPitch = c.entities
								.filter(/** @param {any} e */ (e) => e.side === 'opponent')
								.map(/** @param {any} e */ (e) => ({ ...e }));
							drawnRoutes = Array.isArray(c.routes) ? c.routes.map(/** @param {any} r */ (r) => ({ ...r })) : [];
						}
					}
				}
			} catch (e) {
				console.error('[War Room] load error:', e);
			}
			boardLoadComplete = true;
		})();
	});

	// TacticalGridHost — reactive accessors wrapping $state vars
	const host = {
		showTacticalOverlay: {
			get: () => true,
			set: /** @param {boolean} _v */ (_v) => {},
		},
		warRoomTool: {
			get: () => warRoomTool,
			set: /** @param {'DRAG' | 'ROUTE'} v */ (v) => { warRoomTool = v; },
		},
		wrBucketPitch: {
			get: () => wrBucketPitch,
			set: /** @param {TacticalToken[]} v */ (v) => { wrBucketPitch = v; },
		},
		wrBucketXi: {
			get: () => wrBucketXi,
			set: /** @param {TacticalToken[]} v */ (v) => { wrBucketXi = v; },
		},
		wrBucketBench: {
			get: () => wrBucketBench,
			set: /** @param {TacticalToken[]} v */ (v) => { wrBucketBench = v; },
		},
		wrOppPitch: {
			get: () => wrOppPitch,
			set: /** @param {TacticalToken[]} v */ (v) => { wrOppPitch = v; },
		},
		drawnRoutes: {
			get: () => drawnRoutes,
			set: /** @param {unknown[]} v */ (v) => { drawnRoutes = v; },
		},
	};

	const engine = createTacticalWarRoom(host);

	// Load team roster into wrBucketXi whenever the selected team changes.
	// Strategy: rosters/{tid} → player_lookup collection → numbered placeholders.
	$effect(() => {
		const tid = selectedTeamId;
		if (!tid) return;

		void (async () => {
			try {
				// ── Source 1: rosters/{teamId} doc with players:string[] ────────
			const snap = await getDoc(doc(db, 'rosters', tid));
			const rostersNames = /** @type {string[]} */ (
					snap.exists() && Array.isArray(snap.data()?.players)
						? snap.data().players
						: []
				)
					.map((x) => String(x).trim())
					.filter(Boolean);

				if (rostersNames.length) {
				wrBucketXi = rostersNames.map((name, i) => ({
					id: `${tid}_p${i}`,
					name,
					number: String(i + 1).padStart(2, '0'),
					position: '',
					side: /** @type {'friendly'} */ ('friendly'),
					color: '#14b8a6',
				}));
				return;
				}

				// ── Source 2: player_lookup collection keyed by teamId ───────────
			const lookupSnap = await getDocs(
				query(collection(db, 'player_lookup'), where('teamId', '==', tid)),
			);

			if (lookupSnap.size > 0) {
					/** @type {TacticalToken[]} */
					const tokens = [];
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
							side: /** @type {'friendly'} */ ('friendly'),
							color: '#14b8a6',
						});
					});
				tokens.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
				wrBucketXi = tokens;
				return;
				}

			// ── Source 3: no roster yet — leave the bench empty (no fake players).
			//    The board stays usable for drawing; coach loads a real roster to populate.
			wrBucketXi = [];
			} catch (e) {
				console.error('[War Room] roster load error:', e);
				wrBucketXi = [];
			}
		})();
	});
</script>

<svelte:window onkeydown={engine.handleKeyDown} />

<!--
  War Room Mounting Shell — immersive fullscreen console overlay.
  position:fixed + inset:0 gives the SVG a guaranteed viewport-sized box so
  coordinate math, radial hub, and route drawing all work correctly.
  z-index 1050: above sidebar(50), topbar(60), context-switcher(1000);
  below command palette(9999) so Cmd+K remains accessible.
-->
<div
	class="coach-tactics-shell tw-fixed tw-inset-0 tw-overflow-hidden"
	style="z-index: 1050;"
	in:scale={{ duration: 350, start: 0.97, easing: quintOut }}
>
	<TacticalArena model={engine} {warRoomTool} />
	<TacticalHUD model={engine} bind:warRoomTool ondeploy={deployPlay} />

	<button
		type="button"
		class="coach-tac-exit coach-os-action-chip"
		aria-label="Exit War Room"
		onclick={() => goto('/coach')}
	>
		✕ Exit War Room
	</button>
</div>
