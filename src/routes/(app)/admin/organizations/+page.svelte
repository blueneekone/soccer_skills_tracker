<script>
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		setDoc,
		deleteDoc,
		getDocs,
		query,
		where,
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { clubSportIconClass } from '$lib/utils/sport-icon.js';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import '$lib/styles/enterprise-console.css';

	const createSportModuleFn = httpsCallable(functions, 'createSportModule');

	const PAGE_SIZE = 50;

	// ── Typedefs ─────────────────────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string,
	 *   name?: string,
	 *   sport?: string,
	 *   directorEmail?: string,
	 *   isInfinite?: boolean,
	 *   logoUrl?: string,
	 *   createdAt?: unknown,
	 * }} Club
	 */

	/**
	 * @typedef {{ status: 'clean' | 'watch' | 'risk' | 'na', total: number, verified: number }} ComplianceHealth
	 */

	// ── Direct Firestore fetch — does NOT depend on teamsStore ───────────────────
	/** @type {Club[]} */
	let clubs = $state([]);
	let clubsLoading = $state(false);
	let clubsErr = $state('');

	/** @type {Map<string, ComplianceHealth>} */
	let complianceMap = $state(new Map());

	$effect(() => {
		// Guard: wait for Firebase Auth init to settle before reading protected collections.
		// Without this, getDocs fires with no token → empty snapshot (the "Aggies FC" bug).
		if (authStore.isLoading || !authStore.isAuthenticated) return;

		let cancelled = false;
		clubsLoading = true;
		clubsErr = '';

		void Promise.all([
			getDocs(collection(db, 'clubs')),
			getDocs(collection(db, 'vpc_requests')),
		])
			.then(([clubsSnap, vpcSnap]) => {
				if (cancelled) return;

			// Build clubs array — normalize every field so legacy documents with missing
			// fields (e.g. no `sport` key) never cause the {#each} renderer to throw.
			/** @type {Club[]} */
			const loaded = [];
			clubsSnap.forEach((d) => {
				const raw = /** @type {Record<string, unknown>} */ (d.data());
				loaded.push({
					id: d.id,
					name:          typeof raw.name          === 'string' ? raw.name.trim()          : undefined,
					sport:         typeof raw.sport         === 'string' && raw.sport.trim()
					               ? raw.sport.trim()
					               : undefined,          // intentionally undefined → renders as '—' downstream
					directorEmail: typeof raw.directorEmail === 'string' ? raw.directorEmail.trim() : undefined,
					isInfinite:    raw.isInfinite === true,
					logoUrl:       typeof raw.logoUrl       === 'string' ? raw.logoUrl.trim()       : undefined,
					createdAt:     raw.createdAt,
				});
			});
				clubs = loaded.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

				// Build compliance map from vpc_requests
				/** @type {Map<string, { total: number, verified: number }>} */
				const raw = new Map();
				vpcSnap.forEach((d) => {
					const data = d.data();
					const clubId = typeof data.clubId === 'string' ? data.clubId : '';
					if (!clubId) return;
					const existing = raw.get(clubId) ?? { total: 0, verified: 0 };
					existing.total += 1;
					if (data.status === 'approved') existing.verified += 1;
					raw.set(clubId, existing);
				});

				/** @type {Map<string, ComplianceHealth>} */
				const cm = new Map();
				raw.forEach((v, clubId) => {
					const pct = v.total > 0 ? v.verified / v.total : 0;
					/** @type {ComplianceHealth['status']} */
					let status;
					if (pct >= 1) status = 'clean';
					else if (pct >= 0.5) status = 'watch';
					else status = 'risk';
					cm.set(clubId, { status, total: v.total, verified: v.verified });
				});
				complianceMap = cm;
			})
			.catch((e) => {
				if (cancelled) return;
				clubsErr = e instanceof Error ? e.message : 'Could not load organizations.';
			})
			.finally(() => {
				if (!cancelled) clubsLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	// ── Search + pagination ───────────────────────────────────────────────────────
	let orgSearch = $state('');
	let orgPage   = $state(0);

	$effect(() => {
		void orgSearch;
		orgPage = 0;
	});

	const filteredClubs = $derived.by(() => {
		const q = orgSearch.trim().toLowerCase();
		if (!q) return clubs;
		return clubs.filter((cl) => {
			return (
				(cl.name || '').toLowerCase().includes(q) ||
				cl.id.toLowerCase().includes(q) ||
				(cl.sport || '').toLowerCase().includes(q) ||
				(cl.directorEmail || '').toLowerCase().includes(q)
			);
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

	// ── Compliance badge data ─────────────────────────────────────────────────────
	/** @param {string} clubId */
	function getCompliance(clubId) {
		return complianceMap.get(clubId) ?? null;
	}

	// ── Add Club form ────────────────────────────────────────────────────────────
	let showAddForm     = $state(false);
	let newClubId       = $state('');
	let newClubName     = $state('');
	/** @type {string} */
	let newClubSport    = $state('soccer');
	/** true when the admin selects "+ Create new sport…" in the sport select */
	let newSportMode    = $state(false);
	let newSportName    = $state('');
	let newSportIcon    = $state('ph-soccer-ball');
	let newClubDir      = $state('');
	let clubSaving      = $state(false);
	let clubAddErr      = $state('');

	/** Reacts to sport select changes — toggles "new sport" inline panel */
	$effect(() => {
		newSportMode = newClubSport === '__new__';
		if (!newSportMode) { newSportName = ''; newSportIcon = 'ph-soccer-ball'; }
	});

	async function addClub() {
		clubAddErr = '';
		if (!newClubId.trim() || !newClubName.trim()) {
			clubAddErr = 'Club ID and Club Name are required.';
			return;
		}
		if (newSportMode && !newSportName.trim()) {
			clubAddErr = 'Sport name is required when creating a new sport module.';
			return;
		}
		clubSaving = true;
		try {
			const id    = newClubId.trim().toLowerCase();
			const email = newClubDir.trim().toLowerCase();

			// ── Step 1: Provision new sport module if requested ──────────────────
			// If this callable fails, club creation is halted — no partial state written.
			let resolvedSport = newClubSport;
			if (newSportMode) {
				const res = await createSportModuleFn({
					sportName: newSportName.trim(),
					defaultIcon: newSportIcon.trim() || 'ph-soccer-ball',
					courtType: '',
				});
				const data = /** @type {{ ok?: boolean, sportId?: string }} */ (res.data);
				if (!data?.ok || !data.sportId) {
					throw new Error('Sport module server did not confirm creation. Club was NOT created.');
				}
				resolvedSport = data.sportId;
			}

			// ── Step 2: Create the club document ────────────────────────────────
			await setDoc(doc(db, 'clubs', id), {
				id,
				name: newClubName,
				directorEmail: email,
				sport: resolvedSport,
				createdAt: new Date(),
			});
			if (email) {
				await setDoc(doc(db, 'users', email), { role: 'director', clubId: id }, { merge: true });
			}
			await logSecurityEvent('CREATE_CLUB', id, newClubName);

			// ── Reset form ───────────────────────────────────────────────────────
			newClubId    = '';
			newClubName  = '';
			newClubSport = 'soccer';
			newSportName = '';
			newSportIcon = 'ph-soccer-ball';
			newClubDir   = '';
			showAddForm  = false;

			// Reload clubs table directly
			const snap = await getDocs(collection(db, 'clubs'));
			/** @type {Club[]} */
			const reloaded = [];
			snap.forEach((d) => reloaded.push({ id: d.id, .../** @type {Omit<Club,'id'>} */ (d.data()) }));
			clubs = reloaded.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
		} catch (e) {
			clubAddErr = e instanceof Error ? e.message : 'Could not create club.';
		} finally {
			clubSaving = false;
		}
	}

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	async function deleteClub(id, name) {
		if (!confirm(`Permanently delete organization "${name}" (${id})? This cannot be undone.`)) return;
		await deleteDoc(doc(db, 'clubs', id));
		await logSecurityEvent('DELETE_CLUB', id, 'Club deleted permanently');
		clubs = clubs.filter((cl) => cl.id !== id);
	}

</script>

<div class="orgs3-page">

	<!-- ── Page toolbar ──────────────────────────────────────────────────────── -->
	<div class="orgs3-toolbar">
		<div class="orgs3-toolbar__left">
			<h1 class="orgs3-toolbar__title">Organizations</h1>
			<span class="orgs3-toolbar__count">
				{#if clubsLoading}—{:else}{filteredClubs.length} of {clubs.length}{/if}
			</span>
		</div>
		<div class="orgs3-toolbar__right">
			<div class="orgs3-search-wrap">
				<i class="ph ph-magnifying-glass orgs3-search-icon" aria-hidden="true"></i>
				<input
					type="search"
					class="orgs3-search"
					bind:value={orgSearch}
					placeholder="Filter organizations…"
					autocomplete="off"
					aria-label="Filter organizations"
				/>
			</div>
			<button
				type="button"
				class="orgs3-add-btn"
				onclick={() => (showAddForm = !showAddForm)}
				aria-expanded={showAddForm}
			>
				<i class="ph {showAddForm ? 'ph-x' : 'ph-plus'}" aria-hidden="true"></i>
				{showAddForm ? 'Cancel' : 'Add Organization'}
			</button>
		</div>
	</div>

	<!-- ── Inline add form (collapsible) ────────────────────────────────────── -->
	{#if showAddForm}
		<div class="orgs3-add-form">
			{#if clubAddErr}
				<p class="orgs3-flash orgs3-flash--err" role="alert">{clubAddErr}</p>
			{/if}
			<div class="orgs3-add-grid">
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-id">
						Club ID <span class="orgs3-req" aria-hidden="true">*</span>
					</label>
					<input id="add-club-id" type="text" class="orgs3-input" bind:value={newClubId} placeholder="e.g. aggiesfc" disabled={clubSaving} />
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-name">
						Club Name <span class="orgs3-req" aria-hidden="true">*</span>
					</label>
					<input id="add-club-name" type="text" class="orgs3-input" bind:value={newClubName} placeholder="e.g. Aggie FC" disabled={clubSaving} />
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-sport">Sport</label>
					<select id="add-club-sport" class="orgs3-input" bind:value={newClubSport} disabled={clubSaving}>
						<option value="soccer">Soccer</option>
						<option value="basketball">Basketball</option>
						<option value="baseball">Baseball</option>
						<option value="football">Football</option>
						<option value="volleyball">Volleyball</option>
						<option value="hockey">Hockey</option>
						<option value="lacrosse">Lacrosse</option>
						<option value="generic">Generic</option>
						<option disabled>──────────</option>
						<option value="__new__">+ Create new sport…</option>
					</select>
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-club-dir">Director Email</label>
					<input id="add-club-dir" type="email" class="orgs3-input" bind:value={newClubDir} placeholder="director@example.com" disabled={clubSaving} />
				</div>
			</div>

			<!-- ── New Sport inline panel — shown only when "+ Create new sport…" is selected -->
			{#if newSportMode}
				<div class="orgs3-new-sport-panel">
					<div class="orgs3-new-sport-panel__label">
						<i class="ph ph-trophy" aria-hidden="true"></i>
						New Sport Module
						<span class="orgs3-new-sport-panel__sub">
							Provisioned via Cloud Function before the club is saved.
							If this step fails, the club will NOT be created.
						</span>
					</div>
					<div class="orgs3-add-grid orgs3-add-grid--compact">
						<div class="orgs3-field">
							<label class="orgs3-field-label" for="add-sport-name">
								Sport Name <span class="orgs3-req" aria-hidden="true">*</span>
							</label>
							<input
								id="add-sport-name"
								type="text"
								class="orgs3-input"
								bind:value={newSportName}
								placeholder="e.g. Volleyball"
								disabled={clubSaving}
							/>
						</div>
						<div class="orgs3-field">
							<label class="orgs3-field-label" for="add-sport-icon">
								Icon <span class="orgs3-field-label__hint">(Phosphor class)</span>
							</label>
							<input
								id="add-sport-icon"
								type="text"
								class="orgs3-input"
								bind:value={newSportIcon}
								placeholder="ph-volleyball"
								disabled={clubSaving}
							/>
						</div>
					</div>
				</div>
			{/if}

			<button type="button" class="orgs3-submit-btn" onclick={addClub} disabled={clubSaving}>
				{#if clubSaving}
					{newSportMode ? 'Provisioning sport & creating club…' : 'Creating…'}
				{:else}
					+ Register Organization
				{/if}
			</button>
		</div>
	{/if}

	<!-- ── Enterprise DataTable ───────────────────────────────────────────────── -->
	{#if clubsErr}
		<div class="orgs3-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{clubsErr}
		</div>
	{/if}

	<div class="orgs3-dt-container">
		<table class="orgs3-dt" aria-label="Organizations">
			<thead class="orgs3-dt__head">
				<tr>
					<th class="orgs3-dt__th orgs3-dt__th--logo" scope="col" aria-label="Logo"></th>
					<th class="orgs3-dt__th" scope="col">Organization</th>
					<th class="orgs3-dt__th" scope="col">Sport</th>
					<th class="orgs3-dt__th" scope="col">Director</th>
					<th class="orgs3-dt__th" scope="col">Teams</th>
					<th class="orgs3-dt__th orgs3-dt__th--compliance" scope="col">Compliance</th>
					<th class="orgs3-dt__th orgs3-dt__th--actions" scope="col" aria-label="Actions"></th>
				</tr>
			</thead>
			<tbody>
				{#if clubsLoading}
					<tr>
						<td colspan="7" class="orgs3-dt__td-loading" aria-busy="true">
							<span class="orgs3-spinner" aria-hidden="true"></span>
							Loading organizations…
						</td>
					</tr>
				{:else if pagedClubs.length === 0}
					<tr>
						<td colspan="7" class="orgs3-dt__td-empty">
							{clubs.length === 0 ? 'No organizations registered yet.' : 'No organizations match your filter.'}
						</td>
					</tr>
				{:else}
					{#each pagedClubs as cl (cl.id)}
						{@const compliance = getCompliance(cl.id)}
						{@const teamCount  = teamsStore.teams.filter((t) => t.clubId === cl.id).length}
						<tr class="orgs3-dt__row">
							<!-- Logo -->
							<td class="orgs3-dt__td orgs3-dt__td--logo">
								{#if typeof cl.logoUrl === 'string' && cl.logoUrl.trim()}
									<img class="orgs3-logo" src={cl.logoUrl.trim()} alt="" loading="lazy" />
								{:else}
								<span class="orgs3-logo-fallback" aria-hidden="true">
									<i class="ph {clubSportIconClass(cl.sport ?? 'generic')}"></i>
								</span>
								{/if}
							</td>

							<!-- Name + ID -->
							<td class="orgs3-dt__td orgs3-dt__td--name">
								<a class="orgs3-org-link" href="/admin/organizations/{cl.id}">
									{cl.name || '—'}
								</a>
								<span class="orgs3-org-id">{cl.id}</span>
								{#if cl.isInfinite === true}
									<span class="orgs3-promo" title="Unlimited / Promo license">∞</span>
								{/if}
							</td>

							<!-- Sport -->
							<td class="orgs3-dt__td orgs3-dt__td--muted">
								{cl.sport || '—'}
							</td>

							<!-- Director -->
							<td class="orgs3-dt__td orgs3-dt__td--mono orgs3-dt__td--ellipsis">
								{cl.directorEmail || '—'}
							</td>

							<!-- Teams count -->
							<td class="orgs3-dt__td orgs3-dt__td--num">
								{teamCount}
							</td>

							<!-- Compliance Health -->
							<td class="orgs3-dt__td">
								{#if cl.isInfinite === true && !compliance}
									<span class="orgs3-compliance orgs3-compliance--na" title="Enterprise promo license">
										<span class="orgs3-compliance__dot"></span>
										N/A
									</span>
								{:else if compliance === null}
									<span class="orgs3-compliance orgs3-compliance--clean" title="No minor accounts on record">
										<span class="orgs3-compliance__dot"></span>
										Clean
									</span>
								{:else if compliance.status === 'clean'}
									<span class="orgs3-compliance orgs3-compliance--clean" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										Compliant
									</span>
								{:else if compliance.status === 'watch'}
									<span class="orgs3-compliance orgs3-compliance--watch" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										{compliance.verified}/{compliance.total} verified
									</span>
								{:else}
									<span class="orgs3-compliance orgs3-compliance--risk" title="{compliance.verified}/{compliance.total} VPC verified">
										<span class="orgs3-compliance__dot"></span>
										At Risk
									</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="orgs3-dt__td orgs3-dt__td--actions">
								<a
									class="orgs3-view-btn"
									href="/admin/organizations/{cl.id}"
									aria-label="View {cl.name || cl.id}"
								>
									View <i class="ph ph-arrow-right" aria-hidden="true"></i>
								</a>
								<button
									type="button"
									class="orgs3-del-btn"
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

	<!-- ── Pagination ─────────────────────────────────────────────────────────── -->
	{#if orgTotalPages > 1}
		<div class="orgs3-pager" role="navigation" aria-label="Organizations pagination">
			<button
				type="button"
				class="orgs3-page-btn"
				disabled={orgPage <= 0}
				onclick={() => (orgPage = Math.max(0, orgPage - 1))}
			>
				← Prev
			</button>
			<span class="orgs3-page-info">
				Page {orgPage + 1} / {orgTotalPages}
				<span class="orgs3-page-count">({filteredClubs.length} results)</span>
			</span>
			<button
				type="button"
				class="orgs3-page-btn"
				disabled={orgPage >= orgTotalPages - 1}
				onclick={() => (orgPage = Math.min(orgTotalPages - 1, orgPage + 1))}
			>
				Next →
			</button>
		</div>
	{/if}


</div>

<style>
	/* ─────────────────────────────────────────────────────────────────────────── */
	/* Enterprise DataTable — zero card wrappers, 1px borders, high-density rows  */
	/* ─────────────────────────────────────────────────────────────────────────── */
	.orgs3-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Page toolbar ───────────────────────────────────────────────── */
	.orgs3-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		margin-bottom: 0;
	}

	:global(html.dark) .orgs3-toolbar {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.orgs3-toolbar__left {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-shrink: 0;
	}

	.orgs3-toolbar__title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.orgs3-toolbar__count {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.orgs3-toolbar__right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* ── Search ─────────────────────────────────────────────────────── */
	.orgs3-search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.orgs3-search-icon {
		position: absolute;
		left: 10px;
		font-size: 0.875rem;
		color: rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	:global(html.dark) .orgs3-search-icon {
		color: rgba(255, 255, 255, 0.28);
	}

	.orgs3-search {
		height: 34px;
		padding: 0 12px 0 30px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text-primary);
		outline: none;
		width: 220px;
		transition: border-color 0.12s ease;
	}

	.orgs3-search:focus {
		border-color: var(--brand-primary, #f59e0b);
	}

	:global(html.dark) .orgs3-search {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.orgs3-search--sm { width: 200px; }

	/* ── Add button ─────────────────────────────────────────────────── */
	.orgs3-add-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		transition: background 0.1s ease, border-color 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-add-btn:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.18);
	}

	:global(html.dark) .orgs3-add-btn {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
	}

	/* ── Inline add form ────────────────────────────────────────────── */
	.orgs3-add-form {
		padding: 16px 0 20px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-add-form {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.orgs3-add-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 14px;
	}

	.orgs3-add-grid--compact { margin-bottom: 0; }

	/* ── New Sport inline panel ─────────────────────────────────────── */
	.orgs3-new-sport-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px 16px;
		margin-bottom: 14px;
		border-radius: 8px;
		border: 1px solid rgba(245, 158, 11, 0.3);
		background: rgba(245, 158, 11, 0.04);
	}

	:global(html.dark) .orgs3-new-sport-panel {
		border-color: rgba(245, 158, 11, 0.25);
		background: rgba(245, 158, 11, 0.06);
	}

	.orgs3-new-sport-panel__label {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.8125rem;
		font-weight: 700;
		color: #d97706;
		flex-wrap: wrap;
	}

	:global(html.dark) .orgs3-new-sport-panel__label { color: #fbbf24; }

	.orgs3-new-sport-panel__sub {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--text-secondary);
		width: 100%;
		margin-top: 2px;
		line-height: 1.5;
	}

	.orgs3-field-label__hint {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.75;
	}

	.orgs3-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.orgs3-field-label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.orgs3-input {
		height: 34px;
		padding: 0 10px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.12s ease;
		box-sizing: border-box;
		width: 100%;
	}

	.orgs3-input:focus { border-color: var(--brand-primary, #f59e0b); }
	.orgs3-input:disabled { opacity: 0.55; cursor: not-allowed; }

	:global(html.dark) .orgs3-input {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #fafafa;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.orgs3-req { color: var(--danger-red, #b91c1c); margin-left: 2px; }

	.orgs3-submit-btn {
		height: 34px;
		padding: 0 16px;
		border-radius: 7px;
		border: none;
		background: var(--brand-primary, #f59e0b);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		color: #0f172a;
		cursor: pointer;
		transition: filter 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-submit-btn:hover:not(:disabled) { filter: brightness(1.06); }
	.orgs3-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── DataTable container — edge-to-edge ─────────────────────────── */
	.orgs3-dt-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		/* No border-radius, no box-shadow — true edge-to-edge */
		border-top: 1px solid var(--border-subtle, #e5e5e5);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-dt-container {
		border-color: rgba(255, 255, 255, 0.07);
	}

	/* ── Table ──────────────────────────────────────────────────────── */
	.orgs3-dt {
		width: 100%;
		min-width: 680px;
		border-collapse: collapse;
		font-size: 0.8125rem; /* text-sm */
		letter-spacing: -0.01em; /* tracking-tight */
	}

	/* Sticky header */
	.orgs3-dt__head {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.orgs3-dt__th {
		padding: 8px 12px; /* py-2 equivalent */
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		background: var(--surface-subtle, #f9f9f9);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		white-space: nowrap;
	}

	:global(html.dark) .orgs3-dt__th {
		background: #0d0d0f;
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.orgs3-dt__th--logo    { width: 44px; padding-left: 16px; }
	.orgs3-dt__th--compliance { width: 130px; }
	.orgs3-dt__th--actions { width: 96px; text-align: right; padding-right: 16px; }

	/* Rows */
	.orgs3-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.07s ease;
	}

	.orgs3-dt__row:last-child { border-bottom: none; }

	.orgs3-dt__row:hover {
		background: rgba(0, 0, 0, 0.018); /* subtle gray — NO box-shadow */
	}

	:global(html.dark) .orgs3-dt__row {
		border-bottom-color: rgba(255, 255, 255, 0.05);
	}

	:global(html.dark) .orgs3-dt__row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.orgs3-dt__row--clickable { cursor: pointer; }

	/* Cells */
	.orgs3-dt__td {
		padding: 8px 12px; /* py-2 px-3 */
		vertical-align: middle;
		color: var(--text-primary);
	}

	.orgs3-dt__td--logo { width: 44px; padding-left: 16px; }
	.orgs3-dt__td--name { vertical-align: top; padding-top: 10px; }

	.orgs3-dt__td--muted {
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.orgs3-dt__td--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}

	.orgs3-dt__td--ellipsis {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.orgs3-dt__td--num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.orgs3-dt__td--actions {
		text-align: right;
		padding-right: 16px;
		white-space: nowrap;
	}

	/* Loading / empty states */
	.orgs3-dt__td-loading {
		text-align: center;
		padding: 40px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.orgs3-dt__td-empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	/* Loading spinner */
	.orgs3-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
		animation: orgs3-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	:global(html.dark) .orgs3-spinner {
		border-color: rgba(255, 255, 255, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
	}

	@keyframes orgs3-spin { to { transform: rotate(360deg); } }

	/* ── Logo cell ──────────────────────────────────────────────────── */
	.orgs3-logo {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		object-fit: cover;
		border: 1px solid var(--border-subtle, #e5e5e5);
		display: block;
	}

	.orgs3-logo-fallback {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		background: rgba(99, 102, 241, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		color: #6366f1;
	}

	/* ── Org name cell ──────────────────────────────────────────────── */
	.orgs3-org-link {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.1s ease;
	}

	.orgs3-org-link:hover { color: var(--brand-primary, #d97706); }

	.orgs3-org-id {
		display: block;
		font-size: 0.7rem;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
		margin-top: 1px;
	}

	.orgs3-promo {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 900;
		padding: 1px 5px;
		border-radius: 999px;
		background: linear-gradient(135deg, #fde68a, #fbbf24, #d97706);
		color: #78350f;
		margin-left: 4px;
		vertical-align: middle;
	}

	/* ── Compliance Health column ───────────────────────────────────── */
	.orgs3-compliance {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}

	.orgs3-compliance__dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.orgs3-compliance--clean  { color: #15803d; }
	.orgs3-compliance--clean  .orgs3-compliance__dot { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.18); }

	.orgs3-compliance--watch  { color: #b45309; }
	.orgs3-compliance--watch  .orgs3-compliance__dot { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }

	.orgs3-compliance--risk   { color: #b91c1c; }
	.orgs3-compliance--risk   .orgs3-compliance__dot { background: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.2); animation: orgs3-pulse 2s ease infinite; }

	.orgs3-compliance--na     { color: var(--text-secondary); }
	.orgs3-compliance--na     .orgs3-compliance__dot { background: rgba(0,0,0,0.15); }

	:global(html.dark) .orgs3-compliance--clean  { color: #86efac; }
	:global(html.dark) .orgs3-compliance--watch  { color: #fde68a; }
	:global(html.dark) .orgs3-compliance--risk   { color: #fca5a5; }

	@keyframes orgs3-pulse {
		0%, 100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.2); }
		50%        { box-shadow: 0 0 0 5px rgba(239,68,68,0.05); }
	}

	/* ── Action buttons ─────────────────────────────────────────────── */
	.orgs3-view-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: var(--brand-primary, #d97706);
		font-size: 0.75rem;
		font-weight: 700;
		text-decoration: none;
		transition: background 0.1s ease;
		white-space: nowrap;
	}

	.orgs3-view-btn:hover { background: rgba(245, 158, 11, 0.07); }

	:global(html.dark) .orgs3-view-btn {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}

	.orgs3-del-btn {
		background: none;
		border: none;
		padding: 4px 7px;
		border-radius: 5px;
		cursor: pointer;
		color: rgba(0, 0, 0, 0.28);
		font-size: 0.85rem;
		transition: color 0.1s ease, background 0.1s ease;
		margin-left: 4px;
	}

	.orgs3-del-btn:hover {
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.06);
	}

	:global(html.dark) .orgs3-del-btn { color: rgba(255, 255, 255, 0.25); }

	/* ── Pagination ─────────────────────────────────────────────────── */
	.orgs3-pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px 0;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .orgs3-pager {
		border-top-color: rgba(255, 255, 255, 0.07);
	}

	.orgs3-page-btn {
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 5px 14px;
		border-radius: 6px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		cursor: pointer;
		color: var(--text-primary);
		transition: background 0.1s ease;
	}

	.orgs3-page-btn:hover:not(:disabled) { background: rgba(0, 0, 0, 0.04); }
	.orgs3-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	:global(html.dark) .orgs3-page-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.orgs3-page-info {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.orgs3-page-count { font-size: 0.75rem; opacity: 0.8; margin-left: 4px; }

	/* ── Error state ────────────────────────────────────────────────── */
	.orgs3-err {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 0;
		color: var(--danger-red, #b91c1c);
		font-size: 0.875rem;
		font-weight: 600;
	}

	/* ── Flash ──────────────────────────────────────────────────────── */
	.orgs3-flash {
		margin: 0 0 10px;
		padding: 10px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.orgs3-flash--err {
		background: rgba(185, 28, 28, 0.08);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.3);
	}
</style>
