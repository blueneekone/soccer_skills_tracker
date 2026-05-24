<script lang="ts">
	type TabItem = { key: string; label: string; danger?: boolean };

	let {
		tabs,
		active,
		onSelect,
		ariaLabel = 'Sections',
		class: className = '',
	}: {
		tabs: TabItem[];
		active: string;
		onSelect: (key: string) => void;
		ariaLabel?: string;
		class?: string;
	} = $props();
</script>

<nav
	class="pd-os-tab-rail qa-workspace qa-workspace--premium{className ? ` ${className}` : ''}"
	aria-label={ariaLabel}
	role="tablist"
>
	{#each tabs as item (item.key)}
		<button
			type="button"
			class="pd-os-tab-rail__tab qa-workspace__tab"
			class:pd-os-tab-rail__tab--active={active === item.key}
			class:pd-os-tab-rail__tab--danger={item.danger && active !== item.key}
			role="tab"
			aria-selected={active === item.key}
			onclick={() => onSelect(item.key)}
		>
			{item.label}
		</button>
	{/each}
</nav>
