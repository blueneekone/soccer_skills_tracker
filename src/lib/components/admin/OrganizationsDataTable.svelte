<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { licenseMetaForClub } from '$lib/admin/organizationsFilters.js';
	import { clubSportAccent, clubSportIconToken } from '$lib/utils/sport-icon.js';
	import type { AdminClub, AdminComplianceHealth } from '$lib/types/adminOrganizations.js';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	interface Props {
		pagedClubs: AdminClub[];
		totalClubs: number;
		clubsLoading: boolean;
		getCompliance: (clubId: string) => AdminComplianceHealth | null;
	}

	let {
		pagedClubs,
		totalClubs,
		clubsLoading,
		getCompliance,
	}: Props = $props();
</script>

<div class="v-table-wrap tw-overflow-x-auto">
	<table class="v-table tw-w-full tw-border-collapse tw-border tw-border-slate-800 tw-rounded-lg" aria-label="Organizations">
		<thead>
			<tr>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col" aria-label="Logo"></th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col">Organization</th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col">Sport</th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col">License</th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col">Director</th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col">Compliance</th>
				<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]" scope="col" aria-label="Actions"></th>
			</tr>
		</thead>
		<tbody>
			{#if clubsLoading}
				<tr>
					<td colspan="7" class="v-td-empty tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 tw-font-mono tw-[font-variant-numeric:tabular-nums]" aria-busy="true">
						Loading organizations…
					</td>
				</tr>
			{:else if pagedClubs.length === 0}
				<tr>
					<td colspan="7" class="v-td-empty tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 tw-font-mono tw-[font-variant-numeric:tabular-nums]">
						{totalClubs === 0
							? 'No organizations registered yet.'
							: 'No organizations match your filter.'}
					</td>
				</tr>
			{:else}
				{#each pagedClubs as cl (cl.id)}
					{@const compliance = getCompliance(cl.id)}
					{@const accent = clubSportAccent(cl?.sport)}
					{@const licenseMeta = licenseMetaForClub(cl)}
					<tr class="v-tr">
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							{#if typeof cl.logoUrl === 'string' && cl.logoUrl.trim()}
								<img class="orgs3-logo" src={cl.logoUrl.trim()} alt="" loading="lazy" />
							{:else}
								<span
									class="orgs3-logo-chip"
									style="--sport-fg:{accent.fg}; --sport-glow:{accent.glow}; --sport-ring:{accent.ring};"
									aria-hidden="true"
								>
									<Icon name={clubSportIconToken(cl.sport ?? 'generic') as IconName} />
								</span>
							{/if}
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<div class="orgs3-org-primary">
								<a class="orgs3-org-link" href="/admin/organizations/{cl?.id ?? ''}">
									<span class="tw-text-[#FAFAFA] tw-font-bold">
										{cl?.name || cl?.id || 'Unnamed Organization'}
									</span>
								</a>
							</div>
							<span class="tw-text-[#A1A1AA] tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-xs">{cl?.id ?? ''}</span>
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<span
								class="orgs3-sport-pill"
								style="--sport-fg:{accent.fg}; --sport-ring:{accent.ring};"
							>
								{accent.label}
							</span>
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<span
								class="orgs3-license-pill"
								style="--lic-accent:{licenseMeta.accent};"
								title={cl?.isInfinite === true
									? 'Enterprise / unlimited promo license'
									: `Subscription: ${licenseMeta.label}`}
							>
								<Icon name={licenseMeta.icon as IconName} aria-hidden="true" />
								{licenseMeta.label}
							</span>
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<span class="tw-text-[#D4D4D8]">{cl?.directorEmail || 'Unassigned'}</span>
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<div class="tw-flex tw-items-center tw-gap-2" title={compliance ? `${compliance.verified}/${compliance.total} VPC verified` : ''}>
								{#if cl.isInfinite === true && !compliance}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-emerald-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[10px] tw-uppercase tw-text-[#A1A1AA]">N/A</span>
								{:else if compliance === null || compliance.status === 'clean'}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-emerald-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">Compliant</span>
								{:else if compliance.status === 'watch'}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-amber-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">Watch</span>
								{:else}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-rose-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-[font-variant-numeric:tabular-nums] tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">At Risk</span>
								{/if}
							</div>
						</td>

						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0">
							<button class="tw-text-[#14b8a6] hover:tw-text-emerald-400 tw-font-bold tw-text-xs tw-flex tw-items-center tw-gap-1 tw-cursor-pointer" onclick={() => untrack(() => goto(`/admin/organizations/${cl.id}`))} aria-label="View {cl.name || cl.id}">
								View <Icon name={'nav.arrow-right' as IconName} aria-hidden="true" />
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
