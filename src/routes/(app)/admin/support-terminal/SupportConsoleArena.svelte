<script lang="ts">
	import type { SupportConsoleEngine } from './SupportConsoleEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	let { engine }: { engine: SupportConsoleEngine } = $props();
</script>

<div class="bento-grid-container tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-mt-6">
	<!-- Tab Content (Spans 8 cols on lg) -->
	<div class="lg:tw-col-span-8 st-bento z2-panel siem-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-[clamp(16px,2vw,24px)]" style="clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)">
		
		{#if engine.activeTab === 'users'}
			<h2 class="tw-text-base tw-font-mono tw-font-bold tw-text-white tw-uppercase tw-mb-6 tw-flex tw-items-center tw-gap-2">
				<Icon name={"user.settings" as IconName} size={18} class="tw-text-amber-500" /> User Operations
			</h2>
			
			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-target-email" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Target Email</label>
						<input id="sc-target-email" type="email" bind:value={engine.userEmail} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="user@example.com" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-target-uid" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Target UID (for Purge/Disable)</label>
						<input id="sc-target-uid" type="text" bind:value={engine.userUid} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="Firebase Auth UID" />
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-3">
					<button onclick={() => engine.executeCommand('resetUserPassword', { targetEmail: engine.userEmail })} class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-white tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2">
						<Icon name={"comm.mail" as IconName} size={14} class="tw-text-amber-500" /> Send Password Reset
					</button>
					<button onclick={() => engine.executeCommand('disableUser', { targetUid: engine.userUid, disabled: true })} class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-amber-400 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2">
						<Icon name={"sys.ban" as IconName} size={14} /> Disable Account
					</button>
					<button onclick={() => engine.executeCommand('disableUser', { targetUid: engine.userUid, disabled: false })} class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-emerald-400 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2">
						<Icon name={"status.check-square" as IconName} size={14} /> Enable Account
					</button>
					<button onclick={() => engine.executeCommand('purgeUser', { targetUid: engine.userUid, targetEmail: engine.userEmail })} class="tw-bg-rose-950/50 hover:tw-bg-rose-900/50 tw-border tw-border-rose-900/50 tw-text-rose-400 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2">
						<Icon name={"status.shield-alert" as IconName} size={14} /> CASCADE PURGE USER
					</button>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'teams'}
			<h2 class="tw-text-base tw-font-mono tw-font-bold tw-text-white tw-uppercase tw-mb-6">Team Operations</h2>
			
			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
				<div class="tw-flex tw-flex-col tw-gap-4">
					<h3 class="tw-text-sm tw-font-mono tw-text-[#14b8a6] tw-mb-2">Create / Delete Team</h3>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-club-id" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Club ID / Target Team ID</label>
						<input id="sc-club-id" type="text" bind:value={engine.teamClubId} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="Club ID or Team ID (for delete)" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-team-name" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Team Name (Create)</label>
						<input id="sc-team-name" type="text" bind:value={engine.teamName} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="e.g. Aggies FC 16G Grey" />
					</div>
					<div class="tw-grid tw-grid-cols-2 tw-gap-4">
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-team-age" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Age Group</label>
							<input id="sc-team-age" type="text" bind:value={engine.teamAgeGroup} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
						</div>
						<div class="tw-flex tw-flex-col tw-gap-1">
							<label for="sc-team-gender" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Gender</label>
							<input id="sc-team-gender" type="text" bind:value={engine.teamGender} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
						</div>
					</div>
					<div class="tw-flex tw-flex-row tw-gap-2 tw-mt-2">
						<button onclick={() => engine.executeCommand('createTeam', { clubId: engine.teamClubId, teamName: engine.teamName, ageGroup: engine.teamAgeGroup, gender: engine.teamGender, sport: engine.teamSport })} class="tw-bg-amber-500/10 hover:tw-bg-amber-500/20 tw-border tw-border-amber-500/30 tw-text-amber-500 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
							<Icon name={"action.plus" as IconName} size={14} /> Create Team
						</button>
						<button onclick={() => engine.executeCommand('deleteTeam', { clubId: engine.teamClubId, teamId: engine.teamName })} class="tw-bg-rose-950/30 hover:tw-bg-rose-900/40 tw-border tw-border-rose-900/50 tw-text-rose-400 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors" title="Put Team ID in the Team Name field">
							<Icon name={"sys.trash" as IconName} size={14} /> Delete Team
						</button>
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-4">
					<h3 class="tw-text-sm tw-font-mono tw-text-[#f59e0b] tw-mb-2">Link User to Team</h3>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-email" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">User Email</label>
						<input id="sc-link-email" type="email" bind:value={engine.linkEmail} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" placeholder="coach@example.com" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-role" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Role</label>
						<select id="sc-link-role" bind:value={engine.linkRole} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm">
							<option value="head_coach">Head Coach</option>
							<option value="assistant_coach">Assistant Coach</option>
							<option value="player">Player</option>
							<option value="manager">Manager</option>
						</select>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-club" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Club ID</label>
						<input id="sc-link-club" type="text" bind:value={engine.linkClubId} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-link-team" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Team ID</label>
						<input id="sc-link-team" type="text" bind:value={engine.linkTeamId} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-3 tw-mt-2">
						<button onclick={() => engine.executeCommand('linkUserToTeam', { targetEmail: engine.linkEmail, role: engine.linkRole, clubId: engine.linkClubId, teamId: engine.linkTeamId })} class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-border tw-border-amber-500/40 tw-text-amber-500 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
							<Icon name={"user.add" as IconName} size={14} /> Link User
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'claims'}
			<h2 class="tw-text-base tw-font-mono tw-font-bold tw-text-white tw-uppercase tw-mb-6">RBAC Repair</h2>
			
			<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8">
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-email" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Target Email</label>
						<input id="sc-repair-email" type="email" bind:value={engine.repairEmail} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-role" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Role</label>
						<select id="sc-repair-role" bind:value={engine.repairRole} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm">
							<option value="user">User (Parent/Player)</option>
							<option value="coach">Coach</option>
							<option value="director">Director</option>
							<option value="global_admin">Global Admin</option>
							<option value="super_admin">Super Admin</option>
						</select>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-club" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Club ID (Optional)</label>
						<input id="sc-repair-club" type="text" bind:value={engine.repairClubId} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="sc-repair-team" class="tw-text-xs tw-font-mono tw-text-slate-400 tw-uppercase">Team ID (Optional)</label>
						<input id="sc-repair-team" type="text" bind:value={engine.repairTeamId} class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-white tw-px-3 tw-py-2 tw-font-mono tw-text-sm" />
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-3 tw-justify-end">
					<button onclick={() => engine.executeCommand('repairUserClaims', { targetEmail: engine.repairEmail, role: engine.repairRole, clubId: engine.repairClubId || null, teamId: engine.repairTeamId || null })} class="tw-bg-amber-500 hover:tw-bg-amber-500/90 tw-text-void-black tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
						<Icon name={"status.shield-check" as IconName} size={14} /> REPAIR CUSTOM CLAIMS
					</button>
				</div>
			</div>
		{/if}

		{#if engine.activeTab === 'system'}
			<h2 class="tw-text-base tw-font-mono tw-font-bold tw-text-white tw-uppercase tw-mb-6">System Data</h2>
			<div class="tw-flex tw-flex-col tw-gap-4">
				<p class="tw-text-sm tw-text-slate-400">Database health stats and user lists.</p>
				<button onclick={() => engine.executeCommand('listAllUsers', { maxResults: 10 })} class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-text-amber-500 tw-font-mono tw-text-sm tw-font-bold tw-py-2 tw-px-4 tw-text-left tw-transition-colors tw-flex tw-items-center tw-gap-2">
					<Icon name={"user.group" as IconName} size={14} /> Fetch Recent Users (List 10)
				</button>
			</div>
		{/if}

	</div>

	<!-- Output Console (Spans 4 cols on lg) -->
	<div class="lg:tw-col-span-4 st-bento z2-panel siem-panel tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-4 tw-min-h-[200px] tw-font-mono tw-text-xs tw-flex tw-flex-col">
		<h3 class="tw-text-[#334155] tw-uppercase tw-tracking-widest tw-mb-2 tw-flex tw-items-center tw-gap-2">
			<Icon name={"data.radar" as IconName} size={14} class="tw-text-amber-500" /> Terminal Output
		</h3>
		<div class="tw-flex-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-slate-800">
			{#if engine.lastOutput}
				<pre class="tw-whitespace-pre-wrap tw-break-all {engine.lastOutput.type === 'success' ? 'tw-text-[#14b8a6]' : 'tw-text-rose-400'}">{engine.lastOutput.text}</pre>
			{:else}
				<p class="tw-text-slate-600">[AWAITING_COMMAND_EXECUTION]</p>
			{/if}
		</div>
	</div>
</div>
