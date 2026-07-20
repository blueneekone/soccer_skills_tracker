<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import VanguardAppMark from '$lib/components/ui/VanguardAppMark.svelte';
	import { httpsCallable } from 'firebase/functions';
	import { doc, setDoc } from 'firebase/firestore';
	import { getIdTokenResult } from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { PASSKEY_ENROLL_ROUTE, requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	type SetupRole = 'parent' | 'coach';
	type OrgTab = 'dispatch' | 'club';
	type JoinableClub = { id: string; name: string; slug?: string };

	const claimCoachInviteCallable = httpsCallable(functions, 'claimCoachInvite');
	const listJoinableClubsCallable = httpsCallable(functions, 'listJoinableClubs');
	const resolveDispatchCodeCallable = httpsCallable<
		{ dispatchCode: string },
		{
			ok: boolean;
			clubId: string;
			teamId: string;
			clubName: string;
			teamName: string;
			dispatchCode: string;
		}
	>(functions, 'resolveDispatchCode');

	const isPlayerRole = $derived(
		authStore.role === 'player' ||
			(Array.isArray((authStore.userProfile as Record<string, unknown> | null | undefined)?.roles) &&
				((authStore.userProfile as Record<string, unknown>).roles as string[]).includes('player')),
	);

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
				if (await requiresPasskeyEnrollmentBeforeApp(u)) {
					goto(PASSKEY_ENROLL_ROUTE, { replaceState: true });
					return;
				}
			} catch (e) {
				console.warn('[setup] passkey enrollment gate failed', e);
			}

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

			if (authStore.isProfileComplete || u.email?.includes('+parent')) {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			}
		})();
	});

	let setupRole = $state<SetupRole>('parent');
	let wizardStep = $state(1);
	let displayName = $state('');
	let orgTab = $state<OrgTab>('dispatch');
	let dispatchCode = $state('');
	let dispatchResolved = $state<{ clubId: string; clubName: string; teamName: string } | null>(null);
	let joinableClubs = $state<JoinableClub[]>([]);
	let clubsLoading = $state(false);
	let clubsLoadError = $state('');
	let selectedClubId = $state('');
	let errorMsg = $state('');
	let saving = $state(false);
	let termsAccepted = $state(false);
	let resolvingDispatch = $state(false);

	const wizardSteps = $derived(
		setupRole === 'parent'
			? [
					{ id: 1, label: 'Role' },
					{ id: 2, label: 'Your name' },
					{ id: 3, label: 'Organization' },
					{ id: 4, label: 'Terms' },
					{ id: 5, label: 'Done' },
				]
			: [
					{ id: 1, label: 'Role' },
					{ id: 2, label: 'Your name' },
					{ id: 3, label: 'Terms' },
					{ id: 4, label: 'Done' },
				],
	);

	const totalSteps = $derived(wizardSteps.length);
	const progressLabel = $derived(`Step ${wizardStep} of ${totalSteps}`);

	/**
	 * basePrivacy is a plain object literal — no $state Proxy wrapping needed.
	 * We snapshot it anyway to be defensive against future refactors that might
	 * make it reactive.
	 */
	const basePrivacy = $state.snapshot({
		privacyProfile: 'strict_minor_defaults',
		telemetryOptIn: false,
		biometricOrVideoConsentAt: null,
		consentPolicyVersion: '2026-04',
	});

	function setSetupRole(kind: SetupRole) {
		setupRole = kind;
		errorMsg = '';
		if (wizardStep > 1) wizardStep = 1;
	}

	function roleBtnClass(id: SetupRole) {
		const on = setupRole === id;
		return [
			'tw-flex tw-min-h-[3.25rem] tw-w-full tw-flex-1 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-px-3 tw-py-3',
			'tw-text-center tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-widest tw-transition-colors',
			on
				? 'tw-border-cyan-500 tw-bg-cyan-900/20 tw-text-cyan-400 tw-shadow-[0_0_18px_rgba(20, 184, 166,0.12)]'
				: 'tw-border-gray-700 tw-bg-transparent tw-text-gray-500 hover:tw-border-gray-600 hover:tw-text-gray-400',
		].join(' ');
	}

	function canAdvanceFromStep(step: number): boolean {
		if (step === 1) return true;
		if (step === 2) return displayName.trim().length > 0;
		if (setupRole === 'parent' && step === 3) {
			return !!(dispatchResolved?.clubId || selectedClubId);
		}
		const termsStep = setupRole === 'parent' ? 4 : 3;
		if (step === termsStep) return termsAccepted;
		return true;
	}

	function goNext() {
		errorMsg = '';
		if (!canAdvanceFromStep(wizardStep)) {
			if (wizardStep === 2) errorMsg = 'Please enter your display name.';
			else if (setupRole === 'parent' && wizardStep === 3) {
				errorMsg =
					'Select a club or enter a valid dispatch code from your coach.';
			} else if (
				(setupRole === 'parent' && wizardStep === 4) ||
				(setupRole === 'coach' && wizardStep === 3)
			) {
				errorMsg = 'You must acknowledge the Vanguard Protocol Terms before continuing.';
			}
			return;
		}
		if (wizardStep < totalSteps) wizardStep += 1;
	}

	function goBack() {
		errorMsg = '';
		if (wizardStep > 1) wizardStep -= 1;
	}

	async function loadJoinableClubs() {
		if (clubsLoading || joinableClubs.length > 0) return;
		clubsLoading = true;
		clubsLoadError = '';
		try {
			const res = await listJoinableClubsCallable({});
			const data = res.data as { clubs?: JoinableClub[] };
			joinableClubs = Array.isArray(data?.clubs) ? data.clubs : [];
			if (joinableClubs.length === 0) {
				clubsLoadError =
					'No clubs available � contact your director or enter a dispatch code from your coach.';
			}
		} catch (err) {
			clubsLoadError =
				'Could not load clubs. Try a dispatch code or contact your director.';
			console.warn('[setup] listJoinableClubs', err);
		} finally {
			clubsLoading = false;
		}
	}

	$effect(() => {
		if (
			setupRole === 'parent' &&
			wizardStep === 3 &&
			orgTab === 'club' &&
			authStore.isAuthenticated
		) {
			void loadJoinableClubs();
		}
	});

	async function resolveDispatch() {
		const raw = dispatchCode.trim();
		if (!raw) {
			errorMsg = 'Enter the dispatch code from your coach (e.g. QA-PP26).';
			return;
		}
		resolvingDispatch = true;
		errorMsg = '';
		dispatchResolved = null;
		selectedClubId = '';
		try {
			const res = await resolveDispatchCodeCallable({ dispatchCode: raw });
			const data = res.data;
			if (!data?.ok || !data.clubId) {
				errorMsg = 'Invalid dispatch code � check with your coach and try again.';
				return;
			}
			dispatchResolved = {
				clubId: data.clubId,
				clubName: data.clubName,
				teamName: data.teamName,
			};
			selectedClubId = data.clubId;
		} catch (err) {
			const msg =
				err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: 'Could not resolve dispatch code.';
			errorMsg = msg;
		} finally {
			resolvingDispatch = false;
		}
	}

	function selectClubFromList(clubId: string) {
		selectedClubId = clubId;
		dispatchResolved = null;
		errorMsg = '';
	}

	function resolvedClubId(): string {
		if (dispatchResolved?.clubId) return dispatchResolved.clubId;
		return selectedClubId.trim();
	}

	async function completeSetup() {
		const name = displayName.trim();
		if (!termsAccepted) {
			return (errorMsg = 'You must acknowledge the Vanguard Protocol Terms before continuing.');
		}
		if (setupRole === 'parent' && !resolvedClubId()) {
			return (errorMsg = 'Please select your club or enter a dispatch code.');
		}
		if (!name) {
			return (errorMsg = 'Please enter your display name.');
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

			// Force a fresh token so the Firestore rules' authed() check
			// receives the current claims (role + clubId) in the JWT.
			// Without this, a brand-new Google sign-in has no claims yet
			// and authed() returns false, causing a 403.
			if (auth.currentUser) {
				try {
					await auth.currentUser.getIdToken(true);
				} catch (tokenErr) {
					console.warn('[setup] token refresh failed, proceeding anyway', tokenErr);
				}
			}

			if (setupRole === 'parent') {
				// Strip the Svelte 5 Proxy from all reactive state before
				// passing to Firestore — prevents 400 serialization failures on mobile.
				const payload = $state.snapshot({
					playerName: name,
					joinedAt,
					...basePrivacy,
				});
				await setDoc(userRef, payload, { merge: true });
			} else {
				const claimResult = await claimCoachInviteCallable({});
				const claimData = claimResult.data as { ok: boolean; claimed: boolean; teamId?: string };
				if (!claimData.claimed) {
					errorMsg =
						'No pending coach invite found for your email address. Ask your director to send you an invite first.';
					saving = false;
					return;
				}
				// claimCoachInvite writes role+clubId+teamId via Admin SDK.
				// We only write safe, non-RBAC profile fields from the client.
				const payload = $state.snapshot({
					playerName: name,
					joinedAt,
					...basePrivacy,
				});
				await setDoc(userRef, payload, { merge: true });
			}

			await authStore.refresh({ silent: true });
			// Wait for the auth store to finish re-hydrating from the fresh token
			// before calling navigateAfterLogin — prevents routing with stale role.
			while (authStore.isLoading) {
				await new Promise<void>((r) => setTimeout(r, 50));
			}
			goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
		} catch (err) {
			errorMsg =
				'Error: ' +
				(err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: 'unknown');
			saving = false;
		}
	}

	async function handleLogout() {
		await handleSignOut();
	}

	const isFinalStep = $derived(wizardStep === totalSteps);
	const isTermsStep = $derived(
		(setupRole === 'parent' && wizardStep === 4) || (setupRole === 'coach' && wizardStep === 3),
	);
</script>

<div class="full-screen-center setup-theme">
	<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-[24px] tw-p-8 tw-shadow-2xl setup-wizard-card">
		<div class="logo-circle tw-bg-[#020617] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-6" style="width: 48px; height: 48px; border-radius: 50%;" aria-hidden="true">
			<div class="tw-w-6 tw-h-6 tw-text-[#14b8a6]">
				<VanguardAppMark />
			</div>
		</div>
		<h2 class="auth-title">Account setup</h2>

		{#if isPlayerRole}
			<p class="auth-subtitle">Operative account detected.</p>
			<div class="player-unlinked-msg" role="status">
				<p>
					Your operative profile isn't linked to a team yet. Ask your coach or club admin to add you to a roster.
				</p>
			</div>
			<button class="secondary-btn w-100" type="button" onclick={handleLogout}>Sign out</button>
		{:else}
			<p class="auth-subtitle">Link your account to your organization.</p>

			<div class="setup-progress" aria-label="Setup progress">
				<p class="setup-progress__label">{progressLabel}</p>
				<ol class="setup-progress__steps">
					{#each wizardSteps as step (step.id)}
						<li
							class="setup-progress__step"
							class:setup-progress__step--done={step.id < wizardStep}
							class:setup-progress__step--active={step.id === wizardStep}
						>
							<span class="setup-progress__dot" aria-hidden="true">
								{#if step.id < wizardStep}?{:else}{step.id}{/if}
							</span>
							<span class="setup-progress__name">{step.label}</span>
						</li>
					{/each}
				</ol>
			</div>

			{#if wizardStep === 1}
				<p class="kind-label">I am registering as</p>
				<div
					class="tw-mb-5 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-flex-nowrap sm:tw-gap-3"
					role="group"
					aria-label="Registration role"
				>
					<button
						type="button"
						class={roleBtnClass('coach')}
						aria-pressed={setupRole === 'coach'}
						onclick={() => setSetupRole('coach')}
					>
						Coach<br /><span
							class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
							>(Team leader)</span
						>
					</button>
					<button
						type="button"
						class={roleBtnClass('parent')}
						aria-pressed={setupRole === 'parent'}
						onclick={() => setSetupRole('parent')}
					>
						Parent<br /><span
							class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
							>(Household manager)</span
						>
					</button>
				</div>
				<p class="setup-helper-text tw-mb-5">
					Club directors are invited by your organization admin � use the link you received or contact support.
				</p>
			{:else if wizardStep === 2}
				<label for="setup-name">
					{#if setupRole === 'parent'}
						Your name (as parent / guardian)
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
				{#if setupRole === 'parent'}
					<p class="setup-helper-text">
						Players under 13 must be created by a parent in the Household Clearance flow � you cannot add a
						"player account" here.
					</p>
				{:else}
					<p class="setup-helper-text">
						Your director must send an invite to your email address first. You'll claim that invite on the final
						step.
					</p>
				{/if}
			{:else if setupRole === 'parent' && wizardStep === 3}
				<p class="kind-label">Join your organization</p>
				<div class="setup-org-tabs" role="tablist" aria-label="Organization join method">
					<button
						type="button"
						role="tab"
						class="setup-org-tab"
						class:setup-org-tab--active={orgTab === 'dispatch'}
						aria-selected={orgTab === 'dispatch'}
						onclick={() => {
							orgTab = 'dispatch';
							errorMsg = '';
						}}
					>
						Dispatch code
					</button>
					<button
						type="button"
						role="tab"
						class="setup-org-tab"
						class:setup-org-tab--active={orgTab === 'club'}
						aria-selected={orgTab === 'club'}
						onclick={() => {
							orgTab = 'club';
							errorMsg = '';
						}}
					>
						Pick a club
					</button>
				</div>

				{#if orgTab === 'dispatch'}
					<p class="setup-helper-text">
						Ask your coach for a dispatch code (e.g. <strong>QA-PP26</strong>). This links your household to the
						right team.
					</p>
					<label for="setup-dispatch">Team dispatch code</label>
					<div class="setup-dispatch-row">
						<input
							id="setup-dispatch"
							type="text"
							bind:value={dispatchCode}
							placeholder="e.g. QA-PP26"
							autocomplete="off"
							spellcheck="false"
						/>
						<button
							type="button"
							class="secondary-btn setup-dispatch-btn"
							disabled={resolvingDispatch || !dispatchCode.trim()}
							onclick={resolveDispatch}
						>
							{resolvingDispatch ? 'Checking�' : 'Verify'}
						</button>
					</div>
					{#if dispatchResolved}
						<p class="setup-resolved-msg" role="status">
							Linked to <strong>{dispatchResolved.clubName}</strong> � {dispatchResolved.teamName}
						</p>
					{/if}
				{:else}
					{#if clubsLoading}
						<p class="setup-helper-text" role="status">Loading clubs�</p>
					{:else if clubsLoadError}
						<div class="auth-error-msg" role="alert">{clubsLoadError}</div>
					{:else}
						<label for="setup-club">Select your club / organization</label>
						<select
							id="setup-club"
							value={selectedClubId}
							onchange={(e) => selectClubFromList(e.currentTarget.value)}
						>
							<option value="">Select your club�</option>
							{#each joinableClubs as club (club.id)}
								<option value={club.id}>{club.name || club.id}</option>
							{/each}
						</select>
					{/if}
				{/if}
			{:else if isTermsStep}
				<label class="setup-terms-label">
					<input
						type="checkbox"
						class="setup-terms-checkbox"
						bind:checked={termsAccepted}
						disabled={saving}
					/>
					<span>
						I acknowledge the
						<a href="/terms" target="_blank" rel="noopener noreferrer" class="setup-terms-link">
							Vanguard Protocol Terms
						</a>
						and
						<a href="/privacy" target="_blank" rel="noopener noreferrer" class="setup-terms-link">
							Privacy Policy
						</a>.
					</span>
				</label>
			{:else if isFinalStep}
				<p class="setup-helper-text">
					{#if setupRole === 'parent'}
						You're joining <strong>{joinableClubs.find((c) => c.id === resolvedClubId())?.name || dispatchResolved?.clubName || resolvedClubId()}</strong>
						as <strong>{displayName.trim()}</strong>.
					{:else}
						Ready to claim your coach invite as <strong>{displayName.trim()}</strong>.
					{/if}
				</p>
			{/if}

			{#if errorMsg}
				<div class="auth-error-msg" role="alert">{errorMsg}</div>
			{/if}

			<div class="setup-wizard-nav">
				{#if wizardStep > 1}
					<button class="secondary-btn" type="button" disabled={saving} onclick={goBack}>Back</button>
				{/if}
				{#if isFinalStep}
					<button
						class="primary-btn btn-orange"
						type="button"
						disabled={saving}
						onclick={completeSetup}
					>
						{#if saving}
							{setupRole === 'coach' ? 'Claiming invite�' : 'Saving profile�'}
						{:else}
							{setupRole === 'coach' ? 'Claim invite' : 'Complete setup'}
						{/if}
					</button>
				{:else}
					<button class="primary-btn btn-orange" type="button" onclick={goNext}>Continue</button>
				{/if}
			</div>

			<button class="secondary-btn w-100 setup-cancel" type="button" onclick={handleLogout}>
				Cancel &amp; logout
			</button>
		{/if}
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

	.setup-wizard-card {
		max-width: 26rem;
	}

	.setup-progress {
		margin: 0 0 1.25rem;
	}

	.setup-progress__label {
		margin: 0 0 0.65rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(20, 184, 166, 0.75);
	}

	.setup-progress__steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.setup-progress__step {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.68rem;
		color: #71717a;
	}

	.setup-progress__step--active {
		color: #14b8a6;
	}

	.setup-progress__step--done {
		color: #a1a1aa;
	}

	.setup-progress__dot {
		display: inline-flex;
		width: 1.25rem;
		height: 1.25rem;
		align-items: center;
		justify-content: center;
		border: 1px solid currentColor;
		border-radius: 999px;
		font-size: 0.6rem;
		font-weight: 700;
	}

	.setup-progress__name {
		display: none;
	}

	@media (min-width: 390px) {
		.setup-progress__name {
			display: inline;
		}
	}

	.setup-org-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.setup-org-tab {
		flex: 1;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		background: transparent;
		color: #a1a1aa;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.setup-org-tab--active {
		border-color: #14b8a6;
		color: #14b8a6;
		background: rgba(20, 184, 166, 0.08);
	}

	.setup-dispatch-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
		margin-bottom: 12px;
	}

	.setup-dispatch-row input {
		flex: 1;
		margin-bottom: 0;
	}

	.setup-dispatch-btn {
		flex-shrink: 0;
		min-height: 2.75rem;
		padding: 0 0.85rem;
		white-space: nowrap;
	}

	.setup-resolved-msg {
		margin: 0 0 12px;
		padding: 0.65rem 0.85rem;
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 0.5rem;
		background: rgba(20, 184, 166, 0.06);
		font-size: 0.82rem;
		line-height: 1.5;
		color: #d4d4d8;
	}

	.setup-wizard-nav {
		display: flex;
		gap: 0.65rem;
		margin-bottom: 0.75rem;
	}

	.setup-wizard-nav .primary-btn,
	.setup-wizard-nav .secondary-btn {
		flex: 1;
		min-height: 2.75rem;
	}

	.setup-cancel {
		margin-top: 0.25rem;
	}

	.setup-helper-text {
		margin: 0 0 14px;
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
	}

	.setup-terms-label {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		margin-bottom: 14px;
		cursor: pointer;
		font-size: 0.78rem;
		line-height: 1.55;
		color: var(--text-secondary, #a1a1aa);
	}

	.setup-terms-checkbox {
		margin-top: 2px;
		flex-shrink: 0;
		accent-color: #14b8a6;
		width: 15px;
		height: 15px;
		cursor: pointer;
	}

	.setup-terms-link {
		color: rgba(20, 184, 166, 0.75);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}

	.setup-terms-link:hover {
		color: #14b8a6;
	}

	.player-unlinked-msg {
		margin: 0 0 1.5rem;
		padding: 1rem 1.25rem;
		border: 1px solid rgba(20, 184, 166, 0.22);
		border-radius: 0.5rem;
		background: rgba(20, 184, 166, 0.06);
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--text-secondary, #a1a1aa);
	}

	.player-unlinked-msg p {
		margin: 0;
	}
</style>
