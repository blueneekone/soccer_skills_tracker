<script>
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { doc, updateDoc, getDoc } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { loadComplianceTable } from '$lib/registrar/loadComplianceRows.js';
	import ClubEligibilityMatrixPanel from '$lib/components/director/ClubEligibilityMatrixPanel.svelte';
	import {
		normalizeEligibilityMatrix,
		blockerLabel,
	} from '$lib/director/evaluateClubEligibility.js';

	let { clubId = '' } = $props();

	/** @type {import('$lib/registrar/loadComplianceRows.js').RegistrarRosterRow[]} */
	let rows = $state([]);
	let loading = $state(false);
	let loadErr = $state('');

	/** @type {Record<string, boolean>} */
	let matrix = $state(normalizeEligibilityMatrix(null));

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
			const clubSnap = await getDoc(doc(db, 'clubs', clubId));
			matrix = normalizeEligibilityMatrix(clubSnap.data()?.eligibilityMatrix);
			rows = await loadComplianceTable(clubTeams, matrix);
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
			await load();
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		}
	};
	</script>

<div class="compliance-tab">
	<ClubEligibilityMatrixPanel {clubId} onSaved={() => void load()} />

	<h2 class="tw-text-sm tw-font-semibold tw-uppercase tw-tracking-wider tw-text-[#A1A1AA] tw-mb-[clamp(8px,1vw,12px)]">Player compliance matrix</h2>
	<div class="v-table-wrap tw-overflow-x-auto">
		<table class="v-table">
			<thead>
				<tr>
					<th class="v-th">Player</th>
					<th class="v-th">Team</th>
					<th class="v-th">DOB</th>
					<th class="v-th">Account</th>
					<th class="v-th">Medical info</th>
					<th class="v-th">Waiver</th>
					<th class="v-th">Passport</th>
					<th class="v-th">Eligible</th>
					<th class="v-th">Official status</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr><td colspan="9" class="v-td-empty">Loading compliance matrix…</td></tr>
				{:else if loadErr}
					<tr><td colspan="9" class="v-td-empty">{loadErr}</td></tr>
				{:else if rows.length === 0}
					<tr><td colspan="9" class="v-td-empty">No roster players found for your club.</td></tr>
				{:else}
					{#each rows as row (row.key)}
						<tr class="v-tr">
							<td class="v-td">
								<b class="tw-text-[#FAFAFA]">{row.playerName}</b>
								{#if row.email}
									<br /><span class="tw-text-xs tw-text-[#A1A1AA] tw-font-mono">{row.email}</span>
								{/if}
							</td>
							<td class="v-td">{row.teamLabel}</td>
							<td class="v-td tw-font-mono">{row.dobLabel}</td>
							<td class="v-td">
								{row.guardianLinked ? 'Linked' : 'Name only'}
							</td>
							<td class="v-td">
								{#if row.emergencyName || row.emergencyPhone}
									<b>Contact:</b> {row.emergencyName || '—'} ({row.emergencyPhone || '—'})<br />
								{/if}
								<b>Notes:</b> {row.medicalNotes || 'None'}
							</td>
							<td class="v-td">{row.waiverLabel}</td>
							<td class="v-td">{row.passportLabel}</td>
							<td class="v-td">
								{#if row.eligible === true}
									<span class="eligible-yes">Eligible</span>
								{:else if row.eligible === false}
									<span class="eligible-no">Blocked</span>
									{#if row.blockers?.length}
										<br />
										<span class="blocker-list">
											{row.blockers.map((b) => blockerLabel(b)).join(' · ')}
										</span>
									{/if}
								{:else}
									—
								{/if}
							</td>
							<td class="v-td">
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
									<span class="tw-text-xs tw-text-[#A1A1AA]">Add email to manage</span>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.status-select             { margin: 0; padding: 4px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; width: auto; }
	.status-select--suspended  { color: #b91c1c; }
	.status-select--clear      { color: #047857; }
	.eligible-yes { color: #047857; font-weight: 700; }
	.eligible-no { color: #b91c1c; font-weight: 700; }
	.blocker-list { font-size: 0.75rem; color: #64748b; }
</style>

