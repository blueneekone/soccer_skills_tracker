<script lang="ts">
	import { getActiveDb } from '$lib/firebase.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
	let stats: { level: number; xp_this_week: number; streak_days: number } | null = $state(null);
	
	$effect(() => {
		const row = enterprisePlayerDrawer.selected;
		if (!row || !row.statsDocId) {
			stats = null;
			return;
		}
		
		const db = getActiveDb();
		const docRef = doc(db, 'player_stats', row.statsDocId);
		
		const unsub = onSnapshot(docRef, (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				stats = {
					level: data.level || 1,
					xp_this_week: data.xp_this_week || 0,
					streak_days: data.streak_days || 0
				};
			} else {
				stats = null;
			}
		});
		
		return () => unsub();
	});
	
	function closeDrawer() {
		enterprisePlayerDrawer.close();
	}
	
	function getInitials(name: string) {
		if (!name) return '??';
		return name
			.split(' ')
			.filter(n => n.length > 0)
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.substring(0, 2);
	}
	
	let canReadHousehold = $derived(
		enterprisePlayerDrawer.selected?.source === 'admin' ||
		enterprisePlayerDrawer.selected?.source === 'registrar'
	);
</script>

{#if enterprisePlayerDrawer.isOpen && enterprisePlayerDrawer.selected}
	<!-- Z-Index 300 Scrim -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="tw-fixed tw-inset-0 tw-z-[300] tw-bg-black/60 tw-backdrop-blur-sm tw-transition-opacity"
		onclick={closeDrawer}
	></div>

	<!-- Z-Index 310 Panel -->
	<div 
		class="ec-pdrawer tw-fixed tw-inset-y-0 tw-right-0 tw-z-[310] tw-w-[400px] tw-max-w-full tw-bg-[#0B0F19] tw-border-l tw-border-[#334155] tw-transform tw-transition-transform tw-duration-200 tw-ease-out tw-overflow-y-auto tw-flex tw-flex-col"
		class:tw-translate-x-full={!enterprisePlayerDrawer.isOpen}
		class:tw-translate-x-0={enterprisePlayerDrawer.isOpen}
	>
		<!-- Header -->
		<div class="tw-p-6 tw-border-b tw-border-[#334155] tw-flex tw-items-start tw-justify-between">
			<div class="tw-flex tw-items-center tw-gap-4">
				<div class="tw-w-12 tw-h-12 tw-rounded-full tw-bg-[#0f172a] tw-flex tw-items-center tw-justify-center tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-font-bold tw-text-lg">
					{getInitials(enterprisePlayerDrawer.selected.displayName)}
				</div>
				<div>
					<h2 class="tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-leading-tight">
						{enterprisePlayerDrawer.selected.displayName || 'Unknown Player'}
					</h2>
					<p class="tw-text-sm tw-text-[#A1A1AA] tw-font-mono tw-[font-variant-numeric:tabular-nums]">
						{enterprisePlayerDrawer.selected.teamLabel || enterprisePlayerDrawer.selected.teamId || 'No Team'}
					</p>
				</div>
			</div>
			<button class="tw-text-[#A1A1AA] hover:tw-text-[#FAFAFA] tw-transition-colors tw-cursor-pointer" onclick={closeDrawer} aria-label="Close">
				<Icon name={'sys.close' as IconName} />
			</button>
		</div>

		<!-- Body -->
		<div class="tw-p-6 tw-space-y-8 tw-flex-1">
			<!-- Identity Block -->
			<div>
				<h3 class="tw-text-xs tw-font-semibold tw-text-[#A1A1AA] tw-uppercase tw-tracking-wider tw-mb-4">Identity & Roster</h3>
				<div class="tw-grid tw-grid-cols-2 tw-gap-4">
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-rounded-lg">
						<div class="tw-text-[#A1A1AA] tw-text-xs tw-mb-1">Jersey</div>
						<div class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-lg tw-font-bold">
							{enterprisePlayerDrawer.selected.jersey || '--'}
						</div>
					</div>
					<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-rounded-lg">
						<div class="tw-text-[#A1A1AA] tw-text-xs tw-mb-1">Position</div>
						<div class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-lg tw-font-bold">
							{enterprisePlayerDrawer.selected.position || '--'}
						</div>
					</div>
				</div>
			</div>

			<!-- Accountability Block -->
			<div>
				<h3 class="tw-text-xs tw-font-semibold tw-text-[#A1A1AA] tw-uppercase tw-tracking-wider tw-mb-4">Live Accountability</h3>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-rounded-lg tw-space-y-4">
					{#if stats}
						<div class="tw-flex tw-justify-between tw-items-center">
							<span class="tw-text-sm tw-text-[#D4D4D8]">Current Level</span>
							<span class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-font-bold">Lv {stats.level}</span>
						</div>
						<div class="tw-flex tw-justify-between tw-items-center">
							<span class="tw-text-sm tw-text-[#D4D4D8]">Weekly XP</span>
							<span class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-font-bold">{stats.xp_this_week.toLocaleString()} XP</span>
						</div>
						<div class="tw-flex tw-justify-between tw-items-center">
							<span class="tw-text-sm tw-text-[#D4D4D8]">Active Streak</span>
							<span class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-font-bold">{stats.streak_days} Days</span>
						</div>
					{:else}
						<div class="tw-text-sm tw-text-[#A1A1AA] tw-font-mono tw-[font-variant-numeric:tabular-nums]">Loading telemetry...</div>
					{/if}
				</div>
			</div>

			<!-- Household & Compliance Block -->
			{#if canReadHousehold}
			<div>
				<h3 class="tw-text-xs tw-font-semibold tw-text-[#A1A1AA] tw-uppercase tw-tracking-wider tw-mb-4">Household & Compliance</h3>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-4 tw-rounded-lg tw-space-y-4">
					<div class="tw-flex tw-justify-between tw-items-center">
						<span class="tw-text-sm tw-text-[#D4D4D8]">Age Group</span>
						<span class="tw-text-[#FAFAFA] tw-font-mono tw-[font-variant-numeric:tabular-nums]">
							{enterprisePlayerDrawer.selected.ageGroup || '--'}
						</span>
					</div>
					<div class="tw-flex tw-justify-between tw-items-center">
						<span class="tw-text-sm tw-text-[#D4D4D8]">Status</span>
						<span class="tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[10px] tw-uppercase {enterprisePlayerDrawer.selected.status === 'active' ? 'tw-text-emerald-400' : 'tw-text-amber-400'}">
							{enterprisePlayerDrawer.selected.status}
						</span>
					</div>
				</div>
			</div>
			{/if}
		</div>
	</div>
{/if}
