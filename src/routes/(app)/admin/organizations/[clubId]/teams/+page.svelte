<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { doc, setDoc } from 'firebase/firestore';
	import { getContext } from 'svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
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

	// ── Teams for this club (derived from global store) ─────────────────────────
	const clubTeams = $derived(
		teamsStore.teams.filter((t) => t.clubId === ctx.clubId),
	);

	// ── Add Team form ────────────────────────────────────────────────────────────
	let teamId      = $state('');
	let teamName    = $state('');
	let teamCoach   = $state('');
	let teamSaving  = $state(false);
	let teamAddErr  = $state('');
	let showAddForm = $state(false);

	const addTeam = async () => {
		teamAddErr = '';
		if (!ctx.clubId) {
			teamAddErr = 'Organization context not loaded.';
			return;
		}
		if (!teamId.trim() || !teamName.trim()) {
			teamAddErr = 'Enter a Team ID suffix and team name.';
			return;
		}
		const tid = `${ctx.clubId}_${teamId.trim()}`;
		teamSaving = true;
		try {
			await setDoc(doc(db, 'teams', tid), {
				clubId: ctx.clubId,
				name: teamName,
				coachEmail: teamCoach.trim().toLowerCase(),
				createdAt: new Date(),
			});
			if (teamCoach.trim()) {
				const coachEmail = teamCoach.trim().toLowerCase();
				await setDoc(
					doc(db, 'users', coachEmail),
					{ role: 'coach', clubId: ctx.clubId, teamId: tid },
					{ merge: true },
				);
				await setDoc(
					doc(db, 'coach_lookup', coachEmail),
					{ role: 'coach', clubId: ctx.clubId, teamId: tid },
					{ merge: true },
				);
			}
			await logSecurityEvent('CREATE_TEAM', tid, teamName);
			teamId = '';
			teamName = '';
			teamCoach = '';
			showAddForm = false;
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
		} catch (e) {
			teamAddErr = e instanceof Error ? e.message : 'Could not create team.';
		} finally {
			teamSaving = false;
		}
	};
</script>

<div class="teams-page">

	<!-- ── Page toolbar ─────────────────────────────────────────────────────────── -->
	<div class="teams-page__toolbar">
		<div class="teams-page__toolbar-left">
			<h2 class="teams-page__title">
				<i class="ph ph-users-three" aria-hidden="true"></i>
				Teams
			</h2>
			{#if !ctx.clubLoading && ctx.clubDoc}
				<span class="teams-page__count">
					{clubTeams.length} team{clubTeams.length === 1 ? '' : 's'}
				</span>
			{/if}
		</div>
		<button
			type="button"
			class="teams-add-btn"
			onclick={() => (showAddForm = !showAddForm)}
			aria-expanded={showAddForm}
		>
			<i class="ph {showAddForm ? 'ph-x' : 'ph-plus'}" aria-hidden="true"></i>
			{showAddForm ? 'Cancel' : 'Add Team'}
		</button>
	</div>

	<!-- ── Inline Add Team form ──────────────────────────────────────────────────── -->
	{#if showAddForm}
		<div class="teams-add-form">
			{#if teamAddErr}
				<p class="teams-flash teams-flash--err" role="alert">{teamAddErr}</p>
			{/if}
			{#if ctx.clubLoading}
				<p class="teams-muted">Loading organization…</p>
			{:else if ctx.clubErr}
				<p class="teams-flash teams-flash--err" role="alert">{ctx.clubErr}</p>
			{:else}
				<p class="teams-muted">
					Final Team ID: <code class="teams-code">{ctx.clubId}_{teamId.trim() || '…'}</code>
				</p>
				<div class="teams-add-grid">
					<div class="teams-field">
						<label class="teams-field__label" for="add-team-id">
							Team ID suffix <span class="teams-req" aria-hidden="true">*</span>
						</label>
						<input
							id="add-team-id"
							type="text"
							class="teams-input"
							bind:value={teamId}
							placeholder="e.g. u15bew"
							disabled={teamSaving}
						/>
					</div>
					<div class="teams-field">
						<label class="teams-field__label" for="add-team-name">
							Team Name <span class="teams-req" aria-hidden="true">*</span>
						</label>
						<input
							id="add-team-name"
							type="text"
							class="teams-input"
							bind:value={teamName}
							placeholder="e.g. Aggie FC U15 Boys"
							disabled={teamSaving}
						/>
					</div>
					<div class="teams-field">
						<label class="teams-field__label" for="add-team-coach">Head Coach Email</label>
						<input
							id="add-team-coach"
							type="email"
							class="teams-input"
							bind:value={teamCoach}
							placeholder="coach@example.com"
							disabled={teamSaving}
						/>
					</div>
				</div>
				<button
					type="button"
					class="teams-submit-btn"
					onclick={addTeam}
					disabled={teamSaving}
				>
					{teamSaving ? 'Creating…' : '+ Add Team'}
				</button>
			{/if}
		</div>
	{/if}

	<!-- ── Teams DataTable ──────────────────────────────────────────────────────── -->
	<div class="teams-dt-container">
		<table class="teams-dt" aria-label="Teams in this organization">
			<thead class="teams-dt__head">
				<tr>
					<th class="teams-dt__th" scope="col">Team Name</th>
					<th class="teams-dt__th" scope="col">Team ID</th>
					<th class="teams-dt__th" scope="col">Head Coach</th>
					<th class="teams-dt__th teams-dt__th--actions" scope="col">Roster</th>
				</tr>
			</thead>
			<tbody>
				{#if clubTeams.length === 0}
					<tr>
						<td colspan="4" class="teams-dt__td-empty">
							No teams for this organization yet.
						</td>
					</tr>
				{:else}
					{#each clubTeams as t (t.id)}
						<tr class="teams-dt__row">
							<td class="teams-dt__td teams-dt__td--name">{t.name || '—'}</td>
							<td class="teams-dt__td teams-dt__td--mono">{t.id}</td>
							<td class="teams-dt__td teams-dt__td--muted">{t.coachEmail || '—'}</td>
							<td class="teams-dt__td teams-dt__td--actions">
								<a
									class="teams-roster-btn"
									href="/admin/organizations/{ctx.clubId}/teams/{t.id}/roster"
									aria-label="View roster for {t.name || t.id}"
								>
									<i class="ph ph-users" aria-hidden="true"></i>
									View Roster
								</a>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

</div>

<style>
	.teams-page {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Toolbar ────────────────────────────────────────────────────── */
	.teams-page__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		margin-bottom: 0;
	}

	:global(html.dark) .teams-page__toolbar {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.teams-page__toolbar-left {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-shrink: 0;
	}

	.teams-page__title {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.teams-page__count {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.teams-add-btn {
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

	.teams-add-btn:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.18);
	}

	:global(html.dark) .teams-add-btn {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
		color: #f4f4f5;
	}

	/* ── Add form ───────────────────────────────────────────────────── */
	.teams-add-form {
		padding: 16px 0 20px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .teams-add-form {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.teams-add-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 14px;
	}

	.teams-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.teams-field__label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.teams-input {
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

	.teams-input:focus { border-color: var(--brand-primary, #f59e0b); }
	.teams-input:disabled { opacity: 0.55; cursor: not-allowed; }

	:global(html.dark) .teams-input {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.10);
		color: #f4f4f5;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.teams-req { color: var(--danger-red, #b91c1c); margin-left: 2px; }

	.teams-submit-btn {
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
	}

	.teams-submit-btn:hover:not(:disabled) { filter: brightness(1.06); }
	.teams-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.teams-muted {
		margin: 0 0 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.teams-code {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.8125rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		padding: 1px 5px;
	}

	:global(html.dark) .teams-code {
		background: rgba(255, 255, 255, 0.08);
	}

	/* ── Flash / error ──────────────────────────────────────────────── */
	.teams-flash {
		margin: 0 0 10px;
		padding: 10px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.teams-flash--err {
		background: rgba(185, 28, 28, 0.08);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.3);
	}

	/* ── DataTable ──────────────────────────────────────────────────── */
	.teams-dt-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .teams-dt-container {
		border-color: rgba(255, 255, 255, 0.07);
	}

	.teams-dt {
		width: 100%;
		min-width: 520px;
		border-collapse: collapse;
		font-size: 0.8125rem;
		letter-spacing: -0.01em;
	}

	.teams-dt__head {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.teams-dt__th {
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

	:global(html.dark) .teams-dt__th {
		background: #0d0d0f;
		border-bottom-color: rgba(255, 255, 255, 0.07);
	}

	.teams-dt__th--actions {
		width: 130px;
		text-align: right;
		padding-right: 16px;
	}

	.teams-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.07s ease;
	}

	.teams-dt__row:last-child { border-bottom: none; }

	.teams-dt__row:hover {
		background: rgba(0, 0, 0, 0.018);
	}

	:global(html.dark) .teams-dt__row {
		border-bottom-color: rgba(255, 255, 255, 0.05);
	}

	:global(html.dark) .teams-dt__row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.teams-dt__td {
		padding: 10px 12px;
		vertical-align: middle;
		color: var(--text-primary);
	}

	.teams-dt__td--name {
		font-weight: 600;
	}

	.teams-dt__td--mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.teams-dt__td--muted {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}

	.teams-dt__td--actions {
		text-align: right;
		padding-right: 16px;
		white-space: nowrap;
	}

	.teams-dt__td-empty {
		text-align: center;
		padding: 40px 20px !important;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	/* ── Roster link button ─────────────────────────────────────────── */
	.teams-roster-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
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

	.teams-roster-btn:hover {
		background: rgba(245, 158, 11, 0.07);
	}

	:global(html.dark) .teams-roster-btn {
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}
</style>
