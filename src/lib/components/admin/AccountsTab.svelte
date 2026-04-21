<script>
	import { auth, db } from '$lib/firebase.js';
	import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import '$lib/styles/enterprise-console.css';

	/** @typedef {{ id: string, displayName: string, teamId: string, teamLabel: string, statsDocId: string, playerEmail: string, jersey: string | null, ageGroup: string | null, position: string | null, status: 'active' | 'pending', lastActiveLabel: string }} PlatformPlayerRow */

	let platformPlayers = $state(/** @type {PlatformPlayerRow[]} */ ([]));
	let platformLoading = $state(false);
	let platformErr = $state('');

	/**
	 * @param {string} teamName
	 */
	function parseAgeFromTeamName(teamName) {
		if (!teamName) return null;
		const m = String(teamName).match(/\bU\s*(\d{1,2})\b/i);
		return m ? `U${m[1]}` : null;
	}

	/**
	 * @param {Record<string, unknown> | undefined} stats
	 */
	function formatLastActiveLabel(stats) {
		if (!stats) return '—';
		const la = stats.lastActive;
		if (la && typeof la === 'object' && 'toDate' in la && typeof la.toDate === 'function') {
			try {
				return la.toDate().toLocaleDateString();
			} catch {
				/* — */
			}
		}
		if (typeof stats.last_training_utc === 'string') return stats.last_training_utc;
		return '—';
	}

	async function loadPlatformRoster() {
		if (authStore.role !== 'super_admin') return;
		platformLoading = true;
		platformErr = '';
		try {
			const lookupSnap = await getDocs(collection(db, 'player_lookup'));
			const teamNameById = Object.fromEntries(teamsStore.teams.map((t) => [t.id, t.name || t.id]));
			const uniqueTeamIds = new Set();
			/** @type {Array<{ playerName: string, email: string, teamId: string, teamLabel: string }>} */
			const raw = [];
			lookupSnap.forEach((d) => {
				const data = d.data();
				const teamId = typeof data.teamId === 'string' ? data.teamId : '';
				const playerName =
					typeof data.playerName === 'string' && data.playerName.trim() ?
						data.playerName.trim() :
						'';
				if (!playerName) return;
				uniqueTeamIds.add(teamId);
				raw.push({
					playerName,
					email: d.id,
					teamId,
					teamLabel: teamNameById[teamId] || teamId || '—',
				});
			});

			/** @type {Record<string, Record<string, { id: string, data: Record<string, unknown> }>>} */
			const statsByTeam = {};
			for (const tid of uniqueTeamIds) {
				if (!tid) continue;
				const sq = query(collection(db, 'player_stats'), where('teamId', '==', tid));
				const sSnap = await getDocs(sq);
				statsByTeam[tid] = {};
				sSnap.forEach((sd) => {
					const dat = sd.data();
					const entry = { id: sd.id, data: dat };
					statsByTeam[tid][sd.id] = entry;
					const pn = typeof dat.playerName === 'string' ? dat.playerName.trim() : '';
					if (pn) statsByTeam[tid][`n:${pn}`] = entry;
				});
			}

			platformPlayers = raw
				.map((r) => {
					const teamStats = statsByTeam[r.teamId] || {};
					const byName = teamStats[`n:${r.playerName}`];
					const byEmail = teamStats[r.email];
					const pick = byName || byEmail;
					const st = pick?.data;
					const statsDocId = pick?.id || r.email;
					return {
						id: `${r.teamId}_${r.playerName}_${r.email}`,
						displayName: r.playerName,
						teamId: r.teamId,
						teamLabel: r.teamLabel,
						statsDocId,
						playerEmail: r.email,
						jersey: null,
						ageGroup: parseAgeFromTeamName(r.teamLabel),
						position: null,
						status: /** @type {'active'} */ ('active'),
						lastActiveLabel: formatLastActiveLabel(st),
					};
				})
				.sort((a, b) =>
					a.teamLabel.localeCompare(b.teamLabel) || a.displayName.localeCompare(b.displayName)
				);
		} catch (e) {
			platformErr =
				e instanceof Error ? e.message : 'Could not load platform roster.';
			platformPlayers = [];
		} finally {
			platformLoading = false;
		}
	}

	$effect(() => {
		if (!teamsStore.loaded || authStore.role !== 'super_admin') return;
		// Re-run when team list changes so labels stay in sync.
		void teamsStore.teams.length;
		loadPlatformRoster();
	});

	/**
	 * @param {PlatformPlayerRow} row
	 */
	function openAdminPlayer(row) {
		enterprisePlayerDrawer.open(
			{
				...row,
				source: 'admin',
			},
			{
				editProfile: () => {
					const em = row.playerEmail;
					if (em) window.location.href = `mailto:${em}`;
				},
			}
		);
	}

	let newClubId = $state('');
	let newClubName = $state('');
	/** @type {'soccer'|'basketball'|'baseball'|'football'|'volleyball'|'hockey'|'lacrosse'|'generic'} */
	let newClubSport = $state('soccer');
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
		if (!newClubSport) return alert('Select a sport for this club.');
		saving = true;
		try {
			const id = newClubId.trim().toLowerCase();
			const email = newClubDirector.trim().toLowerCase();
			await setDoc(doc(db, 'clubs', id), {
				id,
				name: newClubName,
				directorEmail: email,
				sport: newClubSport,
				createdAt: new Date(),
			});
			if (email) await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
			await logSecurityEvent('CREATE_CLUB', id, newClubName);
			alert('Club Added Securely!');
			newClubId = '';
			newClubName = '';
			newClubSport = 'soccer';
			newClubDirector = '';
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
		<div class="card-header">📋 Platform Roster (Linked Players)</div>
		<div class="card-body p-0">
			{#if authStore.role !== 'super_admin'}
				<p class="admin-roster-hint">Super admin only.</p>
			{:else if platformLoading}
				<div class="session-empty">Loading roster…</div>
			{:else if platformErr}
				<p class="admin-roster-err">{platformErr}</p>
			{:else if platformPlayers.length === 0}
				<div class="session-empty">No players in player_lookup.</div>
			{:else}
				<div class="ec-table-wrap">
					<table class="ec-table">
						<thead>
							<tr>
								<th>Player</th>
								<th>Team</th>
								<th>Age Group</th>
								<th>Position</th>
								<th>Status</th>
								<th>Last Active</th>
							</tr>
						</thead>
						<tbody>
							{#each platformPlayers as row (row.id)}
								<tr
									class="ec-table__row-click"
									onclick={() => openAdminPlayer(row)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											openAdminPlayer(row);
										}
									}}
									role="button"
									tabindex="0"
								>
									<td class="ec-table__strong">{row.displayName}</td>
									<td class="ec-muted">{row.teamLabel}</td>
									<td>{row.ageGroup || '—'}</td>
									<td class="ec-muted">—</td>
									<td>
										<span class="ec-pill ec-pill--ok">Active</span>
									</td>
									<td class="ec-muted">{row.lastActiveLabel}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<div class="card">
		<div class="card-header">🏢 Registered Organizations</div>
		<div class="card-body">
			<div class="ec-table-wrap">
				<table class="admin-table">
					<thead><tr><th>ID</th><th>Name</th><th>Sport</th><th>Director</th><th>Action</th></tr></thead>
					<tbody>
						{#each teamsStore.clubs as cl}
							<tr>
								<td>{cl.id}</td>
								<td>{cl.name}</td>
								<td>{cl.sport || '—'}</td>
								<td>{cl.directorEmail || '—'}</td>
								<td><button class="delete-btn" onclick={() => deleteClub(cl.id)}>🗑️</button></td>
							</tr>
						{:else}
							<tr><td colspan="5" class="text-center">No clubs.</td></tr>
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
			<label for="admin-new-club-sport">Sport</label>
			<select id="admin-new-club-sport" bind:value={newClubSport} class="m-0 w-100">
				<option value="soccer">Soccer</option>
				<option value="basketball">Basketball</option>
				<option value="baseball">Baseball</option>
				<option value="football">Football</option>
				<option value="volleyball">Volleyball</option>
				<option value="hockey">Hockey</option>
				<option value="lacrosse">Lacrosse</option>
				<option value="generic">Generic</option>
			</select>
			<input type="email" bind:value={newClubDirector} placeholder="Director Email (Optional)" />
			<button class="primary-btn btn-blue w-100" onclick={addClub} disabled={saving}>+ Add Club</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">👥 Registered Teams</div>
		<div class="card-body">
			<div class="ec-table-wrap">
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
			<div class="ec-table-wrap">
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
			</div>
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
	.admin-roster-hint { padding: 16px; margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
	.admin-roster-err { padding: 16px; margin: 0; color: var(--danger-red, #b91c1c); font-size: 0.9rem; }
</style>
