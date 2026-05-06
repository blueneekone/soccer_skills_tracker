<script>
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { createTacticalWarRoom } from '$lib/components/coach/TacticalEngine.svelte.ts';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { db } from '$lib/firebase.js';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

	/** @typedef {import('$lib/states/war-room/types').TacticalToken} TacticalToken */

	let selectedTeamId = $state('');
	let warRoomTool = $state(/** @type {'DRAG' | 'ROUTE'} */ ('DRAG'));

	// War-room token pools
	let wrBucketPitch = $state(/** @type {TacticalToken[]} */ ([]));
	let wrBucketXi = $state(/** @type {TacticalToken[]} */ ([]));
	let wrBucketBench = $state(/** @type {TacticalToken[]} */ ([]));
	let wrOppPitch = $state(/** @type {TacticalToken[]} */ ([]));
	let drawnRoutes = $state(/** @type {unknown[]} */ ([]));

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

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;

		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) selectedTeamId = pivot;
			return;
		}

		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) selectedTeamId = urlTeam;
			return;
		}

		if (!selectedTeamId) {
			selectedTeamId = teams[0].id;
		}
	});

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
					color: '#00f0ff',
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
							color: '#00f0ff',
						});
					});
				tokens.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
				wrBucketXi = tokens;
				return;
				}

			// ── Source 3: placeholder tokens so the board is usable ─────────
			wrBucketXi = Array.from({ length: 11 }, (_, i) => ({
					id: `${tid}_slot${i}`,
					name: `PLAYER ${String(i + 1).padStart(2, '0')}`,
					number: String(i + 1).padStart(2, '0'),
					position: '',
					side: /** @type {'friendly'} */ ('friendly'),
					color: '#00f0ff',
				}));
			} catch (e) {
				console.error('[War Room] roster load error:', e);
				// Placeholders on error so the board stays usable
				wrBucketXi = Array.from({ length: 11 }, (_, i) => ({
					id: `${tid}_fallback${i}`,
					name: `SLOT ${String(i + 1).padStart(2, '0')}`,
					number: String(i + 1).padStart(2, '0'),
					position: '',
					side: /** @type {'friendly'} */ ('friendly'),
					color: '#00f0ff',
				}));
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
	class="tw-fixed tw-inset-0 tw-overflow-hidden tw-bg-[#020202]"
	style="z-index: 1050;"
	in:scale={{ duration: 350, start: 0.97, easing: quintOut }}
>
	<TacticalArena model={engine} {warRoomTool} />
	<TacticalHUD model={engine} bind:warRoomTool />
</div>
