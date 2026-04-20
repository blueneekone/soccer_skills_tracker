<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { db, auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
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
	import PlaybookModule from '$lib/components/coach/PlaybookModule.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	const TABS = [
		{ id: 'roster', label: '👥 Roster', icon: 'ph-users' },
		{ id: 'playbook', label: '📘 Playbook', icon: 'ph-book-open' },
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
	let coachInviteClaimTried = $state(false);

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');
	const clubId = $derived(authStore.userProfile?.clubId);

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

	// Phoenix: accept pending director invite — reserves → active seat + profile
	$effect(() => {
		if (role !== 'coach' || !userEmail || coachInviteClaimTried) return;
		coachInviteClaimTried = true;
		void claimCoachInvite({}).catch(() => {});
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

<div class="view-section locked-dashboard-view">
	<div class="coach-portal-title">
		{#if clubId}
			<ClubLogoMark size="lg" />
		{/if}
		<h2 class="coach-header coach-portal-title__h">Coaching Tools</h2>
	</div>

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
		{:else if activeTab === 'playbook'}
			<PlaybookModule teamId={selectedTeamId} />
		{:else if activeTab === 'matchday'}
			<MatchDayTab
				teamId={selectedTeamId}
				canOverride={canOverrideEligibility}
			/>
		{:else if activeTab === 'messages'}
			<MessagesTab teamId={selectedTeamId} {players} />
		{:else if activeTab === 'plan'}
			<PlanTab teamId={selectedTeamId} workouts={workoutsStore.workouts} />
		{:else if activeTab === 'evals'}
			<EvalsTab teamId={selectedTeamId} {players} workouts={workoutsStore.workouts} />
		{:else if activeTab === 'strategy'}
			<StrategyTab teamId={selectedTeamId} />
		{:else if activeTab === 'design'}
			<DrillDesignerTab teamId={selectedTeamId} workouts={workoutsStore.workouts} {onWorkoutSaved} />
		{:else if activeTab === 'tools'}
			<ToolsTab teamId={selectedTeamId} />
		{/if}
	</div>
</div>

<style>
	.coach-portal-title {
		display: flex;
		align-items: center;
		gap: clamp(10px, 2vw, 16px);
		flex-wrap: wrap;
		margin-bottom: clamp(12px, 2vw, 20px);
	}

	.coach-portal-title__h {
		margin: 0;
	}

	.coach-header {
		font-size: clamp(1.4rem, 4vw, 1.8rem);
		font-weight: 900;
	}
	select { margin-bottom: 0; }
	.tab-content { margin-top: clamp(12px, 2vw, 20px); }
</style>
