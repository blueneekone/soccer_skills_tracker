<script>
	import { db, functions } from '$lib/firebase.js';
	import { doc, setDoc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

	const directorInviteCoach = httpsCallable(functions, 'directorInviteCoach');

	let newTeamName = $state('');
	let newCoachEmail = $state('');
	let selectedTeamId = $state('');
	let inviteCoachEmail = $state('');
	let saving = $state(false);

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	$effect(() => {
		if (clubTeams.length > 0 && !selectedTeamId) selectedTeamId = clubTeams[0].id;
	});

	const createTeam = async () => {
		if (!clubId) return alert('No club on your profile.');
		if (!newTeamName.trim()) return alert('Please enter a team name.');
		const slug = newTeamName.toLowerCase().replace(/[^a-z0-9]/g, '');
		const teamId = `${clubId}_${slug}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', teamId), {
				clubId,
				name: newTeamName.trim(),
				createdAt: new Date()
			});
			let inviteMsg = '';
			if (newCoachEmail.trim()) {
				try {
					await directorInviteCoach({
						teamId,
						coachEmail: newCoachEmail.trim()
					});
					inviteMsg = ' Coach invite sent (reserved seat until they accept).';
				} catch (ie) {
					const m =
						ie && typeof ie === 'object' && 'message' in ie ?
							String(/** @type {{ message?: string }} */ (ie).message) :
							String(ie);
					inviteMsg =
						` Team was created, but the coach invite failed: ${m}`;
				}
			}
			alert(
				`Team “${newTeamName.trim()}” created.${inviteMsg}`
			);
			newTeamName = '';
			newCoachEmail = '';
			await teamsStore.load('director', { clubId });
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			saving = false;
		}
	};

	const inviteCoach = async () => {
		if (!selectedTeamId || !inviteCoachEmail.trim()) {
			return alert('Select a team and enter a coach email.');
		}
		saving = true;
		try {
			const teamSnap = await getDoc(doc(db, 'teams', selectedTeamId));
			if (!teamSnap.exists()) return alert('Team not found.');
			const tClubId = teamSnap.data().clubId;
			if (tClubId && clubId && tClubId !== clubId) {
				return alert('That team does not belong to your club.');
			}
			const res = await directorInviteCoach({
				teamId: selectedTeamId,
				coachEmail: inviteCoachEmail.trim()
			});
			const inviteId =
				res.data && typeof res.data.inviteId === 'string' ?
					` (ref ${res.data.inviteId.slice(0, 12)}…)` :
					'';
			alert(
				`Invite recorded.${inviteId} The coach has 7 days to accept; a seat stays reserved until then.`
			);
			inviteCoachEmail = '';
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					String(e);
			alert(msg);
		} finally {
			saving = false;
		}
	};
</script>

<div class="teams-tab tw-space-y-6">
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
		<div class="card">
			<div class="card-header bg-blue-header">Create sub-team</div>
			<div class="card-body">
				<label class="tw-block tw-text-xs tw-font-bold tw-mb-1" style="color: var(--text-secondary);"
					>Team label (e.g. U12 Gold)</label
				>
				<input type="text" bind:value={newTeamName} placeholder="U12 Gold" class="w-100 m-0" />
				<label class="tw-block tw-text-xs tw-font-bold tw-mt-3 tw-mb-1" style="color: var(--text-secondary);"
					>Optional — head coach email</label
				>
				<input type="email" bind:value={newCoachEmail} placeholder="coach@club.com" class="w-100 m-0" />
				<button class="primary-btn btn-blue w-100 tw-mt-4" onclick={createTeam} disabled={saving}>
					Create team
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-orange-header">Invite coach (seat reservation)</div>
			<div class="card-body">
				<p class="tw-m-0 tw-mb-3 tw-text-sm" style="color: var(--text-secondary);">
					Sends a pending invite: one licensed seat moves into <strong>reserved</strong> until the coach
					accepts or the invite expires after 7 days.
				</p>
				<select bind:value={selectedTeamId} class="w-100">
					<option value="">Select a team…</option>
					{#each clubTeams as t}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
				<input type="email" bind:value={inviteCoachEmail} placeholder="Coach email" class="w-100" />
				<button class="primary-btn btn-orange w-100 tw-mt-2" onclick={inviteCoach} disabled={saving}>
					Send coach invite
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	select,
	input {
		margin-bottom: 12px;
	}
</style>
