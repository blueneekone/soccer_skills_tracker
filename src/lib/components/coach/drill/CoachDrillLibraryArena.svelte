<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, getDocs } from 'firebase/firestore';
	import { BENCHMARK_DRILLS } from '$lib/player/benchmark/benchmarkDrillCatalog.js';

	interface DrillItem {
		id: string;
		title: string;
		category: string;
		attributeId?: string;
		durationMinutes: number;
		playerCount?: string;
		ageGroup?: string;
		description: string;
		scope: 'team' | 'platform';
		xpBounty: number;
	}

	interface Props {
		teamId: string;
		onOpenInDesigner?: (drill: DrillItem) => void;
		onDeployToIntent?: (drill: DrillItem) => void;
		onNewDrill?: () => void;
	}

	let {
		teamId = '',
		onOpenInDesigner = () => {},
		onDeployToIntent = () => {},
		onNewDrill = () => {},
	}: Props = $props();

	let teamDrills = $state<DrillItem[]>([]);
	let loading = $state(false);
	let searchTerm = $state('');
	let selectedCategory = $state<string>('ALL');
	let selectedScope = $state<'ALL' | 'team' | 'platform'>('ALL');

	const CATEGORIES = ['ALL', 'TACTICS', 'PASSING', 'DRIBBLING', 'FINISHING', 'CONDITIONING'];

	// Platform catalog drills transformed to standard schema
	const platformCatalogDrills: DrillItem[] = BENCHMARK_DRILLS.map((d) => ({
		id: `platform_${d.id}`,
		title: d.label,
		category: (d.category || 'TACTICS').toUpperCase(),
		attributeId: d.category,
		durationMinutes: 15,
		playerCount: '6-12 Players',
		ageGroup: 'All Ages',
		description: `Platform benchmark tactical exercise targeting ${d.label} execution and kinetic mastery.`,
		scope: 'platform',
		xpBounty: d.baseXP || 100,
	}));

	// ── B815 Hydration & Load Team Drills from Firestore ─────────────────────────
	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			teamDrills = [];
			return;
		}

		loading = true;
		let cancelled = false;

		(async () => {
			try {
				const snap = await getDocs(collection(db, 'teams', teamId, 'drills'));
				if (cancelled) return;

				const list: DrillItem[] = [];
				snap.forEach((docSnap) => {
					const x = docSnap.data() || {};
					list.push({
						id: docSnap.id,
						title: (x.name || x.title || 'Untitled Drill').trim(),
						category: (x.category || x.focusArea || 'TACTICS').toUpperCase(),
						attributeId: x.attributeId,
						durationMinutes: Number(x.durationMinutes || 15),
						playerCount: x.playerCount || '8-12 Players',
						ageGroup: x.ageGroup || 'U12-U14',
						description: x.description || 'Custom coach drill blueprint.',
						scope: 'team',
						xpBounty: 150,
					});
				});

				list.sort((a, b) => a.title.localeCompare(b.title));
				teamDrills = list;
				loading = false;
			} catch (err) {
				console.error('[CoachDrillLibraryArena] error loading team drills:', err);
				if (!cancelled) loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	// Combined filtered drills
	const allDrills = $derived([...teamDrills, ...platformCatalogDrills]);

	const filteredDrills = $derived.by(() => {
		return allDrills.filter((d) => {
			// Scope filter
			if (selectedScope !== 'ALL' && d.scope !== selectedScope) return false;

			// Category filter
			if (selectedCategory !== 'ALL') {
				if (!d.category.toUpperCase().includes(selectedCategory)) return false;
			}

			// Search text filter
			if (searchTerm.trim()) {
				const q = searchTerm.toLowerCase();
				const matchTitle = d.title.toLowerCase().includes(q);
				const matchDesc = d.description.toLowerCase().includes(q);
				const matchCat = d.category.toLowerCase().includes(q);
				if (!matchTitle && !matchDesc && !matchCat) return false;
			}

			return true;
		});
	});
</script>

<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full tw-text-slate-200">
	<!-- Executive Header & Control Bar (Matching Intent Engine & Designer) -->
	<div class="tw-bg-[#080d1a]/60 tw-backdrop-blur-md tw-border tw-border-slate-800/80 tw-rounded-2xl tw-p-6 tw-flex tw-flex-col tw-gap-5 tw-shadow-2xl">
		<div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
			<div class="tw-flex tw-items-center tw-gap-4">
				<div class="tw-h-12 tw-w-12 tw-rounded-xl tw-bg-slate-800/60 tw-border tw-border-slate-700/80 tw-flex tw-items-center tw-justify-center tw-text-slate-200 tw-font-mono tw-font-bold tw-text-xl tw-shadow-inner">
					📚
				</div>
				<div>
					<h2 class="tw-text-slate-100 tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-3">
						<span>Tactical Drill Library & Playbook</span>
						<span class="tw-bg-slate-800 tw-text-slate-300 tw-border tw-border-slate-700 tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1 tw-rounded-md tw-tracking-widest tw-uppercase">
							{filteredDrills.length} Available
						</span>
					</h2>
					<p class="tw-text-sm tw-text-slate-400 tw-mt-1">
						Browse platform exercises and team tactical playbooks to assign via Intent Engine.
					</p>
				</div>
			</div>

			<!-- New Drill CTA Button (Dark Aesthetic) -->
			<button
				type="button"
				class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-border tw-border-slate-700 hover:tw-border-slate-600 tw-text-slate-100 tw-font-mono tw-text-xs tw-font-bold tw-px-5 tw-py-2.5 tw-rounded-xl active:tw-scale-[0.98] tw-transition-all tw-duration-200 tw-flex tw-items-center tw-gap-2 tw-self-start sm:tw-self-auto"
				onclick={onNewDrill}
			>
				<span>➕</span>
				<span>DESIGN NEW DRILL</span>
			</button>
		</div>

		<!-- Search & Filter Controls -->
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-4 tw-pt-4 tw-border-t tw-border-slate-800/80">
			<!-- Search Bar (7 cols) -->
			<div class="md:tw-col-span-7 tw-relative">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search drills by title, focus, or skill..."
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-xl tw-px-4 tw-py-2.5 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-font-sans"
				/>
				{#if searchTerm}
					<button
						type="button"
						class="tw-absolute tw-right-3 tw-top-2.5 tw-text-slate-400 hover:tw-text-white tw-text-xs"
						onclick={() => (searchTerm = '')}
					>
						✕
					</button>
				{/if}
			</div>

			<!-- Source Scope Filter (5 cols) -->
			<div class="md:tw-col-span-5 tw-flex tw-items-center tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-xl tw-p-1 tw-gap-1">
				<button
					type="button"
					class="tw-flex-1 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[11px] tw-font-bold tw-transition-all {selectedScope === 'ALL' ? 'tw-bg-[#1e293b] tw-text-white tw-border tw-border-slate-600' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
					onclick={() => (selectedScope = 'ALL')}
				>
					All ({allDrills.length})
				</button>
				<button
					type="button"
					class="tw-flex-1 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[11px] tw-font-bold tw-transition-all {selectedScope === 'team' ? 'tw-bg-[#14b8a6]/20 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/40' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
					onclick={() => (selectedScope = 'team')}
				>
					Playbook ({teamDrills.length})
				</button>
				<button
					type="button"
					class="tw-flex-1 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[11px] tw-font-bold tw-transition-all {selectedScope === 'platform' ? 'tw-bg-[#fbbf24]/20 tw-text-[#fbbf24] tw-border tw-border-[#fbbf24]/40' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
					onclick={() => (selectedScope = 'platform')}
				>
					Platform ({platformCatalogDrills.length})
				</button>
			</div>
		</div>

		<!-- Category Pills -->
		<div class="tw-flex tw-items-center tw-gap-2 tw-overflow-x-auto tw-pb-1">
			{#each CATEGORIES as cat (cat)}
				<button
					type="button"
					class="tw-px-3 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[11px] tw-font-semibold tw-transition-all tw-whitespace-nowrap {selectedCategory === cat ? 'tw-bg-[#daff0a] tw-text-black' : 'tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-slate-400 hover:tw-text-white'}"
					onclick={() => (selectedCategory = cat)}
				>
					{cat}
				</button>
			{/each}
		</div>
	</div>

	<!-- Drill Cards Grid (Multi-Billion-Dollar 3-Col Layout) -->
	{#if loading}
		<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-2xl tw-p-8 tw-text-center tw-font-mono tw-text-sm tw-text-slate-400">
			Loading tactical playbook…
		</div>
	{:else if filteredDrills.length === 0}
		<div class="tw-bg-[#0f172a] tw-border tw-border-dashed tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-text-center">
			<p class="tw-text-slate-300 tw-font-bold tw-text-sm">No drills found matching filters.</p>
			<p class="tw-text-slate-500 tw-text-xs tw-mt-1">Try broadening your search or design a new drill.</p>
			<button
				type="button"
				class="tw-mt-4 tw-bg-[#14b8a6] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-px-4 tw-py-2 tw-rounded-xl"
				onclick={onNewDrill}
			>
				Create New Drill in Studio →
			</button>
		</div>
	{:else}
		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-5">
			{#each filteredDrills as drill (drill.id)}
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] hover:tw-border-[#14b8a6]/60 tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-justify-between tw-gap-4 tw-shadow-xl hover:tw-shadow-2xl hover:tw-shadow-teal-950/20 tw-transition-all tw-group">
					<div class="tw-space-y-3">
						<!-- Card Badges -->
						<div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
							<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded tw-bg-[#1e293b] tw-text-[#14b8a6] tw-border tw-border-[#334155]">
								{drill.category}
							</span>

							<div class="tw-flex tw-items-center tw-gap-2">
								<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#daff0a]">
									+{drill.xpBounty} XP
								</span>
								{#if drill.scope === 'team'}
									<span class="tw-bg-teal-950/80 tw-text-teal-300 tw-border tw-border-teal-700/60 tw-font-mono tw-text-[9px] tw-px-1.5 tw-py-0.5 tw-rounded">
										TEAM
									</span>
								{/if}
							</div>
						</div>

						<!-- Drill Title & Description -->
						<div>
							<h3 class="tw-text-white tw-font-bold tw-text-sm group-hover:tw-text-[#14b8a6] tw-transition-colors">
								{drill.title}
							</h3>
							<p class="tw-text-slate-400 tw-text-xs tw-mt-1.5 tw-line-clamp-2 tw-leading-relaxed">
								{drill.description}
							</p>
						</div>

						<!-- Metric Badges -->
						<div class="tw-flex tw-items-center tw-gap-3 tw-pt-2 tw-border-t tw-border-slate-800/80 tw-font-mono tw-text-[11px] tw-text-slate-400">
							<span>⏱ {drill.durationMinutes}m</span>
							<span>👥 {drill.playerCount || 'Squad'}</span>
							<span>🏷 {drill.ageGroup || 'All'}</span>
						</div>
					</div>

					<!-- Card Action Deck -->
					<div class="tw-grid tw-grid-cols-2 tw-gap-2 tw-pt-3 tw-border-t tw-border-[#1e293b]">
						<button
							type="button"
							class="tw-bg-[#020617] hover:tw-bg-[#1e293b] tw-border tw-border-[#334155] hover:tw-border-slate-400 tw-text-slate-300 hover:tw-text-white tw-font-mono tw-text-[11px] tw-font-semibold tw-py-2 tw-px-2 tw-rounded-xl tw-transition-all tw-text-center"
							onclick={() => onOpenInDesigner(drill)}
						>
							📐 In Designer
						</button>

						<button
							type="button"
							class="tw-bg-[#fbbf24] hover:tw-bg-amber-400 tw-text-black tw-font-mono tw-text-[11px] tw-font-bold tw-py-2 tw-px-2 tw-rounded-xl active:tw-scale-[0.98] tw-transition-all tw-text-center"
							onclick={() => onDeployToIntent(drill)}
						>
							🚀 Deploy Intent
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
