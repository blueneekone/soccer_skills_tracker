<script>
	import { db } from '$lib/firebase.js';
	import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
	import { safeGetDate } from '$lib/utils/dates.js';

	let logs = $state([]);
	let loading = $state(false);

	const load = async () => {
		loading = true;
		try {
			const q = query(collection(db, 'security_audit'), orderBy('timestamp', 'desc'), limit(50));
			const snap = await getDocs(q);
			logs = [];
			snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
		} catch (e) {
			console.error(e);
		} finally { loading = false; }
	};

	load();
</script>

<div class="security-tab">
	<div class="card">
		<div class="card-header bg-red-header">
			<i class="ph ph-warning"></i> Super Admin Audit Log
			<button class="action-btn text-white" onclick={load}>↻</button>
		</div>
		<div class="card-body p-0 overflow-x-auto">
			{#if loading}
				<p class="text-center p-20">Decrypting secure audit logs...</p>
			{:else if logs.length === 0}
				<p class="text-center p-20">No security events recorded yet.</p>
			{:else}
				<table class="admin-table">
					<thead><tr><th>Date</th><th>Admin Identity</th><th>Action Taken</th><th>Target Entity</th></tr></thead>
					<tbody>
						{#each logs as log}
							<tr>
								<td class="text-sm-sub">{safeGetDate(log.timestamp).toLocaleString()}</td>
								<td class="text-admin-mono">{log.admin}</td>
								<td><span class="action-badge">{log.action}</span></td>
								<td><b>{log.target}</b><br /><span class="text-sm-sub">{log.details}</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

<style>
	.action-badge {
		background: #fef2f2;
		color: #991b1b;
		padding: 4px 8px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.5px;
		border: 1px solid rgba(220, 38, 38, 0.2);
	}

	:global(html.dark) .action-badge {
		background: rgba(254, 202, 202, 0.12);
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
	}
</style>
