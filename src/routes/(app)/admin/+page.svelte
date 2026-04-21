<script>
	import { page } from '$app/state';
	import { db, functions } from '$lib/firebase.js';
	import { collection, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import AccountsTab from '$lib/components/admin/AccountsTab.svelte';
	import SecurityTab from '$lib/components/admin/SecurityTab.svelte';

	const generateLicenseFn = httpsCallable(functions, 'generateLicense');
	const createSportModuleFn = httpsCallable(functions, 'createSportModule');

	const activeTab = $derived(page.url.searchParams.get('tab') || 'overview');

	let playerCount = $state(0);
	let clubCount = $derived(teamsStore.clubs.length);
	let licenseCount = $state(0);

	/** @param {unknown} e */
	function formatCallableError(e) {
		if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
			return e.message;
		}
		if (e instanceof Error) return e.message;
		return 'Something went wrong. Check the browser console and Cloud Functions logs.';
	}

	async function refreshOverviewCounts() {
		try {
			const [usersSnap, licensesSnap] = await Promise.all([
				getDocs(collection(db, 'users')),
				getDocs(collection(db, 'licenses'))
			]);
			playerCount = usersSnap.size;
			licenseCount = licensesSnap.size;
		} catch (err) {
			console.error('[admin] refreshOverviewCounts', err);
		}
	}

	$effect(() => {
		if (!teamsStore.loaded) return;
		refreshOverviewCounts();
	});

	// —— Licensing tab
	let licenseClubId = $state('');
	let licenseType = $state('subscription');
	let licenseMaxSeats = $state(10);
	let licenseDurationMonths = $state(12);
	let licenseBusy = $state(false);
	let licenseError = $state('');
	let licenseSuccess = $state('');

	async function onGenerateLicense() {
		licenseError = '';
		licenseSuccess = '';
		licenseBusy = true;
		try {
			const res = await generateLicenseFn({
				clubId: licenseClubId || '',
				licenseType,
				maxSeats: Number(licenseMaxSeats) || 10,
				durationMonths: Number(licenseDurationMonths) || 12
			});
			const data = /** @type {{ ok?: boolean, licenseKey?: string }} */ (res.data);
			if (data?.ok && data.licenseKey) {
				licenseSuccess = `License created: ${data.licenseKey}`;
				licenseClubId = '';
				licenseType = 'subscription';
				licenseMaxSeats = 10;
				licenseDurationMonths = 12;
				await refreshOverviewCounts();
			} else {
				licenseError = 'Server did not return a license key.';
			}
		} catch (e) {
			console.error('[admin] generateLicense', e);
			licenseError = formatCallableError(e);
		} finally {
			licenseBusy = false;
		}
	}

	// —— Sports module tab
	let sportName = $state('');
	let sportDefaultIcon = $state('ph-soccer-ball');
	let sportCourtType = $state('');
	let sportBusy = $state(false);
	let sportError = $state('');
	let sportSuccess = $state('');

	async function onCreateSportModule() {
		sportError = '';
		sportSuccess = '';
		sportBusy = true;
		try {
			const res = await createSportModuleFn({
				sportName: sportName.trim(),
				defaultIcon: sportDefaultIcon.trim() || 'ph-soccer-ball',
				courtType: sportCourtType.trim()
			});
			const data = /** @type {{ ok?: boolean, sportId?: string }} */ (res.data);
			if (data?.ok && data.sportId) {
				sportSuccess = `Sport module created (id: ${data.sportId}).`;
				sportName = '';
				sportDefaultIcon = 'ph-soccer-ball';
				sportCourtType = '';
			} else {
				sportError = 'Server did not confirm creation.';
			}
		} catch (e) {
			console.error('[admin] createSportModule', e);
			sportError = formatCallableError(e);
		} finally {
			sportBusy = false;
		}
	}
</script>

<div class="admin-console-page">
	<h2 class="admin-console-page__title"><i class="ph ph-terminal-window"></i> Command Center</h2>

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
				{#if sportError}
					<p class="admin-action-flash admin-action-flash--err" role="alert">{sportError}</p>
				{/if}
				{#if sportSuccess}
					<p class="admin-action-flash admin-action-flash--ok">{sportSuccess}</p>
				{/if}
				<label for="sportName">Sport name</label>
				<input
					id="sportName"
					type="text"
					placeholder="e.g., Volleyball"
					class="flex-1 m-0"
					bind:value={sportName}
					disabled={sportBusy}
				/>
				<label for="sportDefaultIcon">Default icon (Phosphor class)</label>
				<input
					id="sportDefaultIcon"
					type="text"
					placeholder="ph-volleyball"
					class="m-0"
					bind:value={sportDefaultIcon}
					disabled={sportBusy}
				/>
				<label for="sportCourtType">Court type key (optional)</label>
				<input
					id="sportCourtType"
					type="text"
					placeholder="volleyball — auto from name if empty"
					class="m-0"
					bind:value={sportCourtType}
					disabled={sportBusy}
				/>
				<button
					type="button"
					class="primary-btn btn-blue"
					disabled={sportBusy || !sportName.trim()}
					onclick={onCreateSportModule}
				>
					{sportBusy ? 'Creating…' : 'Create sport module'}
				</button>
				<p class="text-sm-sub">Creates a document in Firestore collection <code>sports</code> via secure Cloud Function (super admin only).</p>
			</div>
		</div>

	{:else if activeTab === 'accounts'}
		<AccountsTab />

	{:else if activeTab === 'billing'}
		<div class="card border-gold">
			<div class="card-header bg-gold-header"><i class="ph ph-credit-card"></i> License Generator</div>
			<div class="card-body">
				{#if licenseError}
					<p class="admin-action-flash admin-action-flash--err" role="alert">{licenseError}</p>
				{/if}
				{#if licenseSuccess}
					<p class="admin-action-flash admin-action-flash--ok">{licenseSuccess}</p>
				{/if}
				<label for="licenseClubId">Target organization (club)</label>
				<select id="licenseClubId" bind:value={licenseClubId} disabled={licenseBusy}>
					<option value="">— Optional —</option>
					{#each teamsStore.clubs as cl}
						<option value={cl.id}>{cl.name}</option>
					{/each}
				</select>
				<div class="input-row">
					<div class="flex-1">
						<label for="licenseType">License type</label>
						<select id="licenseType" bind:value={licenseType} disabled={licenseBusy}>
							<option value="subscription">Monthly subscription</option>
							<option value="trial">Free trial</option>
						</select>
					</div>
					<div class="flex-1">
						<label for="licenseMaxSeats">Seat limit</label>
						<input
							id="licenseMaxSeats"
							type="number"
							min="1"
							bind:value={licenseMaxSeats}
							disabled={licenseBusy}
						/>
					</div>
				</div>
				<label for="licenseDurationMonths">Duration (months)</label>
				<input
					id="licenseDurationMonths"
					type="number"
					min="1"
					max="120"
					bind:value={licenseDurationMonths}
					disabled={licenseBusy}
				/>
				<button
					type="button"
					class="primary-btn btn-gold w-100"
					disabled={licenseBusy}
					onclick={onGenerateLicense}
				>
					{licenseBusy ? 'Generating…' : 'Generate license'}
				</button>
				<p class="text-sm-sub">Writes to <code>licenses</code> via <code>generateLicense</code> (no direct client writes).</p>
			</div>
		</div>

	{:else if activeTab === 'security'}
		<SecurityTab />
	{/if}
</div>

<style>
	.admin-console-page__title {
		margin: 0 0 16px;
		font-size: 1.125rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
		letter-spacing: -0.03em;
	}

	select,
	input {
		margin-bottom: 10px;
	}

	.admin-action-flash {
		margin: 0 0 12px;
		padding: 12px 14px;
		border-radius: 12px;
		font-weight: 700;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.admin-action-flash--ok {
		background: rgba(4, 120, 87, 0.12);
		color: var(--success-green, #047857);
		border: 1px solid rgba(4, 120, 87, 0.35);
	}

	.admin-action-flash--err {
		background: rgba(185, 28, 28, 0.1);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.35);
	}

	:global(html.dark) .admin-action-flash--ok {
		color: #a7f3d0;
		border-color: rgba(52, 211, 153, 0.4);
		background: rgba(52, 211, 153, 0.1);
	}

	:global(html.dark) .admin-action-flash--err {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
		background: rgba(127, 29, 29, 0.25);
	}
</style>
