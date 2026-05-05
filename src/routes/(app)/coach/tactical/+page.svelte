<script>
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { createTacticalWarRoom } from '$lib/components/coach/TacticalEngine.svelte.ts';
	import TacticalArena from '$lib/components/coach/TacticalArena.svelte';
	import TacticalHUD from '$lib/components/coach/TacticalHUD.svelte';

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
</script>

<div class="tw-relative tw-w-full tw-h-screen tw-overflow-hidden">
	<TacticalArena model={engine} {warRoomTool} />
	<TacticalHUD model={engine} bind:warRoomTool />
</div>
