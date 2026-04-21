<script>
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';
	import { db, auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
	import TabBar from '$lib/components/TabBar.svelte';
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

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	const TABS = [
		{ id: 'roster', label: '👥 Roster', icon: 'ph-users' },
		{ id: 'playbook', label: '📘 Playbook', icon: 'ph-book-open' },
		{ id: 'videos', label: '🎬 Videos', icon: 'ph-video-camera' },
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

	// Coach workspace: only teams this user heads or assists — never the full org catalog.
	const myTeams = $derived(() => {
		if (!teamsStore.loaded || !userEmail) return [];
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

	$effect(() => {
		const t = $page.url.searchParams.get('tab') || 'roster';
		if (!TABS.some((x) => x.id === t)) return;
		if (untrack(() => activeTab) !== t) activeTab = t;
	});

	/**
	 * @param {string} id
	 */
	function onCoachTabPick(id) {
		goto(`/coach?tab=${encodeURIComponent(id)}`, { replaceState: true, noScroll: true });
	}
</script>

<div class="ec-page ec-coach">
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-8">
			<div class="coach-portal-title">
				{#if clubId}
					<ClubLogoMark size="lg" />
				{/if}
				<h2 class="coach-header coach-portal-title__h">Coaching Tools</h2>
			</div>

			<ActionInbox clubId={clubId || ''} teamId={selectedTeamId} />
			<CoachTeamXpVelocityChart teamId={selectedTeamId} />

			<TabBar tabs={TABS} bind:activeTab variant="coach" onPick={onCoachTabPick} />

			<div class="tab-content">
				{#if activeTab === 'roster'}
					<RosterTab teamId={selectedTeamId} teams={myTeams()} />
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
		</div>

		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-4">
			{#if isDirectorView}
				<div class="ec-panel ec-coach__select">
					<div class="ec-coach__select-head">Director Access</div>
					<div class="ec-coach__select-body">
						<label class="ec-coach__label" for="coach-dir-team">View Team Data</label>
						<select id="coach-dir-team" bind:value={selectedTeamId}>
							{#each myTeams() as t}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else if myTeams().length > 1}
				<div class="ec-panel ec-coach__select">
					<div class="ec-coach__select-body">
						<label class="ec-coach__label" for="coach-team-pick">Team</label>
						<select id="coach-team-pick" bind:value={selectedTeamId} aria-label="Select team">
							{#each myTeams() as t}
								<option value={t.id}>{t.name}</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}

			<div class="ec-panel ec-coach-quick">
				<div class="ec-coach-quick__inner">
					<div class="ec-coach-quick__head">Quick navigation</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
					{#each [
						{ id: 'roster', label: 'Roster' },
						{ id: 'playbook', label: 'Playbook' },
						{ id: 'matchday', label: 'Match Day' },
						{ id: 'plan', label: 'Plan' }
					] as q}
						<button
							type="button"
							class="ec-coach-quick__btn"
							onclick={() => onCoachTabPick(q.id)}
						>
							{q.label}
						</button>
					{/each}
					</div>
				</div>
			</div>
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
	.tab-content { margin-top: clamp(12px, 2vw, 20px); }

	.ec-coach-quick {
		padding: 0;
		overflow: hidden;
	}

	.ec-coach-quick__inner {
		padding: 14px 16px;
		background: #ffffff;
	}

	:global(html.dark) .ec-coach-quick__inner {
		background: #09090b;
	}

	.ec-coach-quick__head {
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.ec-coach-quick__btn {
		text-align: left;
		width: 100%;
		border-radius: 10px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		padding: 10px 12px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		transition: background 0.15s ease-out;
	}

	.ec-coach-quick__btn:hover {
		background: #ffffff;
	}

	:global(html.dark) .ec-coach-quick__btn {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
	}

	:global(html.dark) .ec-coach-quick__btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
