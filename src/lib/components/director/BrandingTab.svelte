<script>
	import { untrack } from 'svelte';
	import { brandingStore } from '$lib/stores/branding.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

	let selectedTeamId = $state('');
	let appName = $state('');
	let logoUrl = $state('');
	let primaryColor = $state('#0f172a');
	let secondaryColor = $state('#fbbf24');
	let saving = $state(false);

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	const loadBranding = async () => {
		if (!selectedTeamId) return;
		// Access Firestore directly via brandingStore helper
		await brandingStore.loadForTeam(selectedTeamId);
		appName = brandingStore.appName;
		logoUrl = brandingStore.logoUrl;
		primaryColor = brandingStore.primaryColor;
		secondaryColor = brandingStore.secondaryColor;
	};

	$effect(() => {
		if (selectedTeamId) loadBranding();
	});

	const saveBranding = async () => {
		if (!selectedTeamId) return;
		saving = true;
		try {
			await brandingStore.saveForTeam(selectedTeamId, { appName, logoUrl, primaryColor, secondaryColor });
			alert('Branding saved!');
		} catch (e) { alert('Error: ' + e.message); }
		finally { saving = false; }
	};

	const resetBranding = async () => {
		if (!selectedTeamId || !confirm('Reset this team\'s branding to default?')) return;
		await brandingStore.resetForTeam(selectedTeamId);
		appName = 'SSTRACKER'; logoUrl = ''; primaryColor = '#0f172a'; secondaryColor = '#fbbf24';
		alert('Branding reset.');
	};
</script>

<div class="branding-tab">
	<div class="card">
		<div class="card-header">Club branding</div>
		<div class="card-body">
			<label>Select Team/Club to Edit</label>
			<select bind:value={selectedTeamId}>
				<option value="">Loading...</option>
				{#each clubTeams as t}
					<option value={t.id}>{t.name} ({t.id})</option>
				{/each}
			</select>

			<label>App Name</label>
			<input type="text" bind:value={appName} placeholder="e.g. Phoenix Hoops Tracker" />

			<label>Logo URL (PNG/JPG)</label>
			<input type="url" bind:value={logoUrl} placeholder="https://example.com/logo.png" />

			<div class="color-row">
				<div class="flex-1">
					<label>Primary Color</label>
					<input type="color" bind:value={primaryColor} class="color-picker" />
				</div>
				<div class="flex-1">
					<label>Secondary Color (Gold)</label>
					<input type="color" bind:value={secondaryColor} class="color-picker" />
				</div>
			</div>

			<button class="btn-primary w-100" onclick={saveBranding} disabled={saving}>
				{saving ? 'Saving...' : 'Save Branding'}
			</button>
			<button class="secondary-btn w-100" onclick={resetBranding}>Reset to Default</button>
		</div>
	</div>
</div>

<style>
	select, input { margin-bottom: 12px; }
	.color-row { display: flex; gap: 16px; margin-bottom: 16px; }
	.color-picker { padding: 2px; height: 44px; border-radius: 8px; cursor: pointer; }
</style>
