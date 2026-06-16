<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		buildDate: string;
		shortSha: string;
		children: Snippet;
	}

	let { title, subtitle = '', buildDate, shortSha, children }: Props = $props();
</script>

<div class="acq-print">
	<header class="acq-print__header">
		<div class="acq-print__brand">
			<span class="acq-print__brand-main">SSTRACKER</span>
			<span class="acq-print__brand-sub">VANGUARD · ACQUISITION</span>
		</div>
		<div class="acq-print__meta">
			<h1 class="acq-print__title">{title}</h1>
			{#if subtitle}
				<p class="acq-print__subtitle">{subtitle}</p>
			{/if}
		</div>
	</header>

	<main class="acq-print__body">
		{@render children()}
	</main>

	<footer class="acq-print__footer">
		Confidential — SSTracker acquisition materials — {buildDate} — commit {shortSha}
	</footer>
</div>

<style>
	:global(body) {
		background: #020202;
	}

	.acq-print {
		--acq-gold: #fbbf24;
		--acq-slate: #334155;
		--acq-void: #020202;
		--acq-text: #e2e8f0;
		--acq-muted: #94a3b8;

		min-height: 100vh;
		background: var(--acq-void);
		color: var(--acq-text);
		font-family: 'Geist', system-ui, sans-serif;
		font-size: 11pt;
		line-height: 1.55;
		display: flex;
		flex-direction: column;
	}

	.acq-print__header {
		border-bottom: 2px solid var(--acq-gold);
		padding: 1.25rem 1.5rem 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.acq-print__brand {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.acq-print__brand-main {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: var(--acq-gold);
	}

	.acq-print__brand-sub {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--acq-muted);
	}

	.acq-print__meta {
		flex: 1;
		min-width: 200px;
	}

	.acq-print__title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1.2;
		color: #f8fafc;
	}

	.acq-print__subtitle {
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
		color: var(--acq-muted);
		max-width: 52ch;
	}

	.acq-print__body {
		flex: 1;
		padding: 1.25rem 1.5rem 2rem;
	}

	.acq-print__footer {
		border-top: 1px solid var(--acq-slate);
		padding: 0.65rem 1.5rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		letter-spacing: 0.06em;
		color: var(--acq-muted);
	}

	@media print {
		:global(body),
		:global(body *) {
			visibility: visible !important;
		}

		.acq-print {
			min-height: auto;
		}

		.acq-print__header {
			position: running(acq-header);
		}

		.acq-print__footer {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: var(--acq-void);
		}

		:global(.acq-print-section) {
			break-inside: avoid;
			page-break-inside: avoid;
		}

		:global(.acq-print-section--break) {
			break-before: page;
			page-break-before: always;
		}
	}
</style>
