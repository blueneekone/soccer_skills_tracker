<script lang="ts">
	import { db, functions } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let saving = $state(false);
	let selectedTeamId = $state('');

	const unassignedTeams = $derived(
		teamsStore.teams.filter(t => !t.coachEmail && t.clubId === authStore.userProfile?.clubId)
	);

	async function bindTeam() {
		if (!db || !authStore.isAuthenticated) return;
		if (!selectedTeamId || saving) return;
		saving = true;
		try {
			const inviteCoachFn = httpsCallable(functions, 'directorInviteCoach');
			await inviteCoachFn({ teamId: selectedTeamId, coachEmail: authStore.user?.email });
			// Give the cloud function a second to propagate claims
			setTimeout(() => {
				import('$lib/firebase.js').then(({ auth }) => {
					auth.currentUser?.getIdToken(true);
				});
			}, 1500);
		} catch (e) {
			console.error(e);
			alert('Failed to bind team.');
		} finally {
			saving = false;
		}
	}
</script>

<div class="tw-p-[clamp(16px,3vw,24px)] tw-max-w-4xl tw-mx-auto tw-min-w-0">
	<h1 class="tw-text-[#fbbf24] tw-text-2xl tw-font-black tw-font-mono tw-mb-6">[ TACTICS HUB ]</h1>

	{#if !authStore.userProfile?.teamId}
		<div class="tw-border tw-border-[#fbbf24] tw-bg-[#fbbf24]/10 tw-p-6 tw-rounded-none">
			<h2 class="tw-text-[#fbbf24] tw-text-lg tw-font-bold tw-font-mono tw-mb-4">[ ACTIVE TEAM BINDING ]</h2>
			<p class="tw-text-white tw-font-sans tw-text-sm tw-mb-4">
				Your coaching profile is not currently bound to an active team. Select an unassigned team from your organization below to claim it.
			</p>

			<div class="tw-flex tw-gap-4 tw-items-center">
				<select
					bind:value={selectedTeamId}
					class="tw-bg-[#0f172a] tw-text-white tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-font-mono tw-text-sm tw-flex-1 focus:tw-outline-none focus:tw-border-[#fbbf24]"
					disabled={saving}
				>
					<option value="">-- SELECT UNASSIGNED TEAM --</option>
					{#each unassignedTeams as team (team.id)}
						<option value={team.id}>{team.name || team.id}</option>
					{/each}
				</select>

				<button
					class="tw-bg-[#fbbf24] tw-text-black tw-font-bold tw-font-mono tw-px-6 tw-py-2 hover:tw-bg-white disabled:tw-opacity-50"
					onclick={bindTeam}
					disabled={!selectedTeamId || saving}
				>
					{saving ? 'BINDING...' : 'BIND'}
				</button>
			</div>
		</div>
	{:else}
		<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-6 tw-rounded-none">
			<h2 class="tw-text-[#14b8a6] tw-text-lg tw-font-bold tw-font-mono tw-mb-4">[ ACTIVE TEAM ]</h2>
			<p class="tw-text-white tw-font-sans">
				You are currently bound to <strong class="tw-font-mono">{authStore.userProfile.teamId}</strong>.
			</p>
		</div>
	{/if}
</div>
