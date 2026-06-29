<script lang="ts" module>
	export type CommsWorkspaceChannel = {
		id: string;
		label: string;
		unread?: boolean;
	};

	export type CommsWorkspaceCategory = {
		id: string;
		label: string;
		channels: CommsWorkspaceChannel[];
	};
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	let {
		variant = 'coach-team',
		categories,
		activeChannel = $bindable(''),
		spaceLabel = '',
		onChannelSelect,
		children,
	}: {
		variant?: 'coach-team';
		categories: CommsWorkspaceCategory[];
		activeChannel?: string;
		spaceLabel?: string;
		onChannelSelect?: (id: string) => void;
		children?: Snippet;
	} = $props();

	let mobilePickerOpen = $state(false);

	const flatChannels = $derived(categories.flatMap((g) => g.channels));

	const activeChannelLabel = $derived(
		flatChannels.find((c) => c.id === activeChannel)?.label ?? 'Channel',
	);

	function selectChannel(id: string) {
		activeChannel = id;
		mobilePickerOpen = false;
		onChannelSelect?.(id);
	}
</script>

<div class="comms-workspace comms-workspace--{variant}">
	{#if browser}
		<div class="comms-workspace__mobile-picker">
			{#if spaceLabel}
				<p class="comms-workspace__space-context">{spaceLabel}</p>
			{/if}
			<button
				type="button"
				class="comms-workspace__mobile-trigger"
				aria-expanded={mobilePickerOpen}
				aria-haspopup="listbox"
				onclick={() => (mobilePickerOpen = !mobilePickerOpen)}
			>
				{activeChannelLabel}
			</button>
			{#if mobilePickerOpen}
				<ul class="comms-workspace__mobile-menu" role="listbox">
					{#each categories as group (group.id)}
						{#each group.channels as ch (ch.id)}
							<li role="option" aria-selected={activeChannel === ch.id}>
								<button type="button" onclick={() => selectChannel(ch.id)}>
									<span class="comms-workspace__mobile-cat">{group.label}</span>
									{ch.label}
									{#if ch.unread}
										<span class="comms-workspace__unread-dot" aria-label="Unread">•</span>
									{/if}
								</button>
							</li>
						{/each}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<nav class="comms-workspace__rail" aria-label="Comms channels">
		{#if spaceLabel}
			<p class="comms-workspace__space-context comms-workspace__space-context--rail">{spaceLabel}</p>
		{/if}

		{#each categories as group (group.id)}
			<section class="comms-workspace__category" aria-labelledby="cws-cat-{group.id}">
				<h3 id="cws-cat-{group.id}" class="comms-workspace__category-label">{group.label}</h3>
				<div class="comms-workspace__category-channels">
					{#each group.channels as ch (ch.id)}
						<button
							type="button"
							class="comms-workspace__rail-btn"
							class:comms-workspace__rail-btn--active={activeChannel === ch.id}
							aria-current={activeChannel === ch.id ? 'page' : undefined}
							onclick={() => selectChannel(ch.id)}
						>
							<span class="comms-workspace__rail-label">{ch.label}</span>
							{#if ch.unread}
								<span class="comms-workspace__unread-dot" aria-label="Unread">•</span>
							{/if}
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</nav>

	<main class="comms-workspace__main coach-os-panel">
		{@render children?.()}
	</main>
</div>

<style>
	.comms-workspace {
		display: grid;
		grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr);
		gap: 16px;
		min-width: 0;
		align-items: start;
	}

	.comms-workspace__main {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		padding: 16px 18px;
	}

	.comms-workspace__mobile-picker {
		display: none;
	}

	.comms-workspace__space-context {
		margin: 0 0 8px;
		padding: 8px 10px;
		border: 1px solid var(--pd-grey-trim, #334155);
		background: rgba(15, 23, 42, 0.35);
		font-size: 11px;
		font-weight: 700;
		color: #94a3b8;
	}

	.comms-workspace__space-context--rail {
		margin-bottom: 12px;
	}

	.comms-workspace__category {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 14px;
	}

	.comms-workspace__category:last-child {
		margin-bottom: 0;
	}

	.comms-workspace__category-label {
		margin: 0 0 4px;
		padding: 0 10px;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #64748b;
	}

	.comms-workspace__category-channels {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.comms-workspace__rail-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		text-align: left;
		padding: 10px 12px;
		border: 1px solid var(--pd-grey-trim, #334155);
		border-left: 3px solid transparent;
		border-radius: 0;
		background: rgba(15, 23, 42, 0.5);
		color: #94a3b8;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.comms-workspace__rail-btn--active {
		border-left-color: var(--pd-data-cyan, #14b8a6);
		border-color: var(--pd-grey-trim, #334155);
		color: #e2e8f0;
		background: rgba(20, 184, 166, 0.08);
	}

	.comms-workspace__rail-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.comms-workspace__unread-dot {
		flex-shrink: 0;
		color: var(--pd-nav-cyan, #06b6d4);
		font-size: 14px;
		line-height: 1;
	}

	.comms-workspace__mobile-trigger {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--pd-grey-trim, #334155);
		border-left: 3px solid var(--pd-data-cyan, #14b8a6);
		border-radius: 0;
		background: rgba(15, 23, 42, 0.5);
		color: #e2e8f0;
		font-size: 13px;
		font-weight: 700;
		text-align: left;
		cursor: pointer;
	}

	.comms-workspace__mobile-menu {
		position: absolute;
		z-index: 20;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px 0;
		list-style: none;
		border: 1px solid var(--pd-grey-trim, #334155);
		background: var(--pd-navy-panel, #0f172a);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
		max-height: min(60vh, 420px);
		overflow-y: auto;
	}

	.comms-workspace__mobile-menu li button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 12px;
		border: none;
		border-left: 3px solid transparent;
		border-radius: 0;
		background: transparent;
		color: #cbd5e1;
		font-size: 13px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.comms-workspace__mobile-menu li button:hover,
	.comms-workspace__mobile-menu li[aria-selected='true'] button {
		border-left-color: var(--pd-data-cyan, #14b8a6);
		background: rgba(20, 184, 166, 0.08);
	}

	.comms-workspace__mobile-cat {
		flex-shrink: 0;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #64748b;
	}

	@media (max-width: 640px) {
		.comms-workspace {
			grid-template-columns: 1fr;
		}

		.comms-workspace__rail {
			display: none;
		}

		.comms-workspace__mobile-picker {
			display: block;
			position: relative;
		}
	}
</style>
