<script lang="ts">
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
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { mergeAdminRoster } from '$lib/admin/rosterMerge.js';
	import type { RosterRow, LinkedRosterInput } from '$lib/admin/rosterMerge.js';
	import {
		fetchGuardiansByPlayerEmails,
		parseGuardianMeta,
	} from '$lib/household/rosterGuardianEnrich.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import RosterGuardianInviteModal from '$lib/components/admin/RosterGuardianInviteModal.svelte';
	import RosterIngestPanel from '$lib/components/admin/RosterIngestPanel.svelte';
	import RegistrarRosterTransferPanel from '$lib/components/director/RegistrarRosterTransferPanel.svelte';
	import UniversalExportHub from '$lib/components/_shared/UniversalExportHub.svelte';
	import { ADMIN_CLUB_CTX_KEY, type AdminClubCtx } from '../../../adminClubCtx.js';

	const ctx = getContext<AdminClubCtx>(ADMIN_CLUB_CTX_KEY);

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

	const ROSTER_PAGE_SIZE = 20;

	/** Email-linked rows from player_lookup (paginated). */
	let emailLinkedRows: LinkedRosterInput[] = $state([]);
	/** Name strings from rosters/{teamId}.players[] (loaded once, not paginated). */
	let nameOnlyNames: string[] = $state([]);

	/** Merged + deduped roster for display. Re-derived whenever either source changes. */
	const roster = $derived(mergeAdminRoster(emailLinkedRows, nameOnlyNames, teamId));

	let rosterLoading = $state(false);
	let rosterErr = $state('');
	/** @type {import('firebase/firestore').DocumentSnapshot | null} */
	let rosterLastDoc = $state(null);
	let rosterHasMore = $state(false);
	let rosterLoadingMore = $state(false);

	let invitePlayerName = $state('');
	let showInviteModal = $state(false);

	const adminClubId = $derived(ctx?.clubId ?? page.params.clubId ?? '');

	// ── Search ───────────────────────────────────────────────────────────────────
	let rosterSearch = $state('');

	const filteredRoster = $derived.by(() => {
		const q = rosterSearch.trim().toLowerCase();
		if (!q) return roster;
		return roster.filter((r) =>
			[
				r.playerName,
				r.email,
				r.ageGroup || '',
				r.parentEmails.join(' '),
				r.householdId || '',
				r.vpcStatus || '',
			]
				.join(' ')
				.toLowerCase()
				.includes(q),
		);
	});

	const EXPORT_COLUMNS = [
		{ key: 'playerName', label: 'Athlete Name' },
		{ key: 'email', label: 'Athlete Email' },
		{ key: 'ageGroup', label: 'Age Group' },
		{ key: 'vpcStatus', label: 'VPC Status' },
		{ key: 'parentEmails', label: 'Guardian Emails' },
		{ key: 'householdId', label: 'Household ID' }
	];

	// ── Age group helper ─────────────────────────────────────────────────────────
	/** @param {Record<string, unknown>} data */
	function linkedRowFromLookup(data, docId) {
		const guardian = parseGuardianMeta(data);
		return {
			email: String(data.email ?? docId),
			playerName: String(data.playerName ?? data.displayName ?? ''),
			ageGroup: data.ageGroup
				? String(data.ageGroup)
				: parseAgeGroup(String(data.teamName ?? '')),
			teamId: String(data.teamId ?? ''),
			parentEmails: guardian.parentEmails,
			householdId: guardian.householdId,
			vpcStatus: guardian.vpcStatus,
		};
	}

	/** Backfill guardian fields for legacy player_lookup rows. */
	async function enrichLinkedRows(rows) {
		const needs = rows.filter((r) => r.email && r.parentEmails.length === 0).map((r) => r.email);
		if (needs.length === 0) return rows;
		const meta = await fetchGuardiansByPlayerEmails(db, needs);
		return rows.map((r) => {
			if (!r.email || r.parentEmails.length > 0) return r;
			const g = meta.get(r.email.toLowerCase());
			if (!g) return r;
			return {
				...r,
				parentEmails: g.parentEmails,
				householdId: g.householdId,
				vpcStatus: g.vpcStatus ?? r.vpcStatus,
			};
		});
	}

	/** @param {string | null | undefined} status */
	function vpcLabel(status) {
		const s = String(status || '').trim().toLowerCase();
		if (s === 'verified') return 'Verified';
		if (s === 'pending_parent' || s === 'pending') return 'Pending';
		if (!s) return '—';
		return status;
	}

	/** @param {RosterRow} r */
	function openAthleteDrawer(r) {
		if (r.nameOnly || !r.email) return;
		enterprisePlayerDrawer.open(
			{
				id: r.email,
				displayName: r.playerName || r.email,
				teamId: r.teamId,
				teamLabel: teamName,
				statsDocId: r.email,
				playerEmail: r.email,
				jersey: null,
				ageGroup: r.ageGroup,
				position: null,
				status: r.vpcStatus === 'verified' ? 'active' : 'pending',
				lastActiveLabel: '—',
				source: 'admin',
			},
			undefined,
			{ focusCompliance: true },
		);
	}

	/** @param {string} teamName */
	function parseAgeGroup(teamName) {
		if (!teamName) return null;
		const m = String(teamName).match(/\bU\s*(\d{1,2})\b/i);
		return m ? `U${m[1]}` : null;
	}

	// ── Data fetch — team doc + roster (deps: authReady + teamId) ─────────────────
	$effect(() => {
		const gen = ++rosterFetchGen;
		if (!authReady) return;

		const tid = teamId;
		if (!tid) {
			untrack(() => {
				teamErr = 'No team ID in URL.';
				teamDoc = null;
				emailLinkedRows = [];
				nameOnlyNames = [];
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
				// Fetch player_lookup (paginated first page), rosters doc (name array), and team meta in parallel.
				const [rosterSnap, rostersDocSnap, teamSnap] = await Promise.all([
					getDocs(rosterFirstPageQ),
					getDoc(doc(db, 'rosters', tid)),
					getDoc(doc(db, 'teams', tid)),
				]);

				if (cancelled || gen !== rosterFetchGen) return;

				const rawDocs = rosterSnap.docs;
				const rosterHasMorePage = rawDocs.length > ROSTER_PAGE_SIZE;
				const pageDocs = rawDocs.slice(0, ROSTER_PAGE_SIZE);
				const rosterLast = pageDocs.at(-1) ?? null;
				const linkedRows = pageDocs.map((d) => linkedRowFromLookup(d.data(), d.id));
				const enrichedRows = await enrichLinkedRows(linkedRows);

				if (cancelled || gen !== rosterFetchGen) return;

				untrack(() => {
					// ── player_lookup (email-linked) ─────────────────────────────────
					rosterHasMore = rosterHasMorePage;
					rosterLastDoc = rosterLast;
					emailLinkedRows = enrichedRows;

					// ── rosters/{tid} (name-only players) ────────────────────────────
					nameOnlyNames = Array.isArray(rostersDocSnap.data()?.players)
						? (rostersDocSnap.data()!.players as unknown[])
								.filter((n): n is string => typeof n === 'string')
						: [];
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

	/** Append the next page of email-linked (player_lookup) rows. Name-only rows are already fully loaded. */
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
			const newLinked = pageDocs.map((d) => linkedRowFromLookup(d.data(), d.id));
			const enriched = await enrichLinkedRows(newLinked);
			emailLinkedRows = [...emailLinkedRows, ...enriched];
		} catch (e) {
			rosterErr = e instanceof Error ? e.message : 'Failed to load more roster entries.';
		} finally {
			rosterLoadingMore = false;
		}
	}
	function openInviteModal(name: string, e: MouseEvent) {
		e.stopPropagation();
		invitePlayerName = name;
		showInviteModal = true;
	}

	function closeInviteModal() {
		showInviteModal = false;
		invitePlayerName = '';
	}
</script>

{#if showInviteModal && invitePlayerName}
	<RosterGuardianInviteModal
		playerName={invitePlayerName}
		teamId={teamId}
		clubId={adminClubId}
		onclose={closeInviteModal}
	/>
{/if}

<div class="roster-page">

	<!-- ── Extended breadcrumb (Organizations > Club > Teams > Team > Roster) ──── -->
	<nav class="roster-breadcrumb" aria-label="Breadcrumb">
	<a class="roster-bc__link" href="/admin/organizations/{ctx.clubId}/teams">
		<Icon name={"user.group" as IconName} />
		Teams
	</a>
	<Icon name={"nav.chevron-right" as IconName} class="roster-bc__sep" />
	{#if teamLoading}
		<span class="roster-bc__current roster-bc__current--loading">Loading…</span>
	{:else if teamErr && !teamDoc}
		<span class="roster-bc__current roster-bc__current--err">{teamId}</span>
	{:else}
		<span class="roster-bc__current">{teamName}</span>
	{/if}
	<Icon name={"nav.chevron-right" as IconName} class="roster-bc__sep" />
		<span class="roster-bc__leaf">Roster</span>
	</nav>

	<!-- ── Page toolbar ──────────────────────────────────────────────────────── -->
	<div class="roster-toolbar">
		<div class="roster-toolbar__left">
			<h2 class="roster-toolbar__title">
				<Icon name={"user.group" as IconName} />
				Roster
			</h2>
			{#if !rosterLoading}
				<span class="roster-toolbar__count">
					{filteredRoster.length} of {roster.length} athletes
				</span>
			{/if}
		</div>
		<div class="roster-toolbar__right">
			<UniversalExportHub
				data={filteredRoster}
				columns={EXPORT_COLUMNS}
				filename={`Roster-${teamName.replace(/\s+/g, '-')}`}
			/>
			<div class="roster-search-wrap">
				<Icon name={"action.search" as IconName} class="roster-search-icon" />
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
	</div>

	<div class="bento-mb-md">
		<RosterIngestPanel teamId={teamId} clubId={adminClubId} />
	</div>

	<div class="bento-mb-md">
		<RegistrarRosterTransferPanel
			clubId={adminClubId}
			targetTeamId={teamId}
		/>
	</div>

	{#if rosterErr}
	<p class="roster-err" role="alert">
		<Icon name={"status.warning-circle" as IconName} />
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
					<th class="roster-dt__th" scope="col">Guardian(s)</th>
					<th class="roster-dt__th" scope="col">VPC</th>
					<th class="roster-dt__th" scope="col">Age Group</th>
					<th class="roster-dt__th" scope="col">Household</th>
				</tr>
			</thead>
			<tbody>
				{#if rosterLoading}
					<tr>
						<td colspan="6" class="roster-dt__td-loading">
							<span class="roster-spinner" aria-hidden="true"></span>
							Loading roster…
						</td>
					</tr>
				{:else if filteredRoster.length === 0}
					<tr>
						<td colspan="6" class="roster-dt__td-empty">
							{roster.length === 0
								? 'No athletes assigned to this team yet.'
								: 'No athletes match your filter.'}
						</td>
					</tr>
				{:else}
					{#each filteredRoster as r (r.key)}
						<tr
							class="roster-dt__row"
							class:roster-dt__row--linked={!r.nameOnly && !!r.email}
							role={!r.nameOnly && r.email ? 'button' : undefined}
							tabindex={!r.nameOnly && r.email ? 0 : undefined}
							onclick={() => openAthleteDrawer(r)}
							onkeydown={(e) => e.key === 'Enter' && openAthleteDrawer(r)}
						>
							<td class="roster-dt__td roster-dt__td--name">
								<span class="roster-player-name">{r.playerName}</span>
							</td>
							<td class="roster-dt__td roster-dt__td--mono">
								{#if r.nameOnly}
									<span class="roster-no-account" title="Player added by name only — no account yet">No account</span>
									<button
										type="button"
										class="roster-invite-btn"
										onclick={(e) => openInviteModal(r.playerName, e)}
									>
										Invite guardian
									</button>
								{:else}
									{r.email}
								{/if}
							</td>
							<td class="roster-dt__td roster-dt__td--mono">
								{#if r.parentEmails.length > 0}
									{r.parentEmails.join(', ')}
								{:else if r.nameOnly}
									<span class="roster-gap" title="Name-only roster entry">—</span>
								{:else}
									<span class="roster-gap roster-gap--warn" title="No guardian linked to this athlete">Unlinked</span>
								{/if}
							</td>
							<td class="roster-dt__td roster-dt__td--muted">
								<span
									class:roster-vpc--ok={r.vpcStatus === 'verified'}
									class:roster-vpc--pending={r.vpcStatus === 'pending_parent' || r.vpcStatus === 'pending'}
								>
									{vpcLabel(r.vpcStatus)}
								</span>
							</td>
							<td class="roster-dt__td roster-dt__td--muted">
								{r.ageGroup || '—'}
							</td>
							<td class="roster-dt__td roster-dt__td--mono roster-dt__td--muted">
								{r.householdId || '—'}
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

	.roster-toolbar__right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
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
		min-width: 720px;
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

	.roster-dt__row--linked {
		cursor: pointer;
	}

	.roster-gap--warn {
		color: var(--danger-red, #b91c1c);
		font-weight: 700;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.roster-vpc--ok {
		color: #059669;
		font-weight: 700;
	}

	.roster-vpc--pending {
		color: #d97706;
		font-weight: 600;
	}

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

	/* ── Name-only badge ────────────────────────────────────────────── */
	.roster-no-account {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.10);
		border-radius: 4px;
		padding: 1px 6px;
	}

	.roster-invite-btn {
		display: block;
		margin-top: 4px;
		border: 1px solid rgba(20, 184, 166, 0.45);
		border-radius: 4px;
		padding: 2px 8px;
		font-size: 0.6875rem;
		font-weight: 700;
		background: transparent;
		color: #0d9488;
		cursor: pointer;
	}

	:global(html.dark) .roster-invite-btn {
		color: #14b8a6;
	}

	:global(html.dark) .roster-no-account {
		color: rgba(255, 255, 255, 0.45);
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.10);
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
		border-top: 1px solid rgba(20, 184, 166, 0.06);
	}

	.roster-load-more__btn {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 1.25rem;
		background: transparent;
		border: 1px solid rgba(20, 184, 166, 0.2);
		border-radius: 7px;
		color: rgba(20, 184, 166, 0.6);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.2s;
	}

	.roster-load-more__btn:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.06);
		border-color: rgba(20, 184, 166, 0.4);
		color: #14b8a6;
	}

	.roster-load-more__btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.roster-load-more__spin {
		width: 12px;
		height: 12px;
		border: 1.5px solid rgba(20, 184, 166, 0.25);
		border-top-color: rgba(20, 184, 166, 0.8);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
