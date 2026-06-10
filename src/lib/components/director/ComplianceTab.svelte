<script>
	import { db } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { loadComplianceTable } from '$lib/registrar/loadComplianceRows.js';

	let { clubId = '' } = $props();

	/** @type {import('$lib/registrar/loadComplianceRows.js').RegistrarRosterRow[]} */
	let rows = $state([]);
	let loading = $state(false);
	let loadErr = $state('');

	const clubTeams = $derived(
		teamsStore.teams
			.filter((t) => t.clubId === clubId)
			.map((t) => ({ id: t.id, name: t.name })),
	);

	const load = async () => {
		if (!clubId || clubTeams.length === 0) {
			rows = [];
			return;
		}
		loading = true;
		loadErr = '';
		try {
			rows = await loadComplianceTable(clubTeams);
		} catch (e) {
			console.error('[ComplianceTab]', e);
			loadErr = e instanceof Error ? e.message : 'Could not load compliance matrix.';
			rows = [];
		} finally {
			loading = false;
		}
	};

	$effect(() => {
		if (clubId && teamsStore.loaded) void load();
	});

	/** @param {string | null} email @param {string} newStatus */
	const updateStatus = async (email, newStatus) => {
		if (!email) return;
		try {
			await updateDoc(doc(db, 'passports', email), { clearanceStatus: newStatus });
			rows = rows.map((row) =>
				row.email === email ? { ...row, clearanceStatus: newStatus } : row,
			);
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		}
	};
</script>

<div class="compliance-tab">
	<div class="card">
		<div class="card-header bg-red-header">Player compliance matrix</div>
		<div class="card-body p-0 overflow-x-auto">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>Team</th>
						<th>DOB</th>
						<th>Account</th>
						<th>Medical info</th>
						<th>Waiver</th>
						<th>Passport</th>
						<th>Official status</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr><td colspan="8" class="text-center">Loading compliance matrix…</td></tr>
					{:else if loadErr}
						<tr><td colspan="8" class="text-center">{loadErr}</td></tr>
					{:else if rows.length === 0}
						<tr><td colspan="8" class="text-center">No roster players found for your club.</td></tr>
					{:else}
						{#each rows as row (row.key)}
							<tr>
								<td>
									<b>{row.playerName}</b>
									{#if row.email}
										<br /><span class="text-sm-sub">{row.email}</span>
									{/if}
								</td>
								<td class="text-sm-sub">{row.teamLabel}</td>
								<td class="text-sm-sub">{row.dobLabel}</td>
								<td class="text-sm-sub">
									{row.guardianLinked ? 'Linked' : 'Name only'}
								</td>
								<td class="text-sm-sub">
									{#if row.emergencyName || row.emergencyPhone}
										<b>Contact:</b> {row.emergencyName || '—'} ({row.emergencyPhone || '—'})<br />
									{/if}
									<b>Notes:</b> {row.medicalNotes || 'None'}
								</td>
								<td>{row.waiverLabel}</td>
								<td>{row.passportLabel}</td>
								<td>
									{#if row.email}
										<select
											value={row.clearanceStatus || 'CLEARED'}
											onchange={(e) => updateStatus(row.email, e.currentTarget.value)}
											class="status-select"
											class:status-select--suspended={row.clearanceStatus === 'RED_CARD'}
											class:status-select--clear={row.clearanceStatus !== 'RED_CARD'}
										>
											<option value="CLEARED">Cleared</option>
											<option value="PENDING_SAFESPORT">SafeSport pending</option>
											<option value="RED_CARD">Suspended (red card)</option>
										</select>
									{:else}
										<span class="text-sm-sub">Add email to manage</span>
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

<style>
	.status-select             { margin: 0; padding: 4px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; width: auto; }
	.status-select--suspended  { color: #b91c1c; }
	.status-select--clear      { color: #047857; }
</style>
