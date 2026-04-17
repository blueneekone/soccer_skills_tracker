<script>
	import { db } from '$lib/firebase.js';
	import { collection, getDocs } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import TabBar from '$lib/components/TabBar.svelte';
	import AccountsTab from '$lib/components/admin/AccountsTab.svelte';
	import SecurityTab from '$lib/components/admin/SecurityTab.svelte';

	const TABS = [
		{ id: 'overview', label: 'Overview', icon: 'ph-chart-line' },
		{ id: 'sports', label: 'Sports Modules', icon: 'ph-trophy' },
		{ id: 'accounts', label: 'Accounts', icon: 'ph-users-three' },
		{ id: 'billing', label: 'Licensing', icon: 'ph-credit-card' },
		{ id: 'security', label: 'Security', icon: 'ph-shield-check' }
	];

	let activeTab = $state('overview');

	// Stats
	let playerCount = $state(0);
	let clubCount = $derived(teamsStore.clubs.length);
	let licenseCount = $state(0);

	$effect(() => {
		if (!teamsStore.loaded) return;
		getDocs(collection(db, 'users')).then((s) => { playerCount = s.size; }).catch(() => {});
		getDocs(collection(db, 'config')).then((s) => {
			let c = 0;
			s.forEach((d) => { if (d.id.startsWith('license_')) c++; });
			licenseCount = c;
		}).catch(() => {});
	});
</script>

<div class="view-section">
	<div class="admin-sticky-header">
		<h2 class="admin-header"><i class="ph ph-terminal-window"></i> Command Center</h2>
		<TabBar tabs={TABS} bind:activeTab variant="admin" />
	</div>

	{#if activeTab === 'overview'}
		<div class="stats-grid">
			<div class="stat-card">
				<h3>Total Athletes</h3>
				<p>{playerCount}</p>
			</div>
			<div class="stat-card">
				<h3>Active Organizations</h3>
				<p>{clubCount}</p>
			</div>
			<div class="stat-card stat-card-gold">
				<h3>Active Licenses</h3>
				<p>{licenseCount}</p>
			</div>
		</div>

	{:else if activeTab === 'sports'}
		<div class="card">
			<div class="card-header">Provision New Sport Module</div>
			<div class="card-body">
				<div class="admin-input-row">
					<input type="text" placeholder="e.g., Volleyball" class="flex-1 m-0" />
					<button class="primary-btn btn-blue">Initialize Schema</button>
				</div>
				<p class="text-sm-sub">Sport module provisioning coming in Epic 3.</p>
			</div>
		</div>

	{:else if activeTab === 'accounts'}
		<AccountsTab />

	{:else if activeTab === 'billing'}
		<div class="card border-gold">
			<div class="card-header bg-gold-header"><i class="ph ph-credit-card"></i> License Generator</div>
			<div class="card-body">
				<label>Target Organization</label>
				<select>
					<option value="">Loading...</option>
					{#each teamsStore.clubs as cl}<option value={cl.id}>{cl.name}</option>{/each}
				</select>
				<div class="input-row">
					<div class="flex-1">
						<label>License Type</label>
						<select>
							<option value="subscription">Monthly Subscription</option>
							<option value="trial">Free Trial</option>
						</select>
					</div>
					<div class="flex-1">
						<label>Seat Limit</label>
						<input type="number" value="10" />
					</div>
				</div>
				<button class="primary-btn btn-gold w-100">Generate &amp; Sync License</button>
			</div>
		</div>

	{:else if activeTab === 'security'}
		<SecurityTab />
	{/if}
</div>

<style>
	.tab-content { margin-top: clamp(12px, 2vw, 20px); }
	select, input { margin-bottom: 10px; }
</style>
