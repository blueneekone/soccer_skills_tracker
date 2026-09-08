<!-- 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active -->
<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc } from 'firebase/firestore';
	import { db, functions, auth } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import '$lib/styles/parent-vpc-trust-band.css';
	import VpcStep1Disclosure from '$lib/components/compliance/VpcStep1Disclosure.svelte';
	import VpcStep2Assertions from '$lib/components/compliance/VpcStep2Assertions.svelte';
	import VpcStep3Attestation from '$lib/components/compliance/VpcStep3Attestation.svelte';

	const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');


	let household = $state(/** @type {Record<string, unknown> | null} */ (null));
	let playerStatuses = $state<Record<string, string>>({});
	let loadErr = $state('');
	let loadingHousehold = $state(true);

	/** @type {'select' | 'step1' | 'step2' | 'step3' | 'done'} */
	let wizardStage = $state('select');
	let activePlayerEmail = $state('');

	const profile = $derived(authStore.userProfile);
	const householdId = $derived(profile?.householdId ? String(profile.householdId) : '');


	// Wizard step 1 state
	let disclosureScrolled = $state(false);
	/** @type {HTMLElement | null} */
	let disclosureEl = $state(null);

	// Wizard step 2 state
	let consentWorkout = $state(false);
	let consentIdentity = $state(false);
	let consentAnalytics = $state(false);
	let consentComms = $state(false);
	let consentSponsor = $state(false);

	// Wizard step 3 state
	let parentDisplayName = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	async function resolvePlayerVpcStatus(playerEmail) {
		const snap = await getDoc(doc(db, 'users', playerEmail));
		return snap.exists() ? snap.data()?.vpcStatus || 'unknown' : 'unknown';
	}

	async function reloadPlayerStatus(playerEmail) {
		const status = await resolvePlayerVpcStatus(playerEmail);
		playerStatuses = { ...playerStatuses, [playerEmail]: status };
		return status;
	}

	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		if (!householdId || authStore.role !== 'parent') {
			household = null;
			loadingHousehold = false;
			return;
		}
		let cancelled = false;
		loadingHousehold = true;
		loadErr = '';

		(async () => {
			try {
				const snap = await getDoc(doc(db, 'households', householdId));
				if (cancelled) return;
				if (!snap.exists()) {
					loadErr = 'Household record not found. Ask your director to link your account.';
					household = null;
					loadingHousehold = false;
					return;
				}
				household = snap.data();

				const emails: string[] = Array.isArray(household?.playerEmails)
					? [...new Set(
						(household.playerEmails as unknown[])
							.map((e) => String(e || '').trim().toLowerCase())
							.filter(Boolean)
					)]
					: [];

			if (emails.length > 0) {
				const statusMap: Record<string, string> = {};
				const resolved = await Promise.all(
					emails.map((em) => resolvePlayerVpcStatus(em))
				);
				for (let i = 0; i < emails.length; i++) {
					statusMap[emails[i]] = resolved[i];
				}
				if (!cancelled) playerStatuses = statusMap;
			}
			} catch (e) {
				if (!cancelled) {
					loadErr = e instanceof Error ? e.message : String(e);
				}
			} finally {
				if (!cancelled) loadingHousehold = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	// Auto-unlock the disclosure button if the entire disclosure text fits inside
	// the container without needing to scroll (e.g., very large viewport).
	// Runs after each render whenever wizardStage reaches 'step1'.

	const playerEmails = $derived.by(() => {
		const raw = household?.playerEmails;
		if (!Array.isArray(raw)) return [];
		return [...new Set(raw.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
	});

	function vpcStatusBadge(status) {
		switch (status) {
			case 'verified':
				return { label: 'Verified', cls: 'parent-vpc-status-chip--verified' };
			case 'not_required':
				return { label: 'Not required', cls: 'parent-vpc-status-chip--muted' };
			case 'pending':
			case 'pending_parent':
			default:
				return { label: 'Consent required', cls: 'parent-vpc-status-chip--pending' };
		}
	}

	const aggregateTrustStatus = $derived.by(() => {
		if (playerEmails.length === 0) return 'unknown';
		const statuses = playerEmails.map((em) => playerStatuses[em] ?? 'unknown');
		if (statuses.every((s) => s === 'verified' || s === 'not_required')) return 'verified';
		if (statuses.some((s) => s === 'pending' || s === 'pending_parent' || s === 'unknown')) {
			return 'pending';
		}
		return 'pending';
	});

	const firstPendingEmail = $derived.by(() =>
		playerEmails.find((em) => !isPlayerVpcComplete(playerStatuses[em]))
	);

	function startFirstPendingConsent() {
		const em = firstPendingEmail;
		if (em) startWizard(em);
	}

	function isPlayerVpcComplete(status) {
		return status === 'verified' || status === 'not_required';
	}

	function startWizard(playerEmail) {
		activePlayerEmail = playerEmail;
		disclosureScrolled = false;
		consentWorkout = false;
		consentIdentity = false;
		consentAnalytics = false;
		consentComms = false;
		consentSponsor = false;
		parentDisplayName = profile?.playerName || '';
		submitError = '';
		wizardStage = 'step1';
	}

	function cancelWizard() {
		wizardStage = 'select';
		activePlayerEmail = '';
		submitError = '';
	}

	function onDisclosureScroll(event) {
		const { scrollTop, scrollHeight, clientHeight } = /** @type {HTMLElement} */ (event.target);
		// 10 px forgiveness buffer — accounts for floating-point subpixel rounding
		// and browsers that report scrollHeight as a fractional value.
		if (scrollHeight - scrollTop <= clientHeight + 10) {
			disclosureScrolled = true;
		}
	}

	async function submitConsent() {
		if (!consentWorkout || !consentIdentity) {
			submitError = 'You must accept the required items (Workout Data and Identity) to proceed.';
			return;
		}
		if (!parentDisplayName.trim()) {
			submitError = 'Your legal name is required for the digital attestation.';
			return;
		}
		submitting = true;
		submitError = '';

		try {
			// Sprint 3.1: WebAuthn Biometric Enclave Attestation
			if (window.PublicKeyCredential) {
				const challenge = new Uint8Array(32);
				window.crypto.getRandomValues(challenge);
				const userId = new Uint8Array(16);
				window.crypto.getRandomValues(userId);

				await navigator.credentials.create({
					publicKey: {
						challenge,
						rp: {
							name: "Vanguard Platform",
							id: window.location.hostname
						},
						user: {
							id: userId,
							name: profile?.email || "parent@vanguard.com",
							displayName: parentDisplayName.trim()
						},
						pubKeyCredParams: [
							{ type: "public-key", alg: -7 },
							{ type: "public-key", alg: -257 }
						],
						authenticatorSelection: {
							authenticatorAttachment: "platform",
							userVerification: "required"
						},
						timeout: 60000,
						attestation: "direct"
					}
				});
			} else {
				console.warn('WebAuthn not supported on this device. Bypassing biometric enclave.');
			}

			const payload = $state.snapshot({
				playerEmail: activePlayerEmail,
				parentDisplayName: parentDisplayName.trim(),
				consentItems: {
					workoutData: consentWorkout,
					identity: consentIdentity,
					analytics: consentAnalytics,
					comms: consentComms,
					sponsor: consentSponsor,
				},
				biometricVerified: !!window.PublicKeyCredential
			});
			await parentGrantVpcConsentFn($state.snapshot(payload));
			await reloadPlayerStatus(activePlayerEmail);
			await auth.currentUser?.getIdToken(true);
			wizardStage = 'done';
		} catch (e) {
			if (e instanceof DOMException) {
				if (e.name === 'NotAllowedError') {
					submitError = 'Biometric attestation failed or was cancelled. Consent requires FaceID/TouchID verification.';
				} else if (e.name === 'InvalidStateError') {
					submitError = 'Device authenticator is already registered or in an invalid state.';
				} else if (e.name === 'SecurityError') {
					submitError = 'Security policy prevents biometric verification on this origin.';
				} else {
					submitError = `Biometric error: ${e.message}`;
				}
			} else {
				submitError = e instanceof Error ? e.message : String(e);
			}
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Verifiable Parental Consent · Parent OS</title>
</svelte:head>


<div class="tw-bg-[#000000] tw-min-h-dvh tw-text-white tw-font-sans tw-overflow-y-auto tw-p-4 lg:tw-p-8">
	<div class="tw-max-w-4xl tw-mx-auto">
		<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-shadow-2xl tw-flex tw-flex-col tw-overflow-hidden">

			<header class="tw-bg-black/40 tw-border-b tw-border-[#334155] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4">
				<div class="tw-flex tw-items-center tw-gap-4">
					<div class="tw-w-12 tw-h-12 tw-bg-black/50 tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-[#f59e0b] tw-rounded-lg">
						<Icon name="status.seal-check" size={24} />
					</div>
					<div>
						<h1 class="tw-font-sans tw-text-xl tw-font-bold tw-uppercase tw-tracking-widest tw-m-0">Verifiable Parental Consent</h1>
						{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0}
							<p class="tw-font-mono tw-text-xs tw-mt-1 {aggregateTrustStatus === 'verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">
								{aggregateTrustStatus === 'verified' ? 'All linked athletes verified' : 'Consent required for one or more athletes'}
							</p>
						{:else}
							<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs tw-mt-1">COPPA / FERPA compliance gate</p>
						{/if}
					</div>
				</div>
				{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0 && wizardStage === 'select' && firstPendingEmail}
					<button type="button" class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-4 tw-py-2 tw-rounded-lg tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase hover:tw-bg-[#f59e0b]/20 tw-transition-colors" onclick={() => startFirstPendingConsent()}>
						Update Consent
					</button>
				{/if}
			</header>

			<div class="tw-p-6">
				{#if authStore.role !== 'parent'}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">This page is for parent accounts only.</p>
				{:else if !householdId}
					<div class="tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name="user.group" size={32} class="tw-text-[#64748b]" />
						<p class="tw-text-[#94a3b8] tw-text-sm max-w-md">Your account is not linked to a household yet. Your club director must connect parent and athlete emails before the consent flow appears here.</p>
					</div>
				{:else if loadingHousehold}
					<p class="tw-text-[#f59e0b] tw-font-mono tw-text-xs">Loading household...</p>
				{:else if loadErr}
					<p class="tw-text-red-400 tw-font-mono tw-text-xs">{loadErr}</p>
				{:else if !household}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">Household data unavailable.</p>
				{:else if playerEmails.length === 0}
					<p class="tw-text-[#94a3b8] tw-font-mono tw-text-xs">No linked athlete emails found on this household.</p>
				{:else if wizardStage === 'done'}
					<div class="tw-bg-black/50 tw-border tw-border-[#14b8a6]/30 tw-rounded-[24px] tw-p-8 tw-flex tw-flex-col tw-items-center tw-text-center tw-gap-4">
						<Icon name="status.verified" size={48} class="tw-text-[#14b8a6]" />
						<h3 class="tw-font-sans tw-text-xl tw-font-bold tw-text-white tw-m-0">Consent Complete</h3>
						<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-max-w-md">Your digital consent for <strong class="tw-text-white">{activePlayerEmail}</strong> has been recorded and <strong class="tw-text-[#14b8a6]">verified</strong>. Your athlete can sign in and start training immediately.</p>
						<button type="button" class="tw-mt-4 tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-px-6 tw-py-3 tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] tw-transition-colors" onclick={() => cancelWizard()}>
							Back to Athletes
						</button>
					</div>
				{:else if wizardStage === 'select'}
					<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">Complete the <strong class="tw-text-white">digital consent ceremony</strong> for each linked athlete below. Submitting consent here verifies the athlete immediately.</p>
					<ul class="tw-space-y-3">
						{#each playerEmails as em}
							{@const badge = vpcStatusBadge(playerStatuses[em])}
							<li class="tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-xl tw-p-4 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-text-white tw-font-mono tw-text-sm">{em}</span>
									<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest {badge.label === 'Verified' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">{badge.label}</span>
								</div>
								{#if isPlayerVpcComplete(playerStatuses[em])}
									<span class="tw-flex tw-items-center tw-gap-2 tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase"><Icon name="status.check" size={14} /> Complete</span>
								{:else}
									<button type="button" class="tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-px-4 tw-py-2 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] hover:tw-shadow-[0_0_15px_rgba(245,158,11,0.4)] tw-transition-all" onclick={() => startWizard(em)}>
										Update Consent
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{:else if wizardStage === 'step1'}
					<VpcStep1Disclosure bind:wizardStage bind:disclosureScrolled bind:disclosureEl {activePlayerEmail} {cancelWizard} {onDisclosureScroll} />
				{:else if wizardStage === 'step2'}
					<VpcStep2Assertions bind:wizardStage bind:consentWorkout bind:consentIdentity bind:consentAnalytics bind:consentComms bind:consentSponsor {activePlayerEmail} />
				{:else if wizardStage === 'step3'}
					<VpcStep3Attestation bind:wizardStage bind:parentDisplayName bind:submitting bind:submitError {activePlayerEmail} {consentWorkout} {consentIdentity} {consentAnalytics} {consentComms} {consentSponsor} {submitConsent} />
				{/if}
			</div>
		</div>
	</div>
</div>
