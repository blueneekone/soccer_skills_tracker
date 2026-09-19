<script lang="ts">
	import type { ComplianceHubEngine } from './ComplianceHubEngine.svelte.js';
	import ComplianceHubModals from './ComplianceHubModals.svelte';

	let { engine }: { engine: ComplianceHubEngine } = $props();
</script>

<div class="ch-filters">
	<input
		type="search"
		class="ch-search"
		placeholder="Search by email or name…"
		bind:value={engine.searchQuery}
		aria-label="Search compliance roster"
	/>
	<div class="ch-filter-pills" role="group" aria-label="Filter by status">
		{#each ['all','cleared','pending','flagged'] as s (s)}
			<button
				class="ch-pill {engine.filterStatus === s ? 'ch-pill--active' : ''}"
				onclick={() => (engine.filterStatus = s)}
			>
				{s.toUpperCase()}
			</button>
		{/each}
	</div>
</div>

{#if engine.loadState === 'error'}
	<div class="ch-error" role="alert">
		<span>⚠ TELEMETRY ERROR:</span> {engine.errorMsg}
	</div>
{/if}

{#if engine.loadState === 'loading' && engine.roster.length === 0}
	<div class="ch-loading" aria-live="polite">
		<div class="ch-loading__pulse"></div>
		<span>LOADING COMPLIANCE ROSTER…</span>
	</div>
{:else if engine.filteredRoster.length === 0}
	<div class="ch-empty">
		<p>NO PERSONNEL MATCHING CURRENT FILTER.</p>
		<p class="ch-empty__sub">Adjust the search or status filter above.</p>
	</div>
{:else}
	<div class="ch-grid tw-font-mono" role="table" aria-label="Compliance roster">
		<div class="ch-grid__header tw-font-mono" role="row">
			<span role="columnheader">PERSONNEL</span>
			<span role="columnheader">ROLE</span>
			<span role="columnheader">STATUS</span>
			<span role="columnheader">EXPIRY</span>
			<span role="columnheader">SOURCE</span>
			{#if engine.canOverride}
				<span role="columnheader">ACTIONS</span>
			{/if}
		</div>

		{#each engine.filteredRoster as row (row.email)}
			<div
				class="ch-grid__row {row.clearanceStatus === 'flagged' ? 'ch-grid__row--flagged' : ''} tw-font-mono"
				role="row"
			>
				<div role="cell" class="ch-cell ch-cell--person">
					<span class="ch-cell__name">{row.displayName}</span>
					<span class="ch-cell__email">{row.email}</span>
				</div>

				<div role="cell" class="ch-cell">
					<span class="ch-role-badge">
						{row.role.toUpperCase()}
					</span>
				</div>

				<div role="cell" class="ch-cell">
					<span class={engine.statusClass(row.clearanceStatus)}>
						{#if row.clearanceStatus === 'cleared'}
							✓ CLEARED
						{:else if row.clearanceStatus === 'flagged'}
							⚑ FLAGGED
						{:else}
							⧗ PENDING
						{/if}
					</span>
					{#if row.isManualOverride}
						<span class="ch-override-tag tw-font-mono">MANUAL</span>
					{/if}
				</div>

				<div role="cell" class="ch-cell ch-cell--mono">
					{engine.formatExpiry(row.expiresAt)}
				</div>

				<div role="cell" class="ch-cell ch-cell--mono">
					{row.source ? row.source.replace('_', ' ').toUpperCase() : '—'}
				</div>

				{#if engine.canOverride}
					<div role="cell" class="ch-cell ch-cell--actions">
						{#if row.clearanceStatus !== 'cleared'}
							<button
								class="ch-btn-primary ch-btn-primary--grant"
								onclick={() => engine.openOverride(row.email)}
								title="Grant manual clearance"
							>
								GRANT
							</button>
						{/if}
						{#if row.clearanceStatus === 'cleared'}
							<button
								class="ch-btn-primary ch-btn-primary--revoke"
								onclick={() => engine.openRevoke(row.email)}
								title="Revoke clearance"
							>
								REVOKE
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<ComplianceHubModals {engine} />

<style>
	.ch-filters {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.ch-search {
		flex: 1;
		min-width: 200px;
		background: var(--vanguard-glass);
		border: 1px solid var(--vanguard-border);
		border-radius: 0.375rem;
		padding: 0.5rem 0.875rem;
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.8rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.ch-search:focus { border-color: var(--vanguard-cyan); }
	.ch-search::placeholder { color: #4b5563; }

	.ch-filter-pills {
		display: flex;
		gap: 0.375rem;
	}

	.ch-pill {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		padding: 0.35rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.ch-pill:hover { border-color: rgba(20, 184, 166, 0.3); color: #9ca3af; }

	.ch-pill--active {
		border-color: var(--vanguard-cyan);
		color: var(--vanguard-cyan);
		background: rgba(20, 184, 166, 0.06);
	}

	.ch-grid {
		border: 1px solid var(--vanguard-border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.ch-grid__header {
		display: grid;
		grid-template-columns: 2fr 1fr 1.25fr 1fr 1fr auto;
		padding: 0.6rem 1rem;
		background: rgba(20, 184, 166, 0.04);
		border-bottom: 1px solid var(--vanguard-border);
		font-size: 0.6rem;
		letter-spacing: 0.12em;
		color: #4b5563;
		gap: 0.5rem;
	}

	.ch-grid__header span { text-transform: uppercase; }

	.ch-grid__row {
		display: grid;
		grid-template-columns: 2fr 1fr 1.25fr 1fr 1fr auto;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.06);
		gap: 0.5rem;
		align-items: center;
		transition: background 0.15s;
	}

	.ch-grid__row:last-child { border-bottom: none; }
	.ch-grid__row:hover { background: rgba(20, 184, 166, 0.02); }

	.ch-grid__row--flagged {
		animation: ch-flag-pulse 2.5s ease-in-out infinite;
	}

	@keyframes ch-flag-pulse {
		0%, 100% { background: transparent; }
		50% { background: rgba(255, 0, 60, 0.04); }
	}

	.ch-cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.ch-cell--mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
	.ch-cell--actions { flex-direction: row; gap: 0.4rem; align-items: center; }

	.ch-cell__name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f3f4f6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ch-cell__email {
		font-size: 0.7rem;
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ch-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.ch-badge--cleared {
		color: var(--vanguard-cyan);
		border-color: rgba(20, 184, 166, 0.3);
		background: rgba(20, 184, 166, 0.08);
		text-shadow: 0 0 8px rgba(20, 184, 166, 0.6);
	}

	.ch-badge--pending {
		color: #d97706;
		border-color: rgba(217, 119, 6, 0.3);
		background: rgba(217, 119, 6, 0.08);
	}

	.ch-badge--flagged {
		color: var(--vanguard-red);
		border-color: rgba(255, 0, 60, 0.4);
		background: rgba(255, 0, 60, 0.1);
		animation: ch-flag-blink 1.2s step-end infinite;
	}

	@keyframes ch-flag-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.ch-role-badge {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: #9ca3af;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.15rem 0.45rem;
		border-radius: 0.25rem;
	}

	.ch-override-tag {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		color: #d97706;
		border: 1px solid rgba(217, 119, 6, 0.3);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		margin-left: 0.25rem;
	}

	.ch-btn-primary {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		padding: 0.3rem 0.6rem;
		border-radius: 0.25rem;
		cursor: pointer;
		border: 1px solid;
		transition: background 0.15s, box-shadow 0.15s;
	}

	.ch-btn-primary--grant {
		border-color: rgba(20, 184, 166, 0.4);
		color: var(--vanguard-cyan);
		background: rgba(20, 184, 166, 0.06);
	}

	.ch-btn-primary--grant:hover {
		background: rgba(20, 184, 166, 0.14);
		box-shadow: 0 0 8px rgba(20, 184, 166, 0.3);
	}

	.ch-btn-primary--revoke {
		border-color: rgba(255, 0, 60, 0.4);
		color: var(--vanguard-red);
		background: rgba(255, 0, 60, 0.06);
	}

	.ch-btn-primary--revoke:hover {
		background: rgba(255, 0, 60, 0.14);
		box-shadow: 0 0 8px rgba(255, 0, 60, 0.3);
	}

	.ch-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		color: #4b5563;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
	}

	.ch-loading__pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--vanguard-cyan);
		animation: ch-pulse 1.2s ease-in-out infinite;
	}

	@keyframes ch-pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1); }
	}

	.ch-empty {
		padding: 3rem;
		text-align: center;
		color: #4b5563;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
	}

	.ch-empty__sub { font-size: 0.7rem; margin-top: 0.5rem; }

	.ch-error {
		padding: 0.75rem 1rem;
		background: rgba(255, 0, 60, 0.1);
		border: 1px solid rgba(255, 0, 60, 0.3);
		border-radius: 0.375rem;
		color: var(--vanguard-red);
		font-size: 0.78rem;
	}

	.ch-error span { font-weight: 700; }

	@media (max-width: 640px) {
		.ch-grid__header,
		.ch-grid__row {
			grid-template-columns: 1.5fr 1fr 1.25fr;
		}

		.ch-grid__header span:nth-child(n+4),
		.ch-grid__row > div:nth-child(n+4) {
			display: none;
		}
	}
</style>
