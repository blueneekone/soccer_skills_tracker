<script>
	/**
	 * @type {{ id: string, label: string, icon?: string }[]}
	 */
	let {
		tabs = [],
		activeTab = $bindable(''),
		variant = 'admin' // 'admin' | 'director' | 'coach'
	} = $props();

	const tabClass = $derived(
		variant === 'coach' ? 'coach-tab-btn' : variant === 'director' ? 'director-tab' : 'admin-tab'
	);
</script>

<div class="tab-bar-container" role="tablist">
	{#each tabs as tab}
		<button
			class={tabClass}
			class:active={activeTab === tab.id}
			role="tab"
			aria-selected={activeTab === tab.id}
			aria-label={tab.label}
			title={tab.label}
			onclick={() => (activeTab = tab.id)}
		>
			{#if tab.icon}<i class="ph {tab.icon} tab-bar-icon" aria-hidden="true"></i>{/if}
			<span class="tab-bar-label">{tab.label}</span>
		</button>
	{/each}
</div>

<style>
	.tab-bar-container {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding-bottom: 10px;
		scrollbar-width: none;
		align-items: center;
	}
	.tab-bar-container::-webkit-scrollbar {
		display: none;
	}

	.tab-bar-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.tab-bar-label {
		display: inline;
	}

	@media (min-width: 1024px) {
		.tab-bar-container :global(.admin-tab),
		.tab-bar-container :global(.director-tab),
		.tab-bar-container :global(.coach-tab-btn) {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0;
			padding: 12px 14px;
			min-width: 48px;
			position: relative;
		}

		.tab-bar-label {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		.tab-bar-icon {
			font-size: 1.35rem;
		}
	}
</style>
