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
		{ key: 'verified' as const, label: 'Verified', dot: '#22c55e', icon: 'status.seal-check' },
		{ key: 'pending' as const, label: 'Pending', dot: '#f59e0b', icon: 'sys.clock' },
	];
</script>

<div class="orgs3-filter-pop" role="dialog" aria-label="Enterprise Filter">
	<div class="orgs3-filter-pop__head">
		<span class="orgs3-filter-pop__title">Filter Organizations</span>
		<button type="button" class="orgs3-filter-pop__close" onclick={onClose} aria-label="Close filter">
			<Icon name={'sys.close' as IconName} aria-hidden="true" />
		</button>
	</div>

	<fieldset class="orgs3-filter-group">
		<legend class="orgs3-filter-group__legend">
			Subscription Tier
			{#if filterTiers.length > 0}
				<span class="orgs3-filter-group__mini-badge">{filterTiers.length}</span>
			{/if}
		</legend>
		<p class="orgs3-filter-group__hint">
			Pick one or more. Clubs without a tier assignment live under
			<strong>Unassigned</strong>.
		</p>
		<div class="orgs3-filter-chips" role="group" aria-label="Subscription Tier">
			{#each TIER_OPTIONS as tier (tier.key)}
				{@const active = filterTiers.includes(tier.key)}
				{@const count = tierCounts[tier.key] || 0}
				<button
					type="button"
					role="checkbox"
					aria-checked={active}
					class="orgs3-filter-chip orgs3-filter-chip--multi"
					class:orgs3-filter-chip--active={active}
					onclick={() => onTiersChange(toggleInList(filterTiers, tier.key) as AdminClubTierKey[])}
				>
					<span class="orgs3-filter-chip__dot" style="background:{tier.accent};"></span>
					<Icon name={tier.icon as IconName} aria-hidden="true" />
					<span>{tier.label}</span>
					<span class="orgs3-filter-chip__count">{count}</span>
				</button>
			{/each}
		</div>
	</fieldset>

	<fieldset class="orgs3-filter-group">
		<legend class="orgs3-filter-group__legend">
			Region / State
			{#if filterStates.length > 0}
				<span class="orgs3-filter-group__mini-badge">{filterStates.length}</span>
			{/if}
		</legend>
		<p class="orgs3-filter-group__hint">
			Parsed from the Google-Places verified address. Type to filter when the list grows past a
			handful of states.
		</p>

		{#if knownStates.length === 0}
			<p class="orgs3-filter-group__empty">
				No states detected yet. Add a verified address to a club to enable region filtering.
			</p>
		{:else}
			{#if knownStates.length > 6}
				<label class="orgs3-filter-state" for="orgs3-filter-region-q">
					<Icon name={'action.search' as IconName} aria-hidden="true" />
					<input
						id="orgs3-filter-region-q"
						type="search"
						class="orgs3-filter-state__typeahead"
						placeholder="Search states (TX, CA, NY…)"
						autocomplete="off"
						bind:value={filterRegionQuery}
						oninput={() => onRegionQueryChange(filterRegionQuery)}
					/>
				</label>
			{/if}

			<div class="orgs3-filter-state-grid" role="group" aria-label="States">
				{#each filteredStateOptions as st (st)}
					{@const active = filterStates.includes(st)}
					<button
						type="button"
						role="checkbox"
						aria-checked={active}
						class="orgs3-filter-state-chip"
						class:orgs3-filter-state-chip--active={active}
						onclick={() => onStatesChange(toggleInList(filterStates, st))}
					>
						<Icon
							name={active ? ('status.check-square' as IconName) : ('sys.square' as IconName)}
							aria-hidden="true"
						/>
						{st}
					</button>
				{:else}
					<span class="orgs3-filter-group__empty orgs3-filter-group__empty--inline">
						No states match "{filterRegionQuery}".
					</span>
				{/each}
			</div>
		{/if}
	</fieldset>

	<fieldset class="orgs3-filter-group">
		<legend class="orgs3-filter-group__legend">Verification Status</legend>
		<p class="orgs3-filter-group__hint">
			Clubs with a Google-Places verified address and a phone number on file count as
			<strong>Verified</strong>.
		</p>
		<div class="orgs3-filter-chips" role="radiogroup" aria-label="Verification Status">
			{#each VERIFICATION_OPTS as opt (opt.key)}
				<button
					type="button"
					role="radio"
					aria-checked={filterVerification === opt.key}
					class="orgs3-filter-chip"
					class:orgs3-filter-chip--active={filterVerification === opt.key}
					onclick={() => onVerificationChange(opt.key)}
				>
					<span class="orgs3-filter-chip__dot" style="background:{opt.dot};"></span>
					<Icon name={opt.icon as IconName} aria-hidden="true" />
					{opt.label}
				</button>
			{/each}
		</div>
	</fieldset>

	<div class="orgs3-filter-pop__foot">
		<button
			type="button"
			class="orgs3-filter-reset"
			onclick={onReset}
			disabled={filterActiveCount === 0}
		>
			Reset
		</button>
		<button type="button" class="orgs3-filter-apply" onclick={onClose}>Done</button>
	</div>
</div>
