<script>
	import { auth, db } from '$lib/firebase.js';
	import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';

	let newClubId = $state('');
	let newClubName = $state('');
	let newClubDirector = $state('');
	let adminTeamClubSel = $state('');
	let adminTeamId = $state('');
	let adminTeamName = $state('');
	let adminTeamCoach = $state('');
	let newAdminEmail = $state('');
	let assignDirEmail = $state('');
	let assignDirClubId = $state('');
	let saving = $state(false);

	const addClub = async () => {
		if (!newClubId.trim() || !newClubName.trim()) return alert('Please enter at least an ID and a Club Name.');
		saving = true;
		try {
			const id = newClubId.trim().toLowerCase();
			const email = newClubDirector.trim().toLowerCase();
			await setDoc(doc(db, 'clubs', id), { id, name: newClubName, directorEmail: email, createdAt: new Date() });
			if (email) await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
			await logSecurityEvent('CREATE_CLUB', id, newClubName);
			alert('Club Added Securely!');
			newClubId = ''; newClubName = ''; newClubDirector = '';
			await teamsStore.load('super_admin');
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};

	const deleteClub = async (id) => {
		if (!confirm(`WARNING: Delete club '${id}'? This cannot be undone.`)) return;
		await deleteDoc(doc(db, 'clubs', id));
		await logSecurityEvent('DELETE_CLUB', id, 'Club deleted permanently');
		alert('Club deleted. Refresh to update.');
		await teamsStore.load('super_admin');
	};

	const addTeam = async () => {
		if (!adminTeamClubSel || !adminTeamName.trim() || !adminTeamId.trim()) return alert('Select parent club, enter a Team ID and team name.');
		const tid = `${adminTeamClubSel}_${adminTeamId.trim()}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', tid), { clubId: adminTeamClubSel, name: adminTeamName, coachEmail: adminTeamCoach.toLowerCase(), createdAt: new Date() });
			if (adminTeamCoach) {
				await setDoc(doc(db, 'users', adminTeamCoach.toLowerCase()), { role: 'coach', clubId: adminTeamClubSel, teamId: tid }, { merge: true });
				await setDoc(doc(db, 'coach_lookup', adminTeamCoach.toLowerCase()), { role: 'coach', clubId: adminTeamClubSel, teamId: tid }, { merge: true });
			}
			await logSecurityEvent('CREATE_TEAM', tid, adminTeamName);
			alert(`Team '${adminTeamName}' added!`);
			adminTeamId = ''; adminTeamName = ''; adminTeamCoach = '';
			await teamsStore.load('super_admin');
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};

	const addAdmin = async () => {
		if (!newAdminEmail.trim()) return alert('Enter email.');
		const email = newAdminEmail.trim().toLowerCase();
		saving = true;
		try {
			await setDoc(doc(db, 'config', 'admins'), { list: [...teamsStore.admins, email] });
			await setDoc(doc(db, 'users', email), { role: 'super_admin' }, { merge: true });
			await logSecurityEvent('GRANT_SUPER_ADMIN', email, 'Added to global config');
			alert('Global Admin Added!');
			newAdminEmail = '';
			await teamsStore.load('super_admin');
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};

	const removeAdmin = async (email) => {
		if (!confirm(`Remove ${email} from Global Admins?`)) return;
		const newList = teamsStore.admins.filter((e) => e !== email);
		await setDoc(doc(db, 'config', 'admins'), { list: newList });
		await logSecurityEvent('REVOKE_SUPER_ADMIN', email, 'Removed from global config');
		await teamsStore.load('super_admin');
	};

	const assignDirector = async () => {
		if (!assignDirEmail || !assignDirClubId) return alert('Fill email and club.');
		const email = assignDirEmail.toLowerCase();
		saving = true;
		try {
			await setDoc(doc(db, 'clubs', assignDirClubId), { directorEmail: email }, { merge: true });
			await setDoc(doc(db, 'users', email), { role: 'director', clubId: assignDirClubId }, { merge: true });
			await logSecurityEvent('ASSIGN_DIRECTOR', email, `Club ID: ${assignDirClubId}`);
			alert(`${email} is now Director of ${assignDirClubId}`);
			assignDirEmail = '';
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};
</script>

<div class="accounts-tab">
	<div class="bento-section">
	<div class="card">
		<div class="card-header">🏢 Registered Organizations</div>
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="admin-table">
					<thead><tr><th>ID</th><th>Name</th><th>Director</th><th>Action</th></tr></thead>
					<tbody>
						{#each teamsStore.clubs as cl}
							<tr>
								<td>{cl.id}</td>
								<td>{cl.name}</td>
								<td>{cl.directorEmail || '—'}</td>
								<td><button class="delete-btn" onclick={() => deleteClub(cl.id)}>🗑️</button></td>
							</tr>
						{:else}
							<tr><td colspan="4" class="text-center">No clubs.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<hr class="section-divider" />
			<label>Add New Club</label>
			<div class="admin-input-row">
				<input type="text" bind:value={newClubId} placeholder="Club ID (e.g. aggiesfc)" class="m-0 flex-1" />
				<input type="text" bind:value={newClubName} placeholder="Club Name" class="m-0 flex-1" />
			</div>
			<input type="email" bind:value={newClubDirector} placeholder="Director Email (Optional)" />
			<button class="primary-btn btn-blue w-100" onclick={addClub} disabled={saving}>+ Add Club</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">👥 Registered Teams</div>
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="admin-table">
					<thead><tr><th>Team</th><th>Club</th><th>Coach</th></tr></thead>
					<tbody>
						{#each teamsStore.teams as t}
							<tr><td>{t.name} <span class="text-sm-sub">({t.id})</span></td><td>{t.clubId}</td><td>{t.coachEmail || '—'}</td></tr>
						{:else}
							<tr><td colspan="3" class="text-center">No teams.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<hr class="section-divider" />
			<label>Add New Team</label>
			<select bind:value={adminTeamClubSel}>
				<option value="">-- Select Parent Club --</option>
				{#each teamsStore.clubs as cl}<option value={cl.id}>{cl.name}</option>{/each}
			</select>
			<div class="admin-input-row">
				<input type="text" bind:value={adminTeamId} placeholder="Team ID (e.g. 15bew)" class="m-0 flex-1" />
				<input type="text" bind:value={adminTeamName} placeholder="Full Team Name" class="m-0 flex-2" />
			</div>
			<input type="email" bind:value={adminTeamCoach} placeholder="Head Coach Email" />
			<button class="primary-btn btn-blue w-100" onclick={addTeam} disabled={saving}>+ Add Team</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-blue-header">👥 Assign Club Director</div>
		<div class="card-body">
			<div class="admin-flex-row">
				<input type="email" bind:value={assignDirEmail} placeholder="Director Email" class="flex-1 m-0" />
				<select bind:value={assignDirClubId} class="m-0">
					<option value="">Select Club</option>
					{#each teamsStore.clubs as cl}<option value={cl.id}>{cl.name}</option>{/each}
				</select>
			</div>
			<button class="primary-btn w-100" onclick={assignDirector} disabled={saving}>Assign Director Role</button>
		</div>
	</div>

	<div class="card border-gold">
		<div class="card-header bg-gold-header">👑 Super Admins</div>
		<div class="card-body">
			<table class="admin-table">
				<thead><tr><th>Admin Email</th><th>Action</th></tr></thead>
				<tbody>
					{#each teamsStore.admins as email}
						<tr>
							<td>{email}</td>
							<td><button class="delete-btn" onclick={() => removeAdmin(email)}>X</button></td>
						</tr>
					{:else}
						<tr><td colspan="2" class="text-center">No admins loaded.</td></tr>
					{/each}
				</tbody>
			</table>
			<label>Grant Super Admin Access</label>
			<div class="admin-input-row">
				<input type="email" bind:value={newAdminEmail} placeholder="Enter new admin email..." class="m-0 flex-1" />
				<button class="primary-btn btn-gold" onclick={addAdmin} disabled={saving}>Grant Access</button>
			</div>
		</div>
	</div>
	</div>
</div>

<style>
	select, input { margin-bottom: 10px; }
	.section-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 16px 0; }
	.admin-flex-row { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
	.delete-btn { background: none; border: 1px solid var(--border-strong); border-radius: 6px; cursor: pointer; color: var(--danger-red); padding: 2px 8px; font-size: 0.85rem; }
</style>
