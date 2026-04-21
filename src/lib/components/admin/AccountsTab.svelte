<script>
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { auth, db } from '$lib/firebase.js';
	import { collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import AdminEditClubDrawer from '$lib/components/admin/AdminEditClubDrawer.svelte';
	import { clubSportIconClass } from '$lib/utils/sport-icon.js';
	import '$lib/styles/enterprise-console.css';

	const PAGE_SIZE = 25;

	let accountsTab = $state(/** @type {'orgs' | 'roster' | 'admins'} */ ('orgs'));
	let editClubOpen = $state(false);
	/** @type {Record<string, unknown> & { id: string } | null} */
	let selectedClub = $state(null);

	let orgSearch = $state('');
	let orgPage = $state(0);
	let rosterSearch = $state('');
	let rosterPage = $state(0);

	/** @type {Record<string, Record<string, unknown>>} */
	let entitlementByClubId = $state({});
	let entitlementsLoading = $state(false);

	$effect(() => {
		void orgSearch;
		orgPage = 0;
	});

	$effect(() => {
		void rosterSearch;
		rosterPage = 0;
	});

	$effect(() => {
		if (authStore.role !== 'super_admin') return;
		if (accountsTab !== 'orgs') return;
		const clubs = teamsStore.clubs;
		const ids = clubs.map((c) => c.id).filter(Boolean);
		if (ids.length === 0) {
			entitlementByClubId = {};
			return;
		}
		let cancelled = false;
		entitlementsLoading = true;
		void (async () => {
			try {
				const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'license_entitlements', id))));
				if (cancelled) return;
				/** @type {Record<string, Record<string, unknown>>} */
				const next = {};
				snaps.forEach((snap, i) => {
					if (snap.exists()) next[ids[i]] = /** @type {Record<string, unknown>} */ (snap.data());
				});
				entitlementByClubId = next;
			} catch (e) {
				console.error('[AccountsTab] license_entitlements batch', e);
			} finally {
				if (!cancelled) entitlementsLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const filteredClubs = $derived.by(() => {
		const q = orgSearch.trim().toLowerCase();
		const list = teamsStore.clubs;
		if (!q) return list;
		return list.filter((cl) => {
			const name = (cl.name || '').toLowerCase();
			const id = (cl.id || '').toLowerCase();
			const sport = (cl.sport || '').toLowerCase();
			const dir = (cl.directorEmail || '').toLowerCase();
			return name.includes(q) || id.includes(q) || sport.includes(q) || dir.includes(q);
		});
	});

	const orgTotalPages = $derived(Math.max(1, Math.ceil(filteredClubs.length / PAGE_SIZE)));

	const pagedClubs = $derived.by(() => {
		const start = orgPage * PAGE_SIZE;
		return filteredClubs.slice(start, start + PAGE_SIZE);
	});

	$effect(() => {
		if (orgPage > orgTotalPages - 1) orgPage = Math.max(0, orgTotalPages - 1);
	});

	/**
	 * @param {Record<string, unknown> | undefined} ent
	 * @param {boolean} isInfinite
	 */
	function licenseUsedCount(ent, isInfinite) {
		if (isInfinite) return { used: 0, limit: 0, pct: 0 };
		if (!ent) return { used: 0, limit: 0, pct: 0 };
		const lim = typeof ent.seats_limit === 'number' ? ent.seats_limit : 0;
		const a = typeof ent.active_seats === 'number' ? ent.active_seats : 0;
		const r = typeof ent.reserved_seats === 'number' ? ent.reserved_seats : 0;
		const used = a + r;
		const pct = lim > 0 ? Math.min(100, (used / lim) * 100) : 0;
		return { used, limit: lim, pct };
	}

	/**
	 * @param {number} pct
	 */
	function licenseStressClass(pct) {
		if (pct > 90) return 'accounts-tab__gauge-fill--crit';
		if (pct > 70) return 'accounts-tab__gauge-fill--warn';
		return 'accounts-tab__gauge-fill--ok';
	}

	/** @typedef {{ id: string, displayName: string, teamId: string, teamLabel: string, statsDocId: string, playerEmail: string, jersey: string | null, ageGroup: string | null, position: string | null, status: 'active' | 'pending', lastActiveLabel: string }} PlatformPlayerRow */

	let platformPlayers = $state(/** @type {PlatformPlayerRow[]} */ ([]));
	let platformLoading = $state(false);
	let platformErr = $state('');

	const filteredRoster = $derived.by(() => {
		const q = rosterSearch.trim().toLowerCase();
		if (!q) return platformPlayers;
		return platformPlayers.filter((row) => {
			const hay = [
				row.displayName,
				row.teamLabel,
				row.playerEmail,
				row.lastActiveLabel,
				row.ageGroup || '',
			]
				.join(' ')
				.toLowerCase();
			return hay.includes(q);
		});
	});

	const rosterTotalPages = $derived(Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE)));

	const pagedRoster = $derived.by(() => {
		const start = rosterPage * PAGE_SIZE;
		return filteredRoster.slice(start, start + PAGE_SIZE);
	});

	$effect(() => {
		if (rosterPage > rosterTotalPages - 1) rosterPage = Math.max(0, rosterTotalPages - 1);
	});

	const selectedEntitlement = $derived(
		selectedClub?.id ? entitlementByClubId[selectedClub.id] ?? null : null,
	);

	const selectedTeamsCount = $derived(
		selectedClub ? teamsStore.teams.filter((t) => t.clubId === selectedClub.id).length : 0,
	);

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

	/**
	 * @param {Record<string, unknown> & { id: string }} cl
	 */
	function openEditClub(cl) {
		selectedClub = cl;
		editClubOpen = true;
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
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: get(page).url.pathname,
			});
		} catch (e) {
			alert('Error: ' + e.message);
		} finally {
			saving = false;
		}
	};

	/**
	 * @param {string} id
	 * @returns {Promise<boolean>}
	 */
	const deleteClub = async (id) => {
		if (!confirm(`WARNING: Delete club '${id}'? This cannot be undone.`)) return false;
		await deleteDoc(doc(db, 'clubs', id));
		await logSecurityEvent('DELETE_CLUB', id, 'Club deleted permanently');
		alert('Club deleted. Refresh to update.');
		await teamsStore.load('super_admin', {
			scope: 'admin_full',
			routePath: get(page).url.pathname,
		});
		return true;
	};

	async function deleteSelectedClubFromDrawer() {
		if (!selectedClub?.id) return false;
		const ok = await deleteClub(selectedClub.id);
		if (ok) {
			editClubOpen = false;
			selectedClub = null;
		}
		return ok;
	}

	const addTeam = async () => {
		if (!adminTeamClubSel || !adminTeamName.trim() || !adminTeamId.trim()) {
			return alert('Select parent club, enter a Team ID and team name.');
		}
		const tid = `${adminTeamClubSel}_${adminTeamId.trim()}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', tid), {
				clubId: adminTeamClubSel,
				name: adminTeamName,
				coachEmail: adminTeamCoach.toLowerCase(),
				createdAt: new Date(),
			});
			if (adminTeamCoach) {
				await setDoc(
					doc(db, 'users', adminTeamCoach.toLowerCase()),
					{ role: 'coach', clubId: adminTeamClubSel, teamId: tid },
					{ merge: true }
				);
				await setDoc(
					doc(db, 'coach_lookup', adminTeamCoach.toLowerCase()),
					{ role: 'coach', clubId: adminTeamClubSel, teamId: tid },
					{ merge: true }
				);
			}
			await logSecurityEvent('CREATE_TEAM', tid, adminTeamName);
			alert(`Team '${adminTeamName}' added!`);
			adminTeamId = '';
			adminTeamName = '';
			adminTeamCoach = '';
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: get(page).url.pathname,
			});
		} catch (e) {
			alert('Error: ' + e.message);
		} finally {
			saving = false;
		}
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
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: get(page).url.pathname,
			});
		} catch (e) {
			alert('Error: ' + e.message);
		} finally {
			saving = false;
		}
	};

	const removeAdmin = async (email) => {
		if (!confirm(`Remove ${email} from Global Admins?`)) return;
		const newList = teamsStore.admins.filter((e) => e !== email);
		await setDoc(doc(db, 'config', 'admins'), { list: newList });
		await logSecurityEvent('REVOKE_SUPER_ADMIN', email, 'Removed from global config');
		await teamsStore.load('super_admin', {
			scope: 'admin_full',
			routePath: get(page).url.pathname,
		});
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
		} catch (e) {
			alert('Error: ' + e.message);
		} finally {
			saving = false;
		}
	};
</script>

<div class="accounts-tab">
	<div class="accounts-tab__nav" role="tablist" aria-label="Administrator sections">
		<button
			type="button"
			class="accounts-tab__tab"
			role="tab"
			aria-selected={accountsTab === 'orgs'}
			tabindex={accountsTab === 'orgs' ? 0 : -1}
			onclick={() => (accountsTab = 'orgs')}
		>
			Organizations
		</button>
		<button
			type="button"
			class="accounts-tab__tab"
			role="tab"
			aria-selected={accountsTab === 'roster'}
			tabindex={accountsTab === 'roster' ? 0 : -1}
			onclick={() => (accountsTab = 'roster')}
		>
			Platform Roster
		</button>
		<button
			type="button"
			class="accounts-tab__tab"
			role="tab"
			aria-selected={accountsTab === 'admins'}
			tabindex={accountsTab === 'admins' ? 0 : -1}
			onclick={() => (accountsTab = 'admins')}
		>
			System Admins
		</button>
	</div>

	{#if accountsTab === 'orgs'}
		<div class="bento-section accounts-tab__panel" role="tabpanel">
			<div class="card">
				<div class="card-header">🏢 Registered Organizations</div>
				<div class="card-body">
					<label class="accounts-tab__search-label" for="accounts-org-search">Search organizations</label>
					<input
						id="accounts-org-search"
						type="search"
						class="accounts-tab__search-input"
						bind:value={orgSearch}
						placeholder="Search by name, ID, sport, director…"
						autocomplete="off"
					/>
					<div class="accounts-tab__table-wrap">
						<table class="admin-table accounts-tab__orgs-table">
							<thead>
								<tr>
									<th class="accounts-tab__th-logo">Logo</th>
									<th>Club name</th>
									<th>Sport</th>
									<th>Director</th>
									<th>License</th>
									<th class="accounts-tab__th-action">Action</th>
								</tr>
							</thead>
							<tbody>
								{#if pagedClubs.length === 0}
									<tr
										><td colspan="6" class="text-center"
											>{filteredClubs.length === 0 ? 'No clubs match your search.' : 'No clubs.'}</td
										></tr
									>
								{:else}
									{#each pagedClubs as cl (cl.id)}
										<tr class="accounts-tab__org-row">
											<td class="accounts-tab__td-logo">
												{#if typeof cl.logoUrl === 'string' && cl.logoUrl.trim()}
													<img
														class="accounts-tab__club-logo"
														src={cl.logoUrl.trim()}
														alt=""
													/>
												{:else}
													<div class="accounts-tab__logo-fallback" aria-hidden="true">
														<i class="ph {clubSportIconClass(cl.sport)}"></i>
													</div>
												{/if}
											</td>
											<td class="accounts-tab__td-name">
												<span class="accounts-tab__club-title">{cl.name || '—'}</span>
												<span class="accounts-tab__club-id">{cl.id}</span>
											</td>
											<td>{cl.sport || '—'}</td>
											<td class="accounts-tab__td-ellipsis">{cl.directorEmail || '—'}</td>
											<td class="accounts-tab__td-license">
												{#if cl.isInfinite === true}
													<span class="accounts-tab__promo-badge" title="Unlimited enterprise / promo">
														∞ PROMO
													</span>
												{:else}
													{@const ent = entitlementByClubId[cl.id]}
													{#if entitlementsLoading && ent === undefined}
														<span class="accounts-tab__license-muted">…</span>
													{:else}
														{@const u = licenseUsedCount(ent, false)}
														{#if u.limit > 0}
															<div class="accounts-tab__gauge" title="Seats used vs licensed cap">
																<div class="accounts-tab__gauge-track">
																	<div
																		class="accounts-tab__gauge-fill {licenseStressClass(u.pct)}"
																		style="width: {u.pct}%"
																	></div>
																</div>
																<span class="accounts-tab__gauge-label">{u.used} / {u.limit} seats</span>
															</div>
														{:else}
															<span class="accounts-tab__license-muted">No cap set</span>
														{/if}
													{/if}
												{/if}
											</td>
											<td class="accounts-tab__td-action">
												<button
													type="button"
													class="accounts-tab__manage-btn"
													onclick={() => openEditClub(cl)}
													aria-label="Manage {cl.name || cl.id}"
												>
													<i class="ph ph-dots-three" aria-hidden="true"></i>
												</button>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
					<div class="accounts-tab__pager" role="navigation" aria-label="Organizations pagination">
						<button
							type="button"
							class="accounts-tab__page-btn"
							disabled={orgPage <= 0}
							onclick={() => (orgPage = Math.max(0, orgPage - 1))}
						>
							Prev
						</button>
						<span class="accounts-tab__page-info">
							Page {orgPage + 1} / {orgTotalPages}
							<span class="accounts-tab__page-count">({filteredClubs.length} orgs)</span>
						</span>
						<button
							type="button"
							class="accounts-tab__page-btn"
							disabled={orgPage >= orgTotalPages - 1}
							onclick={() => (orgPage = Math.min(orgTotalPages - 1, orgPage + 1))}
						>
							Next
						</button>
					</div>
					<p class="accounts-tab__hint">
						Use Manage (<i class="ph ph-dots-three" aria-hidden="true"></i>) for full club details,
						Stripe IDs, and teams count. Club ID is shown under the name.
					</p>
					<hr class="section-divider" />
					<label for="admin-new-club-id">Add New Club</label>
					<div class="admin-input-row">
						<input
							id="admin-new-club-id"
							type="text"
							bind:value={newClubId}
							placeholder="Club ID (e.g. aggiesfc)"
							class="m-0 flex-1"
						/>
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
							<thead>
								<tr><th>Team</th><th>Club</th><th>Coach</th></tr>
							</thead>
							<tbody>
								{#each teamsStore.teams as t}
									<tr>
										<td>{t.name} <span class="text-sm-sub">({t.id})</span></td>
										<td>{t.clubId}</td>
										<td>{t.coachEmail || '—'}</td>
									</tr>
								{:else}
									<tr><td colspan="3" class="text-center">No teams.</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
					<hr class="section-divider" />
					<label for="admin-new-team-club">Add New Team</label>
					<select id="admin-new-team-club" bind:value={adminTeamClubSel}>
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
					<button class="primary-btn w-100" onclick={assignDirector} disabled={saving}>
						Assign Director Role
					</button>
				</div>
			</div>
		</div>
	{:else if accountsTab === 'roster'}
		<div class="bento-section accounts-tab__panel" role="tabpanel">
			<div class="card">
				<div class="card-header">📋 Platform Roster (Linked Players)</div>
				<div class="card-body accounts-tab__roster-stack">
					{#if authStore.role !== 'super_admin'}
						<p class="admin-roster-hint">Super admin only.</p>
					{:else if platformLoading}
						<div class="session-empty">Loading roster…</div>
					{:else if platformErr}
						<p class="admin-roster-err">{platformErr}</p>
					{:else if platformPlayers.length === 0}
						<div class="session-empty">No players in player_lookup.</div>
					{:else}
						<div class="accounts-tab__roster-toolbar">
							<label class="accounts-tab__search-label" for="accounts-roster-search">Search roster</label>
							<input
								id="accounts-roster-search"
								type="search"
								class="accounts-tab__search-input"
								bind:value={rosterSearch}
								placeholder="Search player, team, email, last active…"
								autocomplete="off"
							/>
						</div>
						<div class="accounts-tab__table-wrap">
							<table class="admin-table accounts-tab__roster-table">
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
									{#if pagedRoster.length === 0}
										<tr
											><td colspan="6" class="text-center"
												>{filteredRoster.length === 0 ? 'No players match your search.' : 'No rows.'}</td
											></tr
										>
									{:else}
										{#each pagedRoster as row (row.id)}
											<tr
												class="accounts-tab__roster-row"
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
												<td class="accounts-tab__td-strong">{row.displayName}</td>
												<td class="accounts-tab__td-muted">{row.teamLabel}</td>
												<td>{row.ageGroup || '—'}</td>
												<td class="accounts-tab__td-muted">—</td>
												<td>
													<span class="ec-pill ec-pill--ok">Active</span>
												</td>
												<td class="accounts-tab__td-muted">{row.lastActiveLabel}</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
						<div class="accounts-tab__pager" role="navigation" aria-label="Platform roster pagination">
							<button
								type="button"
								class="accounts-tab__page-btn"
								disabled={rosterPage <= 0}
								onclick={() => (rosterPage = Math.max(0, rosterPage - 1))}
							>
								Prev
							</button>
							<span class="accounts-tab__page-info">
								Page {rosterPage + 1} / {rosterTotalPages}
								<span class="accounts-tab__page-count">({filteredRoster.length} players)</span>
							</span>
							<button
								type="button"
								class="accounts-tab__page-btn"
								disabled={rosterPage >= rosterTotalPages - 1}
								onclick={() => (rosterPage = Math.min(rosterTotalPages - 1, rosterPage + 1))}
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="bento-section accounts-tab__panel" role="tabpanel">
			<div class="card border-gold">
				<div class="card-header bg-gold-header">👑 System Admins</div>
				<div class="card-body">
					<div class="ec-table-wrap">
						<table class="admin-table">
							<thead>
								<tr><th>Admin Email</th><th>Action</th></tr>
							</thead>
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
					<label for="admin-grant-email">Grant Super Admin Access</label>
					<div class="admin-input-row">
						<input
							id="admin-grant-email"
							type="email"
							bind:value={newAdminEmail}
							placeholder="Enter new admin email..."
							class="m-0 flex-1"
						/>
						<button class="primary-btn btn-gold" onclick={addAdmin} disabled={saving}>Grant Access</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<AdminEditClubDrawer
	bind:open={editClubOpen}
	club={selectedClub}
	entitlement={selectedEntitlement}
	teamsCount={selectedTeamsCount}
	onDeleteClub={deleteSelectedClubFromDrawer}
/>

<style>
	.accounts-tab :global(select),
	.accounts-tab :global(input:not(.accounts-tab__search-input)) {
		margin-bottom: 10px;
	}
	.section-divider {
		border: none;
		border-top: 1px solid var(--border-subtle);
		margin: 16px 0;
	}
	.admin-flex-row {
		display: flex;
		gap: 10px;
		margin-bottom: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	.delete-btn {
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		cursor: pointer;
		color: var(--danger-red);
		padding: 2px 8px;
		font-size: 0.85rem;
	}
	.admin-roster-hint {
		padding: 16px;
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	.admin-roster-err {
		padding: 16px;
		margin: 0;
		color: var(--danger-red, #b91c1c);
		font-size: 0.9rem;
	}

	.accounts-tab__nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	.accounts-tab__tab {
		border: 1px solid #e5e5e5;
		background: #fafafa;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 600;
		padding: 8px 14px;
		border-radius: 8px;
		cursor: pointer;
		transition:
			background 0.12s ease,
			color 0.12s ease,
			border-color 0.12s ease;
	}

	.accounts-tab__tab[aria-selected='true'] {
		background: #ffffff;
		color: var(--text-primary);
		border-color: #a3a3a3;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}

	:global(html.dark) .accounts-tab__tab {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.12);
		color: var(--text-secondary);
	}

	:global(html.dark) .accounts-tab__tab[aria-selected='true'] {
		background: #09090b;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.18);
	}

	.accounts-tab__hint {
		margin: 10px 0 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.accounts-tab__pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(22, 163, 74, 0.12);
		color: #15803d;
		border: 1px solid rgba(22, 163, 74, 0.25);
	}

	.accounts-tab__pill-muted {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.accounts-tab__search-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.accounts-tab__search-input {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		margin: 0 0 14px;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--input-bg, #fff);
		font: inherit;
		color: var(--text-primary);
	}

	:global(html.dark) .accounts-tab__search-input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.accounts-tab__table-wrap {
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
	}

	:global(html.dark) .accounts-tab__table-wrap {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.accounts-tab__orgs-table,
	.accounts-tab__roster-table {
		width: 100%;
		min-width: 0;
		table-layout: fixed;
	}

	.accounts-tab__orgs-table :global(th),
	.accounts-tab__orgs-table :global(td),
	.accounts-tab__roster-table :global(th),
	.accounts-tab__roster-table :global(td) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.accounts-tab__th-logo {
		width: 52px;
	}
	.accounts-tab__th-action {
		width: 56px;
		text-align: right;
	}

	.accounts-tab__td-logo {
		width: 52px;
		vertical-align: middle;
	}

	.accounts-tab__club-logo {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid var(--border-subtle, #e5e5e5);
		display: block;
	}

	.accounts-tab__logo-fallback {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: rgba(99, 102, 241, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
		font-size: 1.1rem;
	}

	.accounts-tab__td-name {
		vertical-align: middle;
	}

	.accounts-tab__club-title {
		display: block;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.accounts-tab__club-id {
		display: block;
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-family: ui-monospace, monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.accounts-tab__td-ellipsis {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.accounts-tab__td-license {
		vertical-align: middle;
		min-width: 120px;
	}

	.accounts-tab__promo-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		padding: 4px 8px;
		border-radius: 999px;
		color: #78350f;
		background: linear-gradient(135deg, #fde68a 0%, #fbbf24 55%, #d97706 100%);
		border: 1px solid rgba(180, 83, 9, 0.35);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.accounts-tab__gauge {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.accounts-tab__gauge-track {
		height: 6px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.1);
		overflow: hidden;
	}

	:global(html.dark) .accounts-tab__gauge-track {
		background: rgba(255, 255, 255, 0.1);
	}

	.accounts-tab__gauge-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.2s ease, background 0.2s ease;
	}

	.accounts-tab__gauge-fill--ok {
		background: #22c55e;
	}

	.accounts-tab__gauge-fill--warn {
		background: #f59e0b;
	}

	.accounts-tab__gauge-fill--crit {
		background: #ef4444;
	}

	.accounts-tab__gauge-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.accounts-tab__license-muted {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.accounts-tab__td-action {
		text-align: right;
		vertical-align: middle;
	}

	.accounts-tab__manage-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 8px;
		background: var(--surface-subtle, #fafafa);
		cursor: pointer;
		color: var(--text-primary);
	}

	.accounts-tab__manage-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.dark) .accounts-tab__manage-btn {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.accounts-tab__pager {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 14px;
		padding-top: 4px;
	}

	.accounts-tab__page-btn {
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: #fff;
		cursor: pointer;
		color: var(--text-primary);
	}

	.accounts-tab__page-btn:hover:not(:disabled) {
		background: var(--surface-subtle, #fafafa);
	}

	.accounts-tab__page-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	:global(html.dark) .accounts-tab__page-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.accounts-tab__page-info {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.accounts-tab__page-count {
		font-size: 0.78rem;
		opacity: 0.9;
	}

	.accounts-tab__muted {
		color: var(--text-secondary);
	}

	.accounts-tab__roster-stack {
		padding: 0;
	}

	.accounts-tab__roster-toolbar {
		padding: 16px 16px 0;
	}

	.accounts-tab__roster-stack .accounts-tab__table-wrap {
		margin: 0 16px;
		width: auto;
		max-width: calc(100% - 32px);
	}

	.accounts-tab__roster-stack .accounts-tab__pager {
		padding: 0 16px 16px;
		margin-top: 12px;
	}

	.accounts-tab__roster-row {
		cursor: pointer;
	}

	.accounts-tab__td-strong {
		font-weight: 600;
		color: var(--text-primary);
	}

	.accounts-tab__td-muted {
		color: var(--text-secondary);
		font-size: 0.88rem;
	}
</style>
