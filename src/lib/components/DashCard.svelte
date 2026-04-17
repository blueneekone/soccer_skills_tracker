<script>
	let {
		icon = 'ph-square',
		label = '',
		borderVariant = '',
		hidden = false,
		onclick
	} = $props();
</script>

{#if !hidden}
	<div
		class="card dash-card"
		class:border-gold={borderVariant === 'gold'}
		class:border-green={borderVariant === 'green'}
		class:border-orange={borderVariant === 'orange'}
		class:border-gray={borderVariant === 'gray'}
		class:border-slate={borderVariant === 'slate'}
		class:border-purple={borderVariant === 'purple'}
		role="button"
		tabindex="0"
		{onclick}
		onkeydown={(e) => e.key === 'Enter' && onclick?.()}
		aria-label={label}
	>
		<div class="dash-card-body">
			<i class="ph {icon} dash-icon"></i>
			<div class="dash-label">{label}</div>
		</div>
	</div>
{/if}
