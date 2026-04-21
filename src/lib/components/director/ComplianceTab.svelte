<script>
	import { db } from '$lib/firebase.js';
	import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

	let { clubId = '' } = $props();

	let rows = $state([]);
	let loading = $state(false);

	const load = async () => {
		if (!clubId) return;
		loading = true;
		try {
			const [passSnap, userSnap] = await Promise.all([
				getDocs(collection(db, 'passports')),
				getDocs(collection(db, 'users'))
			]);
			const clubUsers = {};
			userSnap.forEach((d) => { if (d.data().clubId === clubId) clubUsers[d.id] = d.data().playerName || d.id; });
			const data = [];
			passSnap.forEach((d) => {
				const email = d.id;
				if (!clubUsers[email]) return;
				data.push({ email, playerName: clubUsers[email], ...d.data() });
			});
			rows = data;
		} catch (e) { console.error(e); }
		finally { loading = false; }
	};

	$effect(() => { if (clubId) load(); });

	const updateStatus = async (email, newStatus) => {
		try {
			await updateDoc(doc(db, 'passports', email), { clearanceStatus: newStatus });
		} catch (e) { alert('Error: ' + e.message); }
	};
</script>

<div class="compliance-tab">
	<div class="card">
		<div class="card-header bg-red-header">🛂 Player Compliance Dashboard</div>
		<div class="card-body p-0 overflow-x-auto">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>Medical Info</th>
						<th>Waiver Signed</th>
						<th>Official Status</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="4" class="text-center">Loading passports...</td></tr>
					{:else if rows.length === 0}
						<tr><td colspan="4" class="text-center">No passports found for your club.</td></tr>
					{:else}
						{#each rows as row}
							<tr>
								<td>
									<b>{row.playerName}</b><br />
									<span class="text-sm-sub">{row.email}</span>
								</td>
								<td class="text-sm-sub">
									<b>Contact:</b> {row.emergencyName} ({row.emergencyPhone})<br />
									<b>Notes:</b> {row.medicalNotes || 'None'}
								</td>
								<td>{row.hasSignedWaiver ? '✅ Yes' : '❌ No'}</td>
								<td>
									<select
										value={row.clearanceStatus || 'CLEARED'}
										onchange={(e) => updateStatus(row.email, e.target.value)}
										class="status-select"
										class:status-select--suspended={row.clearanceStatus === 'RED_CARD'}
										class:status-select--clear={row.clearanceStatus !== 'RED_CARD'}
									>
										<option value="CLEARED">✅ CLEARED</option>
										<option value="PENDING_SAFESPORT">🟨 SAFESPORT PENDING</option>
										<option value="RED_CARD">🟥 SUSPENDED (Red Card)</option>
									</select>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.status-select             { margin: 0; padding: 4px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; width: auto; }
	.status-select--suspended  { color: #b91c1c; }
	.status-select--clear      { color: #047857; }
</style>
