<script lang="ts">
	import Papa from 'papaparse';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { browser } from '$app/environment';

	type ExportColumn = {
		key: string;
		label: string;
	};

	let {
		data = [],
		columns = [],
		filename = 'export',
	} = $props<{
		data: any[];
		columns: ExportColumn[];
		filename?: string;
	}>();

	function getMappedData() {
		if (columns.length === 0) return data;
		return data.map((row) => {
			const newRow: Record<string, unknown> = {};
			for (const col of columns) {
				newRow[col.label] = (row as Record<string, unknown>)[col.key];
			}
			return newRow;
		});
	}

	function triggerDownload(content: string, type: string, ext: string) {
		if (!browser) return;
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${filename}.${ext}`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function exportCsv() {
		const mapped = getMappedData();
		const csv = Papa.unparse(mapped);
		triggerDownload(csv, 'text/csv;charset=utf-8', 'csv');
	}

	function exportJson() {
		const mapped = getMappedData();
		const json = JSON.stringify(mapped, null, 2);
		triggerDownload(json, 'application/json;charset=utf-8', 'json');
	}

	function exportPdf() {
		if (!browser) return;
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		const mapped = getMappedData();
		const headerLabels = columns.length > 0 ? columns.map((c) => c.label) : Object.keys(mapped[0] || {});

		const theadHtml = headerLabels.map((lbl) => `<th>${lbl}</th>`).join('');
		const tbodyHtml = mapped
			.map(
				(row) =>
					`<tr>${headerLabels
						.map((lbl) => `<td>${row[lbl] !== undefined && row[lbl] !== null ? String(row[lbl]) : ''}</td>`)
						.join('')}</tr>`,
			)
			.join('');

		const html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>${filename}</title>
				<style>
					body {
						font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Consolas, monospace;
						padding: 20px;
						color: #0f172a;
						font-size: 11px;
					}
					h2 {
						font-family: 'Switzer', sans-serif;
						font-size: 16px;
						text-transform: uppercase;
						letter-spacing: 0.05em;
						margin-bottom: 10px;
					}
					table {
						width: 100%;
						border-collapse: collapse;
					}
					th, td {
						border-bottom: 1px solid #cbd5e1;
						padding: 6px 8px;
						text-align: left;
					}
					th {
						background-color: #f8fafc;
						font-weight: 700;
						color: #475569;
						text-transform: uppercase;
						letter-spacing: 0.05em;
						font-size: 10px;
					}
					@media print {
						body { padding: 0; }
					}
				</style>
			</head>
			<body>
				<h2>${filename}</h2>
				<table>
					<thead><tr>${theadHtml}</tr></thead>
					<tbody>${tbodyHtml}</tbody>
				</table>
				<script>
					window.onload = function() {
						setTimeout(() => {
							window.print();
							window.close();
						}, 250);
					};
				<\/script>
			</body>
			</html>
		`;

		printWindow.document.write(html);
		printWindow.document.close();
	}
</script>

<div class="ue-hub">
	<span class="ue-label">Export:</span>
	<div class="ue-actions">
		<button class="ue-btn" onclick={exportCsv} aria-label="Export to CSV" title="Export to CSV">
			<Icon name={"action.database" as IconName} size={14} /> CSV
		</button>
		<button class="ue-btn" onclick={exportJson} aria-label="Export to JSON" title="Export to JSON">
			<Icon name={"action.database" as IconName} size={14} /> JSON
		</button>
		<button class="ue-btn" onclick={exportPdf} aria-label="Export to PDF" title="Export to PDF">
			<Icon name={"action.download" as IconName} size={14} /> PDF
		</button>
	</div>
</div>

<style>
	.ue-hub {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: #0b0f19;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 4px 8px;
		border-radius: 6px;
	}

	.ue-label {
		font-family: 'Switzer', sans-serif;
		font-size: 0.75rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.ue-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.ue-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #e2e8f0;
		border-radius: 4px;
		padding: 4px 8px;
		font-family: 'Geist Mono', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.ue-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.ue-btn:active {
		background: rgba(255, 255, 255, 0.12);
	}
</style>
