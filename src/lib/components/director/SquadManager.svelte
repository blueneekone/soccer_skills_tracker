<script lang="ts">
	/**
	 * SquadManager.svelte
	 * ────────────────────
	 * Trinity role: ARENA (UI) — logic lives in OrgManager (ENGINE)
	 *
	 * High-density team directory with inline actions:
	 *  - Table: Team Name · Head Coach · Player Count · Season status
	 *  - [CREATE SQUAD] modal → OrgManager.createTeam()
	 *  - [ASSIGN COACH] modal → OrgManager.assignCoach()
	 *
	 * Props:
	 *   org — the instantiated OrgManager engine
	 */

	import type { OrgManager } from '$lib/services/org.svelte.js';
	import type { TenantTeam } from '$lib/types/tenant';
	import { authStore } from '$lib/stores/auth.svelte.js';

	interface Props {
		org: OrgManager;
		class?: string;
	}

	const { org, class: className = '' }: Props = $props();

	// ── Create Squad modal ────────────────────────────────────────────────────
	let createOpen = $state(false);
	let createName = $state('');
	let createAge = $state('');
	let createSeason = $state('');
	let createLoading = $state(false);
	let createError = $state('');

	async function handleCreateTeam() {
		createError = '';
		if (!createName.trim()) {
			createError = 'Team name is required.';
			return;
		}
		createLoading = true;
		try {
			await org.createTeam({
				name: createName,
				ageGroup: createAge,
				season: createSeason,
			});
			createName = '';
			createAge = '';
			createSeason = '';
			createOpen = false;
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create squad.';
		} finally {
			createLoading = false;
		}
	}

	// ── Assign Coach modal ────────────────────────────────────────────────────
	let assignTarget = $state<TenantTeam | null>(null);
	let assignEmail = $state('');
	let assignLoading = $state(false);
	let assignError = $state('');

	function openAssign(team: TenantTeam) {
		assignTarget = team;
		assignEmail = team.coachEmail ?? '';
		assignError = '';
	}

	function closeAssign() {
		assignTarget = null;
		assignEmail = '';
		assignError = '';
	}

	async function handleAssignCoach() {
		if (!assignTarget) return;
		assignError = '';
		assignLoading = true;
		try {
			await org.assignCoach({ teamId: assignTarget.id, coachEmail: assignEmail });
			closeAssign();
		} catch (err) {
			assignError = err instanceof Error ? err.message : 'Failed to assign coach.';
		} finally {
			assignLoading = false;
		}
	}

	// ── Role guard ────────────────────────────────────────────────────────────
	// Strictly gate write actions to directors and platform admins.
	// Read-only view is always accessible to any authenticated user who reaches
	// this component (MissionControl's outer isAuthorized guard handles entry).
	const canManage = $derived(authStore.isDirector || authStore.isAdmin);

	// ── Season badge ──────────────────────────────────────────────────────────
	function seasonBadge(season: string | undefined): { label: string; color: string } {
		if (!season) return { label: 'INACTIVE', color: '#334155' };
		return { label: season.toUpperCase(), color: '#14b8a6' };
	}
</script>

<div class="sm-root {className}">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="sm-header">
		<div class="sm-header-left">
			<span class="sm-eyebrow">ORGANIZATION</span>
			<h2 class="sm-title">SQUAD DIRECTORY</h2>
		</div>
		<div class="sm-header-right">
			<span class="sm-count"
				>{org.teams.length}<span class="sm-count-label">SQUADS</span></span
			>
			{#if canManage}
				<button class="sm-create-btn" onclick={() => (createOpen = true)}>
					＋ CREATE SQUAD
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Table ──────────────────────────────────────────────────────────── -->
	{#if org.teams.length === 0}
		<div class="sm-empty">
			<span class="sm-empty-icon" aria-hidden="true">◈</span>
			<p>No squads registered. Create the first one.</p>
		</div>
	{:else}
		<div class="sm-table-wrap">
			<table class="sm-table">
				<thead>
					<tr>
						<th>TEAM</th>
						<th>AGE GROUP</th>
						<th>HEAD COACH</th>
						<th>ROSTER</th>
						<th>SEASON</th>
						<th class="sm-col-actions">ACTIONS</th>
					</tr>
				</thead>
				<tbody>
					{#each org.teams as team (team.id)}
						{@const badge = seasonBadge(team.season)}
						<tr class="sm-row">
							<td class="sm-cell-name">{team.name}</td>
							<td class="sm-cell-age">{team.ageGroup ?? '—'}</td>
							<td class="sm-cell-coach">
								{#if team.coachEmail}
									<span class="sm-coach-pill">{team.coachEmail}</span>
								{:else}
									<span class="sm-unassigned">UNASSIGNED</span>
								{/if}
							</td>
							<td class="sm-cell-roster">
								<span class="sm-roster-num">{team.playerCount ?? 0}</span>
								<span class="sm-roster-lbl">ATH</span>
							</td>
							<td>
								<span class="sm-season-badge" style:color={badge.color}>
									{badge.label}
								</span>
							</td>
						<td class="sm-cell-actions">
							{#if canManage}
								<button
									class="sm-action-btn sm-action-btn--coach"
									onclick={() => openAssign(team)}
								>
									ASSIGN COACH
								</button>
							{:else}
								<span class="sm-read-only-tag">READ ONLY</span>
							{/if}
						</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- ── Create Squad Modal ────────────────────────────────────────────────── -->
{#if createOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sm-backdrop" onclick={() => (createOpen = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sm-modal" onclick={(e) => e.stopPropagation()}>
			<div class="sm-modal-header">
				<span class="sm-modal-label">NEW SQUAD INITIALIZATION</span>
				<button class="sm-modal-close" onclick={() => (createOpen = false)}>✕</button>
			</div>

			<div class="sm-modal-body">
				<div class="sm-field">
					<label class="sm-label" for="squad-name">SQUAD DESIGNATION</label>
					<input
						id="squad-name"
						class="sm-input"
						type="text"
						placeholder="e.g. U-13 Raptors"
						bind:value={createName}
						onkeydown={(e) => e.key === 'Enter' && handleCreateTeam()}
					/>
				</div>

				<div class="sm-field-row">
					<div class="sm-field">
						<label class="sm-label" for="squad-age">AGE GROUP</label>
						<input
							id="squad-age"
							class="sm-input"
							type="text"
							placeholder="e.g. U-13"
							bind:value={createAge}
						/>
					</div>
					<div class="sm-field">
						<label class="sm-label" for="squad-season">SEASON</label>
						<input
							id="squad-season"
							class="sm-input"
							type="text"
							placeholder="e.g. 2025-2026"
							bind:value={createSeason}
						/>
					</div>
				</div>

				{#if createError}
					<p class="sm-error">{createError}</p>
				{/if}

				<button class="sm-confirm-btn" onclick={handleCreateTeam} disabled={createLoading}>
					{createLoading ? 'INITIALIZING...' : '⚡ DEPLOY SQUAD'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Assign Coach Modal ────────────────────────────────────────────────── -->
{#if assignTarget}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sm-backdrop" onclick={closeAssign}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sm-modal" onclick={(e) => e.stopPropagation()}>
			<div class="sm-modal-header">
				<span class="sm-modal-label">ASSIGN HEAD COACH</span>
				<button class="sm-modal-close" onclick={closeAssign}>✕</button>
			</div>

			<div class="sm-modal-body">
				<p class="sm-modal-context">
					Squad: <strong>{assignTarget.name}</strong>
				</p>

				<div class="sm-field">
					<label class="sm-label" for="coach-email">COACH EMAIL</label>
					<input
						id="coach-email"
						class="sm-input"
						type="email"
						placeholder="coach@club.com"
						bind:value={assignEmail}
						onkeydown={(e) => e.key === 'Enter' && handleAssignCoach()}
					/>
				</div>

				<p class="sm-hint">
					This links the coach's email to the squad for display purposes.
					Full role assignment is performed via the invite system.
				</p>

				{#if assignError}
					<p class="sm-error">{assignError}</p>
				{/if}

				<button class="sm-confirm-btn" onclick={handleAssignCoach} disabled={assignLoading}>
					{assignLoading ? 'LINKING...' : '⚡ LINK COACH'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Root ─────────────────────────────────────────────────────────────── */
	.sm-root {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.sm-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
		gap: 1rem;
		flex-wrap: wrap;
	}
	.sm-eyebrow {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #14b8a6;
		display: block;
		margin-bottom: 3px;
	}
	.sm-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0;
		color: #f8fafc;
	}
	.sm-header-right {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}
	.sm-count {
		font-size: 1.4rem;
		font-weight: 700;
		color: #14b8a6;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.sm-count-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #475569;
		margin-top: -2px;
	}
	.sm-create-btn {
		font-family: inherit;
		font-size: 10px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 7px 14px;
		border-radius: 3px;
		border: 1px solid rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.08);
		color: #14b8a6;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.sm-create-btn:hover {
		background: rgba(20, 184, 166, 0.16);
		box-shadow: 0 0 14px rgba(20, 184, 166, 0.2);
	}

	/* ── Table ───────────────────────────────────────────────────────────── */
	.sm-table-wrap {
		overflow-x: auto;
	}
	.sm-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
	}
	.sm-table thead th {
		padding: 0.6rem 1.25rem;
		font-size: 8px;
		letter-spacing: 0.22em;
		color: #475569;
		text-align: left;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		white-space: nowrap;
	}
	.sm-col-actions {
		text-align: right !important;
	}
	.sm-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.12s;
	}
	.sm-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.sm-row:last-child {
		border-bottom: none;
	}
	.sm-row td {
		padding: 0.7rem 1.25rem;
		vertical-align: middle;
	}
	.sm-cell-name {
		font-size: 13px;
		font-weight: 700;
		color: #f1f5f9;
		letter-spacing: 0.03em;
		white-space: nowrap;
	}
	.sm-cell-age {
		font-size: 10px;
		color: #64748b;
		letter-spacing: 0.08em;
	}
	.sm-coach-pill {
		font-size: 10px;
		color: #94a3b8;
		max-width: 160px;
		display: inline-block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sm-unassigned {
		font-size: 9px;
		letter-spacing: 0.15em;
		color: #334155;
	}
	.sm-cell-roster {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}
	.sm-roster-num {
		font-size: 15px;
		font-weight: 700;
		color: #14b8a6;
	}
	.sm-roster-lbl {
		font-size: 8px;
		letter-spacing: 0.12em;
		color: #334155;
	}
	.sm-season-badge {
		font-size: 8px;
		letter-spacing: 0.15em;
	}
	.sm-cell-actions {
		text-align: right;
		white-space: nowrap;
	}
	.sm-action-btn {
		font-family: inherit;
		font-size: 8px;
		letter-spacing: 0.15em;
		padding: 4px 9px;
		border-radius: 2px;
		cursor: pointer;
		transition: all 0.15s;
	}
	.sm-action-btn--coach {
		border: 1px solid rgba(168, 85, 247, 0.35);
		background: rgba(168, 85, 247, 0.07);
		color: #a855f7;
	}
	.sm-action-btn--coach:hover {
		background: rgba(168, 85, 247, 0.15);
		box-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
	}
	.sm-read-only-tag {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: rgba(148, 163, 184, 0.4);
		border: 1px solid rgba(148, 163, 184, 0.15);
		border-radius: 3px;
		padding: 2px 6px;
	}

	/* ── Empty ───────────────────────────────────────────────────────────── */
	.sm-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #475569;
		font-size: 12px;
	}
	.sm-empty-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.75rem;
		opacity: 0.3;
	}

	/* ── Modal backdrop ──────────────────────────────────────────────────── */
	.sm-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}
	.sm-modal {
		background: #080d18;
		border: 1px solid rgba(20, 184, 166, 0.18);
		border-radius: 8px;
		width: min(440px, 94vw);
		box-shadow: 0 0 40px rgba(20, 184, 166, 0.07);
	}
	.sm-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.sm-modal-label {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #14b8a6;
	}
	.sm-modal-close {
		background: none;
		border: none;
		color: #475569;
		font-size: 1rem;
		cursor: pointer;
		transition: color 0.15s;
		padding: 2px 6px;
	}
	.sm-modal-close:hover {
		color: #e2e8f0;
	}
	.sm-modal-body {
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}
	.sm-modal-context {
		font-size: 12px;
		color: #64748b;
		margin: 0;
	}
	.sm-modal-context strong {
		color: #e2e8f0;
	}
	.sm-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
		flex: 1;
	}
	.sm-field-row {
		display: flex;
		gap: 1rem;
	}
	.sm-label {
		font-size: 8px;
		letter-spacing: 0.22em;
		color: #475569;
	}
	.sm-input {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		color: #e2e8f0;
		font-family: inherit;
		font-size: 12px;
		padding: 8px 10px;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		box-sizing: border-box;
	}
	.sm-input:focus {
		border-color: rgba(20, 184, 166, 0.4);
	}
	.sm-input::placeholder {
		color: #334155;
	}
	.sm-hint {
		font-size: 10px;
		color: #334155;
		line-height: 1.6;
		margin: 0;
	}
	.sm-error {
		font-size: 11px;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 3px;
		padding: 6px 10px;
		margin: 0;
	}
	.sm-confirm-btn {
		font-family: inherit;
		font-size: 11px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 0.75rem;
		border-radius: 4px;
		width: 100%;
		cursor: pointer;
		transition: all 0.15s;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.4);
		color: #14b8a6;
	}
	.sm-confirm-btn:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.18);
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.25);
	}
	.sm-confirm-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
