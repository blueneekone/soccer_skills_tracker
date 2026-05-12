<script lang="ts">
	/**
	 * OrgDashboard.svelte
	 * ────────────────────
	 * Organization-level dashboard for directors and admins.
	 *
	 * Data flow (all reads are tenantId-scoped — no cross-tenant leakage)
	 * ─────────────────────────────────────────────────────────────────────
	 *   authStore.tenantId          → scope key for all queries
	 *   clubs/{tenantId}            → org name, logo, plan
	 *   teams where clubId==tid     → team roster list
	 *   generateInviteCode(...)     → writes to invites collection
	 *
	 * Trinity classification: ARENA (pure presentation) — no Engine needed
	 * at this structural stage.  Logic lives in inviteService.ts.
	 */

	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { generateInviteCode } from '$lib/services/inviteService';
	import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
	import type { TenantTeam, OrganizationDoc } from '$lib/types/tenant';
	import type { TenantRole } from '$lib/types/tenant';

	// ── Auth-scoped state ─────────────────────────────────────────────────

	const tenantId = $derived(authStore.tenantId);
	const currentRole = $derived(authStore.role);

	// ── Org data ──────────────────────────────────────────────────────────

	let org = $state<OrganizationDoc | null>(null);
	let orgLoading = $state(true);

	// ── Teams list ────────────────────────────────────────────────────────

	let teams = $state<TenantTeam[]>([]);
	let teamsLoading = $state(true);
	let teamsError = $state('');

	// ── Invite state ──────────────────────────────────────────────────────

	type InviteModal = {
		teamId: string;
		teamName: string;
		role: TenantRole;
	};
	let inviteModal = $state<InviteModal | null>(null);
	let inviteCode = $state('');
	let inviteExpiry = $state('');
	let inviteLoading = $state(false);
	let inviteError = $state('');
	let copyLabel = $state('COPY');

	// ── Firestore subscriptions ───────────────────────────────────────────

	let unsubOrg: (() => void) | null = null;
	let unsubTeams: (() => void) | null = null;

	function detach() {
		unsubOrg?.();
		unsubOrg = null;
		unsubTeams?.();
		unsubTeams = null;
	}

	$effect(() => {
		if (!browser || !tenantId) {
			detach();
			org = null;
			teams = [];
			orgLoading = false;
			teamsLoading = false;
			return;
		}

		detach();
		orgLoading = true;
		teamsLoading = true;
		teamsError = '';

		// ── clubs/{tenantId} ──────────────────────────────────────────────
		unsubOrg = onSnapshot(
			doc(db, 'clubs', tenantId),
			(snap) => {
				org = snap.exists() ? ({ id: snap.id, ...snap.data() } as OrganizationDoc) : null;
				orgLoading = false;
			},
			(err) => {
				console.warn('[OrgDashboard] clubs snapshot error:', err);
				orgLoading = false;
			},
		);

		// ── teams where clubId == tenantId ────────────────────────────────
		unsubTeams = onSnapshot(
			query(collection(db, 'teams'), where('clubId', '==', tenantId)),
			(snap) => {
				teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TenantTeam);
				teamsLoading = false;
			},
			(err) => {
				console.warn('[OrgDashboard] teams snapshot error:', err);
				teamsError = 'Failed to load teams.';
				teamsLoading = false;
			},
		);

		return detach;
	});

	// ── Invite generation ─────────────────────────────────────────────────

	function openInviteModal(team: TenantTeam, role: TenantRole) {
		inviteModal = { teamId: team.id, teamName: team.name, role };
		inviteCode = '';
		inviteExpiry = '';
		inviteError = '';
		copyLabel = 'COPY';
	}

	function closeInviteModal() {
		inviteModal = null;
		inviteCode = '';
		inviteError = '';
	}

	async function handleGenerateCode(usageLimit = 1) {
		if (!inviteModal || !tenantId) return;
		inviteLoading = true;
		inviteError = '';
		inviteCode = '';
		try {
			const result = await generateInviteCode(
				inviteModal.role,
				tenantId,
				inviteModal.teamId,
				usageLimit,
			);
			inviteCode = result.code;
			inviteExpiry = result.expiresAt.toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			});
		} catch (err) {
			inviteError = err instanceof Error ? err.message : 'Failed to generate code.';
		} finally {
			inviteLoading = false;
		}
	}

	async function copyCode() {
		if (!inviteCode) return;
		try {
			await navigator.clipboard.writeText(inviteCode);
			copyLabel = 'COPIED ✓';
			setTimeout(() => (copyLabel = 'COPY'), 2000);
		} catch {
			copyLabel = 'ERROR';
		}
	}

	// ── Role helpers ──────────────────────────────────────────────────────
	// Primary audience: directors (club owners, tenantId-scoped).
	// God Mode bypass: platform admins (isAdmin = global_admin | super_admin).
	// ⚠  Never check role strings here — derive from the auth store's typed flags.

	const canManage = $derived(authStore.isDirector || authStore.isAdmin);
</script>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="od-root">
	<!-- ── Header ───────────────────────────────────────────────────────── -->
	<header class="od-header">
		<div class="od-header-left">
			<span class="od-label">NEXUS COMMAND</span>
			<h1 class="od-title">
				{#if orgLoading}
					<span class="od-skeleton od-skeleton--title"></span>
				{:else}
					{org?.name ?? 'ORGANIZATION'}
				{/if}
			</h1>
			{#if org?.plan}
				<span class="od-plan-badge">{org.plan.toUpperCase()}</span>
			{/if}
		</div>

		<div class="od-header-right">
			<div class="od-stat">
				<span class="od-stat-value">{teamsLoading ? '—' : teams.length}</span>
				<span class="od-stat-label">TEAMS</span>
			</div>
			<div class="od-live-indicator">
				<span class="od-live-dot"></span>
				<span>LIVE</span>
			</div>
		</div>
	</header>

	<!-- ── Tenant scope banner ────────────────────────────────────────────── -->
	{#if !tenantId}
		<div class="od-notice">
			<span class="od-notice-icon">⚠</span>
			No organization linked to your account. Contact your club director or platform admin.
		</div>
	{:else}
		<div class="od-scope-bar">
			<span class="od-scope-key">TENANT_ID</span>
			<code class="od-scope-val">{tenantId}</code>
			<span class="od-scope-sep">·</span>
			<span class="od-scope-key">ROLE</span>
			<code class="od-scope-val">{(currentRole ?? 'guest').toUpperCase()}</code>
		</div>
	{/if}

	<!-- ── Teams grid ─────────────────────────────────────────────────────── -->
	<section class="od-teams-section">
		<h2 class="od-section-title">TEAMS <span class="od-section-count">// {teams.length}</span></h2>

		{#if teamsLoading}
			<div class="od-teams-grid">
				{#each [1, 2, 3] as _}
					<div class="od-team-card od-team-card--loading">
						<div class="od-skeleton od-skeleton--line"></div>
						<div class="od-skeleton od-skeleton--line-short"></div>
					</div>
				{/each}
			</div>
		{:else if teamsError}
			<p class="od-error">{teamsError}</p>
		{:else if teams.length === 0}
			<div class="od-empty">
				<span class="od-empty-icon">◈</span>
				<p>No teams found for this organization.</p>
				{#if canManage}
					<p class="od-empty-hint">
						Create a team in Firestore under <code>teams/</code> with
						<code>clubId: "{tenantId}"</code>.
					</p>
				{/if}
			</div>
		{:else}
			<div class="od-teams-grid">
				{#each teams as team (team.id)}
					<div class="od-team-card">
						<!-- Team identity -->
						<div class="od-team-header">
							<span class="od-team-name">{team.name}</span>
							{#if team.ageGroup}
								<span class="od-age-badge">{team.ageGroup}</span>
							{/if}
						</div>

						<!-- Team meta -->
						<dl class="od-team-meta">
							<dt>COACH</dt>
							<dd>{team.coachEmail ?? '—'}</dd>
							{#if team.season}
								<dt>SEASON</dt>
								<dd>{team.season}</dd>
							{/if}
							{#if team.playerCount !== undefined}
								<dt>ROSTER</dt>
								<dd>{team.playerCount} operatives</dd>
							{/if}
						</dl>

						<!-- Invite actions -->
						{#if canManage}
							<div class="od-invite-actions">
								<button
									class="od-invite-btn od-invite-btn--coach"
									onclick={() => openInviteModal(team, 'coach')}
								>
									＋ COACH INVITE
								</button>
								<button
									class="od-invite-btn od-invite-btn--player"
									onclick={() => openInviteModal(team, 'player')}
								>
									＋ PLAYER INVITE
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<!-- ─── Invite Modal ─────────────────────────────────────────────────────── -->
{#if inviteModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="od-modal-backdrop" onclick={closeInviteModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="od-modal" onclick={(e) => e.stopPropagation()}>
			<div class="od-modal-header">
				<span class="od-modal-label">INVITE CODE GENERATOR</span>
				<button class="od-modal-close" onclick={closeInviteModal}>✕</button>
			</div>

			<div class="od-modal-body">
				<p class="od-modal-meta">
					Team: <strong>{inviteModal.teamName}</strong>
					&nbsp;·&nbsp;
					Role: <strong>{inviteModal.role.toUpperCase()}</strong>
				</p>
				<p class="od-modal-hint">
					Generate a 6-character code valid for 48 hours. Share it with the recipient;
					they enter it in the app to join this team.
				</p>

				{#if inviteCode}
					<!-- Generated code display -->
					<div class="od-code-display">
						<span class="od-code">{inviteCode}</span>
						<button class="od-copy-btn" onclick={copyCode}>{copyLabel}</button>
					</div>
					<p class="od-code-expiry">Expires: {inviteExpiry}</p>
					<button class="od-regen-btn" onclick={() => handleGenerateCode(1)} disabled={inviteLoading}>
						{inviteLoading ? '...' : '↺ GENERATE NEW CODE'}
					</button>
				{:else}
					<button
						class="od-generate-btn"
						onclick={() => handleGenerateCode(1)}
						disabled={inviteLoading}
					>
						{inviteLoading ? 'GENERATING...' : 'GENERATE CODE'}
					</button>
				{/if}

				{#if inviteError}
					<p class="od-modal-error">{inviteError}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Root ────────────────────────────────────────────────────────────── */
	.od-root {
		min-height: 100vh;
		background: #010409;
		color: #e2e8f0;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		padding: 2rem;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.od-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-bottom: 1px solid rgba(0, 240, 255, 0.15);
		padding-bottom: 1.25rem;
		margin-bottom: 1.25rem;
	}
	.od-label {
		font-size: 10px;
		letter-spacing: 0.25em;
		color: #00f0ff;
		display: block;
		margin-bottom: 0.25rem;
	}
	.od-title {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		margin: 0;
		color: #f8fafc;
	}
	.od-plan-badge {
		display: inline-block;
		margin-top: 0.4rem;
		padding: 2px 8px;
		font-size: 9px;
		letter-spacing: 0.2em;
		border: 1px solid rgba(0, 240, 255, 0.4);
		border-radius: 2px;
		color: #00f0ff;
		background: rgba(0, 240, 255, 0.06);
	}
	.od-header-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.od-stat {
		text-align: right;
	}
	.od-stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #00f0ff;
		display: block;
		line-height: 1;
	}
	.od-stat-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #64748b;
	}
	.od-live-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		letter-spacing: 0.2em;
		color: #22c55e;
	}
	.od-live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 8px #22c55e;
		animation: od-pulse 1.8s ease-in-out infinite;
	}

	/* ── Scope bar ───────────────────────────────────────────────────────── */
	.od-scope-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 10px;
		letter-spacing: 0.12em;
		color: #475569;
		margin-bottom: 2rem;
	}
	.od-scope-key {
		color: #334155;
		text-transform: uppercase;
	}
	.od-scope-val {
		color: #94a3b8;
		background: rgba(255, 255, 255, 0.04);
		padding: 1px 6px;
		border-radius: 2px;
	}
	.od-scope-sep {
		color: #1e293b;
	}

	/* ── Notice ──────────────────────────────────────────────────────────── */
	.od-notice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.25);
		border-radius: 4px;
		padding: 1rem 1.25rem;
		font-size: 13px;
		color: #fbbf24;
		margin-bottom: 2rem;
	}
	.od-notice-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	/* ── Section ─────────────────────────────────────────────────────────── */
	.od-section-title {
		font-size: 11px;
		letter-spacing: 0.25em;
		color: #475569;
		text-transform: uppercase;
		margin: 0 0 1.25rem;
	}
	.od-section-count {
		color: #00f0ff;
		opacity: 0.7;
	}

	/* ── Teams grid ──────────────────────────────────────────────────────── */
	.od-teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.25rem;
	}
	.od-team-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 6px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		transition: border-color 0.2s;
	}
	.od-team-card:hover {
		border-color: rgba(0, 240, 255, 0.2);
	}
	.od-team-card--loading {
		pointer-events: none;
	}
	.od-team-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.od-team-name {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #f1f5f9;
	}
	.od-age-badge {
		font-size: 9px;
		letter-spacing: 0.18em;
		border: 1px solid rgba(0, 240, 255, 0.3);
		border-radius: 2px;
		padding: 1px 6px;
		color: #00f0ff;
		flex-shrink: 0;
	}
	.od-team-meta {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 4px 12px;
		font-size: 11px;
		margin: 0;
	}
	.od-team-meta dt {
		color: #475569;
		letter-spacing: 0.12em;
	}
	.od-team-meta dd {
		color: #94a3b8;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Invite actions ──────────────────────────────────────────────────── */
	.od-invite-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.od-invite-btn {
		flex: 1;
		padding: 6px 0;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		font-weight: 700;
		border-radius: 3px;
		cursor: pointer;
		transition: all 0.15s;
		border: 1px solid transparent;
	}
	.od-invite-btn--coach {
		background: rgba(0, 240, 255, 0.08);
		border-color: rgba(0, 240, 255, 0.3);
		color: #00f0ff;
	}
	.od-invite-btn--coach:hover {
		background: rgba(0, 240, 255, 0.15);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
	}
	.od-invite-btn--player {
		background: rgba(34, 197, 94, 0.06);
		border-color: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}
	.od-invite-btn--player:hover {
		background: rgba(34, 197, 94, 0.12);
		box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
	}

	/* ── Empty & error states ────────────────────────────────────────────── */
	.od-empty {
		text-align: center;
		padding: 3rem 2rem;
		color: #475569;
		font-size: 13px;
	}
	.od-empty-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.75rem;
		opacity: 0.4;
	}
	.od-empty-hint {
		font-size: 11px;
		color: #334155;
		margin-top: 0.5rem;
	}
	.od-empty-hint code {
		color: #94a3b8;
	}
	.od-error {
		color: #ef4444;
		font-size: 12px;
		padding: 1rem;
	}

	/* ── Skeleton loader ─────────────────────────────────────────────────── */
	.od-skeleton {
		border-radius: 3px;
		background: linear-gradient(90deg, #1e293b 25%, #0f172a 50%, #1e293b 75%);
		background-size: 200% 100%;
		animation: od-shimmer 1.4s infinite;
	}
	.od-skeleton--title {
		display: inline-block;
		width: 180px;
		height: 1.75rem;
	}
	.od-skeleton--line {
		height: 14px;
		margin-bottom: 8px;
		width: 100%;
	}
	.od-skeleton--line-short {
		height: 10px;
		width: 60%;
	}

	/* ── Modal ───────────────────────────────────────────────────────────── */
	.od-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.od-modal {
		background: #0a0f1a;
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 8px;
		width: min(420px, 92vw);
		box-shadow: 0 0 40px rgba(0, 240, 255, 0.08);
	}
	.od-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.od-modal-label {
		font-size: 10px;
		letter-spacing: 0.25em;
		color: #00f0ff;
	}
	.od-modal-close {
		background: none;
		border: none;
		color: #475569;
		font-size: 1rem;
		cursor: pointer;
		padding: 2px 6px;
		transition: color 0.15s;
	}
	.od-modal-close:hover {
		color: #e2e8f0;
	}
	.od-modal-body {
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.od-modal-meta {
		font-size: 12px;
		color: #94a3b8;
		margin: 0;
	}
	.od-modal-meta strong {
		color: #e2e8f0;
	}
	.od-modal-hint {
		font-size: 11px;
		color: #475569;
		line-height: 1.6;
		margin: 0;
	}

	/* ── Code display ────────────────────────────────────────────────────── */
	.od-code-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(0, 240, 255, 0.04);
		border: 1px solid rgba(0, 240, 255, 0.25);
		border-radius: 6px;
		padding: 0.75rem 1rem;
	}
	.od-code {
		flex: 1;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		color: #00f0ff;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
	}
	.od-copy-btn {
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		padding: 5px 12px;
		border: 1px solid rgba(0, 240, 255, 0.4);
		border-radius: 3px;
		background: rgba(0, 240, 255, 0.08);
		color: #00f0ff;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.od-copy-btn:hover {
		background: rgba(0, 240, 255, 0.15);
	}
	.od-code-expiry {
		font-size: 10px;
		color: #475569;
		text-align: center;
		margin: 0;
	}

	/* ── Buttons ─────────────────────────────────────────────────────────── */
	.od-generate-btn,
	.od-regen-btn {
		font-family: inherit;
		font-size: 11px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		width: 100%;
	}
	.od-generate-btn {
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.4);
		color: #00f0ff;
	}
	.od-generate-btn:hover:not(:disabled) {
		background: rgba(0, 240, 255, 0.18);
		box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
	}
	.od-generate-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.od-regen-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #475569;
		font-size: 10px;
	}
	.od-regen-btn:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.15);
		color: #94a3b8;
	}
	.od-regen-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.od-modal-error {
		font-size: 11px;
		color: #ef4444;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: rgba(239, 68, 68, 0.08);
		border-radius: 4px;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	/* ── Animations ──────────────────────────────────────────────────────── */
	@keyframes od-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
	@keyframes od-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
