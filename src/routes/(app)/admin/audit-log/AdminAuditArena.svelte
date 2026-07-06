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
<div class="v-table-wrap tw-overflow-x-auto">
	<table class="v-table">
		<thead>
			<tr>
				<th class="v-th">Timestamp</th>
				<th class="v-th">Admin Identity</th>
				<th class="v-th">Action</th>
				<th class="v-th">Target / Details</th>
			</tr>
		</thead>
		<tbody>
			{#if engine.loading && engine.logs.length === 0}
				<tr>
					<td colspan="4" class="v-td-empty">
						Decrypting secure audit logs…
					</td>
				</tr>
			{:else if engine.filteredLogs.length === 0}
				<tr>
					<td colspan="4">
						<div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-[clamp(32px,4vw,64px)]">
							<div class="tw-text-[#A1A1AA] tw-opacity-80 tw-mb-4" aria-hidden="true">
								<Icon name={'status.warning-circle' as IconName} />
							</div>
							<p class="tw-font-sans tw-tracking-tight tw-text-[#A1A1AA] tw-text-sm">
								{engine.logs.length === 0 ? 'No security events recorded yet.' : 'No events match your filter.'}
							</p>
						</div>
					</td>
				</tr>
			{:else}
				{#each engine.filteredLogs as log (log.id)}
					<tr class="v-tr">
						<td class="v-td tw-font-mono tw-whitespace-nowrap">
							{engine.rowTimestamp(log)}
						</td>
						<td class="v-td tw-font-mono">{log.admin || '—'}</td>
						<td class="v-td">
							<span class="al-badge {engine.actionSeverityClass(log.action)}">
								{log.action || '—'}
							</span>
						</td>
						<td class="v-td">
							<strong class="tw-text-[#FAFAFA]">{log.target || '—'}</strong>
							{#if log.details}
								<span class="tw-block tw-text-xs tw-text-[#A1A1AA] tw-mt-0.5">{log.details}</span>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<!-- ── Load more ──────────────────────────────────────────────────────────── -->
{#if engine.hasMore}
	<div class="tw-flex tw-items-center tw-gap-[clamp(8px,1vw,16px)] tw-mt-[clamp(8px,1vw,16px)]">
		<button
			type="button"
			class="v-toolbar-btn"
			onclick={() => engine.loadLogs(true)}
			disabled={engine.loading}
		>
			{engine.loading ? 'Loading…' : `Load ${engine.PAGE_SIZE} more events`}
		</button>
		<span class="tw-text-xs tw-text-[#A1A1AA] tw-font-mono">
			{engine.totalLoaded} events loaded so far
		</span>
	</div>
{/if}

