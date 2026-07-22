<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { functions, db } from '$lib/firebase.js';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { teamId = '' } = $props();

	let intent = $state('possession');
	let assigning = $state(false);
	let assignStatus = $state('');
	
	let availableDrills = $state<any[]>([]);
	let loadingDrills = $state(false);
	let selectedDrillId = $state('');

	const secureAssignHomeworkFn = httpsCallable(functions, 'secureAssignHomework');

	// Load drills for intent
	async function loadDrillsForIntent() {
		if (!teamId) return;
		loadingDrills = true;
		try {
			if (!db || !authStore.isAuthenticated) return;
			const q = query(
				collection(db, 'workouts'),
				where('teamId', '==', teamId),
				where('attributeId', '==', intent)
			);
			const snap = await getDocs(q);
			availableDrills = snap.docs.map(d => ({ id: d.id, ...d.data() }));
			if (availableDrills.length > 0) {
				selectedDrillId = availableDrills[0].id;
			} else {
				selectedDrillId = '';
			}
		} catch (e) {
			console.error(e);
		} finally {
			loadingDrills = false;
		}
	}

	import { untrack } from 'svelte';

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		untrack(() => {
			loadDrillsForIntent();
		});
	});

	async function assignDrill() {
		if (!selectedDrillId) return;
		assigning = true;
		assignStatus = '';
		try {
			await secureAssignHomeworkFn({
				teamId,
				drillId: selectedDrillId,
				intent
			});
			assignStatus = 'Drill assigned successfully to the squad!';
		} catch (e: any) {
			console.error(e);
			assignStatus = `Failed to assign: ${e.message}`;
		} finally {
			assigning = false;
		}
	}
</script>

<div class="bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
	<!-- Intent Engine Configuration spans 5 columns -->
	<div class="bento-span-5 lg:tw-col-span-5 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6">
		<div class="tw-flex tw-items-center tw-gap-3 tw-mb-6">
			<Icon name={"ai.sparkle" as IconName} class="tw-w-6 tw-h-6 tw-text-[#14b8a6]" />
			<h2 class="tw-text-white tw-font-bold tw-text-xl">Intent Engine</h2>
		</div>
		
		<p class="tw-text-[#94a3b8] tw-text-sm tw-mb-6">
			Select a tactical intent. The engine will match drills from your Team Library to address squad gaps.
		</p>
		
		<label class="tw-block tw-mb-2 tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">TACTICAL INTENT</label>
		<select 
			bind:value={intent}
			class="tw-w-full tw-bg-[#1e293b] tw-text-white tw-border tw-border-[#334155] tw-rounded-xl tw-p-3 tw-font-mono focus:tw-outline-none focus:tw-border-[#14b8a6] tw-transition-colors tw-mb-6"
		>
			<option value="possession">Possession & Build-Up</option>
			<option value="transition_def">Defensive Transitions</option>
			<option value="finishing">Final Third Finishing</option>
			<option value="pressing">High Press Intensity</option>
		</select>
	</div>

	<!-- Homework Assignment spans 7 columns -->
	<div class="bento-span-7 lg:tw-col-span-7 tw-bg-[#0f172a] tw-rounded-[var(--radius-premium,24px)] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col">
		<h2 class="tw-text-white tw-font-bold tw-text-xl tw-mb-6">Homework Deployment</h2>
		
		{#if loadingDrills}
			<div class="tw-text-[#94a3b8] tw-flex-1 tw-flex tw-items-center tw-justify-center tw-font-mono">
				Querying engine...
			</div>
		{:else if availableDrills.length === 0}
			<div class="tw-bg-[#1e293b] tw-rounded-xl tw-p-6 tw-border tw-border-[#334155] tw-flex-1 tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
				<Icon name={"status.warning" as IconName} class="tw-w-8 tw-h-8 tw-text-[#fbbf24] tw-mb-3" />
				<h3 class="tw-text-white tw-font-bold tw-mb-1">No Matching Drills</h3>
				<p class="tw-text-[#94a3b8] tw-text-sm">Design a drill with this tactical intent in the Drill Designer first.</p>
			</div>
		{:else}
			<div class="tw-space-y-4 tw-flex-1 tw-overflow-y-auto tw-max-h-[300px]">
				<label class="tw-block tw-text-[#94a3b8] tw-text-xs tw-font-mono tw-tracking-widest">SELECT DRILL TO ASSIGN</label>
				{#each availableDrills as drill (drill.id)}
					<label class="tw-flex tw-items-center tw-gap-3 tw-bg-[#1e293b] tw-p-4 tw-rounded-xl tw-border tw-border-[#334155] tw-cursor-pointer hover:tw-border-[#14b8a6] tw-transition-colors">
						<input type="radio" bind:group={selectedDrillId} value={drill.id} class="tw-accent-[#14b8a6]" />
						<div class="tw-flex-1">
							<div class="tw-text-white tw-font-bold">{drill.title || 'Untitled Drill'}</div>
							<div class="tw-text-[#94a3b8] tw-text-xs tw-font-mono">{drill.id}</div>
						</div>
					</label>
				{/each}
			</div>

			<div class="tw-mt-6 tw-pt-6 tw-border-t tw-border-[#334155]">
				<button 
					class="tw-w-full tw-bg-[#14b8a6] tw-text-black tw-font-bold tw-py-3 tw-rounded-xl hover:tw-bg-[#0d9488] tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
					onclick={assignDrill}
					disabled={assigning || !selectedDrillId}
				>
					{assigning ? 'Deploying...' : 'Secure Assign to Squad'}
				</button>
				{#if assignStatus}
					<p class="tw-mt-3 tw-text-sm tw-text-center tw-font-mono {assignStatus.includes('Failed') ? 'tw-text-[#ef4444]' : 'tw-text-[#10b981]'}">
						{assignStatus}
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
