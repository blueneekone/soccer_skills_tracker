<script>
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import { clubSportIconClass } from '$lib/utils/sport-icon.js';
	import { goto } from '$app/navigation';
	import '$lib/styles/enterprise-console.css';

	const PAGE_SIZE = 25;

	// ── Organizations table ──────────────────────────────────────────────────────
	let orgSearch = $state('');
	let orgPage = $state(0);

	$effect(() => {
		void orgSearch;
		orgPage = 0;
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

	// ── Add Club form ────────────────────────────────────────────────────────────
	let newClubId = $state('');
	let newClubName = $state('');
	/** @type {'soccer'|'basketball'|'baseball'|'football'|'volleyball'|'hockey'|'lacrosse'|'generic'} */
	let newClubSport = $state('soccer');
	let newClubDirector = $state('');
	let clubSaving = $state(false);
	let clubAddErr = $state('');

	const addClub = async () => {
		clubAddErr = '';
		if (!newClubId.trim() || !newClubName.trim()) {
			clubAddErr = 'Please enter at least an ID and a club name.';
			return;
		}
		if (!newClubSport) {
			clubAddErr = 'Select a sport for this club.';
			return;
		}
		clubSaving = true;
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
			if (email) {
				await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
			}
			await logSecurityEvent('CREATE_CLUB', id, newClubName);
			newClubId = '';
			newClubName = '';
			newClubSport = 'soccer';
			newClubDirector = '';
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
		} catch (e) {
			clubAddErr = e instanceof Error ? e.message : 'Could not create club.';
		} finally {
			clubSaving = false;
		}
	};

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	const deleteClub = async (id, name) => {
		if (!confirm(`WARNING: Delete club "${name}" (${id})? This cannot be undone.`)) return;
		await deleteDoc(doc(db, 'clubs', id));
		await logSecurityEvent('DELETE_CLUB', id, 'Club deleted permanently');
		await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
	};

	// ── Platform Roster (linked players) ────────────────────────────────────────
	/** @typedef {{ id: string, displayName: string, teamId: string, teamLabel: string, statsDocId: string, playerEmail: string, ageGroup: string | null, lastActiveLabel: string }} PlatformPlayerRow */

	let platformPlayers = $state(/** @type {PlatformPlayerRow[]} */ ([]));
	let platformLoading = $state(false);
	let platformErr = $state('');
	let rosterSearch = $state('');
	let rosterPage = $state(0);

	$effect(() => {
		void rosterSearch;
		rosterPage = 0;
	});

	$effect(() => {
		if (!teamsStore.loaded || authStore.role !== 'super_admin') return;
		void teamsStore.teams.length;
		void loadPlatformRoster();
	});

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
				return /** @type {() => Date} */ (/** @type {Record<string,unknown>}*/(la)['toDate']).call(la).toLocaleDateString();
			} catch { /* — */ }
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
					typeof data.playerName === 'string' && data.playerName.trim()
						? data.playerName.trim()
						: '';
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
						ageGroup: parseAgeFromTeamName(r.teamLabel),
						lastActiveLabel: formatLastActiveLabel(st),
					};
				})
				.sort(
					(a, b) =>
						a.teamLabel.localeCompare(b.teamLabel) ||
						a.displayName.localeCompare(b.displayName),
				);
		} catch (e) {
			platformErr = e instanceof Error ? e.message : 'Could not load platform roster.';
			platformPlayers = [];
		} finally {
			platformLoading = false;
		}
	}

	const filteredRoster = $derived.by(() => {
		const q = rosterSearch.trim().toLowerCase();
		if (!q) return platformPlayers;
		return platformPlayers.filter((row) => {
			const hay = [row.displayName, row.teamLabel, row.playerEmail, row.ageGroup || '']
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

	/**
	 * @param {PlatformPlayerRow} row
	 */
	function openAdminPlayer(row) {
		enterprisePlayerDrawer.open(
			{ ...row, source: 'admin' },
			{
				editProfile: () => {
					if (row.playerEmail) window.location.href = `mailto:${row.playerEmail}`;
				},
			},
		);
	}
</script>

<div class="orgs-page">

	<!-- ── Organizations header ───────────────────────────────────────────────── -->
	<div class="orgs-page__header">
		<div class="orgs-page__header-text">
			<h1 class="orgs-page__title">
				<i class="ph ph-buildings" aria-hidden="true"></i>
				Organizations
			</h1>
			<p class="orgs-page__sub">{teamsStore.clubs.length} registered clubs on the platform.</p>
		</div>
	</div>

	<!-- ── Org search + table ──────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-body orgs-page__table-card-body">
			<div class="orgs-page__toolbar">
				<label class="orgs-page__search-label" for="orgs-search">Search organizations</label>
				<input
					id="orgs-search"
					type="search"
					class="orgs-page__search-input"
					bind:value={orgSearch}
					placeholder="Search by name, ID, sport, director…"
					autocomplete="off"
				/>
			</div>

			<div class="orgs-page__table-wrap">
				<table class="admin-table orgs-page__table">
					<thead>
						<tr>
							<th class="orgs-page__th-logo">Logo</th>
							<th>Club name</th>
							<th>Sport</th>
							<th>Director</th>
							<th>Teams</th>
							<th class="orgs-page__th-actions">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if pagedClubs.length === 0}
							<tr>
								<td colspan="6" class="text-center">
									{filteredClubs.length === 0 ? 'No clubs match your search.' : 'No clubs registered yet.'}
								</td>
							</tr>
						{:else}
							{#each pagedClubs as cl (cl.id)}
								<tr class="orgs-page__org-row">
									<td class="orgs-page__td-logo">
										{#if typeof cl.logoUrl === 'string' && cl.logoUrl.trim()}
											<img
												class="orgs-page__club-logo"
												src={cl.logoUrl.trim()}
												alt=""
												loading="lazy"
											/>
										{:else}
											<div class="orgs-page__logo-fallback" aria-hidden="true">
												<i class="ph {clubSportIconClass(cl.sport)}"></i>
											</div>
										{/if}
									</td>
									<td class="orgs-page__td-name">
										<span class="orgs-page__club-title">{cl.name || '—'}</span>
										<span class="orgs-page__club-id">{cl.id}</span>
									</td>
									<td class="orgs-page__td-muted">{cl.sport || '—'}</td>
									<td class="orgs-page__td-ellipsis">{cl.directorEmail || '—'}</td>
									<td class="orgs-page__td-muted">
										{teamsStore.teams.filter((t) => t.clubId === cl.id).length}
									</td>
									<td class="orgs-page__td-actions">
										<a
											class="orgs-page__view-btn"
											href="/admin/organizations/{cl.id}"
											aria-label="View details for {cl.name || cl.id}"
										>
											View <i class="ph ph-arrow-right" aria-hidden="true"></i>
										</a>
										<button
											type="button"
											class="delete-btn"
											onclick={() => deleteClub(cl.id, cl.name || cl.id)}
											aria-label="Delete {cl.name || cl.id}"
										>
											<i class="ph ph-trash" aria-hidden="true"></i>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="orgs-page__pager" role="navigation" aria-label="Organizations pagination">
				<button
					type="button"
					class="orgs-page__page-btn"
					disabled={orgPage <= 0}
					onclick={() => (orgPage = Math.max(0, orgPage - 1))}
				>
					Prev
				</button>
				<span class="orgs-page__page-info">
					Page {orgPage + 1} / {orgTotalPages}
					<span class="orgs-page__page-count">({filteredClubs.length} orgs)</span>
				</span>
				<button
					type="button"
					class="orgs-page__page-btn"
					disabled={orgPage >= orgTotalPages - 1}
					onclick={() => (orgPage = Math.min(orgTotalPages - 1, orgPage + 1))}
				>
					Next
				</button>
			</div>
		</div>
	</div>

	<!-- ── Add Club form ──────────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-header">
			<i class="ph ph-plus-circle" aria-hidden="true"></i> Register New Organization
		</div>
		<div class="card-body">
			{#if clubAddErr}
				<p class="orgs-page__flash orgs-page__flash--err" role="alert">{clubAddErr}</p>
			{/if}
			<div class="orgs-page__add-grid">
				<div class="orgs-page__field">
					<label for="add-club-id">Club ID <span class="orgs-page__req">*</span></label>
					<input
						id="add-club-id"
						type="text"
						bind:value={newClubId}
						placeholder="e.g. aggiesfc"
						disabled={clubSaving}
					/>
				</div>
				<div class="orgs-page__field">
					<label for="add-club-name">Club Name <span class="orgs-page__req">*</span></label>
					<input
						id="add-club-name"
						type="text"
						bind:value={newClubName}
						placeholder="e.g. Aggie FC"
						disabled={clubSaving}
					/>
				</div>
				<div class="orgs-page__field">
					<label for="add-club-sport">Sport</label>
					<select id="add-club-sport" bind:value={newClubSport} disabled={clubSaving}>
						<option value="soccer">Soccer</option>
						<option value="basketball">Basketball</option>
						<option value="baseball">Baseball</option>
						<option value="football">Football</option>
						<option value="volleyball">Volleyball</option>
						<option value="hockey">Hockey</option>
						<option value="lacrosse">Lacrosse</option>
						<option value="generic">Generic</option>
					</select>
				</div>
				<div class="orgs-page__field">
					<label for="add-club-director">Director Email (Optional)</label>
					<input
						id="add-club-director"
						type="email"
						bind:value={newClubDirector}
						placeholder="director@example.com"
						disabled={clubSaving}
					/>
				</div>
			</div>
			<button
				type="button"
				class="primary-btn btn-blue"
				onclick={addClub}
				disabled={clubSaving}
			>
				{clubSaving ? 'Creating…' : '+ Register Organization'}
			</button>
		</div>
	</div>

	<!-- ── Platform Roster ────────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-header">
			<i class="ph ph-users" aria-hidden="true"></i> Platform Roster
			{#if platformLoading}
				<span class="orgs-page__loading-badge">Loading…</span>
			{/if}
		</div>
		<div class="card-body orgs-page__roster-body">
			{#if authStore.role !== 'super_admin'}
				<p class="orgs-page__muted">Super admin access required.</p>
			{:else if platformErr}
				<p class="orgs-page__flash orgs-page__flash--err" role="alert">{platformErr}</p>
			{:else if platformPlayers.length === 0 && !platformLoading}
				<p class="orgs-page__muted">No players found in <code>player_lookup</code>.</p>
			{:else}
				<div class="orgs-page__toolbar">
					<label class="orgs-page__search-label" for="roster-search">Search roster</label>
					<input
						id="roster-search"
						type="search"
						class="orgs-page__search-input"
						bind:value={rosterSearch}
						placeholder="Search player, team, email…"
						autocomplete="off"
					/>
				</div>
				<div class="orgs-page__table-wrap">
					<table class="admin-table orgs-page__table">
						<thead>
							<tr>
								<th>Player</th>
								<th>Team</th>
								<th>Age Group</th>
								<th>Status</th>
								<th>Last Active</th>
							</tr>
						</thead>
						<tbody>
							{#if pagedRoster.length === 0}
								<tr>
									<td colspan="5" class="text-center">No players match your search.</td>
								</tr>
							{:else}
								{#each pagedRoster as row (row.id)}
									<tr
										class="orgs-page__roster-row"
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
										<td>
											<span class="orgs-page__player-name">{row.displayName}</span>
											<span class="orgs-page__player-email">{row.playerEmail}</span>
										</td>
										<td class="orgs-page__td-muted">{row.teamLabel}</td>
										<td>{row.ageGroup || '—'}</td>
										<td><span class="ec-pill ec-pill--ok">Active</span></td>
										<td class="orgs-page__td-muted">{row.lastActiveLabel}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
				<div class="orgs-page__pager" role="navigation" aria-label="Platform roster pagination">
					<button
						type="button"
						class="orgs-page__page-btn"
						disabled={rosterPage <= 0}
						onclick={() => (rosterPage = Math.max(0, rosterPage - 1))}
					>
						Prev
					</button>
					<span class="orgs-page__page-info">
						Page {rosterPage + 1} / {rosterTotalPages}
						<span class="orgs-page__page-count">({filteredRoster.length} players)</span>
					</span>
					<button
						type="button"
						class="orgs-page__page-btn"
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

<style>
	.orgs-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* ── Page header ────────────────────────────────────────────────── */
	.orgs-page__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.orgs-page__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
		letter-spacing: -0.03em;
	}

	.orgs-page__sub {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	/* ── Table card body (zero padding for full-bleed table) ──────── */
	.orgs-page__table-card-body {
		padding: 0 !important;
	}

	/* ── Toolbar (search bar) ───────────────────────────────────────── */
	.orgs-page__toolbar {
		padding: 16px 16px 0;
	}

	.orgs-page__search-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.orgs-page__search-input {
		width: 100%;
		max-width: 420px;
		box-sizing: border-box;
		margin: 0 0 10px;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--input-bg, #fff);
		font: inherit;
		color: var(--text-primary);
	}

	:global(html.dark) .orgs-page__search-input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	/* ── Full-bleed table wrap ──────────────────────────────────────── */
	.orgs-page__table-wrap {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.orgs-page__table {
		width: 100%;
		min-width: 640px;
		table-layout: auto;
	}

	.orgs-page__th-logo  { width: 52px; }
	.orgs-page__th-actions { width: 110px; text-align: right; }

	.orgs-page__td-logo {
		width: 52px;
		vertical-align: middle;
	}

	.orgs-page__club-logo {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid var(--border-subtle, #e5e5e5);
		display: block;
	}

	.orgs-page__logo-fallback {
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

	.orgs-page__td-name { vertical-align: middle; }

	.orgs-page__club-title {
		display: block;
		font-weight: 600;
		color: var(--text-primary);
	}

	.orgs-page__club-id {
		display: block;
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-family: ui-monospace, monospace;
	}

	.orgs-page__td-muted {
		color: var(--text-secondary);
		font-size: 0.88rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.orgs-page__td-ellipsis {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.orgs-page__td-actions {
		text-align: right;
		vertical-align: middle;
		white-space: nowrap;
	}

	.orgs-page__view-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--brand-primary, #f59e0b);
		background: transparent;
		color: var(--brand-primary, #d97706);
		font-size: 0.82rem;
		font-weight: 700;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.12s ease;
	}

	.orgs-page__view-btn:hover {
		background: rgba(245, 158, 11, 0.08);
	}

	:global(html.dark) .orgs-page__view-btn {
		color: #fbbf24;
		border-color: #d97706;
	}

	/* ── Pager ──────────────────────────────────────────────────────── */
	.orgs-page__pager {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs-page__pager {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.orgs-page__page-btn {
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

	.orgs-page__page-btn:hover:not(:disabled) {
		background: var(--surface-subtle, #fafafa);
	}

	.orgs-page__page-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	:global(html.dark) .orgs-page__page-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.orgs-page__page-info {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.orgs-page__page-count {
		font-size: 0.78rem;
		opacity: 0.9;
	}

	/* ── Add Club form ──────────────────────────────────────────────── */
	.orgs-page__add-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}

	.orgs-page__field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.orgs-page__field label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin: 0;
	}

	.orgs-page__field input,
	.orgs-page__field select {
		margin: 0;
	}

	.orgs-page__req {
		color: var(--danger-red, #b91c1c);
		margin-left: 2px;
	}

	/* ── Platform roster ────────────────────────────────────────────── */
	.orgs-page__roster-body {
		padding: 0 !important;
	}

	.orgs-page__roster-row {
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.orgs-page__roster-row:hover {
		background: var(--surface-subtle, rgba(0,0,0,0.03));
	}

	.orgs-page__player-name {
		display: block;
		font-weight: 600;
		color: var(--text-primary);
	}

	.orgs-page__player-email {
		display: block;
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-family: ui-monospace, monospace;
	}

	/* ── Flash messages ─────────────────────────────────────────────── */
	.orgs-page__flash {
		margin: 0 0 12px;
		padding: 12px 14px;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.orgs-page__flash--err {
		background: rgba(185, 28, 28, 0.1);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.35);
	}

	:global(html.dark) .orgs-page__flash--err {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
		background: rgba(127, 29, 29, 0.25);
	}

	/* ── Misc ────────────────────────────────────────────────────────── */
	.orgs-page__muted {
		padding: 16px;
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.orgs-page__loading-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-left: 8px;
	}

	.delete-btn {
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		cursor: pointer;
		color: var(--danger-red, #b91c1c);
		padding: 6px 10px;
		font-size: 0.85rem;
		margin-left: 6px;
	}

	.delete-btn:hover {
		background: rgba(185, 28, 28, 0.08);
	}
</style>
