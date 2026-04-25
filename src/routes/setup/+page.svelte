<script>
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { signOut } from 'firebase/auth';
	import { doc, setDoc } from 'firebase/firestore';
	import { getIdTokenResult } from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	const listTeamsForClub = httpsCallable(functions, 'listTeamsForClub');

	// Redirect logic — global admins (JWT claims or role token) skip profile completion.
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
				const isPlatformAdmin =
					tr.claims.isGlobalAdmin === true ||
					tr.claims.isSuperAdmin === true ||
					tr.claims.role === 'global_admin' ||
					tr.claims.role === 'super_admin';
				if (isPlatformAdmin) {
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

	// Load all clubs for organization pickers (setup scope).
	$effect(() => {
		if (authStore.isAuthenticated && !teamsStore.loaded) {
			teamsStore.load('parent', {
				coachEmail: auth.currentUser?.email ?? '',
				scope: 'setup',
				routePath: '/setup',
			});
		}
	});

	/** Phase 4 — players are parent-provisioned only; no self-serve athlete path. */
	let setupRole = $state(/** @type {'director' | 'coach' | 'parent'} */ ('parent'));
	let displayName = $state('');
	let selectedClubId = $state('');
	let selectedTeamId = $state('');
	let errorMsg = $state('');
	let saving = $state(false);
	let clubTeams = $state([]);
	let clubTeamsLoading = $state(false);

	const basePrivacy = {
		privacyProfile: 'strict_minor_defaults',
		telemetryOptIn: false,
		biometricOrVideoConsentAt: null,
		consentPolicyVersion: '2026-04',
	};

	$effect(() => {
		if (!selectedClubId) {
			clubTeams = [];
			clubTeamsLoading = false;
			return;
		}
		if (setupRole !== 'coach') {
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

	function setSetupRole(/** @type {'director' | 'coach' | 'parent'} */ kind) {
		setupRole = kind;
		selectedTeamId = '';
		errorMsg = '';
	}

	function roleBtnClass(/** @type {'director' | 'coach' | 'parent'} */ id) {
		const on = setupRole === id;
		return [
			'tw-flex tw-min-h-[3.25rem] tw-w-full tw-flex-1 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-px-3 tw-py-3',
			'tw-text-center tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-widest tw-transition-colors',
			on
				? 'tw-border-cyan-500 tw-bg-cyan-900/20 tw-text-cyan-400 tw-shadow-[0_0_18px_rgba(34,211,238,0.12)]'
				: 'tw-border-gray-700 tw-bg-transparent tw-text-gray-500 hover:tw-border-gray-600 hover:tw-text-gray-400',
		].join(' ');
	}

	async function completeSetup() {
		const name = displayName.trim();
		if (!selectedClubId) {
			return (errorMsg = 'Please select your club / organization.');
		}
		if (!name) {
			return (errorMsg = 'Please enter your display name.');
		}

		if (setupRole === 'coach' && !selectedTeamId) {
			return (errorMsg = 'Please select your team.');
		}

		const userEmail = auth.currentUser?.email?.toLowerCase();
		if (!userEmail) {
			return (errorMsg = 'No signed-in email — try signing in again.');
		}

		saving = true;
		errorMsg = '';
		try {
			const userRef = doc(db, 'users', userEmail);
			const joinedAt = new Date();

			if (setupRole === 'parent') {
				await setDoc(
					userRef,
					{
						clubId: selectedClubId,
						role: 'parent',
						playerName: name,
						joinedAt,
						...basePrivacy,
					},
					{ merge: true },
				);
			} else if (setupRole === 'director') {
				await setDoc(
					userRef,
					{
						clubId: selectedClubId,
						role: 'director',
						playerName: name,
						teamId: 'admin',
						joinedAt,
						...basePrivacy,
					},
					{ merge: true },
				);
			} else {
				const team = clubTeams.find((t) => t.id === selectedTeamId);
				const clubFromTeam =
					team && typeof team.clubId === 'string' && team.clubId.trim() ?
						team.clubId.trim()
					:	selectedClubId;
				await setDoc(
					userRef,
					{
						clubId: clubFromTeam,
						teamId: selectedTeamId,
						role: 'coach',
						playerName: name,
						joinedAt,
						...basePrivacy,
					},
					{ merge: true },
				);
			}

			await authStore.refresh({ silent: true });
			goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
		} catch (err) {
			errorMsg =
				'Error saving profile: ' +
				(err && typeof err === 'object' && 'message' in err ? String(/** @type {*} */ (err).message) : 'unknown');
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
		<div class="logo-circle" aria-hidden="true"><i class="ph ph-soccer-ball"></i></div>
		<h2 class="auth-title">Complete Profile</h2>
		<p class="auth-subtitle">Link your account to your organization.</p>

		<p class="kind-label">I am registering as</p>
		<div
			class="tw-mb-5 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-flex-nowrap sm:tw-gap-3"
			role="group"
			aria-label="Registration role"
		>
			<button
				type="button"
				class={roleBtnClass('director')}
				aria-pressed={setupRole === 'director'}
				onclick={() => setSetupRole('director')}
			>
				Director<br /><span class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
					>(Club admin)</span
				>
			</button>
			<button
				type="button"
				class={roleBtnClass('coach')}
				aria-pressed={setupRole === 'coach'}
				onclick={() => setSetupRole('coach')}
			>
				Coach<br /><span class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
					>(Team leader)</span
				>
			</button>
			<button
				type="button"
				class={roleBtnClass('parent')}
				aria-pressed={setupRole === 'parent'}
				onclick={() => setSetupRole('parent')}
			>
				Parent<br /><span class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
					>(Household manager)</span
				>
			</button>
		</div>

		<label for="setup-club">Select your club / organization</label>
		<select
			id="setup-club"
			bind:value={selectedClubId}
			onchange={() => {
				selectedTeamId = '';
			}}
		>
			<option value="">Select your club…</option>
			{#each teamsStore.clubs as club}
				<option value={club.id}>{club.name || club.id}</option>
			{/each}
		</select>

		<label for="setup-name">
			{#if setupRole === 'parent'}
				Your name (as parent / guardian)
			{:else if setupRole === 'director'}
				Your name (as club director)
			{:else}
				Your name (as coach)
			{/if}
		</label>
		<input
			id="setup-name"
			type="text"
			bind:value={displayName}
			placeholder="e.g. Alex Morgan"
			autocomplete="name"
		/>

		{#if setupRole === 'coach'}
			<label for="setup-team">Select your team</label>
			<select
				id="setup-team"
				bind:value={selectedTeamId}
				disabled={!selectedClubId || clubTeamsLoading}
			>
				<option value="">
					{!selectedClubId
						? 'Select a club first…'
						: clubTeamsLoading
							? 'Loading teams…'
							: 'Select your team…'}
				</option>
				{#each clubTeams as team}
					<option value={team.id}>{team.name || team.id}</option>
				{/each}
			</select>
		{/if}

		{#if setupRole === 'parent'}
			<p class="setup-helper-text">
				Players under 13 must be created by a parent in the Household Clearance flow — you cannot add a “player
				account” here.
			</p>
		{:else if setupRole === 'director'}
			<p class="setup-helper-text">
				Club-scoped access. You’ll manage your organization from the director console after setup.
			</p>
		{:else}
			<p class="setup-helper-text">Pick the team you lead. Claims sync after you save (via the clearance server).</p>
		{/if}

		{#if errorMsg}
			<div class="auth-error-msg" role="alert">{errorMsg}</div>
		{/if}

		<button class="primary-btn btn-orange w-100" onclick={completeSetup} disabled={saving}>
			{saving ? 'Saving profile…' : 'Complete setup'}
		</button>
		<button class="secondary-btn w-100" type="button" onclick={handleLogout}>Cancel &amp; logout</button>
	</div>
</div>

<style>
	.kind-label {
		margin: 0 0 8px;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	select,
	input {
		margin-bottom: 12px;
	}

	.setup-helper-text {
		margin: 0 0 14px;
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
	}
</style>
