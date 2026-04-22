<script>
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { db, auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
	import RosterTab from '$lib/components/coach/RosterTab.svelte';
	import PlanTab from '$lib/components/coach/PlanTab.svelte';
	import EvalsTab from '$lib/components/coach/EvalsTab.svelte';
	import StrategyTab from '$lib/components/coach/StrategyTab.svelte';
	import DrillDesignerTab from '$lib/components/coach/DrillDesignerTab.svelte';
	import ToolsTab from '$lib/components/coach/ToolsTab.svelte';
	import MessagesTab from '$lib/components/coach/MessagesTab.svelte';
	import MatchDayTab from '$lib/components/coach/MatchDayTab.svelte';
	import PlaybookModule from '$lib/components/coach/PlaybookModule.svelte';
	import VerificationQueue from '$lib/components/coach/VerificationQueue.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import TeamLeaderboard from '$lib/components/tracker/TeamLeaderboard.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	const VALID_TABS = new Set([
		'home', 'roster', 'playbook', 'videos', 'matchday',
		'messages', 'plan', 'evals', 'strategy', 'design', 'tools',
	]);

	let activeTab = $state('home');
	let selectedTeamId = $state('');
	let players = $state([]);
	let coachInviteClaimTried = $state(false);

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');
	const clubId = $derived(authStore.userProfile?.clubId);

	// Coach workspace: assigned teams; Global Admin QA uses full loaded catalog from org scope.
	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const isDirectorView = $derived(
		role === 'super_admin' || role === 'global_admin' || role === 'director',
	);

	const canOverrideEligibility = $derived(
		role === 'super_admin' || role === 'global_admin' || role === 'director',
	);

	// Auto-select team: context store pivot (any role) → URL param → first available.
	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;

		// Priority 1: context store pivot — set by WorkspaceContextSwitcher for any role.
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) selectedTeamId = pivot;
			return;
		}

		// Priority 2: URL teamId param — survives hard refresh / direct link.
		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) selectedTeamId = urlTeam;
			return;
		}

		// Priority 3: default to first team when nothing else is available.
		if (!selectedTeamId) {
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

	$effect(() => {
		const t = page.url.searchParams.get('tab') || 'home';
		if (!VALID_TABS.has(t)) return;
		if (untrack(() => activeTab) !== t) activeTab = t;
	});
</script>

<div class="ec-page ec-coach">
	<!-- Main canvas: sidebar navigation handles all tab switching -->
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6 tw-items-stretch">
		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-8">
			{#if activeTab === 'home'}
				<div class="coach-portal-title">
					{#if clubId}
						<ClubLogoMark size="lg" />
					{/if}
					<h2 class="coach-header coach-portal-title__h">Coaching Tools</h2>
				</div>
				<ActionInbox clubId={clubId || ''} teamId={selectedTeamId} />
				<CoachTeamXpVelocityChart teamId={selectedTeamId} />
				<div class="coach-home-grid">
					<div class="ec-panel coach-home-card">
						<div class="coach-home-card__head">Team leaderboard snapshot</div>
						<TeamLeaderboard teamIdForStaff={selectedTeamId} compact />
					</div>
					<div class="ec-panel coach-home-card">
						<div class="coach-home-card__head">Roster snapshot</div>
						{#if players.length === 0}
							<p class="coach-home-card__empty">No roster data yet for this team.</p>
						{:else}
							<ul class="coach-home-roster" aria-label="Roster snapshot">
								{#each players.slice(0, 12) as playerName (playerName)}
									<li>{playerName}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{:else if activeTab === 'roster'}
				<RosterTab teamId={selectedTeamId} teams={myTeams} />
			{:else if activeTab === 'playbook'}
				<PlaybookModule teamId={selectedTeamId} />
			{:else if activeTab === 'videos'}
				<VerificationQueue teamId={selectedTeamId} />
			{:else if activeTab === 'matchday'}
				<MatchDayTab
					teamId={selectedTeamId}
					canOverride={canOverrideEligibility}
				/>
			{:else if activeTab === 'messages'}
				<MessagesTab teamId={selectedTeamId} {players} clubId={clubId || ''} />
			{:else if activeTab === 'plan'}
				<PlanTab teamId={selectedTeamId} workouts={workoutsStore.workouts} />
			{:else if activeTab === 'evals'}
				<EvalsTab teamId={selectedTeamId} {players} workouts={workoutsStore.workouts} />
			{:else if activeTab === 'strategy'}
				<StrategyTab teamId={selectedTeamId} />
			{:else if activeTab === 'design'}
				<DrillDesignerTab teamId={selectedTeamId} workouts={workoutsStore.workouts} {onWorkoutSaved} />
			{:else if activeTab === 'tools'}
				<ToolsTab teamId={selectedTeamId} clubId={clubId || ''} />
			{/if}
		</div>

		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-4">
			{#if isDirectorView}
				<div class="ec-panel ec-coach__select">
					<div class="ec-coach__select-head">Director Access</div>
					<div class="ec-coach__select-body">
						<label class="ec-coach__label" for="coach-dir-team">View Team Data</label>
						<select id="coach-dir-team" bind:value={selectedTeamId}>
							{#each myTeams as t (t.id)}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else if myTeams.length > 1}
				<div class="ec-panel ec-coach__select">
					<div class="ec-coach__select-body">
						<label class="ec-coach__label" for="coach-team-pick">Team</label>
						<select id="coach-team-pick" bind:value={selectedTeamId} aria-label="Select team">
							{#each myTeams as t (t.id)}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.ec-coach {
		padding-bottom: 8px;
	}

	.ec-coach__select {
		padding: 0;
		margin-bottom: 0;
		overflow: hidden;
	}

	.ec-coach__select-head {
		padding: 10px 14px;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: #ffffff;
	}

	:global(html.dark) .ec-coach__select-head {
		border-bottom-color: rgba(255, 255, 255, 0.08);
		background: #09090b;
	}

	.ec-coach__select-body {
		padding: 12px 14px;
		background: #ffffff;
	}

	:global(html.dark) .ec-coach__select-body {
		background: #09090b;
	}

	.ec-coach__label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 6px;
		color: var(--text-secondary);
	}

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

	.coach-home-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 12px;
		align-items: stretch;
	}

	.coach-home-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 1.25rem;
	}

	.coach-home-card__head {
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.coach-home-card__empty {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.coach-home-roster {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		flex: 1 1 auto;
	}

	.coach-home-roster li {
		border: 1px solid #e5e5e5;
		border-radius: 10px;
		background: #fafafa;
		padding: 8px 10px;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	:global(html.dark) .coach-home-roster li {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}


</style>
