<script>
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase.js';
	import { signOut, getIdTokenResult } from 'firebase/auth';
	import { doc, setDoc, getDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	// Redirect logic
	$effect(() => {
		if (!authStore.isLoading) {
			if (!authStore.isAuthenticated) goto('/login', { replaceState: true });
			else if (authStore.isProfileComplete) goto('/home', { replaceState: true });
		}
	});

	// Load clubs/teams for dropdowns
	$effect(() => {
		if (authStore.isAuthenticated && !teamsStore.loaded) {
			teamsStore.load(authStore.role);
		}
	});

	let selectedClubId = $state('');
	let selectedTeamId = $state('');
	let selectedPlayerName = $state('');
	let manualPlayerName = $state('');
	let showManualEntry = $state(false);
	let rosterPlayers = $state([]);
	let rosterLoading = $state(false);
	let errorMsg = $state('');
	let saving = $state(false);

	const filteredTeams = $derived(
		selectedClubId ? teamsStore.teams.filter((t) => t.clubId === selectedClubId) : []
	);

	async function onTeamChange() {
		selectedPlayerName = '';
		showManualEntry = false;
		rosterPlayers = [];
		if (!selectedTeamId) return;
		rosterLoading = true;
		try {
			const snap = await getDoc(doc(db, 'rosters', selectedTeamId));
			rosterPlayers = snap.exists() && snap.data().players ? [...snap.data().players].sort() : [];
		} catch (e) {
			console.error(e);
		} finally {
			rosterLoading = false;
		}
	}

	function onPlayerChange() {
		showManualEntry = selectedPlayerName === 'manual';
	}

	async function completeSetup() {
		const finalName = selectedPlayerName === 'manual' ? manualPlayerName.trim() : selectedPlayerName;
		if (!selectedClubId || !selectedTeamId || !finalName) {
			return (errorMsg = 'Please select a club, team, and player name.');
		}
		saving = true;
		errorMsg = '';
		try {
			const userEmail = auth.currentUser.email.toLowerCase();
			const userRef = doc(db, 'users', userEmail);
			const tokenResult = await getIdTokenResult(auth.currentUser, true);
			const claimRole = tokenResult.claims.role || 'player';

			const profileData = {
				clubId: selectedClubId,
				teamId: selectedTeamId,
				playerName: finalName,
				joinedAt: new Date(),
				privacyProfile: 'strict_minor_defaults',
				telemetryOptIn: false,
				biometricOrVideoConsentAt: null,
				consentPolicyVersion: '2026-04'
			};

			await setDoc(userRef, profileData, { merge: true });
			await authStore.refresh({ silent: true });
			goto('/home', { replaceState: true });
		} catch (err) {
			errorMsg = 'Error saving profile: ' + err.message;
			saving = false;
		}
	}

	async function handleLogout() {
		await signOut(auth);
		goto('/login', { replaceState: true });
	}
</script>

<div class="full-screen-center setup-theme">
	<div class="auth-card">
		<div class="logo-circle">⚽</div>
		<h2 class="auth-title">Complete Profile</h2>
		<p class="auth-subtitle">Link your account to your organization.</p>

		<label>Select Your Club / Organization</label>
		<select bind:value={selectedClubId} onchange={() => { selectedTeamId = ''; selectedPlayerName = ''; rosterPlayers = []; }}>
			<option value="">Select your club...</option>
			{#each teamsStore.clubs as club}
				<option value={club.id}>{club.name || club.id}</option>
			{/each}
		</select>

		<label>Select Your Team</label>
		<select bind:value={selectedTeamId} disabled={!selectedClubId} onchange={onTeamChange}>
			<option value="">Select a club first...</option>
			{#each filteredTeams as team}
				<option value={team.id}>{team.name || team.id}</option>
			{/each}
		</select>

		<label>Select Player Name</label>
		<select bind:value={selectedPlayerName} disabled={!selectedTeamId || rosterLoading} onchange={onPlayerChange}>
			{#if rosterLoading}
				<option value="">Loading players...</option>
			{:else}
				<option value="">Select your name...</option>
				{#each rosterPlayers as p}
					<option value={p}>{p}</option>
				{/each}
				{#if rosterPlayers.length > 0}
					<option value="manual">My name isn't listed (manual entry)</option>
				{/if}
			{/if}
		</select>

		{#if showManualEntry}
			<div class="manual-entry">
				<label>Type Player Name</label>
				<input type="text" placeholder="First and Last Name" bind:value={manualPlayerName} />
				<p class="setup-helper-text">Your coach will need to approve this entry before your XP counts toward the team leaderboard.</p>
			</div>
		{/if}

		{#if errorMsg}
			<div class="auth-error-msg" role="alert">{errorMsg}</div>
		{/if}

		<button class="primary-btn btn-orange w-100" onclick={completeSetup} disabled={saving}>
			{saving ? 'Saving Profile...' : 'Complete Setup'}
		</button>
		<button class="secondary-btn w-100" onclick={handleLogout}>Cancel &amp; Logout</button>
	</div>
</div>

<style>
	select, input {
		margin-bottom: 12px;
	}
	.manual-entry {
		margin-bottom: 12px;
	}
</style>
