<script>
	import { goto } from '$app/navigation';
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { collection, query, where, getDocs, doc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';
	import { clubSportIconSuffix } from '$lib/utils/sport-icon.js';
	import DashCard from '$lib/components/DashCard.svelte';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import ElitePlayerDashboard from '$lib/components/ElitePlayerDashboard.svelte';
	import ActiveAssignmentsInbox from '$lib/components/ActiveAssignmentsInbox.svelte';
	import VideoTrialUploader from '$lib/components/player/VideoTrialUploader.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';

	const completeAssignmentStatus = httpsCallable(functions, 'completeAssignmentStatus');

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role);
	/** Aligns with route-policies athlete-only routes (player + troubleshooting admin). */
	const showAthleteHomeCards = $derived(role === 'player' || role === 'super_admin');

	const displayName = $derived(
		profile?.playerName ||
		(role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Athlete')
	);
	const firstName = $derived((displayName || '').split(' ')[0] || displayName);

	const effectiveTid = $derived(
		role === 'super_admin' || role === 'director' || role === 'registrar'
			? null
			: profile?.teamId
	);

	let scheduleItems = $state([]);
	let homeworkItems = $state([]);
	let scheduleLoading = $state(true);
	let hwLoading = $state(true);
	let show250Banner = $state(false);

	let statsMiniMins = $state(0);
	let statsMiniSessions = $state(0);
	let statsMiniLoading = $state(false);

	const welcomeSportIcon = $derived(clubSportIconSuffix(clubBrandingStore.sport));
	const showPlayerStatsBento = $derived(
		showAthleteHomeCards && role === 'player' && profile?.playerName && profile?.teamId && profile.teamId !== 'admin'
	);
	const showElitePlayerDash = $derived(
		role === 'player' && profile?.teamId && profile.teamId !== 'admin'
	);
	const statsMiniXp = $derived(Math.floor(statsMiniMins * 2));

	// Check for 250 XP challenge unlock banner
	$effect(() => {
		if (profile && !profile.hasViewedBasicsChallenge) {
			// Will be populated by stats load; we do a lightweight check
			show250Banner = false; // Reset; stats page sets this
		}
	});

	// Load schedule
	$effect(() => {
		if (!effectiveTid) { scheduleLoading = false; return; }
		const tid = effectiveTid;
		scheduleLoading = true;
		getDocs(query(collection(db, 'schedules'), where('teamId', '==', tid)))
			.then((snap) => {
				scheduleItems = [];
				snap.forEach((d) => scheduleItems.push({ id: d.id, ...d.data() }));
				scheduleItems.sort((a, b) => a.date.localeCompare(b.date));
			})
			.catch(console.error)
			.finally(() => (scheduleLoading = false));
	});

	// Player dashboard: quick stats for bento card
	$effect(() => {
		if (!showPlayerStatsBento || !profile?.playerName || !profile?.teamId) {
			statsMiniMins = 0;
			statsMiniSessions = 0;
			statsMiniLoading = false;
			return;
		}
		statsMiniLoading = true;
		const player = profile.playerName;
		const tid = profile.teamId;
		getDocs(query(collection(db, 'reps'), where('player', '==', player), where('teamId', '==', tid)))
			.then((snap) => {
				let m = 0;
				snap.forEach((d) => {
					m += Number(d.data().minutes || 0);
				});
				statsMiniSessions = snap.size;
				statsMiniMins = m;
			})
			.catch(console.error)
			.finally(() => {
				statsMiniLoading = false;
			});
	});

	// Load homework (legacy name-based rows — parents + older assignments)
	$effect(() => {
		if (
			!profile?.playerName ||
			role === 'super_admin' ||
			role === 'director' ||
			role === 'registrar' ||
			role === 'player'
		) {
			hwLoading = false;
			return;
		}
		hwLoading = true;
		getDocs(query(collection(db, 'assignments'), where('player', '==', profile.playerName)))
			.then((snap) => {
				homeworkItems = [];
				snap.forEach((d) => {
					const hw = d.data();
					const st = hw.status;
					if (st === 'active' || st === 'pending') {
						homeworkItems.push({ id: d.id, ...hw });
					}
				});
			})
			.catch(console.error)
			.finally(() => (hwLoading = false));
	});

	const markHwDone = async (id) => {
		try {
			await completeAssignmentStatus({ assignmentId: id });
			homeworkItems = homeworkItems.filter((h) => h.id !== id);
		} catch (e) {
			alert(
				e && typeof e === 'object' && 'message' in e ?
					String(e.message) :
					'Could not update assignment.',
			);
		}
	};

	const hasCoachAccess = $derived(
		role === 'super_admin' ||
		role === 'director' ||
		(teamsStore.loaded && authStore.user && teamsStore.getCoachTeams(authStore.user.email).length > 0)
	);

	const inboxClubId = $derived(profile?.clubId || '');
	const inboxTeamId = $derived.by(() => {
		if (role === 'coach' && authStore.user?.email && teamsStore.loaded) {
			const teams = teamsStore.getCoachTeams(authStore.user.email);
			return teams[0]?.id || '';
		}
		return effectiveTid || '';
	});
</script>

<div class="ec-page ec-home">
	<div class="tw-grid tw-grid-cols-1 xl:tw-grid-cols-12 tw-gap-6">
		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-8">
			<ActionInbox clubId={inboxClubId} teamId={inboxTeamId} />

			<!-- Welcome header -->
			<div class="ec-panel dashboard-header">
				<div class="card-body text-center">
					{#if profile?.clubId}
						<div class="welcome-brand-wrap">
							<ClubLogoMark size="lg" />
						</div>
					{:else}
						<i class="ph {welcomeSportIcon} dash-icon icon-large welcome-sport-icon"></i>
					{/if}
					<h2 class="welcome-title">Welcome, <span>{firstName}</span>!</h2>
					<p class="welcome-subtitle">Ready to get 1% better today?</p>
				</div>
			</div>

			{#if showElitePlayerDash}
				<ElitePlayerDashboard />
			{/if}

			<ActiveAssignmentsInbox />

			{#if role === 'player' && profile?.clubId && profile?.teamId && profile.teamId !== 'admin'}
				<VideoTrialUploader />
			{/if}

			<!-- 250 XP challenge banner -->
			{#if show250Banner && showAthleteHomeCards}
				<div class="card challenge-banner" role="button" tabindex="0" onclick={() => goto('/challenges')} onkeydown={(e) => e.key === 'Enter' && goto('/challenges')}>
					<div class="challenge-banner-body">
						<h3 class="challenge-banner-title">🔥 NEW CHALLENGE UNLOCKED! 🔥</h3>
						<p class="challenge-banner-text">You hit 250 XP. Tap here to view your Brilliant Basics trial.</p>
					</div>
				</div>
			{/if}

			<!-- Team schedule + homework + player stats -->
			<div class="bento-section bento-section--dashboard-cards">
	<div class="card border-aggie-blue">
		<div class="card-header">📅 Team Schedule</div>
		<div class="card-body p-0">
			{#if scheduleLoading}
				<ul class="session-list"><li class="session-empty">Loading schedule...</li></ul>
			{:else if !effectiveTid}
				<ul class="session-list">
					<li class="session-empty">
						{#if role === 'registrar' || role === 'director' || role === 'super_admin'}
							No personal team schedule. Use Coach or Registrar tools for team calendars.
						{:else}
							Select a team to view schedule.
						{/if}
					</li>
				</ul>
			{:else if scheduleItems.length === 0}
				<ul class="session-list"><li class="session-empty">No upcoming events.</li></ul>
			{:else}
				<ul class="session-list">
					{#each scheduleItems as evt}
						<li class="session-item">
							<div>
								<b class="schedule-evt-type">{evt.type}</b>: {evt.location}<br />
								<span class="text-sm-sub">{evt.date} @ {evt.time}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	{#if role !== 'player'}
		<div class="card border-orange">
			<div class="card-header bg-orange-header">🎯 My Homework</div>
			<div class="card-body p-0">
				{#if role === 'super_admin' || role === 'director' || role === 'registrar'}
					<ul class="session-list"><li class="session-empty staff-hw-msg">Staff accounts don't receive player homework.</li></ul>
				{:else if hwLoading}
					<ul class="session-list"><li class="session-empty">Loading assignments...</li></ul>
				{:else if homeworkItems.length === 0}
					<ul class="session-list"><li class="session-empty">No active assignments!</li></ul>
				{:else}
					<ul class="session-list">
						{#each homeworkItems as hw}
							<li class="session-item hw-item">
								<div class="hw-content">
									<span class="hw-due">Due: {hw.dueDate}</span>
									<div class="hw-drills">
										{#if Array.isArray(hw.drills)}
											{#each hw.drills as dr}
												<div>• {dr.name} <span class="text-sm-sub">({dr.sets}x{dr.reps})</span></div>
											{/each}
										{:else}
											{hw.drill}
										{/if}
									</div>
								</div>
								<button type="button" class="action-btn hw-done-btn" onclick={() => markHwDone(hw.id)}>Done</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}

	{#if showPlayerStatsBento}
		<button
			type="button"
			class="card border-gold my-stats-bento-card"
			onclick={() => goto('/stats')}
		>
			<div class="card-header my-stats-bento-header">
				<span><i class="ph ph-chart-bar" aria-hidden="true"></i> My Stats</span>
				<span class="my-stats-bento-cta">Open</span>
			</div>
			<div class="card-body my-stats-bento-body">
				{#if statsMiniLoading}
					<p class="my-stats-bento-muted">Loading your stats…</p>
				{:else}
					<div class="my-stats-bento-metrics">
						<div>
							<span class="my-stats-bento-value">{statsMiniXp.toLocaleString()}</span>
							<span class="my-stats-bento-unit">XP</span>
						</div>
						<div>
							<span class="my-stats-bento-value">{statsMiniSessions}</span>
							<span class="my-stats-bento-unit">sessions</span>
						</div>
						<div>
							<span class="my-stats-bento-value">{statsMiniMins}</span>
							<span class="my-stats-bento-unit">minutes</span>
						</div>
					</div>
					<p class="my-stats-bento-hint">View charts, rank, and calendar on the full stats page.</p>
				{/if}
			</div>
		</button>
	{/if}
			</div>
		</div>

		<div class="tw-flex tw-flex-col tw-gap-6 xl:tw-col-span-4">
			<div class="dashboard-grid bento-grid tw-mb-0">
				<DashCard icon="ph-list" label="Log Workout" hidden={!showAthleteHomeCards} onclick={() => goto('/tracker')} />
				<DashCard icon="ph-identification-card" label="Player Passport" borderVariant="green" hidden={!showAthleteHomeCards} onclick={() => goto('/passport')} />
				<DashCard
					icon="ph-chat-circle"
					label="Messages"
					borderVariant="gray"
					hidden={role !== 'player' && role !== 'parent'}
					onclick={() => goto('/messages')}
				/>
				<DashCard icon="ph-trophy" label="Trials" borderVariant="gold" hidden={!showAthleteHomeCards} onclick={() => goto('/challenges')} />
				<DashCard icon="ph-trophy" label="Trophy Room" borderVariant="gold" hidden={!showAthleteHomeCards} onclick={() => goto('/trophies')} />

				<DashCard
					icon="ph-shield-check"
					label="Parental consent"
					borderVariant="green"
					hidden={role !== 'parent'}
					onclick={() => goto('/parent/vpc')}
				/>
				<DashCard
					icon="ph-user-check"
					label="Log workout (parent)"
					borderVariant="green"
					hidden={role !== 'parent'}
					onclick={() => goto('/parent/log-workout')}
				/>
				<DashCard icon="ph-megaphone" label="Coach Tools" borderVariant="gray" hidden={!hasCoachAccess} onclick={() => goto('/coach')} />
				<DashCard icon="ph-gear" label="Command Center" borderVariant="gray" hidden={role !== 'super_admin'} onclick={() => goto('/admin')} />
				<DashCard icon="ph-briefcase" label="Director Portal" borderVariant="purple" hidden={role !== 'super_admin' && role !== 'director'} onclick={() => goto('/director')} />
				<DashCard
					icon="ph-swap"
					label="Registrar console"
					borderVariant="purple"
					hidden={role !== 'registrar' && role !== 'director' && role !== 'super_admin'}
					onclick={() => goto('/registrar')}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.ec-home {
		padding-bottom: 16px;
	}

	.ec-home .dashboard-header {
		padding: clamp(14px, 3vw, 22px);
		margin-bottom: 0;
	}

	.ec-home .dashboard-header .card-body {
		padding: 0;
	}

	.welcome-brand-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: clamp(6px, 1.5vw, 12px);
	}

	.welcome-sport-icon {
		color: var(--aggie-gold);
		filter: drop-shadow(0 4px 14px rgba(245, 158, 11, 0.35));
	}

	.my-stats-bento-card {
		cursor: pointer;
		text-align: left;
		width: 100%;
		font: inherit;
		margin-bottom: 0;
	}

	.my-stats-bento-header {
		margin-bottom: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.my-stats-bento-header i {
		margin-right: 8px;
		vertical-align: -0.1em;
	}

	.my-stats-bento-cta {
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--accent-orange-soft);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.my-stats-bento-body {
		padding-top: 0;
	}

	.my-stats-bento-metrics {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-bottom: 12px;
	}

	.my-stats-bento-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 900;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.my-stats-bento-unit {
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.my-stats-bento-hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.my-stats-bento-muted {
		margin: 0;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.schedule-evt-type {
		color: var(--text-primary);
		font-weight: 800;
	}
	.staff-hw-msg {
		color: var(--accent-orange-soft);
	}
	.hw-item {
		border-left: 4px solid #ea580c;
		align-items: flex-start;
	}
	.hw-content {
		flex: 1;
	}
	.hw-due {
		font-size: 0.8rem;
		color: var(--accent-orange-soft);
		font-weight: 800;
		text-transform: uppercase;
		display: block;
		margin-bottom: 4px;
	}
	.hw-drills {
		font-size: 0.85rem;
		line-height: 1.5;
	}
	.hw-done-btn {
		background: #16a34a;
		color: white;
		padding: 8px 12px;
		border-radius: 10px;
		margin-top: 10px;
		font-size: 0.85rem;
	}
</style>
