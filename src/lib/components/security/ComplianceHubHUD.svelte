<script lang="ts">
	import type { ComplianceHubEngine } from './ComplianceHubEngine.svelte.js';

	let { engine }: { engine: ComplianceHubEngine } = $props();
</script>

{#if !engine.canAccess}
	<div class="ch-denied">
		<span class="ch-denied__icon">⛔</span>
		<p>CLEARANCE PROTOCOL — ACCESS DENIED</p>
		<p class="ch-denied__sub">Director or Registrar credentials required.</p>
	</div>
{:else}
	<div class="ch-header">
		<div class="ch-header__titles">
			<div class="ch-header__label">VANGUARD CLEARANCE TERMINAL</div>
			<h2 class="ch-header__title">Compliance Hub</h2>
			<p class="ch-header__sub">
				Background vetting status for all coaching staff and recruiters.
			</p>
		</div>
		<button
			class="ch-reload-btn"
			onclick={() => void engine.loadRoster()}
			disabled={engine.loadState === 'loading'}
			aria-label="Refresh compliance roster"
		>
			{engine.loadState === 'loading' ? 'SYNCING…' : '↻ REFRESH'}
		</button>
	</div>

	<div class="ch-stats tw-font-mono">
		<div class="ch-stat">
			<span class="ch-stat__num">{engine.stats.total}</span>
			<span class="ch-stat__lbl">TOTAL</span>
		</div>
		<div class="ch-stat ch-stat--cleared">
			<span class="ch-stat__num">{engine.stats.cleared}</span>
			<span class="ch-stat__lbl">CLEARED</span>
		</div>
		<div class="ch-stat ch-stat--pending">
			<span class="ch-stat__num">{engine.stats.pending}</span>
			<span class="ch-stat__lbl">PENDING</span>
		</div>
		<div class="ch-stat ch-stat--flagged">
			<span class="ch-stat__num">{engine.stats.flagged}</span>
			<span class="ch-stat__lbl">FLAGGED</span>
		</div>
	</div>
{/if}

<style>
	.ch-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.ch-header__label {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: var(--vanguard-cyan);
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}

	.ch-header__title {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #f3f4f6;
	}

	.ch-header__sub {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.ch-reload-btn {
		background: transparent;
		border: 1px solid rgba(20, 184, 166, 0.3);
		color: var(--vanguard-cyan);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.ch-reload-btn:hover:not(:disabled) {
		border-color: var(--vanguard-cyan);
		background: rgba(20, 184, 166, 0.06);
	}

	.ch-reload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ch-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--bento-gap-sm);
	}

	@media (min-width: 48rem) {
		.ch-stats {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.ch-stat {
		background: var(--vanguard-glass);
		border: 1px solid var(--vanguard-border);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.ch-stat__num {
		font-size: 1.75rem;
		font-weight: 900;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		color: #9ca3af;
		line-height: 1;
	}

	.ch-stat__lbl {
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: #4b5563;
	}

	.ch-stat--cleared .ch-stat__num { color: var(--vanguard-cyan); }
	.ch-stat--cleared { border-color: rgba(20, 184, 166, 0.25); }

	.ch-stat--pending .ch-stat__num { color: #d97706; }
	.ch-stat--pending { border-color: rgba(217, 119, 6, 0.25); }

	.ch-stat--flagged .ch-stat__num { color: var(--vanguard-red); }
	.ch-stat--flagged { border-color: rgba(255, 0, 60, 0.25); }

	.ch-denied {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		gap: 0.5rem;
	}

	.ch-denied__icon { font-size: 2.5rem; }

	.ch-denied p {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		color: var(--vanguard-red);
		text-transform: uppercase;
	}

	.ch-denied__sub {
		font-size: 0.7rem !important;
		color: #6b7280 !important;
		text-transform: none !important;
	}
</style>
