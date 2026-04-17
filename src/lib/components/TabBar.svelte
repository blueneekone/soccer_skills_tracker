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
			onclick={() => (activeTab = tab.id)}
		>
			{#if tab.icon}<i class="ph {tab.icon}"></i>{/if}
			{tab.label}
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
	}
	.tab-bar-container::-webkit-scrollbar {
		display: none;
	}
</style>
