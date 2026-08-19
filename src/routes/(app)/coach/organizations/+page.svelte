<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	const userEmail = $derived((authStore.user?.email || '').trim());
	const role = $derived(authStore.role);

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const affiliatedClubs = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') {
			return teamsStore.clubs.map((club) => {
				const clubTeams = teamsStore.teams.filter((t) => t.clubId === club.id);
				return { club, teams: clubTeams };
			});
		}

		const clubMap = new Map<string, { club: any; teams: any[] }>();
		for (const team of myTeams) {
			const cId = team.clubId || 'unassigned';
			if (!clubMap.has(cId)) {
				const foundClub = teamsStore.clubs.find((c) => c.id === cId) || {
					id: cId,
					name: cId === 'unassigned' ? 'Independent / Unassigned' : cId.toUpperCase()
				};
				clubMap.set(cId, { club: foundClub, teams: [] });
			}
			clubMap.get(cId)!.teams.push(team);
		}
		return Array.from(clubMap.values());
	});

	const totalSquads = $derived(myTeams.length);
</script>

<svelte:head>
	<title>Organizations · Coach OS · Vanguard OS</title>
</svelte:head>

<div class="pd-page-root tw-min-h-[100dvh] tw-bg-[#020617] tw-text-slate-300 tw-flex tw-flex-col tw-overflow-x-hidden">
	<!-- Nexus Header Banner -->
	<header class="tw-w-full tw-bg-[#0b0f19] tw-border-b tw-border-slate-800 tw-py-6 tw-px-6">
		<div class="tw-max-w-7xl tw-mx-auto tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
			<div class="tw-flex tw-items-center tw-gap-3">
				<div class="tw-w-10 tw-h-10 tw-bg-slate-900 tw-border tw-border-[#14b8a6]/40 tw-flex tw-items-center tw-justify-center tw-text-[#14b8a6]">
					<Icon name="org.building" size={20} />
				</div>
				<div>
					<h1 class="tw-m-0 tw-font-mono tw-text-xl tw-font-bold tw-text-white tw-uppercase tw-tracking-widest">
						Coach Organizations
					</h1>
					<p class="tw-m-0 tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-uppercase tw-tracking-wider">
						Affiliated Clubs & Squad Management
					</p>
				</div>
			</div>
			<div class="tw-flex tw-items-center tw-gap-3 tw-font-mono tw-text-xs">
				<span class="tw-px-3 tw-py-1 tw-bg-slate-900 tw-border tw-border-slate-800 tw-text-[#daff0a] tw-font-bold">
					{affiliatedClubs.length} ACTIVE {affiliatedClubs.length === 1 ? 'CLUB' : 'CLUBS'}
				</span>
				<span class="tw-px-3 tw-py-1 tw-bg-slate-900 tw-border tw-border-slate-800 tw-text-[#14b8a6]">
					{totalSquads} {totalSquads === 1 ? 'SQUAD' : 'SQUADS'} ASSIGNED
				</span>
			</div>
		</div>
	</header>

	<!-- Main Body Layout: 12-column asymmetric Bento Grid -->
	<main class="tw-w-full tw-max-w-7xl tw-mx-auto tw-p-[clamp(16px,3vw,32px)] tw-flex-1">
		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-items-start">

			<!-- Affiliated Organizations List (Span 8) -->
			<div class="lg:tw-col-span-8 st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-6">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-6 tw-border-b tw-border-slate-800 tw-pb-3">
					<h2 class="tw-m-0 tw-font-mono tw-text-sm tw-font-bold tw-text-white tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-2">
						<Icon name="user.group" size={16} />
						Affiliated Organizations & Squads
					</h2>
					<span class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">
						{userEmail || 'AUTHENTICATED COACH'}
					</span>
				</div>

				{#if !teamsStore.loaded}
					<div class="tw-p-8 tw-text-center tw-font-mono tw-text-xs tw-text-slate-400">
						Loading organization telemetry...
					</div>
				{:else if affiliatedClubs.length === 0}
					<div class="tw-p-8 tw-text-center tw-border tw-border-dashed tw-border-slate-800 tw-bg-slate-950/50">
						<p class="tw-font-mono tw-text-sm tw-text-slate-300 tw-mb-2">No Active Organizations Found</p>
						<p class="tw-font-sans tw-text-xs tw-text-slate-400 tw-max-w-md tw-mx-auto tw-mb-4">
							You are not currently assigned to any team in an active organization. Reach out to your Club Director to assign your coach account.
						</p>
						<a
							href="/coach/dashboard"
							class="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-[#daff0a] tw-text-black tw-font-mono tw-font-bold tw-text-xs tw-uppercase tw-no-underline hover:tw-bg-amber-400 tw-transition-colors"
						>
							Return to Nexus Command
						</a>
					</div>
				{:else}
					<div class="tw-flex tw-flex-col tw-gap-6">
						{#each affiliatedClubs as item (item.club.id)}
							<div class="tw-border tw-border-slate-800 tw-bg-slate-900/60 tw-p-4">
								<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-mb-3 tw-border-b tw-border-slate-800/60 tw-pb-2">
									<div>
										<h3 class="tw-m-0 tw-font-mono tw-text-base tw-font-bold tw-text-white">
											{item.club.name || item.club.id}
										</h3>
										<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]">
											ID: {item.club.id}
										</span>
									</div>
									<span class="tw-font-mono tw-text-[10px] tw-px-2 tw-py-0.5 tw-bg-emerald-950/80 tw-text-emerald-400 tw-border tw-border-emerald-800/50 tw-uppercase">
										Active Organization
									</span>
								</div>

								<div class="tw-mt-3">
									<h4 class="tw-font-mono tw-text-xs tw-text-slate-400 tw-uppercase tw-mb-2">
										Assigned Teams ({item.teams.length})
									</h4>
									{#if item.teams.length === 0}
										<div class="tw-text-xs tw-font-sans tw-text-slate-400 italic">
											No direct team assignments in this club.
										</div>
									{:else}
										<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-2">
											{#each item.teams as team (team.id)}
												<div class="tw-p-3 tw-bg-slate-950/80 tw-border tw-border-slate-800 tw-flex tw-items-center tw-justify-between">
													<div>
														<p class="tw-m-0 tw-font-mono tw-text-xs tw-font-bold tw-text-white">
															{team.name || team.id}
														</p>
														<span class="tw-font-mono tw-text-[10px] tw-text-slate-400">
															Age: {team.ageGroup || 'N/A'} · Gender: {team.gender || 'Coed'}
														</span>
													</div>
													<a
														href="/coach/logistics?tab-[#14b8a6]"
														class="tw-text-[#14b8a6] hover:tw-text-teal-300 tw-font-mono tw-text-[10px] tw-uppercase tw-no-underline"
													>
														Team Ops &rarr;
													</a>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Telemetry & Clearance Panel (Span 4) -->
			<div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6">
				<!-- Coach Clearance Card -->
				<div class="st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-5">
					<h3 class="tw-m-0 tw-font-mono tw-text-xs tw-font-bold tw-text-[#daff0a] tw-uppercase tw-tracking-widest tw-mb-3 tw-flex tw-items-center tw-gap-2">
						<Icon name="status.shield-check" size={16} />
						Clearance & Vault Verification
					</h3>
					<div class="tw-bg-slate-950/70 tw-p-3 tw-border tw-border-slate-800 tw-mb-4">
						<div class="tw-flex tw-items-center tw-justify-between tw-mb-1">
							<span class="tw-font-mono tw-text-[11px] tw-text-slate-400">STATUS</span>
							<span class="tw-font-mono tw-text-[11px] tw-font-bold {authStore.isCleared ? 'tw-text-emerald-400' : 'tw-text-amber-400'} tw-uppercase">
								{authStore.isCleared ? 'VERIFIED CLEARED' : 'PENDING CLEARANCE'}
							</span>
						</div>
						<p class="tw-m-0 tw-font-sans tw-text-xs tw-text-slate-300">
							{authStore.isCleared
								? 'Your SafeSport & Checkr background check is active and verified in the Organization Vault.'
								: 'Background check verification required for active field operations.'}
						</p>
					</div>
					<a
						href="/onboarding/coach"
						class="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-no-underline tw-border tw-border-slate-700 tw-transition-colors"
					>
						Check Clearance Status
					</a>
				</div>

				<!-- Quick Actions Navigation -->
				<div class="st-bento vanguard-panel tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-5">
					<h3 class="tw-m-0 tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-widest tw-mb-3">
						Coach Operations
					</h3>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<a
							href="/coach/dashboard"
							class="tw-p-3 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-800 tw-text-slate-200 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-justify-between tw-no-underline tw-transition-colors"
						>
							<span>Daily Intel / Dashboard</span>
							<span class="tw-text-[#14b8a6]">&rarr;</span>
						</a>
						<a
							href="/coach/logistics"
							class="tw-p-3 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-800 tw-text-slate-200 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-justify-between tw-no-underline tw-transition-colors"
						>
							<span>Team Ops & Logistics</span>
							<span class="tw-text-[#14b8a6]">&rarr;</span>
						</a>
						<a
							href="/coach/tactical"
							class="tw-p-3 tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-800 tw-text-slate-200 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-justify-between tw-no-underline tw-transition-colors"
						>
							<span>War Room & Tactics</span>
							<span class="tw-text-[#14b8a6]">&rarr;</span>
						</a>
					</div>
				</div>
			</div>

		</div>
	</main>
</div>
