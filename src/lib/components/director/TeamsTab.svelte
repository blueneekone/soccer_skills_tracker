<script>
	import { db } from '$lib/firebase.js';
	import { doc, getDoc, setDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

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
		if (!newTeamName.trim()) return alert('Please enter a team name.');
		const teamId = `${clubId}_${newTeamName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', teamId), { clubId, name: newTeamName, coachEmail: newCoachEmail.toLowerCase(), createdAt: new Date() });
			if (newCoachEmail) {
				await setDoc(doc(db, 'coach_lookup', newCoachEmail.toLowerCase()), { teamId, clubId, role: 'coach' });
			}
			alert(`✅ Team '${newTeamName}' created!`);
			newTeamName = ''; newCoachEmail = '';
			await teamsStore.load('director');
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};

	const inviteCoach = async () => {
		if (!selectedTeamId || !inviteCoachEmail.trim()) return alert('Select a team and enter a coach email.');
		const emailLower = inviteCoachEmail.toLowerCase().trim();
		saving = true;
		try {
			const teamSnap = await getDoc(doc(db, 'teams', selectedTeamId));
			if (!teamSnap.exists()) return alert('Team not found.');
			const tClubId = teamSnap.data().clubId;
			const batch = writeBatch(db);
			batch.set(doc(db, 'coach_lookup', emailLower), { teamId: selectedTeamId, clubId: tClubId, role: 'coach', invitedAt: new Date() }, { merge: true });
			batch.set(doc(db, 'users', emailLower), { teamId: selectedTeamId, clubId: tClubId, role: 'coach' }, { merge: true });
			await batch.commit();
			alert(`✅ Coach invite sent! ${emailLower} will be auto-assigned on next login.`);
			inviteCoachEmail = '';
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};
</script>

<div class="teams-tab">
	<div class="bento-section">
	<div class="card">
		<div class="card-header bg-blue-header">Create Sub-Team</div>
		<div class="card-body">
			<div class="input-row">
				<input type="text" bind:value={newTeamName} placeholder="Team Name (e.g. U12 Gold)" class="flex-1 m-0" />
				<input type="email" bind:value={newCoachEmail} placeholder="Coach Email" class="flex-1 m-0" />
			</div>
			<button class="primary-btn btn-blue w-100" onclick={createTeam} disabled={saving}>Create Team</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-orange-header">Assign Coach to Existing Team</div>
		<div class="card-body">
			<select bind:value={selectedTeamId}>
				<option value="">Loading Teams...</option>
				{#each clubTeams as t}
					<option value={t.id}>{t.name}</option>
				{/each}
			</select>
			<input type="email" bind:value={inviteCoachEmail} placeholder="Coach Email" />
			<button class="primary-btn btn-orange w-100" onclick={inviteCoach} disabled={saving}>Invite / Assign Coach</button>
		</div>
	</div>
	</div>
</div>

<style>
	.input-row { gap: 8px; }
	select, input { margin-bottom: 12px; }
</style>
