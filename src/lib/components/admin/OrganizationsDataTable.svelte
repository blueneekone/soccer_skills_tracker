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
		openRowMenuId: string | null;
		loginAsDirectorBusyFor: string | null;
		getCompliance: (clubId: string) => AdminComplianceHealth | null;
		getTeamCount: (clubId: string) => number;
		onToggleRowMenu: (id: string) => void;
		onEdit: (club: AdminClub) => void;
		onCloseRowMenu: () => void;
		onLoginAsDirector: (club: AdminClub) => void;
		onDelete: (id: string, name: string) => void;
	}

	let {
		pagedClubs,
		totalClubs,
		clubsLoading,
		openRowMenuId,
		loginAsDirectorBusyFor,
		getCompliance,
		getTeamCount,
		onToggleRowMenu,
		onEdit,
		onCloseRowMenu,
		onLoginAsDirector,
		onDelete,
	}: Props = $props();
</script>

<div class="v-table-wrap">
	<table class="v-table" aria-label="Organizations">
		<thead class="">
			<tr>
				<th class="v-th v-th--avatar" scope="col" aria-label="Logo"></th>
				<th class="v-th" scope="col">Organization</th>
				<th class="v-th" scope="col">Sport</th>
				<th class="v-th v-th--license" scope="col">License</th>
				<th class="v-th" scope="col">Director</th>
				<th class="v-th v-th--center" scope="col">Teams</th>
				<th class="v-th v-th--compliance" scope="col">Compliance</th>
				<th class="v-th v-th--actions" scope="col" aria-label="Actions"></th>
			</tr>
		</thead>
		<tbody>
			{#if clubsLoading}
				<tr>
					<td colspan="8" class="v-td-loading" aria-busy="true">
						<span class="orgs3-spinner" aria-hidden="true"></span>
						Loading organizations…
					</td>
				</tr>
			{:else if pagedClubs.length === 0}
				<tr>
					<td colspan="8" class="v-td-empty">
						{totalClubs === 0
							? 'No organizations registered yet.'
							: 'No organizations match your filter.'}
					</td>
				</tr>
			{:else}
				{#each pagedClubs as cl (cl.id)}
					{@const compliance = getCompliance(cl.id)}
					{@const teamCount = getTeamCount(cl.id)}
					{@const accent = clubSportAccent(cl?.sport)}
					{@const licenseMeta = licenseMetaForClub(cl)}
					<tr class="v-tr">
						<td class="v-td v-td--avatar">
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

						<td class="v-td v-td--name">
							<div class="orgs3-org-primary">
								<a class="orgs3-org-link" href="/admin/organizations/{cl?.id ?? ''}">
									<span class="orgs3-org-name-text">
										{cl?.name || cl?.id || 'Unnamed Organization'}
									</span>
								</a>
							</div>
							<span class="orgs3-org-id">{cl?.id ?? ''}</span>
						</td>

						<td class="v-td v-td--muted">
							<span
								class="orgs3-sport-pill"
								style="--sport-fg:{accent.fg}; --sport-ring:{accent.ring};"
							>
								{accent.label}
							</span>
						</td>

						<td class="v-td v-td--license">
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

						<td class="v-td v-td--mono v-td--ellipsis">
							{cl?.directorEmail || 'Unassigned'}
						</td>

						<td class="v-td v-td--num v-td--center">
							{teamCount}
						</td>

						<td class="v-td">
							{#if cl.isInfinite === true && !compliance}
								<span class="orgs3-compliance orgs3-compliance--na" title="Enterprise promo license">
									<span class="orgs3-compliance__dot"></span>
									N/A
								</span>
							{:else if compliance === null}
								<span
									class="orgs3-compliance orgs3-compliance--clean"
									title="No minor accounts on record"
								>
									<span class="orgs3-compliance__dot"></span>
									Clean
								</span>
							{:else if compliance.status === 'clean'}
								<span
									class="orgs3-compliance orgs3-compliance--clean"
									title="{compliance.verified}/{compliance.total} VPC verified"
								>
									<span class="orgs3-compliance__dot"></span>
									Compliant
								</span>
							{:else if compliance.status === 'watch'}
								<span
									class="orgs3-compliance orgs3-compliance--watch"
									title="{compliance.verified}/{compliance.total} VPC verified"
								>
									<span class="orgs3-compliance__dot"></span>
									{compliance.verified}/{compliance.total} verified
								</span>
							{:else}
								<span
									class="orgs3-compliance orgs3-compliance--risk"
									title="{compliance.verified}/{compliance.total} VPC verified"
								>
									<span class="orgs3-compliance__dot"></span>
									At Risk
								</span>
							{/if}
						</td>

						<td class="v-td v-td--actions">
							<div class="orgs3-row-action-wrap">
								<a
									class="orgs3-view-btn"
									href="/admin/organizations/{cl.id}"
									aria-label="View {cl.name || cl.id}"
								>
									View <Icon name={'nav.arrow-right' as IconName} aria-hidden="true" />
								</a>
								<button
									type="button"
									class="orgs3-row-actions-btn"
									aria-haspopup="menu"
									aria-expanded={openRowMenuId === cl.id}
									aria-label="Actions for {cl.name || cl.id}"
									onclick={(e) => {
										e.stopPropagation();
										onToggleRowMenu(cl.id);
									}}
								>
									<Icon name={'nav.more-v' as IconName} aria-hidden="true" />
								</button>
								{#if openRowMenuId === cl.id}
									<div class="orgs3-row-menu" role="menu">
										<button
											type="button"
											role="menuitem"
											class="orgs3-row-menu__item"
											onclick={() => onEdit(cl)}
										>
											<Icon name={'action.edit' as IconName} aria-hidden="true" />
											Edit Organization
										</button>
										<a
											role="menuitem"
											class="orgs3-row-menu__item"
											href="/admin/organizations/{cl.id}"
											onclick={onCloseRowMenu}
										>
											<Icon name={'nav.external' as IconName} aria-hidden="true" />
											Open Details
										</a>
										<button
											type="button"
											role="menuitem"
											class="orgs3-row-menu__item"
											disabled={loginAsDirectorBusyFor === cl.id ||
												!(cl.directorEmail || '').trim()}
											onclick={() => onLoginAsDirector(cl)}
										>
											{#if loginAsDirectorBusyFor === cl.id}
												<Icon
													name={'status.loading' as IconName}
													class="orgs3-row-menu__spin"
													aria-hidden="true"
												/>
												Launching session…
											{:else}
												<Icon name={'nav.sign-in' as IconName} aria-hidden="true" />
												Login As Director
											{/if}
										</button>
										<button
											type="button"
											role="menuitem"
											class="orgs3-row-menu__item orgs3-row-menu__item--danger"
											onclick={() => {
												onCloseRowMenu();
												onDelete(cl.id, cl.name || cl.id);
											}}
										>
											<Icon name={'action.delete' as IconName} aria-hidden="true" />
											Delete Organization
										</button>
									</div>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
