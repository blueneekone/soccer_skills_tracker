<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { NewMessageEngine } from './NewMessageEngine.svelte.js';

	let {
		engine,
		onClose,
	}: { engine: NewMessageEngine; onClose: () => void } = $props();
</script>

<div class="nm-hud">
	{#if !engine.loading && !engine.loadErr}
		<label class="nm-label" for="nm-search">To</label>
		<div class="nm-search-wrap">
			<span class="nm-search-ico" aria-hidden="true"
				><Icon name={"action.search" as IconName} size={18} /></span
			>
			<input
				id="nm-search"
				class="nm-search"
				type="search"
				placeholder="Search coaches, parents, players…"
				autocomplete="off"
				bind:value={engine.search}
			/>
		</div>

		{#if engine.showGroupName}
			<label class="nm-label" for="nm-group">
				Group name <span class="nm-opt">(optional)</span>
			</label>
			<input
				id="nm-group"
				class="nm-input"
				type="text"
				maxlength="200"
				placeholder={engine.plan.defaultName}
				bind:value={engine.groupName}
			/>
		{/if}

		{#if engine.createErr}
			<p class="nm-err" role="alert">{engine.createErr}</p>
		{/if}

		<div class="nm-actions">
			<button type="button" class="nm-btn nm-btn--ghost" onclick={onClose}>Cancel</button>
			<button
				type="button"
				class="nm-btn nm-btn--primary"
				disabled={engine.creating || engine.selected.size === 0}
				onclick={() => void engine.startChat(onClose)}
			>
				{engine.creating ? 'Starting…' : 'Start Chat'}
			</button>
		</div>
	{/if}
</div>

<style>
	.nm-hud {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.nm-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.nm-search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 9999px;
		padding: 8px 12px;
		background: #fafafa;
	}

	:global(html.dark) .nm-search-wrap {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.nm-search-ico {
		font-size: 18px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.nm-search {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
	}

	.nm-input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .nm-input {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.nm-opt {
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	.nm-err {
		margin: 0;
		font-size: 13px;
		color: #b91c1c;
	}

	.nm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 4px;
	}

	.nm-btn {
		border-radius: 14px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid #e5e5e5;
	}

	.nm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nm-btn--ghost {
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .nm-btn--ghost {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.nm-btn--primary {
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		border-color: transparent;
	}
</style>
