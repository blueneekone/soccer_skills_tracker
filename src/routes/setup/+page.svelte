<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { httpsCallable } from 'firebase/functions';
	import { doc, setDoc } from 'firebase/firestore';
	import { getIdTokenResult } from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { PASSKEY_ENROLL_ROUTE, requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	/**
	 * True when the signed-in user already has a player role (string claim or roles array).
	 * Used to show the teamless-player terminal state instead of the parent/coach onboarding form.
	 */
	const isPlayerRole = $derived(
		authStore.role === 'player' ||
		(Array.isArray((authStore.userProfile as Record<string, unknown> | null | undefined)?.roles) &&
			((authStore.userProfile as Record<string, unknown>).roles as string[]).includes('player'))
	);

	/** T0-5: coach role is server-assigned via this callable — no client setDoc(role:'coach'). */
	const claimCoachInviteCallable = httpsCallable(functions, 'claimCoachInvite');

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
	let setupRole = $state(/** @type {'parent' | 'coach'} */ ('parent'));
	let displayName = $state('');
	let selectedClubId = $state('');
	let errorMsg = $state('');
	let saving = $state(false);
	let termsAccepted = $state(false);

	const basePrivacy = {
		privacyProfile: 'strict_minor_defaults',
		telemetryOptIn: false,
		biometricOrVideoConsentAt: null,
		consentPolicyVersion: '2026-04',
	};

	function setSetupRole(/** @type {'parent' | 'coach'} */ kind) {
		setupRole = kind;
		errorMsg = '';
	}

	function roleBtnClass(/** @type {'parent' | 'coach'} */ id) {
		const on = setupRole === id;
		return [
			'tw-flex tw-min-h-[3.25rem] tw-w-full tw-flex-1 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-px-3 tw-py-3',
			'tw-text-center tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-widest tw-transition-colors',
			on
				? 'tw-border-cyan-500 tw-bg-cyan-900/20 tw-text-cyan-400 tw-shadow-[0_0_18px_rgba(20, 184, 166,0.12)]'
				: 'tw-border-gray-700 tw-bg-transparent tw-text-gray-500 hover:tw-border-gray-600 hover:tw-text-gray-400',
		].join(' ');
	}

	async function completeSetup() {
		const name = displayName.trim();
		if (!termsAccepted) {
			return (errorMsg = 'You must acknowledge the Vanguard Protocol Terms before continuing.');
		}
		// Club selection is required for parents only; coaches get club/team from their invite.
		if (setupRole === 'parent' && !selectedClubId) {
			return (errorMsg = 'Please select your club / organization.');
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
			} else {
			// T0-5: privileged role is NEVER written by client — server callable owns it.
			// claimCoachInvite finds the pending invite by authenticated email, validates
			// seat reservation, and writes role/teamId/clubId via Admin SDK.
			const claimResult = await claimCoachInviteCallable({});
			const claimData = claimResult.data as { ok: boolean; claimed: boolean; teamId?: string };
				if (!claimData.claimed) {
					errorMsg =
						'No pending coach invite found for your email address. Ask your director to send you an invite first.';
					saving = false;
					return;
				}
				// Persist display name and privacy defaults only — role/teamId/clubId are server-owned.
				await setDoc(
					userRef,
					{
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
				'Error: ' +
				(err && typeof err === 'object' && 'message' in err ? String(/** @type {*} */ (err).message) : 'unknown');
			saving = false;
		}
	}

	async function handleLogout() {
		await handleSignOut();
	}
</script>

<div class="full-screen-center setup-theme">
	<div class="auth-card">
		<div class="logo-circle" aria-hidden="true"><Icon name="sport.soccer" size={24} /></div>
		<h2 class="auth-title">Complete Profile</h2>

		{#if isPlayerRole}
			<!-- Teamless-player terminal state: stable, no redirect bounce. -->
			<p class="auth-subtitle">Operative account detected.</p>
			<div class="player-unlinked-msg" role="status">
				<p>
					Your operative profile isn't linked to a team yet. Ask your coach or club admin to add you to a roster.
				</p>
			</div>
			<button class="secondary-btn w-100" type="button" onclick={handleLogout}>Sign out</button>
		{:else}
			<p class="auth-subtitle">Link your account to your organization.</p>

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
			<p class="setup-helper-text tw-mb-5">
				Club directors are invited by your organization admin — use the link you received or contact support.
			</p>

		{#if setupRole === 'parent'}
			<label for="setup-club">Select your club / organization</label>
			<select id="setup-club" bind:value={selectedClubId}>
				<option value="">Select your club…</option>
				{#each teamsStore.clubs as club}
					<option value={club.id}>{club.name || club.id}</option>
				{/each}
			</select>
		{/if}

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
					Players under 13 must be created by a parent in the Household Clearance flow — you cannot add a "player
					account" here.
				</p>
			{:else}
				<p class="setup-helper-text">
					Your director must send an invite to your email address first. Once a pending invite exists for your
					account, click "Claim invite" below to activate your coach role.
				</p>
			{/if}

		<!-- Terms acknowledgement — required before submission -->
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

		{#if errorMsg}
			<div class="auth-error-msg" role="alert">{errorMsg}</div>
		{/if}

		<button class="primary-btn btn-orange w-100" onclick={completeSetup} disabled={saving || !termsAccepted}>
			{#if saving}
				{setupRole === 'coach' ? 'Claiming invite…' : 'Saving profile…'}
			{:else}
				{setupRole === 'coach' ? 'Claim invite' : 'Complete setup'}
			{/if}
		</button>
			<button class="secondary-btn w-100" type="button" onclick={handleLogout}>Cancel &amp; logout</button>
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

	.setup-terms-link:hover { color: #14b8a6; }

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
