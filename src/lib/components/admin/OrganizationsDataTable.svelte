<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { licenseMetaForClub } from '$lib/admin/organizationsFilters.js';
	import { clubSportAccent, clubSportIconToken } from '$lib/utils/sport-icon.js';
	import type { AdminClub, AdminComplianceHealth } from '$lib/types/adminOrganizations.js';

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

<div class="tw-w-full">
	<table class="v-table tw-w-full" aria-label="Organizations">
		<thead class="tw-sticky tw-top-0 tw-z-10 tw-bg-[#0B0F19] tw-border-b tw-border-[#334155]">
			<tr>
				<th class="v-th v-th--avatar" scope="col" aria-label="Logo"></th>
				<th class="v-th" scope="col">Organization</th>
				<th class="v-th" scope="col">Sport</th>
				<th class="v-th v-th--license" scope="col">License</th>
				<th class="v-th" scope="col">Director</th>
				<th class="v-th v-th--compliance" scope="col">Compliance</th>
				<th class="v-th v-th--actions" scope="col" aria-label="Actions"></th>
			</tr>
		</thead>
		<tbody>
			{#if clubsLoading}
				<tr>
					<td colspan="7" class="v-td-loading tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight" aria-busy="true">
						<span class="orgs3-spinner" aria-hidden="true"></span>
						Loading organizations…
					</td>
				</tr>
			{:else if pagedClubs.length === 0}
				<tr>
					<td colspan="7" class="tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight">
						<div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-[clamp(32px,4vw,64px)]">
							<div class="tw-text-[#A1A1AA] tw-opacity-80 tw-mb-4" aria-hidden="true">
								<Icon name={'org.building' as IconName} />
							</div>
							<p class="tw-font-sans tw-tracking-tight tw-text-[#A1A1AA] tw-text-sm">
								{totalClubs === 0
									? 'No organizations registered yet.'
									: 'No organizations match your filter.'}
							</p>
						</div>
					</td>
				</tr>
			{:else}
				{#each pagedClubs as cl (cl.id)}
					{@const compliance = getCompliance(cl.id)}
					{@const accent = clubSportAccent(cl?.sport)}
					{@const licenseMeta = licenseMetaForClub(cl)}
					<tr class="v-tr">
						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--avatar">
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

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--name">
							<div class="orgs3-org-primary">
								<a class="orgs3-org-link" href="/admin/organizations/{cl?.id ?? ''}">
									<span class="orgs3-org-name-text">
										{cl?.name || cl?.id || 'Unnamed Organization'}
									</span>
								</a>
							</div>
							<span class="orgs3-org-id tw-font-mono tw-tabular-nums">{cl?.id ?? ''}</span>
						</td>

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--muted">
							<span
								class="orgs3-sport-pill"
								style="--sport-fg:{accent.fg}; --sport-ring:{accent.ring};"
							>
								{accent.label}
							</span>
						</td>

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--license">
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

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--mono v-td--ellipsis">
							{cl?.directorEmail || 'Unassigned'}
						</td>

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight">
							<div class="tw-flex tw-items-center tw-gap-2" title={compliance ? `${compliance.verified}/${compliance.total} VPC verified` : ''}>
								{#if cl.isInfinite === true && !compliance}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-emerald-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-tabular-nums tw-text-[10px] tw-uppercase tw-text-[#A1A1AA]">N/A</span>
								{:else if compliance === null || compliance.status === 'clean'}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-emerald-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-tabular-nums tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">Compliant</span>
								{:else if compliance.status === 'watch'}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-amber-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-tabular-nums tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">Watch</span>
								{:else}
									<div class="tw-w-[6px] tw-h-[6px] tw-rounded-full tw-bg-rose-400" aria-hidden="true"></div>
									<span class="tw-font-mono tw-tabular-nums tw-text-[10px] tw-uppercase tw-text-[#FAFAFA]">At Risk</span>
								{/if}
							</div>
						</td>

						<td class="v-td tw-py-2 tw-px-3 tw-text-sm tw-tracking-tight v-td--actions">
							<a class="tw-text-[#14b8a6] hover:tw-text-emerald-400 tw-font-bold tw-text-xs tw-flex tw-items-center tw-gap-1" href="/admin/organizations/{cl.id}" aria-label="View {cl.name || cl.id}">
								View <Icon name={'nav.arrow-right' as IconName} aria-hidden="true" />
							</a>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
