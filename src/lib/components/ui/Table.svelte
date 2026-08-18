<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		columns = [],
		rows = [],
		emptyText = 'No data found.',
		children,
		class: className = '',
	}: {
		columns?: string[];
		rows?: any[][];
		emptyText?: string;
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="v-table-wrap {className}">
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

<style>
	.v-table-wrap {
		width: 100%;
		overflow-x: auto;
		background-color: #000000; /* Z0 Void Black */
	}

	.v-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		text-align: left;
		color: #ffffff;
	}

	.v-th,
	.v-td,
	.v-td-empty {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #334155;
	}

	.v-th {
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.v-tr:hover {
		background-color: #0f172a;
	}

	.v-td-empty {
		text-align: center;
		color: #94a3b8;
		font-style: italic;
	}
</style>
