<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export type VampireSchemaField = {
		id: string;
		label: string;
		required?: boolean;
	};

	export const VAMPIRE_SCHEMA: VampireSchemaField[] = [
		{ id: 'email', label: 'Player Email', required: true },
		{ id: 'displayName', label: 'Player Name', required: true },
		{ id: 'position', label: 'Position' },
		{ id: 'dateOfBirth', label: 'Date of Birth' },
		{ id: 'jerseyNumber', label: 'Jersey Number' },
	];

	let {
		headers = [] as string[],
		previewRows = [] as Record<string, string>[],
		onsubmit,
		oncancel,
	} = $props<{
		headers: string[];
		previewRows: Record<string, string>[];
		onsubmit: (mapping: Record<string, string>) => void;
		oncancel: () => void;
	}>();

	// mapping: Record<targetFieldId, sourceCsvHeader>
	let mapping = $state<Record<string, string>>({});

	// Auto-map based on common heuristics on mount
	$effect(() => {
		const newMapping: Record<string, string> = {};
		for (const h of headers) {
			const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
			if (norm.includes('email')) newMapping['email'] = h;
			else if (norm.includes('name') || norm.includes('firstlast')) newMapping['displayName'] = h;
			else if (norm === 'pos' || norm.includes('position')) newMapping['position'] = h;
			else if (norm.includes('dob') || norm.includes('birth')) newMapping['dateOfBirth'] = h;
			else if (norm.includes('jersey') || norm.includes('number')) newMapping['jerseyNumber'] = h;
		}
		untrack(() => {
			mapping = { ...newMapping };
		});
	});

	let errorMsg = $state('');

	function handleConfirm() {
		errorMsg = '';
		for (const f of VAMPIRE_SCHEMA) {
			if (f.required && !mapping[f.id]) {
				errorMsg = `Missing required mapping: ${f.label}`;
				return;
			}
		}
		onsubmit(mapping);
	}
</script>

<div class="vm-container">
	<header class="vm-head">
		<h4 class="vm-title">
			<Icon name={"action.database" as IconName} />
			Vampire Engine: Column Mapping
		</h4>
		<p class="vm-sub">Map incoming CSV columns to the system schema to proceed.</p>
	</header>

	<div class="vm-body">
		<table class="vm-table">
			<thead>
				<tr>
					<th>System Field</th>
					<th>Incoming CSV Column</th>
					<th>Preview (Row 1)</th>
				</tr>
			</thead>
			<tbody>
				{#each VAMPIRE_SCHEMA as field}
					<tr>
						<td class="vm-cell-sys">
							{field.label}
							{#if field.required}<span class="vm-req">*</span>{/if}
						</td>
						<td class="vm-cell-map">
							<select class="vm-select" bind:value={mapping[field.id]}>
								<option value="">-- Ignore --</option>
								{#each headers as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</td>
						<td class="vm-cell-preview">
							{#if mapping[field.id] && previewRows.length > 0}
								<span class="vm-preview-val">{previewRows[0][mapping[field.id]] || '—'}</span>
							{:else}
								<span class="vm-muted">—</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<footer class="vm-footer">
		{#if errorMsg}
			<p class="vm-error">{errorMsg}</p>
		{/if}
		<div class="vm-actions">
			<button class="vm-btn vm-btn--cancel" onclick={oncancel}>Cancel</button>
			<button class="vm-btn vm-btn--confirm" onclick={handleConfirm}>Ingest Mapped Data</button>
		</div>
	</footer>
</div>

<style>
	.vm-container {
		background: #0b0f19;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: 'Switzer', sans-serif;
	}

	.vm-head {
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.02);
	}

	.vm-title {
		margin: 0;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.vm-sub {
		margin: 4px 0 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.vm-body {
		overflow-x: auto;
	}

	.vm-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.8rem;
	}

	.vm-table th {
		padding: 0.75rem 1rem;
		color: #64748b;
		font-family: 'Geist Mono', monospace;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.vm-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: #e2e8f0;
	}

	.vm-cell-sys {
		font-weight: 600;
	}

	.vm-req {
		color: #f87171;
		margin-left: 4px;
	}

	.vm-select {
		background: #1e293b;
		color: #f1f5f9;
		border: 1px solid #334155;
		border-radius: 4px;
		padding: 4px 8px;
		font-family: 'Geist Mono', monospace;
		font-size: 0.75rem;
		width: 100%;
		max-width: 250px;
	}

	.vm-preview-val {
		font-family: 'Geist Mono', monospace;
		font-size: 0.75rem;
		color: #10b981;
	}

	.vm-muted {
		color: #475569;
	}

	.vm-footer {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.02);
	}

	.vm-actions {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	.vm-btn {
		border: none;
		border-radius: 4px;
		padding: 6px 12px;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		font-family: 'Geist Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.vm-btn--cancel {
		background: transparent;
		color: #94a3b8;
		border: 1px solid #334155;
	}

	.vm-btn--cancel:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.vm-btn--confirm {
		background: #d97706;
		color: #fff;
	}

	.vm-btn--confirm:hover {
		background: #b45309;
	}

	.vm-error {
		margin: 0;
		color: #f87171;
		font-size: 0.75rem;
		font-weight: 600;
	}
</style>
