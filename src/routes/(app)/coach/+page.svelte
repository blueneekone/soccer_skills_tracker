<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
	import TabBar from '$lib/components/TabBar.svelte';
	import RosterTab from '$lib/components/coach/RosterTab.svelte';
	import PlanTab from '$lib/components/coach/PlanTab.svelte';
	import EvalsTab from '$lib/components/coach/EvalsTab.svelte';
	import StrategyTab from '$lib/components/coach/StrategyTab.svelte';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import ToolsTab from '$lib/components/coach/ToolsTab.svelte';

	const TABS = [
		{ id: 'roster', label: '👥 Roster', icon: 'ph-users' },
		{ id: 'plan', label: '📅 Plan', icon: 'ph-calendar' },
		{ id: 'evals', label: '📋 Evals', icon: 'ph-clipboard-text' },
		{ id: 'strategy', label: '🖌️ Strategy', icon: 'ph-paint-brush' },
		{ id: 'design', label: '📐 Drill Designer', icon: 'ph-ruler' },
		{ id: 'tools', label: '⚙️ Tools', icon: 'ph-gear' }
	];

	let activeTab = $state('roster');
	let selectedTeamId = $state('');
	let players = $state([]);

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');

	// Plain $derived value — reactive to teamsStore.loaded, role, userEmail
	const myTeams = $derived(
		!teamsStore.loaded || !userEmail
			? []
			: role === 'super_admin' || role === 'director'
				? teamsStore.teams
				: teamsStore.getCoachTeams(userEmail)
	);

	const isDirectorView = $derived(role === 'super_admin' || role === 'director');

	// Auto-select first team once myTeams is populated
	$effect(() => {
		if (myTeams.length > 0 && !selectedTeamId) {
			selectedTeamId = myTeams[0].id;
		}
	});

	// Reload workouts and players when selected team changes
	$effect(() => {
		if (!selectedTeamId) return;
		workoutsStore.loadForTeam(selectedTeamId);
		loadPlayers(selectedTeamId);
	});

	const loadPlayers = async (tid) => {
		try {
			const [statsSnap, rosterSnap] = await Promise.all([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', tid))),
				getDoc(doc(db, 'rosters', tid))
			]);
			const names = new Set();
			statsSnap.forEach((d) => names.add(d.id));
			if (rosterSnap.exists()) (rosterSnap.data().players || []).forEach((p) => names.add(p));
			players = Array.from(names).sort();
		} catch (e) {
			console.error(e);
		}
	};

	const onWorkoutSaved = () => workoutsStore.loadForTeam(selectedTeamId);
</script>

<div class="view-section">
	<h2 class="coach-header">Coaching Tools</h2>

	{#if isDirectorView}
		<!-- Super Admin / Director: pick any team -->
		<div class="card">
			<div class="card-header">Director Access</div>
			<div class="card-body">
				<label for="dirTeamSelect">View Team Data</label>
				<select id="dirTeamSelect" bind:value={selectedTeamId}>
					{#if myTeams.length === 0}
						<option value="">Loading teams...</option>
					{:else}
						{#each myTeams as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					{/if}
				</select>
			</div>
		</div>
	{:else if myTeams.length > 1}
		<!-- Coach with multiple teams -->
		<div class="card">
			<div class="card-body">
				<label for="coachTeamSelect">Select Team</label>
				<select id="coachTeamSelect" bind:value={selectedTeamId}>
					{#each myTeams as t}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	<TabBar tabs={TABS} bind:activeTab variant="coach" />

	<div class="tab-content">
		{#if activeTab === 'roster'}
			<RosterTab teamId={selectedTeamId} teams={myTeams} />
		{:else if activeTab === 'plan'}
			<PlanTab teamId={selectedTeamId} workouts={workoutsStore.workouts} {players} />
		{:else if activeTab === 'evals'}
			<EvalsTab teamId={selectedTeamId} {players} workouts={workoutsStore.workouts} />
		{:else if activeTab === 'strategy'}
			<StrategyTab />
		{:else if activeTab === 'design'}
			<DrillDesignerTab teamId={selectedTeamId} workouts={workoutsStore.workouts} {onWorkoutSaved} />
		{:else if activeTab === 'tools'}
			<ToolsTab teamId={selectedTeamId} />
		{/if}
	</div>
</div>

<style>
	.coach-header {
		font-size: clamp(1.4rem, 4vw, 1.8rem);
		font-weight: 900;
		margin-bottom: clamp(12px, 2vw, 20px);
	}
	select {
		margin-bottom: 0;
	}
	.tab-content {
		margin-top: clamp(12px, 2vw, 20px);
	}
</style>
