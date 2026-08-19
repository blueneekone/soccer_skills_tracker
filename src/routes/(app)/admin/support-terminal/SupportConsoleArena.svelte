<script lang="ts">
	import type { SupportConsoleEngine } from './SupportConsoleEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	let { engine }: { engine: SupportConsoleEngine } = $props();
</script>

<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
	<!-- Tab Content (Spans 8 cols on lg) -->
	<div class="lg:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6">
		{#if engine.activeTab === 'users'}
			<h2 class="tw-text-sm tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider tw-mb-5 tw-flex tw-items-center tw-gap-2">
				<Icon name={"user.settings" as IconName} size={16} class="tw-text-amber-500" /> User Operations
			</h2>

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-flex tw-flex-col tw-gap-1.5">
						<label for="sc-target-email" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Target Email</label>
						<input id="sc-target-email" type="email" bind:value={engine.userEmail} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="user@example.com" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1.5">
						<label for="sc-target-uid" class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#94A3B8] tw-uppercase">Target UID (for Purge/Disable)</label>
						<input id="sc-target-uid" type="text" bind:value={engine.userUid} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="Firebase Auth UID" />
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-2.5 tw-justify-center">
					<button onclick={() => engine.executeCommand('resetUserPassword', { targetEmail: engine.userEmail })} class="tw-bg-[#020617] tw-border tw-border-amber-500/40 hover:tw-border-amber-500 hover:tw-bg-amber-500/10 tw-text-amber-400 tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-transition-all tw-flex tw-items-center tw-gap-2.5">
						<Icon name={"comm.mail" as IconName} size={14} class="tw-text-amber-400" /> Send Password Reset
					</button>
					<button onclick={() => engine.executeCommand('disableUser', { targetUid: engine.userUid, disabled: true })} class="tw-bg-[#020617] tw-border tw-border-amber-500/40 hover:tw-border-amber-500 hover:tw-bg-amber-500/10 tw-text-amber-400 tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-transition-all tw-flex tw-items-center tw-gap-2.5">
						<Icon name={"sys.ban" as IconName} size={14} /> Disable Account
					</button>
					<button onclick={() => engine.executeCommand('disableUser', { targetUid: engine.userUid, disabled: false })} class="tw-bg-[#020617] tw-border tw-border-[#14b8a6]/40 hover:tw-border-[#14b8a6] hover:tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-transition-all tw-flex tw-items-center tw-gap-2.5">
						<Icon name={"status.check-square" as IconName} size={14} /> Enable Account
					</button>
					<button onclick={() => engine.executeCommand('purgeUser', { targetUid: engine.userUid, targetEmail: engine.userEmail })} class="tw-bg-[#020617] tw-border tw-border-rose-500/40 hover:tw-border-rose-500 hover:tw-bg-rose-500/10 tw-text-rose-400 tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-transition-all tw-flex tw-items-center tw-gap-2.5">
						<Icon name={"status.shield-alert" as IconName} size={14} /> CASCADE PURGE USER
					</button>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'teams'}
			<h2 class="tw-text-sm tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider tw-mb-5">Team Operations</h2>

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
				<div class="tw-flex tw-flex-col tw-gap-3.5">
					<h3 class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-m-0">Create / Delete Team</h3>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-club-id" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Club ID / Target Team ID</label>
						<input id="sc-club-id" type="text" bind:value={engine.teamClubId} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="Club ID or Team ID" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-team-name" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Team Name (Create)</label>
						<input id="sc-team-name" type="text" bind:value={engine.teamName} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="e.g. Aggies FC 16G Grey" />
					</div>
					<div class="tw-grid tw-grid-cols-2 tw-gap-3">
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-team-age" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Age Group</label>
							<input id="sc-team-age" type="text" bind:value={engine.teamAgeGroup} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="U11" />
						</div>
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-team-gender" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Gender</label>
							<input id="sc-team-gender" type="text" bind:value={engine.teamGender} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="Girls" />
						</div>
					</div>
					<div class="tw-flex tw-flex-row tw-gap-2 tw-mt-2">
						<button onclick={() => engine.executeCommand('createTeam', { clubId: engine.teamClubId, teamName: engine.teamName, ageGroup: engine.teamAgeGroup, gender: engine.teamGender, sport: engine.teamSport })} class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-[#020617] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-py-2.5 tw-px-4 tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
							<Icon name={"action.add" as IconName} size={14} /> Create Team
						</button>
						<button onclick={() => engine.executeCommand('deleteTeam', { clubId: engine.teamClubId, teamId: engine.teamName })} class="tw-bg-[#020617] tw-border tw-border-rose-500/40 hover:tw-border-rose-500 hover:tw-bg-rose-500/10 tw-text-rose-400 tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors" title="Put Team ID in the Team Name field">
							<Icon name={"action.delete" as IconName} size={14} /> Delete Team
						</button>
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-3.5">
					<h3 class="tw-text-xs tw-font-mono tw-font-bold tw-text-[#f59e0b] tw-uppercase tw-m-0">Link User to Team</h3>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-email" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">User Email</label>
						<input id="sc-link-email" type="email" bind:value={engine.linkEmail} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" placeholder="coach@example.com" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-role" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Role</label>
						<select id="sc-link-role" bind:value={engine.linkRole} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none">
							<option value="head_coach">Head Coach</option>
							<option value="assistant_coach">Assistant Coach</option>
							<option value="player">Player</option>
							<option value="manager">Manager</option>
						</select>
					</div>
					<div class="tw-grid tw-grid-cols-2 tw-gap-3">
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-link-club" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Club ID</label>
							<input id="sc-link-club" type="text" bind:value={engine.linkClubId} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
						</div>
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-link-team" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Team ID</label>
							<input id="sc-link-team" type="text" bind:value={engine.linkTeamId} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
						</div>
					</div>
					<div class="tw-flex tw-flex-col tw-mt-2">
						<button onclick={() => engine.executeCommand('linkUserToTeam', { targetEmail: engine.linkEmail, role: engine.linkRole, clubId: engine.linkClubId, teamId: engine.linkTeamId })} class="tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-[#020617] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-py-2.5 tw-px-4 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
							<Icon name={"action.add" as IconName} size={14} /> Link User to Team
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'claims'}
			<h2 class="tw-text-sm tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider tw-mb-5">RBAC Repair</h2>

			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
				<div class="tw-flex tw-flex-col tw-gap-3.5">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-email" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Target Email</label>
						<input id="sc-repair-email" type="email" bind:value={engine.repairEmail} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-role" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Role</label>
						<select id="sc-repair-role" bind:value={engine.repairRole} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none">
							<option value="user">User (Parent/Player)</option>
							<option value="coach">Coach</option>
							<option value="director">Director</option>
							<option value="global_admin">Global Admin</option>
							<option value="super_admin">Super Admin</option>
						</select>
					</div>
					<div class="tw-grid tw-grid-cols-2 tw-gap-3">
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-repair-club" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Club ID (Optional)</label>
							<input id="sc-repair-club" type="text" bind:value={engine.repairClubId} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
						</div>
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-repair-team" class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-uppercase">Team ID (Optional)</label>
							<input id="sc-repair-team" type="text" bind:value={engine.repairTeamId} class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-px-3 tw-py-2 tw-font-mono tw-text-xs focus:tw-border-[#14b8a6] focus:tw-outline-none" />
						</div>
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-justify-end">
					<button onclick={() => engine.executeCommand('repairUserClaims', { targetEmail: engine.repairEmail, role: engine.repairRole, clubId: engine.repairClubId || null, teamId: engine.repairTeamId || null })} class="tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-[#020617] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-py-3 tw-px-4 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
						<Icon name={"status.shield-check" as IconName} size={14} /> Repair Custom Claims
					</button>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'system'}
			<h2 class="tw-text-sm tw-font-mono tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-wider tw-mb-5">System Data</h2>
			<div class="tw-flex tw-flex-col tw-gap-4">
				<p class="tw-text-xs tw-font-mono tw-text-[#94A3B8] tw-m-0">Database health stats and user query logs.</p>
				<button onclick={() => engine.executeCommand('listAllUsers', { maxResults: 10 })} class="tw-bg-[#020617] tw-border tw-border-[#14b8a6]/40 hover:tw-border-[#14b8a6] hover:tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-py-2.5 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2 tw-w-fit">
					<Icon name={"user.group" as IconName} size={14} /> Fetch Recent Users (List 10)
				</button>
			</div>
		{/if}
	</div>

	<!-- Output Console (Spans 4 cols on lg) -->
	<div class="lg:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-min-h-[220px] tw-font-mono tw-text-xs tw-flex tw-flex-col">
		<h3 class="tw-text-[#94A3B8] tw-uppercase tw-tracking-widest tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-text-xs tw-font-bold tw-m-0">
			<Icon name={"data.radar" as IconName} size={14} class="tw-text-amber-500" /> Terminal Output
		</h3>
		<div class="tw-flex-1 tw-p-3.5 tw-bg-[#000000] tw-border tw-border-[#334155] tw-min-h-[160px] tw-overflow-y-auto">
			{#if engine.lastOutput}
				<pre class="tw-whitespace-pre-wrap tw-break-all tw-m-0 {engine.lastOutput.type === 'success' ? 'tw-text-[#14b8a6]' : 'tw-text-rose-400'}">{engine.lastOutput.text}</pre>
			{:else}
				<p class="tw-text-slate-600 tw-m-0">[AWAITING_COMMAND_EXECUTION]</p>
			{/if}
		</div>
	</div>
</div>
