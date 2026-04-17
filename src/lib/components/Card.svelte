<script>
	/**
	 * @type {'blue'|'gold'|'green'|'red'|'orange'|'none'}
	 */
	let {
		header = '',
		headerVariant = 'none',
		borderVariant = '',
		flushTop = false,
		children,
		headerSlot
	} = $props();

	const headerClass = $derived({
		'bg-blue-header': headerVariant === 'blue',
		'bg-gold-header': headerVariant === 'gold',
		'bg-green-header': headerVariant === 'green',
		'bg-red-header': headerVariant === 'red',
		'bg-orange-header': headerVariant === 'orange'
	});
</script>

<div
	class="card"
	class:border-gold={borderVariant === 'gold'}
	class:border-green={borderVariant === 'green'}
	class:border-orange={borderVariant === 'orange'}
	class:border-aggie-blue={borderVariant === 'blue'}
	class:border-purple={borderVariant === 'purple'}
	class:border-slate={borderVariant === 'slate'}
	class:border-gray={borderVariant === 'gray'}
	class:flush-top={flushTop}
>
	{#if header || headerSlot}
		<div class="card-header" class:bg-blue-header={headerVariant === 'blue'} class:bg-gold-header={headerVariant === 'gold'} class:bg-green-header={headerVariant === 'green'} class:bg-red-header={headerVariant === 'red'} class:bg-orange-header={headerVariant === 'orange'}>
			{#if headerSlot}
				{@render headerSlot()}
			{:else}
				{header}
			{/if}
		</div>
	{/if}
	<div class="card-body">
		{@render children()}
	</div>
</div>
