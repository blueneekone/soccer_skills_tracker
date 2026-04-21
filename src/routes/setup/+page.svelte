<script>
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { signOut } from 'firebase/auth';
	import { doc, setDoc, getDoc } from 'firebase/firestore';
	import { getIdTokenResult } from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	const listTeamsForClub = httpsCallable(functions, 'listTeamsForClub');
	const playerSelfReportDobFn = httpsCallable(functions, 'playerSelfReportDob');

	// Redirect logic — super admins (JWT `isSuperAdmin` or role) skip profile completion
	$effect(() => {
		if (authStore.isLoading) return;

		if (!authStore.isAuthenticated) {
			goto('/login', { replaceState: true });
			return;
		}

		void (async () => {
			const u = auth.currentUser;
			if (!u) return;
			try {
				const tr = await getIdTokenResult(u, false);
				const isSuper =
					tr.claims.isSuperAdmin === true || tr.claims.role === 'super_admin';
				if (isSuper) {
					await authStore.refresh({ silent: true });
					goto('/admin', { replaceState: true });
					return;
				}
			} catch (e) {
				console.error('[setup] token', e);
			}

			if (authStore.isProfileComplete) {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			}
		})();
	});

	// Load clubs for dropdowns
	$effect(() => {
		if (authStore.isAuthenticated && !teamsStore.loaded) {
			teamsStore.load(authStore.role || 'player', {
				coachEmail: auth.currentUser?.email ?? '',
				scope: 'setup',
				routePath: '/setup',
			});
		}
	});

	let accountKind = $state(/** @type {'player' | 'parent'} */ ('player'));
	let parentDisplayName = $state('');
	let selectedClubId = $state('');
	let selectedTeamId = $state('');
	let selectedPlayerName = $state('');
	let manualPlayerName = $state('');
	let dateOfBirth = $state('');
	let showManualEntry = $state(false);
	let rosterPlayers = $state([]);
	let rosterLoading = $state(false);
	let errorMsg = $state('');
	let saving = $state(false);
	let clubTeams = $state([]);
	let clubTeamsLoading = $state(false);
	/** @type {'idle' | 'minor_pending'} */
	let dobOutcome = $state('idle');

	const today = new Date().toISOString().split('T')[0];
	const minDobDate = (() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 100);
		return d.toISOString().split('T')[0];
	})();

	$effect(() => {
		if (!selectedClubId) {
			clubTeams = [];
			clubTeamsLoading = false;
			return;
		}
		if (accountKind !== 'player') {
			clubTeams = [];
			clubTeamsLoading = false;
			return;
		}
		let cancelled = false;
		clubTeamsLoading = true;
		(async () => {
			try {
				const res = await listTeamsForClub({ clubId: selectedClubId });
				const list = res.data && res.data.teams ? res.data.teams : [];
				if (!cancelled) clubTeams = Array.isArray(list) ? list : [];
			} catch (e) {
				console.error(e);
				if (!cancelled) clubTeams = [];
			} finally {
				if (!cancelled) clubTeamsLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function setAccountKind(kind) {
		accountKind = kind;
		selectedTeamId = '';
		selectedPlayerName = '';
		rosterPlayers = [];
		showManualEntry = false;
		manualPlayerName = '';
		dateOfBirth = '';
		dobOutcome = 'idle';
		errorMsg = '';
	}

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
		if (accountKind === 'parent') {
			const name = parentDisplayName.trim();
			if (!selectedClubId || !name) {
				return (errorMsg = 'Please select a club and enter your display name.');
			}
			saving = true;
			errorMsg = '';
			try {
				const userEmail = auth.currentUser.email.toLowerCase();
				const userRef = doc(db, 'users', userEmail);
				const profileData = {
					clubId: selectedClubId,
					role: 'parent',
					playerName: name,
					joinedAt: new Date(),
					privacyProfile: 'strict_minor_defaults',
					telemetryOptIn: false,
					biometricOrVideoConsentAt: null,
					consentPolicyVersion: '2026-04'
				};
				await setDoc(userRef, profileData, { merge: true });
				await authStore.refresh({ silent: true });
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			} catch (err) {
				errorMsg = 'Error saving profile: ' + err.message;
				saving = false;
			}
			return;
		}

		const finalName = selectedPlayerName === 'manual' ? manualPlayerName.trim() : selectedPlayerName;
		if (!selectedClubId || !selectedTeamId || !finalName) {
			return (errorMsg = 'Please select a club, team, and player name.');
		}
		saving = true;
		errorMsg = '';
		try {
			const userEmail = auth.currentUser.email.toLowerCase();
			const userRef = doc(db, 'users', userEmail);

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

			if (dateOfBirth.trim()) {
				try {
					const dobResult = await playerSelfReportDobFn({ dateOfBirth: dateOfBirth.trim() });
					const r = /** @type {any} */ (dobResult.data);
					if (r.isMinor === true) {
						dobOutcome = 'minor_pending';
						saving = false;
						return;
					}
				} catch (dobErr) {
					console.warn('[setup] DOB report failed — continuing setup:', dobErr);
				}
			}

			goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
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

		<p class="kind-label">I am registering as</p>
		<div class="account-kind-row" role="group" aria-label="Account type">
			<button
				type="button"
				class="kind-btn"
				class:kind-btn-active={accountKind === 'player'}
				onclick={() => setAccountKind('player')}
			>
				Athlete
			</button>
			<button
				type="button"
				class="kind-btn"
				class:kind-btn-active={accountKind === 'parent'}
				onclick={() => setAccountKind('parent')}
			>
				Parent / guardian
			</button>
		</div>

		<label>Select Your Club / Organization</label>
		<select
			bind:value={selectedClubId}
			onchange={() => {
				selectedTeamId = '';
				selectedPlayerName = '';
				rosterPlayers = [];
			}}
		>
			<option value="">Select your club...</option>
			{#each teamsStore.clubs as club}
				<option value={club.id}>{club.name || club.id}</option>
			{/each}
		</select>

		{#if accountKind === 'parent'}
			<label>Your name (as parent / guardian)</label>
			<input
				type="text"
				bind:value={parentDisplayName}
				placeholder="e.g. Jane Doe"
				autocomplete="name"
			/>
			<p class="setup-helper-text">
				You do not need a team roster slot. After you finish, your club director can link your account to your
				athlete’s household for consent workflows.
			</p>
		{:else if dobOutcome === 'minor_pending'}
			<div class="minor-gate" role="alert">
				<div class="minor-gate__icon">🔒</div>
				<h3 class="minor-gate__title">Parental consent required</h3>
				<p class="minor-gate__body">
					Based on your date of birth, your account requires a parent or guardian to complete the
					consent process before you can access training data.
				</p>
				<p class="minor-gate__body">
					A <strong>Parent / Guardian</strong> must create an account on this platform, then visit
					<strong>Parent dashboard → Consent</strong> to complete verification.
				</p>
				<button
					class="primary-btn btn-orange w-100"
					onclick={() => goto('/vpc-pending', { replaceState: true })}
				>
					Got it — view my status
				</button>
			</div>
		{:else}
			<label>Select Your Team</label>
			<select bind:value={selectedTeamId} disabled={!selectedClubId || clubTeamsLoading} onchange={onTeamChange}>
				<option value="">
					{!selectedClubId
						? 'Select a club first...'
						: clubTeamsLoading
							? 'Loading teams…'
							: 'Select your team…'}
				</option>
				{#each clubTeams as team}
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
					<p class="setup-helper-text">
						Your coach will need to approve this entry before your XP counts toward the team leaderboard.
					</p>
				</div>
			{/if}

			<label for="setup-dob">Date of Birth <span class="setup-optional">(optional — used for COPPA compliance)</span></label>
			<input
				id="setup-dob"
				type="date"
				bind:value={dateOfBirth}
				min={minDobDate}
				max={today}
			/>
			<p class="setup-helper-text">
				If you are under 17, a parent or guardian must complete the consent flow before you can log workouts.
			</p>
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
	.kind-label {
		margin: 0 0 8px;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.account-kind-row {
		display: flex;
		gap: clamp(8px, 2vw, 12px);
		margin-bottom: clamp(14px, 2.5vw, 20px);
	}

	.kind-btn {
		flex: 1;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border, rgba(148, 163, 184, 0.35));
		background: rgba(255, 255, 255, 0.06);
		cursor: pointer;
		font-weight: 600;
	}

	.kind-btn-active {
		border-color: rgba(251, 191, 36, 0.65);
		box-shadow: 0 8px 24px -8px rgba(15, 23, 42, 0.2);
	}

	:global(html.dark) .kind-btn {
		background: rgba(15, 23, 42, 0.45);
	}

	select,
	input {
		margin-bottom: 12px;
	}
	.manual-entry {
		margin-bottom: 12px;
	}

	.setup-optional {
		font-size: 0.75rem;
		opacity: 0.6;
		font-weight: 400;
	}

	.minor-gate {
		text-align: center;
		padding: 1.25rem 0.5rem 0.75rem;
	}
	.minor-gate__icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}
	.minor-gate__title {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.minor-gate__body {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}
</style>
