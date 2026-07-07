<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { ADMIN_TIER_OPTIONS } from '$lib/admin/organizationsConstants.js';
	import {
		collectKnownStates,
		countClubsByTier,
		filterStateOptions,
		toggleInList,
	} from '$lib/admin/organizationsFilters.js';
	import type { AdminClub, AdminClubTierKey } from '$lib/types/adminOrganizations.js';

	interface Props {
		clubs: AdminClub[];
		filterVerification: 'all' | 'verified' | 'pending';
		filterStates: string[];
		filterTiers: AdminClubTierKey[];
		filterRegionQuery: string;
		filterActiveCount: number;
		onClose: () => void;
		onReset: () => void;
		onVerificationChange: (value: 'all' | 'verified' | 'pending') => void;
		onTiersChange: (tiers: AdminClubTierKey[]) => void;
		onStatesChange: (states: string[]) => void;
		onRegionQueryChange: (query: string) => void;
	}

	let {
		clubs,
		filterVerification = $bindable('all'),
		filterStates = $bindable([]),
		filterTiers = $bindable([]),
		filterRegionQuery = $bindable(''),
		filterActiveCount,
		onClose,
		onReset,
		onVerificationChange,
		onTiersChange,
		onStatesChange,
		onRegionQueryChange,
	}: Props = $props();

	const TIER_OPTIONS = ADMIN_TIER_OPTIONS;
	const knownStates = $derived(collectKnownStates(clubs));
	const filteredStateOptions = $derived(filterStateOptions(knownStates, filterRegionQuery));
	const tierCounts = $derived(countClubsByTier(clubs));

	const VERIFICATION_OPTS = [
		{ key: 'all' as const, label: 'All', dot: '#a1a1aa', icon: 'content.list' },
		{ key: 'verified' as const, label: 'Verified', dot: '#14b8a6', icon: 'status.seal-check' },
		{ key: 'pending' as const, label: 'Pending', dot: '#f59e0b', icon: 'sys.clock' },
	];
</script>

<div class="tw-flex tw-flex-col tw-w-full tw-min-w-[320px] sm:tw-min-w-[480px] tw-bg-[#0B0F19] tw-text-[#FAFAFA] tw-p-6" role="dialog" aria-label="Enterprise Filter">
	<div class="tw-flex tw-justify-between tw-items-center tw-pb-4 tw-mb-4 tw-border-b tw-border-[#334155]">
		<span class="tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA]">
			Filter Organizations
		</span>
		<button type="button" class="tw-bg-transparent tw-border-none tw-text-[#94A3B8] hover:tw-text-[#FAFAFA] tw-transition-colors" onclick={onClose} aria-label="Close filter">
			<Icon name={'sys.close' as IconName} aria-hidden="true" size={20} />
		</button>
	</div>

	<!-- Subscription Tier -->
	<fieldset class="tw-mb-6 tw-border-none tw-p-0 tw-m-0">
		<legend class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-2">
			Subscription Tier
			{#if filterTiers.length > 0}
				<span class="tw-ml-2 tw-bg-[#fbbf24] tw-text-[#0B0F19] tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[10px]">{filterTiers.length}</span>
			{/if}
		</legend>
		<p class="tw-text-[#94A3B8] tw-text-xs tw-mb-3">
			Pick one or more. Clubs without a tier assignment live under <strong>Unassigned</strong>.
		</p>
		<div class="tw-flex tw-flex-wrap tw-gap-2" role="group" aria-label="Subscription Tier">
			{#each TIER_OPTIONS as tier (tier.key)}
				{@const active = filterTiers.includes(tier.key)}
				{@const count = tierCounts[tier.key] || 0}
				<button
					type="button"
					role="checkbox"
					aria-checked={active}
					class="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-border tw-rounded-none tw-text-xs tw-font-bold tw-transition-colors {active ? 'tw-bg-[#14b8a6]/10 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-bg-transparent tw-border-[#334155] tw-text-[#94A3B8] hover:tw-border-[#FAFAFA] hover:tw-text-[#FAFAFA]'}"
					onclick={() => onTiersChange(toggleInList(filterTiers, tier.key) as AdminClubTierKey[])}
				>
					<span class="tw-w-2 tw-h-2 tw-rounded-full" style="background:{tier.accent};"></span>
					<Icon name={tier.icon as IconName} aria-hidden="true" size={14} />
					<span>{tier.label}</span>
					<span class="tw-opacity-50">({count})</span>
				</button>
			{/each}
		</div>
	</fieldset>

	<!-- Region / State -->
	<fieldset class="tw-mb-6 tw-border-none tw-p-0 tw-m-0">
		<legend class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-2">
			Region / State
			{#if filterStates.length > 0}
				<span class="tw-ml-2 tw-bg-[#fbbf24] tw-text-[#0B0F19] tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[10px]">{filterStates.length}</span>
			{/if}
		</legend>
		<p class="tw-text-[#94A3B8] tw-text-xs tw-mb-3">
			Parsed from the Google-Places verified address.
		</p>

		{#if knownStates.length === 0}
			<p class="tw-text-[#94A3B8] tw-text-xs tw-italic">
				No states detected yet. Add a verified address to a club to enable region filtering.
			</p>
		{:else}
			{#if knownStates.length > 6}
				<div class="tw-flex tw-items-center tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-px-3 tw-py-2 tw-mb-3">
					<Icon name={'action.search' as IconName} aria-hidden="true" class="tw-text-[#94A3B8] tw-mr-2" size={14} />
					<input
						id="orgs3-filter-region-q"
						type="search"
						class="tw-bg-transparent tw-border-none tw-outline-none tw-text-[#FAFAFA] tw-text-sm tw-w-full"
						placeholder="Search states (TX, CA, NY…)"
						autocomplete="off"
						bind:value={filterRegionQuery}
						oninput={() => onRegionQueryChange(filterRegionQuery)}
					/>
				</div>
			{/if}

			<div class="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 tw-gap-2 tw-max-h-48 tw-overflow-y-auto tw-pr-2" role="group" aria-label="States">
				{#each filteredStateOptions as st (st)}
					{@const active = filterStates.includes(st)}
					<button
						type="button"
						role="checkbox"
						aria-checked={active}
						class="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-border tw-rounded-none tw-text-xs tw-font-bold tw-transition-colors {active ? 'tw-bg-[#14b8a6]/10 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-bg-transparent tw-border-[#334155] tw-text-[#94A3B8] hover:tw-border-[#FAFAFA] hover:tw-text-[#FAFAFA]'}"
						onclick={() => onStatesChange(toggleInList(filterStates, st))}
					>
						<Icon
							name={active ? ('status.check-square' as IconName) : ('sys.square' as IconName)}
							aria-hidden="true"
							size={14}
						/>
						{st}
					</button>
				{:else}
					<span class="tw-text-[#94A3B8] tw-text-xs tw-italic tw-col-span-full">
						No states match "{filterRegionQuery}".
					</span>
				{/each}
			</div>
		{/if}
	</fieldset>

	<!-- Verification Status -->
	<fieldset class="tw-mb-6 tw-border-none tw-p-0 tw-m-0">
		<legend class="tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#FAFAFA] tw-mb-2">Verification Status</legend>
		<p class="tw-text-[#94A3B8] tw-text-xs tw-mb-3">
			Clubs with a Google-Places verified address and a phone number count as <strong>Verified</strong>.
		</p>
		<div class="tw-flex tw-flex-wrap tw-gap-2" role="radiogroup" aria-label="Verification Status">
			{#each VERIFICATION_OPTS as opt (opt.key)}
				<button
					type="button"
					role="radio"
					aria-checked={filterVerification === opt.key}
					class="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-border tw-rounded-none tw-text-xs tw-font-bold tw-transition-colors {filterVerification === opt.key ? 'tw-bg-[#14b8a6]/10 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-bg-transparent tw-border-[#334155] tw-text-[#94A3B8] hover:tw-border-[#FAFAFA] hover:tw-text-[#FAFAFA]'}"
					onclick={() => onVerificationChange(opt.key)}
				>
					<span class="tw-w-2 tw-h-2 tw-rounded-full" style="background:{opt.dot};"></span>
					<Icon name={opt.icon as IconName} aria-hidden="true" size={14} />
					{opt.label}
				</button>
			{/each}
		</div>
	</fieldset>

	<div class="tw-flex tw-justify-between tw-items-center tw-pt-4 tw-border-t tw-border-[#334155]">
		<button
			type="button"
			class="tw-bg-transparent tw-border-none tw-text-[#f43f5e] hover:tw-text-[#fb7185] tw-text-xs tw-font-bold tw-font-mono tw-uppercase tw-tracking-widest tw-transition-colors disabled:tw-opacity-50"
			onclick={onReset}
			disabled={filterActiveCount === 0}
		>
			Reset All
		</button>
		<button 
			type="button" 
			class="tw-bg-[#14b8a6] tw-text-[#0B0F19] tw-px-6 tw-py-2 tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-widest hover:tw-bg-[#0d9488] tw-transition-colors" 
			onclick={onClose}
		>
			Apply & Close
		</button>
	</div>
</div>
