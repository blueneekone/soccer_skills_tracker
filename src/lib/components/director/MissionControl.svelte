<script lang="ts">
	/**
	 * MissionControl.svelte
	 * ──────────────────────
	 * Trinity role: HUD (Glass UI — the top-level director dashboard shell)
	 *
	 * This is the Director's Mission Control — the bird's-eye view of the
	 * entire club's health.  It is composed of:
	 *
	 *   1. ACCESS GUARD — blocks non-directors with a locked state.
	 *      Global admins bypass via "God Mode."
	 *
	 *   2. ORG METRIC TILES (top row) — 4 live KPI tiles:
	 *        Total Athletes · Total Squads · Active Missions · Avg VAN Rating
	 *
	 *   3. SQUAD MANAGER — team directory with Create Squad / Assign Coach.
	 *
	 *   4. INVITE COMMAND CENTER — org-wide invite code management.
	 *
	 * Data contract:
	 *   All reactive data is owned by a single `OrgManager` instance created
	 *   inside this component (self-contained; no external service prop needed).
	 *   The OrgManager auto-connects via $effect.root() when authStore.tenantId
	 *   becomes available.
	 */

	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { OrgManager } from '$lib/services/org.svelte.js';
	import SquadManager from '$lib/components/director/SquadManager.svelte';
	import OrgInvites from '$lib/components/director/OrgInvites.svelte';

	// ── Service instantiation ─────────────────────────────────────────────────
	const org = new OrgManager();
	$effect(() => () => org.destroy());

	// ── Access guard ──────────────────────────────────────────────────────────
	/**
	 * Who can access Mission Control:
	 *   isDirector → primary audience (club owner, tenantId-scoped).
	 *   isAdmin    → God Mode bypass (platform global_admin / super_admin,
	 *                cross-tenant visibility, no tenantId required).
	 *
	 * Everyone else is redirected to /home.
	 * Both flags are $derived in the auth store — this re-evaluates reactively
	 * whenever role changes mid-session (e.g. after invite consumption).
	 */
	const isAuthorized = $derived(authStore.isDirector || authStore.isAdmin);

	/** True only for platform admins — enables cross-tenant God Mode indicators. */
	const isGodMode = $derived(authStore.isAdmin);

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (!authStore.isAuthenticated) {
			goto('/login');
			return;
		}
		if (!isAuthorized) {
			goto('/home');
		}
	});

	// ── Metric tile config ────────────────────────────────────────────────────
	type MetricTile = {
		id: string;
		label: string;
		sublabel: string;
		getValue: () => number | string;
		color: string;
		icon: string;
	};

	const TILES: MetricTile[] = [
		{
			id: 'athletes',
			label: 'TOTAL ATHLETES',
			sublabel: 'REGISTERED PLAYERS',
			getValue: () => org.playerCount,
			color: '#00f0ff',
			icon: '◉',
		},
		{
			id: 'squads',
			label: 'TOTAL SQUADS',
			sublabel: 'ACTIVE TEAMS',
			getValue: () => org.teams.length,
			color: '#a855f7',
			icon: '◈',
		},
		{
			id: 'missions',
			label: 'ACTIVE MISSIONS',
			sublabel: 'PENDING TASKS',
			getValue: () => org.activeMissions.length,
			color: '#f59e0b',
			icon: '⬟',
		},
		{
			id: 'rating',
			label: 'AVG VAN RATING',
			sublabel: 'VANGUARD SCORE',
			getValue: () => org.avgVanRating.toFixed(1),
			color: '#22c55e',
			icon: '▲',
		},
	];

	// ── Active section tab ────────────────────────────────────────────────────
	type Section = 'squads' | 'invites';
	let activeSection = $state<Section>('squads');
</script>

<!-- ── Access guard ───────────────────────────────────────────────────────── -->
{#if !isAuthorized && !authStore.isLoading}
	<div class="mc-locked">
		<span class="mc-locked-icon" aria-hidden="true">⛔</span>
		<h2 class="mc-locked-title">ACCESS RESTRICTED</h2>
		<p class="mc-locked-msg">
			Director-level clearance required.
			Contact your platform administrator.
		</p>
		<button class="mc-locked-back" onclick={() => goto('/home')}>← RETURN TO BASE</button>
	</div>
{:else}
	<div class="mc-root">
		<!-- ── Header ───────────────────────────────────────────────────────── -->
		<header class="mc-header">
			<div class="mc-header-left">
				<span class="mc-eyebrow">
					{isGodMode ? '⚡ GOD MODE ACTIVE · ' : ''}NEXUS COMMAND
				</span>
				<h1 class="mc-title">
					{#if org.loading && !org.org}
						<span class="mc-skeleton mc-skeleton--title"></span>
					{:else}
						{org.org?.name ?? 'MISSION CONTROL'}
					{/if}
				</h1>
				{#if org.org?.plan}
					<span class="mc-plan-badge">{org.org.plan.toUpperCase()} TIER</span>
				{/if}
			</div>

			<div class="mc-header-right">
				<div class="mc-live-pill">
					<span class="mc-live-dot"></span>
					LIVE
				</div>
				<div class="mc-tenant-chip">
					<span class="mc-tenant-key">TID</span>
					<code class="mc-tenant-val">{authStore.tenantId || '—'}</code>
				</div>
			</div>
		</header>

		<!-- ── Metric tiles ──────────────────────────────────────────────────── -->
		<div class="mc-tiles">
			{#each TILES as tile (tile.id)}
				<div class="mc-tile" style:--accent={tile.color}>
					<div class="mc-tile-icon" style:color={tile.color}>
						{tile.icon}
					</div>
					<div class="mc-tile-data">
						<span class="mc-tile-value" style:color={tile.color}>
							{org.loading && tile.id !== 'squads' ? '—' : tile.getValue()}
						</span>
						<span class="mc-tile-label">{tile.label}</span>
						<span class="mc-tile-sublabel">{tile.sublabel}</span>
					</div>
					<!-- Decorative bottom glow bar -->
					<div class="mc-tile-glow"></div>
				</div>
			{/each}
		</div>

		<!-- ── Error banner ───────────────────────────────────────────────────── -->
		{#if org.error}
			<div class="mc-error-banner">
				<span>⚠ {org.error}</span>
			</div>
		{/if}

		<!-- ── Section nav ────────────────────────────────────────────────────── -->
		<div class="mc-section-nav">
			<button
				class="mc-nav-btn"
				class:mc-nav-btn--active={activeSection === 'squads'}
				onclick={() => (activeSection = 'squads')}
			>
				<span class="mc-nav-icon">◈</span>
				SQUAD DIRECTORY
				<span class="mc-nav-badge">{org.teams.length}</span>
			</button>
			<button
				class="mc-nav-btn"
				class:mc-nav-btn--active={activeSection === 'invites'}
				onclick={() => (activeSection = 'invites')}
			>
				<span class="mc-nav-icon">◎</span>
				INVITE CONTROL
				<span class="mc-nav-badge">{org.activeInvites.length}</span>
			</button>
		</div>

		<!-- ── Main content ───────────────────────────────────────────────────── -->
		<div class="mc-content">
			{#if activeSection === 'squads'}
				<SquadManager {org} />
			{:else}
				<OrgInvites {org} />
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Access locked ────────────────────────────────────────────────────── */
	.mc-locked {
		min-height: 60vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #475569;
		text-align: center;
		padding: 3rem;
	}
	.mc-locked-icon {
		font-size: 3rem;
	}
	.mc-locked-title {
		font-size: 1rem;
		letter-spacing: 0.2em;
		color: #ef4444;
		margin: 0;
	}
	.mc-locked-msg {
		font-size: 12px;
		color: #334155;
		max-width: 320px;
		line-height: 1.7;
		margin: 0;
	}
	.mc-locked-back {
		font-family: inherit;
		font-size: 10px;
		letter-spacing: 0.18em;
		padding: 8px 18px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
		margin-top: 0.5rem;
	}
	.mc-locked-back:hover {
		color: #94a3b8;
		border-color: rgba(255, 255, 255, 0.15);
	}

	/* ── Root ─────────────────────────────────────────────────────────────── */
	.mc-root {
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.mc-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid rgba(0, 240, 255, 0.12);
	}
	.mc-eyebrow {
		font-size: 9px;
		letter-spacing: 0.3em;
		color: #00f0ff;
		display: block;
		margin-bottom: 4px;
	}
	.mc-title {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		margin: 0;
		color: #f8fafc;
		line-height: 1.15;
	}
	.mc-plan-badge {
		display: inline-flex;
		align-items: center;
		margin-top: 6px;
		padding: 2px 9px;
		font-size: 8px;
		letter-spacing: 0.2em;
		border: 1px solid rgba(0, 240, 255, 0.35);
		border-radius: 2px;
		color: #00f0ff;
		background: rgba(0, 240, 255, 0.06);
	}
	.mc-header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.mc-live-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		letter-spacing: 0.2em;
		color: #22c55e;
	}
	.mc-live-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 8px #22c55e;
		animation: mc-pulse 1.8s ease-in-out infinite;
	}
	.mc-tenant-chip {
		display: flex;
		align-items: center;
		gap: 5px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 3px;
		padding: 3px 8px;
	}
	.mc-tenant-key {
		font-size: 8px;
		letter-spacing: 0.18em;
		color: #334155;
	}
	.mc-tenant-val {
		font-size: 10px;
		color: #64748b;
		letter-spacing: 0.1em;
	}

	/* ── Metric tiles ────────────────────────────────────────────────────── */
	.mc-tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1px;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 8px;
		overflow: hidden;
	}
	.mc-tile {
		background: rgba(1, 4, 9, 0.88);
		backdrop-filter: blur(12px);
		padding: 1.25rem 1.5rem;
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		position: relative;
		overflow: hidden;
		transition: background 0.15s;
	}
	.mc-tile:hover {
		background: rgba(255, 255, 255, 0.03);
	}
	.mc-tile-icon {
		font-size: 1.2rem;
		line-height: 1;
		flex-shrink: 0;
		margin-top: 3px;
		opacity: 0.7;
	}
	.mc-tile-data {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.mc-tile-value {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.01em;
		text-shadow: 0 0 24px color-mix(in srgb, var(--accent) 40%, transparent);
	}
	.mc-tile-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #e2e8f0;
		margin-top: 3px;
	}
	.mc-tile-sublabel {
		font-size: 8px;
		letter-spacing: 0.14em;
		color: #334155;
	}
	/* Bottom glow bar */
	.mc-tile-glow {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent);
		opacity: 0.2;
		transition: opacity 0.2s;
	}
	.mc-tile:hover .mc-tile-glow {
		opacity: 0.45;
	}

	/* ── Error banner ────────────────────────────────────────────────────── */
	.mc-error-banner {
		background: rgba(239, 68, 68, 0.07);
		border: 1px solid rgba(239, 68, 68, 0.22);
		border-radius: 4px;
		padding: 0.6rem 1rem;
		font-size: 11px;
		color: #ef4444;
	}

	/* ── Section nav ─────────────────────────────────────────────────────── */
	.mc-section-nav {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0;
	}
	.mc-nav-btn {
		display: flex;
		align-items: center;
		gap: 7px;
		font-family: inherit;
		font-size: 10px;
		letter-spacing: 0.18em;
		padding: 0.6rem 1.1rem;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		margin-bottom: -1px;
	}
	.mc-nav-btn:hover {
		color: #94a3b8;
	}
	.mc-nav-btn--active {
		color: #00f0ff;
		border-bottom-color: #00f0ff;
	}
	.mc-nav-icon {
		font-size: 11px;
		opacity: 0.7;
	}
	.mc-nav-badge {
		background: rgba(255, 255, 255, 0.07);
		border-radius: 2px;
		padding: 1px 6px;
		font-size: 9px;
		color: #64748b;
	}
	.mc-nav-btn--active .mc-nav-badge {
		background: rgba(0, 240, 255, 0.12);
		color: #00f0ff;
	}

	/* ── Content ─────────────────────────────────────────────────────────── */
	.mc-content {
		/* Children (SquadManager, OrgInvites) fill this container */
	}

	/* ── Skeleton ────────────────────────────────────────────────────────── */
	.mc-skeleton {
		display: inline-block;
		border-radius: 3px;
		background: linear-gradient(90deg, #1e293b 25%, #0f172a 50%, #1e293b 75%);
		background-size: 200% 100%;
		animation: mc-shimmer 1.4s infinite;
	}
	.mc-skeleton--title {
		width: 220px;
		height: 1.75rem;
	}

	/* ── Animations ──────────────────────────────────────────────────────── */
	@keyframes mc-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
	@keyframes mc-shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>
