<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { AdminAuditEngine } from './AdminAuditEngine.svelte.js';

	let { engine }: { engine: AdminAuditEngine } = $props();
</script>

{#if engine.loadErr}
	<div class="al-err" role="alert">
		<Icon name={"status.warning-circle" as IconName} />
		{engine.loadErr}
	</div>
{/if}

<!-- ── Log table ──────────────────────────────────────────────────────────── -->
<div class="card">
	<div class="card-body al-table-body">
		<div class="al-table-wrap">
			<table class="admin-table al-table">
				<thead>
					<tr>
						<th class="al-th-ts">Timestamp</th>
						<th class="al-th-admin">Admin Identity</th>
						<th class="al-th-action">Action</th>
						<th>Target / Details</th>
					</tr>
				</thead>
				<tbody>
					{#if engine.loading && engine.logs.length === 0}
						<tr>
							<td colspan="4" class="text-center al-td-loading">
								Decrypting secure audit logs…
							</td>
						</tr>
					{:else if engine.filteredLogs.length === 0}
						<tr>
							<td colspan="4" class="text-center">
								{engine.logs.length === 0 ? 'No security events recorded yet.' : 'No events match your filter.'}
							</td>
						</tr>
					{:else}
						{#each engine.filteredLogs as log (log.id)}
							<tr class="al-row">
								<td class="al-td-ts">
									{engine.rowTimestamp(log)}
								</td>
								<td class="al-td-admin">{log.admin || '—'}</td>
								<td class="al-td-action">
									<span class="al-badge {engine.actionSeverityClass(log.action)}">
										{log.action || '—'}
									</span>
								</td>
								<td class="al-td-detail">
									<strong class="al-td-target">{log.target || '—'}</strong>
									{#if log.details}
										<span class="al-td-details-sub">{log.details}</span>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ── Load more ──────────────────────────────────────────────────────────── -->
{#if engine.hasMore}
	<div class="al-load-more">
		<button
			type="button"
			class="secondary-btn"
			onclick={() => engine.loadLogs(true)}
			disabled={engine.loading}
		>
			{engine.loading ? 'Loading…' : `Load ${engine.PAGE_SIZE} more events`}
		</button>
		<span class="al-load-more__hint">
			{engine.totalLoaded} events loaded so far
		</span>
	</div>
{/if}
