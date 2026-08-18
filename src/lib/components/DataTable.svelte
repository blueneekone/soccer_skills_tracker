<script>
	let { columns = [], rows = [], emptyText = 'No data found.', children } = $props();
</script>

<div class="v-table-wrap tw-overflow-x-auto">
	<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-4 tw-min-w-0 tw-overflow-x-auto">
		<table class="tw-w-full tw-font-mono tw-text-sm v-table">
		{#if columns.length > 0}
			<thead>
				<tr>
					{#each columns as col}
						<th class="v-th">{col}</th>
					{/each}
				</tr>
			</thead>
		{/if}
		<tbody>
			{#if children}
				{@render children()}
			{:else if rows.length === 0}
				<tr><td colspan={columns.length || 1} class="v-td-empty">{emptyText}</td></tr>
			{:else}
				{#each rows as row}
					<tr class="v-tr">
						{#each row as cell}
							<td class="v-td">{cell}</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
	</div>
</div>

