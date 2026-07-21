<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { NewMessageEngine } from './NewMessageEngine.svelte.js';

	let { engine }: { engine: NewMessageEngine } = $props();
</script>

<div class="nm-arena">
	{#if engine.loading}
		<p class="nm-muted">Loading people…</p>
	{:else if engine.loadErr}
		<p class="nm-err" role="alert">{engine.loadErr}</p>
	{:else}
		<!-- We keep this area for displaying selected chips and candidate list -->
		{#if engine.selectedList.length > 0}
			<ul class="nm-chips">
				{#each engine.selectedList as s (s.email)}
					<li class="nm-chip">
						<span class="nm-chip-text">{s.label}</span>
						<span class="nm-chip-role">{s.role}</span>
						<button
							type="button"
							class="nm-chip-x"
							aria-label="Remove {s.label}"
							onclick={() => engine.removeChip(s.email)}
						>
							<Icon name={"sys.close" as IconName} size={14} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="nm-list" role="listbox" aria-label="Recipients">
			{#each engine.filtered as c (c.email)}
				<button
					type="button"
					class="nm-row"
					class:nm-row--on={engine.selected.has(c.email)}
					onclick={() => engine.toggle(c.email)}
				>
					<span class="nm-row-label">{c.label}</span>
					<span class="nm-row-role">{c.role}</span>
					<span class="nm-row-email">{c.email}</span>
				</button>
			{:else}
				<p class="nm-muted">No matches.</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	.nm-arena {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.nm-muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.nm-err {
		margin: 0;
		font-size: 13px;
		color: #b91c1c;
	}

	.nm-chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.nm-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 10px;
		border-radius: 999px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		font-size: 12px;
	}

	:global(html.dark) .nm-chip {
		border-color: rgba(255, 255, 255, 0.12);
		background: #18181b;
	}

	.nm-chip-text {
		font-weight: 600;
		color: var(--text-primary);
	}

	.nm-chip-role {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.nm-chip-x {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 2px;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
	}

	.nm-list {
		flex: 1;
		min-height: 120px;
		overflow-y: visible;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1.25rem;
		background: #fafafa;
	}

	:global(html.dark) .nm-list {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.nm-row {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 0 10px;
		padding: 10px 12px;
		border: none;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: transparent;
		cursor: pointer;
		text-align: left;
		font: inherit;
	}

	:global(html.dark) .nm-row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.nm-row:last-child {
		border-bottom: none;
	}

	.nm-row:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.nm-row--on {
		background: rgba(245, 158, 11, 0.12);
	}

	:global(html.dark) .nm-row--on {
		background: rgba(245, 158, 11, 0.15);
	}

	.nm-row-label {
		grid-column: 1;
		grid-row: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.nm-row-role {
		grid-column: 2;
		grid-row: 1;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
		align-self: start;
	}

	.nm-row-email {
		grid-column: 1 / -1;
		grid-row: 2;
		font-size: 11px;
		color: var(--text-secondary);
		word-break: break-all;
	}
</style>
