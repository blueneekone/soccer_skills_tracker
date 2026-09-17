<script lang="ts">
	import type { FacilityMapVaultEngine } from './FacilityMapVaultEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { Timestamp } from 'firebase/firestore';

	let { engine } = $props<{ engine: FacilityMapVaultEngine }>();

	function fmtTime(t: Timestamp | undefined) {
		if (!t?.toDate) return '—';
		try {
			return t.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

<div class="fm-panel fm-panel--vault-wide" aria-labelledby="fm-vault-h">
	<h4 id="fm-vault-h" class="fm-panel__title">Asset vault & registry</h4>
	<p class="fm-panel__hint fm-panel__hint--vault">
		Upload static PDFs/images from field operations, or manage logistics-only facilities for routing and lightning defense.
	</p>
	<div class="fm-table-wrap fm-table-wrap--vault">
		<table class="fm-table" aria-label="Facility vault documents">
			<thead>
				<tr>
					<th scope="col">Name</th>
					<th scope="col">Address</th>
					<th scope="col">Status</th>
					<th scope="col">Type</th>
					<th scope="col">Uploaded</th>
					<th scope="col">ID</th>
					{#if engine.canManage}
						<th scope="col" class="fm-table-actions-col">Actions</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each engine.rows as r (r.id)}
					<tr>
						<td>
							{#if r.routingUrl}
								<Icon name={"geo.pin" as IconName} size={14} class="tw-mr-1 tw-inline tw-text-emerald-500 tw-align-text-bottom" />
							{/if}
							{r.name}
						</td>
						<td>{r.address || '—'}</td>
						<td>
							{#if r.status === 'LOCKED'}
								<span class="fm-badge-status fm-badge-status--legacy-locked" aria-label="Locked by legacy app">
									LOCKED (Legacy)
								</span>
							{:else if r.status === 'Locked'}
								<span class="fm-badge-status fm-badge-status--locked" aria-label="Locked due to weather or maintenance">
									Locked
								</span>
							{:else}
								<span class="fm-badge-status fm-badge-status--active">Active</span>
							{/if}
						</td>
						<td>
							{#if r.type === 'pdf'}
								<span class="fm-badge">PDF Map</span>
							{:else if r.type === 'image'}
								<span class="fm-badge">Img Map</span>
							{:else}
								<span class="fm-badge fm-badge--logistics">Logistics Only</span>
							{/if}
						</td>
						<td class="tw-tabular-nums">{fmtTime(r.uploadedAt)}</td>
						<td class="fm-table-id-cell tw-tabular-nums">
							{r.id}
							{#if r.lockReason}
								<p class="tw-mt-1 tw-text-[10px] tw-text-amber-500 tw-leading-tight">
									{r.lockReason}
								</p>
							{/if}
						</td>
						{#if engine.canManage}
							<td class="fm-table-actions-col">
								<div class="fm-table-actions">
									<button
										type="button"
										class="fm-btn fm-btn--sm"
										onclick={() => engine.openPreview(r)}
									>
										Preview & Logistics
									</button>
									<button
										type="button"
										class="fm-btn fm-btn--sm fm-btn--secondary"
										onclick={() => engine.openFacilityEditModal(r)}
									>
										Edit
									</button>
									<button
										type="button"
										class="fm-btn fm-btn--sm fm-btn--danger"
										onclick={() => void engine.deleteFacility(r)}
										aria-label="Delete {r.name}"
									>
										<Icon name={"sys.trash" as IconName} size={14} />
									</button>
								</div>
							</td>
						{/if}
					</tr>
				{/each}
				{#if engine.rows.length === 0}
					<tr>
						<td colspan={engine.canManage ? 7 : 6} class="fm-table-empty">
							No facilities registered. Add one below.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
.fm-table-wrap {
		width: 100%;
		overflow-x: auto;
		border: 1px solid #334155;
		border-radius: 4px;
		background: #1e293b;
	}

.fm-table-wrap--vault {
		width: 100%;
		max-width: none;
	}

.fm-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-switzer);
		font-size: 0.9rem;
		text-align: left;
		min-width: 800px;
	}

.fm-table th,
	.fm-table td {
		padding: 12px 16px;
		border-bottom: 1px solid #334155;
		color: #e2e8f0;
	}

.fm-table th {
		background: #0f172a;
		font-weight: 600;
		color: #94a3b8;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

.fm-table tr:last-child td {
		border-bottom: none;
	}

.fm-table tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

.fm-table-empty {
		text-align: center;
		padding: 32px 16px;
		color: #64748b;
		font-style: italic;
	}

.fm-table-id-cell {
		font-size: 0.8rem;
		color: #64748b;
	}

.fm-table-actions-col {
		width: 11rem;
		text-align: right;
	}

.fm-table-actions {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: flex-end;
		align-items: center;
	}

.fm-badge {
		display: inline-block;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}

.fm-badge--logistics {
		background: rgba(148, 163, 184, 0.1);
		color: #94a3b8;
		border-color: rgba(148, 163, 184, 0.3);
	}

.fm-badge-status {
		display: inline-block;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

.fm-badge-status--active {
		background: rgba(20, 184, 166, 0.15);
		color: #2dd4bf;
		border: 1px solid rgba(20, 184, 166, 0.3);
	}

.fm-badge-status--locked {
		background: rgba(245, 158, 11, 0.15);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

.fm-badge-status--legacy-locked {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

</style>
