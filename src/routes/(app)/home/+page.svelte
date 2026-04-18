<script>
	import { goto } from '$app/navigation';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import DashCard from '$lib/components/DashCard.svelte';

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

	// Load homework
	$effect(() => {
		if (!profile?.playerName || role === 'super_admin' || role === 'director' || role === 'registrar') {
			hwLoading = false;
			return;
		}
		hwLoading = true;
		getDocs(query(collection(db, 'assignments'), where('player', '==', profile.playerName)))
			.then((snap) => {
				homeworkItems = [];
				snap.forEach((d) => {
					const hw = d.data();
					if (hw.status === 'active') homeworkItems.push({ id: d.id, ...hw });
				});
			})
			.catch(console.error)
			.finally(() => (hwLoading = false));
	});

	const markHwDone = async (id) => {
		await updateDoc(doc(db, 'assignments', id), { status: 'completed' });
		homeworkItems = homeworkItems.filter((h) => h.id !== id);
	};

	const hasCoachAccess = $derived(
		role === 'super_admin' ||
		role === 'director' ||
		(teamsStore.loaded && authStore.user && teamsStore.getCoachTeams(authStore.user.email).length > 0)
	);
</script>

<div class="view-section">
	<!-- Welcome header -->
	<div class="card dashboard-header">
		<div class="card-body text-center">
			<i class="ph ph-football dash-icon icon-large"></i>
			<h2 class="welcome-title">Welcome, <span>{firstName}</span>!</h2>
			<p class="welcome-subtitle">Ready to get 1% better today?</p>
		</div>
	</div>

	<!-- 250 XP challenge banner -->
	{#if show250Banner && showAthleteHomeCards}
		<div class="card challenge-banner" role="button" tabindex="0" onclick={() => goto('/challenges')} onkeydown={(e) => e.key === 'Enter' && goto('/challenges')}>
			<div class="challenge-banner-body">
				<h3 class="challenge-banner-title">🔥 NEW CHALLENGE UNLOCKED! 🔥</h3>
				<p class="challenge-banner-text">You hit 250 XP. Tap here to view your Brilliant Basics trial.</p>
			</div>
		</div>
	{/if}

	<!-- Bento grid dashboard (Epic 1.2 + Phase 0.2 shared tokens in style.css) -->
	<div class="dashboard-grid bento-grid">
		<DashCard icon="ph-list" label="Log Workout" hidden={!showAthleteHomeCards} onclick={() => goto('/tracker')} />
		<DashCard icon="ph-identification-card" label="Player Passport" borderVariant="green" hidden={!showAthleteHomeCards} onclick={() => goto('/passport')} />
		<DashCard icon="ph-chart-bar" label="My Stats" hidden={!showAthleteHomeCards} onclick={() => goto('/stats')} />
		<DashCard
			icon="ph-chat-circle"
			label="Messages"
			borderVariant="gray"
			hidden={role !== 'player' && role !== 'parent'}
			onclick={() => goto('/messages')}
		/>
		<DashCard icon="ph-trophy" label="Trials" borderVariant="gold" hidden={!showAthleteHomeCards} onclick={() => goto('/challenges')} />
		<DashCard icon="ph-trophy" label="Trophy Room" borderVariant="gold" hidden={!showAthleteHomeCards} onclick={() => goto('/trophies')} />

		<a href="https://www.positionspecific.com/" target="_blank" rel="noopener" class="no-underline">
			<div class="card dash-card border-slate">
				<div class="dash-card-body">
					<i class="ph ph-lightning-bolt dash-icon"></i>
					<div class="dash-label">Position Specific</div>
				</div>
			</div>
		</a>

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

	<!-- Team schedule + homework (Epic 1.2 bento row) -->
	<div class="bento-section">
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
							<button class="action-btn hw-done-btn" onclick={() => markHwDone(hw.id)}>Done</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
	</div>
</div>

<style>
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
