<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { db, auth } from '$lib/firebase.js';
	import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
	import TabBar from '$lib/components/TabBar.svelte';
	import RosterTab from '$lib/components/coach/RosterTab.svelte';
	import PlanTab from '$lib/components/coach/PlanTab.svelte';
	import EvalsTab from '$lib/components/coach/EvalsTab.svelte';
	import StrategyTab from '$lib/components/coach/StrategyTab.svelte';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import ToolsTab from '$lib/components/coach/ToolsTab.svelte';
	import MessagesTab from '$lib/components/coach/MessagesTab.svelte';
	import MatchDayTab from '$lib/components/coach/MatchDayTab.svelte';

	const TABS = [
		{ id: 'roster', label: '👥 Roster', icon: 'ph-users' },
		{ id: 'matchday', label: '⚽ Match Day', icon: 'ph-soccer-ball' },
		{ id: 'messages', label: '💬 Messages', icon: 'ph-chat-circle' },
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

	// Which teams to show
	const myTeams = $derived(() => {
		if (!teamsStore.loaded || !userEmail) return [];
		if (role === 'super_admin' || role === 'director') return teamsStore.teams;
		return teamsStore.getCoachTeams(userEmail);
	});

	const isDirectorView = $derived(role === 'super_admin' || role === 'director');

	const canOverrideEligibility = $derived(
		role === 'super_admin' || role === 'director',
	);

	// Auto-select first team
	$effect(() => {
		const teams = myTeams();
		if (teams.length > 0 && !selectedTeamId) {
			selectedTeamId = teams[0].id;
		}
	});

	// Load players when team changes
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
		} catch (e) { console.error(e); }
	};

	const onWorkoutSaved = () => workoutsStore.loadForTeam(selectedTeamId);
</script>

<div class="view-section">
	<h2 class="coach-header">Coaching Tools</h2>

	<!-- Director team selector -->
	{#if isDirectorView}
		<div class="card">
			<div class="card-header">Director Access</div>
			<div class="card-body">
				<label>View Team Data</label>
				<select bind:value={selectedTeamId}>
					{#each myTeams() as t}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</div>
		</div>
	{:else}
		<!-- Coach can only see their own teams -->
		{#if myTeams().length > 1}
			<div class="card">
				<div class="card-body">
					<select bind:value={selectedTeamId}>
						{#each myTeams() as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	{/if}

	<TabBar tabs={TABS} bind:activeTab variant="coach" />

	<div class="tab-content">
		{#if activeTab === 'roster'}
			<RosterTab teamId={selectedTeamId} teams={myTeams()} />
		{:else if activeTab === 'matchday'}
			<MatchDayTab
				teamId={selectedTeamId}
				canOverride={canOverrideEligibility}
			/>
		{:else if activeTab === 'messages'}
			<MessagesTab teamId={selectedTeamId} {players} />
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
	select { margin-bottom: 0; }
	.tab-content { margin-top: clamp(12px, 2vw, 20px); }
</style>
