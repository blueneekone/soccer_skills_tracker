<script>
	let { columns = [], rows = [], emptyText = 'No data found.', children } = $props();
</script>

<div class="overflow-x-auto">
	<table class="admin-table">
		{#if columns.length > 0}
			<thead>
				<tr>
					{#each columns as col}
						<th>{col}</th>
					{/each}
				</tr>
			</thead>
		{/if}
		<tbody>
			{#if children}
				{@render children()}
			{:else if rows.length === 0}
				<tr><td colspan={columns.length || 1} class="text-center">{emptyText}</td></tr>
			{:else}
				{#each rows as row}
					<tr>
						{#each row as cell}
							<td>{cell}</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
