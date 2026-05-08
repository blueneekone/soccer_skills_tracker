<script>
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		query,
		where,
		orderBy,
		limit,
		startAfter,
	} from 'firebase/firestore';
	import { getContext } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import '$lib/styles/enterprise-console.css';

	/**
	 * @type {{
	 *   clubDoc: Record<string, unknown> & { id: string } | null,
	 *   clubId: string,
	 *   clubLoading: boolean,
	 *   clubErr: string,
	 * }}
	 */
	const ctx = getContext('adminClubCtx');

	const teamId = $derived(page.params.teamId || '');
	const authReady = $derived(!authStore.isLoading && authStore.isAuthenticated);
	/** Canceled stale roster fetches when `teamId` or auth gating flaps. */
	let rosterFetchGen = 0;

	// ── Team meta (name for breadcrumb) ──────────────────────────────────────────
	/** @type {{ id: string, name?: string, coachEmail?: string } | null} */
	let teamDoc = $state(null);
	let teamLoading = $state(false);
	let teamErr = $state('');

	// ── Roster ───────────────────────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   email: string,
	 *   playerName: string,
	 *   ageGroup: string | null,
	 *   teamId: string,
	 * }} RosterRow
	 */

	const ROSTER_PAGE_SIZE = 20;

	/** @type {RosterRow[]} */
	let roster = $state([]);
	let rosterLoading = $state(false);
	let rosterErr = $state('');
	/** @type {import('firebase/firestore').DocumentSnapshot | null} */
	let rosterLastDoc = $state(null);
	let rosterHasMore = $state(false);
	let rosterLoadingMore = $state(false);

	// ── Search ───────────────────────────────────────────────────────────────────
	let rosterSearch = $state('');

	const filteredRoster = $derived.by(() => {
		const q = rosterSearch.trim().toLowerCase();
		if (!q) return roster;
		return roster.filter((r) =>
			[r.playerName, r.email, r.ageGroup || ''].join(' ').toLowerCase().includes(q),
		);
	});

	// ── Age group helper ─────────────────────────────────────────────────────────
	/** @param {string} teamName */
	function parseAgeGroup(teamName) {
		if (!teamName) return null;
		const m = String(teamName).match(/\bU\s*(\d{1,2})\b/i);
		return m ? `U${m[1]}` : null;
	}

	// ── Data fetch — team doc + roster (deps: authReady + teamId; no $effect → $state sync loops) ──
	$effect(() => {
		const gen = ++rosterFetchGen;
		if (!authReady) return;

		const tid = teamId;
		if (!tid) {
			untrack(() => {
				teamErr = 'No team ID in URL.';
				teamDoc = null;
				roster = [];
				teamLoading = false;
				rosterLoading = false;
			});
			return;
		}

		let cancelled = false;

		untrack(() => {
			teamLoading = true;
			rosterLoading = true;
			teamErr = '';
			rosterErr = '';
		});

		void (async () => {
			try {
				const rosterFirstPageQ = query(
					collection(db, 'player_lookup'),
					where('teamId', '==', tid),
					orderBy('playerName'),
					limit(ROSTER_PAGE_SIZE + 1),
				);
				const [teamSnap, rosterSnap] = await Promise.all([
					getDoc(doc(db, 'teams', tid)),
					getDocs(rosterFirstPageQ),
				]);

				if (cancelled || gen !== rosterFetchGen) return;

				untrack(() => {
					const rawDocs = rosterSnap.docs;
					rosterHasMore = rawDocs.length > ROSTER_PAGE_SIZE;
					const pageDocs = rawDocs.slice(0, ROSTER_PAGE_SIZE);
					rosterLastDoc = pageDocs.at(-1) ?? null;
					roster = pageDocs.map((d) => {
						const data = d.data();
						return {
							email: String(data.email ?? d.id),
							playerName: String(data.playerName ?? data.displayName ?? ''),
							ageGroup: data.ageGroup ? String(data.ageGroup) : parseAgeGroup(String(data.teamName ?? '')),
							teamId: String(data.teamId ?? ''),
						};
					});
				});

				if (teamSnap.exists()) {
					const d = teamSnap.data();
					teamDoc = {
						id: teamSnap.id,
						name:       typeof d.name       === 'string' ? d.name       : undefined,
						coachEmail: typeof d.coachEmail === 'string' ? d.coachEmail : undefined,
					};
				} else {
					teamErr = `Team "${tid}" not found.`;
				}
				teamLoading = false;
				// roster was already set in the untrack block above; just clear loading.
				rosterLoading = false;
			} catch (e) {
				if (cancelled || gen !== rosterFetchGen) return;
				const msg = e instanceof Error ? e.message : 'Could not load roster.';
				teamErr = teamErr || msg;
				rosterErr = msg;
				teamLoading = false;
				rosterLoading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const teamName = $derived(teamDoc?.name || teamId);

	/** Append the next page of roster documents. */
	async function loadMoreRoster() {
		if (!rosterHasMore || rosterLoadingMore || !rosterLastDoc) return;
		rosterLoadingMore = true;
		try {
			const nextQ = query(
				collection(db, 'player_lookup'),
				where('teamId', '==', teamId),
				orderBy('playerName'),
				startAfter(rosterLastDoc),
				limit(ROSTER_PAGE_SIZE + 1),
			);
			const snap = await getDocs(nextQ);
			rosterHasMore = snap.docs.length > ROSTER_PAGE_SIZE;
			const pageDocs = snap.docs.slice(0, ROSTER_PAGE_SIZE);
			rosterLastDoc = pageDocs.at(-1) ?? rosterLastDoc;
			/** @type {RosterRow[]} */
			const newRows = pageDocs.map((d) => {
				const data = d.data();
				return {
					email: String(data.email ?? d.id),
					playerName: String(data.playerName ?? data.displayName ?? ''),
					ageGroup: data.ageGroup ? String(data.ageGroup) : parseAgeGroup(String(data.teamName ?? '')),
					teamId: String(data.teamId ?? ''),
				};
			});
			roster = [...roster, ...newRows];
		} catch (e) {
			rosterErr = e instanceof Error ? e.message : 'Failed to load more roster entries.';
		} finally {
			rosterLoadingMore = false;
		}
	}
</script>

<div class="roster-page">

	<!-- ── Extended breadcrumb (Organizations > Club > Teams > Team > Roster) ──── -->
	<nav class="roster-breadcrumb" aria-label="Breadcrumb">
		<a class="roster-bc__link" href="/admin/organizations/{ctx.clubId}/teams">
			<i class="ph ph-users-three" aria-hidden="true"></i>
			Teams
		</a>
		<i class="ph ph-caret-right roster-bc__sep" aria-hidden="true"></i>
		{#if teamLoading}
			<span class="roster-bc__current roster-bc__current--loading">Loading…</span>
		{:else if teamErr && !teamDoc}
			<span class="roster-bc__current roster-bc__current--err">{teamId}</span>
		{:else}
			<span class="roster-bc__current">{teamName}</span>
		{/if}
		<i class="ph ph-caret-right roster-bc__sep" aria-hidden="true"></i>
		<span class="roster-bc__leaf">Roster</span>
	</nav>

	<!-- ── Page toolbar ──────────────────────────────────────────────────────── -->
	<div class="roster-toolbar">
		<div class="roster-toolbar__left">
			<h2 class="roster-toolbar__title">
				<i class="ph ph-users" aria-hidden="true"></i>
				Roster
			</h2>
			{#if !rosterLoading}
				<span class="roster-toolbar__count">
					{filteredRoster.length} of {roster.length} athletes
				</span>
			{/if}
		</div>
		<div class="roster-search-wrap">
			<i class="ph ph-magnifying-glass roster-search-icon" aria-hidden="true"></i>
			<input
				type="search"
				class="roster-search"
				bind:value={rosterSearch}
				placeholder="Filter athletes…"
				autocomplete="off"
				aria-label="Filter roster"
			/>
		</div>
	</div>

	{#if rosterErr}
		<p class="roster-err" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			{rosterErr}
		</p>
	{/if}

	<!-- ── DataTable ─────────────────────────────────────────────────────────── -->
	<div class="roster-dt-container">
		<table class="roster-dt" aria-label="Team roster">
			<thead class="roster-dt__head">
				<tr>
					<th class="roster-dt__th" scope="col">Athlete</th>
					<th class="roster-dt__th" scope="col">Email</th>
					<th class="roster-dt__th" scope="col">Age Group</th>
					<th class="roster-dt__th" scope="col">Team ID</th>
				</tr>
			</thead>
			<tbody>
				{#if rosterLoading}
					<tr>
						<td colspan="4" class="roster-dt__td-loading">
							<span class="roster-spinner" aria-hidden="true"></span>
							Loading roster…
						</td>
					</tr>
				{:else if filteredRoster.length === 0}
					<tr>
						<td colspan="4" class="roster-dt__td-empty">
							{roster.length === 0
								? 'No athletes assigned to this team yet.'
								: 'No athletes match your filter.'}
						</td>
					</tr>
				{:else}
					{#each filteredRoster as r (r.email)}
						<tr class="roster-dt__row">
							<td class="roster-dt__td roster-dt__td--name">
								<span class="roster-player-name">{r.playerName}</span>
							</td>
							<td class="roster-dt__td roster-dt__td--mono">
								{r.email}
							</td>
							<td class="roster-dt__td roster-dt__td--muted">
								{r.ageGroup || '—'}
							</td>
							<td class="roster-dt__td roster-dt__td--mono roster-dt__td--muted">
								{r.teamId}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>

	<!-- Pagination: Load More -->
	{#if rosterHasMore}
		<div class="roster-load-more">
			<button
				class="roster-load-more__btn"
				onclick={loadMoreRoster}
				disabled={rosterLoadingMore}
			>
				{#if rosterLoadingMore}
					<span class="roster-load-more__spin" aria-hidden="true"></span>
					LOADING…
				{:else}
					▼ LOAD MORE OPERATIVES ({roster.length} loaded)
				{/if}
			</button>
		</div>
	{/if}
	</div>

</div>

<style>
	.roster-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Extended breadcrumb ────────────────────────────────────────── */
	.roster-breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 0 12px;
		flex-wrap: wrap;
	}

	.roster-bc__link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--brand-primary, #d97706);
		text-decoration: none;
		transition: opacity 0.12s ease;
	}

	.roster-bc__link:hover { opacity: 0.78; }

	.roster-bc__sep {
		font-size: 0.9rem;
		color: var(--text-secondary);
		opacity: 0.55;
		flex-shrink: 0;
	}

	.roster-bc__current {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.roster-bc__current--loading {
		color: var(--text-secondary);
		font-weight: 400;
		font-style: italic;
	}

	.roster-bc__current--err { color: var(--danger-red, #b91c1c); }

	.roster-bc__leaf {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* ── Toolbar ────────────────────────────────────────────────────── */
	.roster-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		margin-bottom: 0;
	}

	:global(html.dark) .roster-toolbar {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.roster-toolbar__left {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.roster-toolbar__title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.roster-toolbar__count {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	/* ── Search ─────────────────────────────────────────────────────── */
	.roster-search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.roster-search-icon {
		position: absolute;
		left: 10px;
		font-size: 0.875rem;
		color: rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	:global(html.dark) .roster-search-icon {
		color: rgba(255, 255, 255, 0.28);
	}

	.roster-search {
		height: 34px;
		padding: 0 12px 0 2.5rem;
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

	.roster-search:focus { border-color: var(--brand-primary, #f59e0b); }

	:global(html.dark) .roster-search {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #f4f4f5;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	/* ── Error ──────────────────────────────────────────────────────── */
	.roster-err {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 12px 0;
		padding: 12px 14px;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger-red, #b91c1c);
		background: rgba(185, 28, 28, 0.07);
		border: 1px solid rgba(185, 28, 28, 0.25);
	}

	/* ── DataTable ──────────────────────────────────────────────────── */
	.roster-dt-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .roster-dt-container {
		border-color: rgba(255, 255, 255, 0.07);
	}

	.roster-dt {
		width: 100%;
		min-width: 540px;
		border-collapse: collapse;
		font-size: 0.8125rem;
		letter-spacing: -0.01em;
	}

	.roster-dt__head {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.roster-dt__th {
		padding: 8px 12px;
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

	:global(html.dark) .roster-dt__th {
		background: #0d0d0f;
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.roster-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.07s ease;
	}

	.roster-dt__row:last-child { border-bottom: none; }

	.roster-dt__row:hover { background: rgba(0, 0, 0, 0.018); }

	:global(html.dark) .roster-dt__row {
		border-bottom-color: rgba(255, 255, 255, 0.05);
	}

	:global(html.dark) .roster-dt__row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.roster-dt__td {
		padding: 10px 12px;
		vertical-align: middle;
		color: var(--text-primary);
	}

	.roster-dt__td--name { font-weight: 600; }

	.roster-dt__td--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}

	.roster-dt__td--muted { color: var(--text-secondary); }

	.roster-dt__td-loading,
	.roster-dt__td-empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.roster-dt__td-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	/* ── Loading spinner ────────────────────────────────────────────── */
	.roster-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
		animation: roster-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	:global(html.dark) .roster-spinner {
		border-color: rgba(255, 255, 255, 0.1);
		border-top-color: var(--brand-primary, #f59e0b);
	}

	@keyframes roster-spin { to { transform: rotate(360deg); } }

	/* ── Player name cell ───────────────────────────────────────────── */
	.roster-player-name {
		display: block;
		font-weight: 600;
		color: var(--text-primary);
	}

	/* ── Pagination — Load More ─────────────────────────────────────── */
	.roster-load-more {
		display: flex;
		justify-content: center;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(0, 240, 255, 0.06);
	}

	.roster-load-more__btn {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 1.25rem;
		background: transparent;
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 7px;
		color: rgba(0, 240, 255, 0.6);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.2s;
	}

	.roster-load-more__btn:hover:not(:disabled) {
		background: rgba(0, 240, 255, 0.06);
		border-color: rgba(0, 240, 255, 0.4);
		color: #00f0ff;
	}

	.roster-load-more__btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.roster-load-more__spin {
		width: 12px;
		height: 12px;
		border: 1.5px solid rgba(0, 240, 255, 0.25);
		border-top-color: rgba(0, 240, 255, 0.8);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
