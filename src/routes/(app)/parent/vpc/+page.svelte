<script lang="ts">
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc } from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import '$lib/styles/parent-vpc-trust-band.css';
	const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');

	const profile = $derived(authStore.userProfile);
	const householdId = $derived(
		profile?.householdId ? String(profile.householdId) : ''
	);

	let household = $state(/** @type {Record<string, unknown> | null} */ (null));
	let playerStatuses = $state<Record<string, string>>({});
	let loadErr = $state('');
	let loadingHousehold = $state(true);

	/** @type {'select' | 'step1' | 'step2' | 'step3' | 'done'} */
	let wizardStage = $state('select');
	let activePlayerEmail = $state('');

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
	$effect(() => {
		if (wizardStage !== 'step1') return;
		const el = disclosureEl;
		if (!el) return;
		// Use rAF to let the DOM settle after Svelte renders the disclosure block.
		const id = requestAnimationFrame(() => {
			if (el.scrollHeight <= el.clientHeight + 10) {
				disclosureScrolled = true;
			}
		});
		return () => cancelAnimationFrame(id);
	});

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
			await parentGrantVpcConsentFn(payload);
			await reloadPlayerStatus(activePlayerEmail);
			wizardStage = 'done';
		} catch (e) {
			submitError = e instanceof Error ? e.message : String(e);
			if (submitError.includes('NotAllowedError')) {
				submitError = 'Biometric attestation failed or was cancelled. Consent requires FaceID/TouchID verification.';
			}
		} finally {
			submitting = false;
		}
	}
</script>

<div class="parent-vpc-trust-band">
	<div class="parent-vpc-z1-well">
		<div class="parent-vpc-z2-panel">
			{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0 && wizardStage !== 'done'}
				<span
					class="parent-vpc-minimal-badge parent-vpc-minimal-badge--{aggregateTrustStatus === 'verified'
						? 'verified'
						: 'pending'}"
					aria-hidden="true"
				>
					{aggregateTrustStatus === 'verified' ? 'Verified' : 'Required'}
				</span>
			{/if}

			<header class="parent-vpc-trust-hero">
				<div class="parent-vpc-z3-shield" aria-hidden="true">
					<Icon name="status.seal-check" />
				</div>
				<div class="parent-vpc-trust-hero__body">
					<h2 class="parent-vpc-trust-hero__title">Verifiable parental consent</h2>
					{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0}
						<p
							class="parent-vpc-status-label parent-vpc-status-label--{aggregateTrustStatus === 'verified'
								? 'verified'
								: 'pending'}"
						>
							{aggregateTrustStatus === 'verified'
								? 'All linked athletes verified'
								: 'Consent required for one or more athletes'}
						</p>
					{:else}
						<p class="parent-vpc-status-label parent-vpc-status-label--muted">
							COPPA / FERPA compliance gate
						</p>
					{/if}
				</div>
				{#if authStore.role === 'parent' && householdId && !loadingHousehold && !loadErr && household && playerEmails.length > 0 && wizardStage === 'select' && firstPendingEmail}
					<button
						type="button"
						class="parent-vpc-btn-update"
						onclick={startFirstPendingConsent}
					>
						Update consent
					</button>
				{/if}
			</header>

			<div class="parent-vpc-z1-stack">
			{#if authStore.role !== 'parent'}
				<p class="parent-vpc-muted">This page is for parent accounts only.</p>

			{:else if !householdId}
				<div class="parent-vpc-empty-state">
					<Icon name="user.group" class="parent-vpc-empty-state__icon" />
					<p class="parent-vpc-empty-state__text">
						Your account is not linked to a household yet. Your club director must connect parent
						and athlete emails before the consent flow appears here.
					</p>
				</div>

			{:else if loadingHousehold}
				<p class="parent-vpc-muted">Loading household…</p>

			{:else if loadErr}
				<p class="parent-vpc-error" role="alert">{loadErr}</p>

			{:else if !household}
				<p class="parent-vpc-muted">Household data unavailable.</p>

			{:else if playerEmails.length === 0}
				<p class="parent-vpc-muted">No linked athlete emails found on this household.</p>

			{:else if wizardStage === 'done'}
				<div class="parent-vpc-done">
					<div class="parent-vpc-done__icon" aria-hidden="true"><Icon name="status.verified" /></div>
					<h3 class="parent-vpc-done__title">Consent complete</h3>
					<p class="parent-vpc-done__body">
						Your digital consent for <strong>{activePlayerEmail}</strong> has been recorded and
						<strong>verified</strong>. Your athlete can sign in and start training immediately.
					</p>
					<button type="button" class="parent-vpc-btn-update" onclick={cancelWizard}>
						Back to athletes
					</button>
				</div>

			{:else if wizardStage === 'select'}
				<p class="parent-vpc-intro">
					Complete the <strong>digital consent ceremony</strong> for each linked athlete below.
					Submitting consent here verifies the athlete immediately — your athlete can train as soon
					as you finish.
				</p>
				<ul class="parent-vpc-athlete-list">
					{#each playerEmails as em}
						{@const badge = vpcStatusBadge(playerStatuses[em])}
						<li class="parent-vpc-athlete-row">
							<div class="parent-vpc-athlete-row__info">
								<span class="parent-vpc-athlete-row__email">{em}</span>
								<span class="parent-vpc-status-chip {badge.cls}">{badge.label}</span>
							</div>
							{#if isPlayerVpcComplete(playerStatuses[em])}
								<span class="parent-vpc-athlete-row__done">
									<Icon name="status.check" /> Complete
								</span>
							{:else}
								<button
									type="button"
									class="parent-vpc-btn-update parent-vpc-btn-update--sm"
									onclick={() => startWizard(em)}
								>
									Update consent
								</button>
							{/if}
						</li>
					{/each}
				</ul>

			{:else if wizardStage === 'step1'}
				<div class="parent-vpc-wizard-header">
					<button type="button" class="parent-vpc-back-btn" onclick={cancelWizard} aria-label="Cancel wizard">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="parent-vpc-wizard-progress">
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--active">1</span>
						<span class="parent-vpc-wizard-progress__line"></span>
						<span class="parent-vpc-wizard-progress__step">2</span>
						<span class="parent-vpc-wizard-progress__line"></span>
						<span class="parent-vpc-wizard-progress__step">3</span>
					</div>
				</div>

				<h3 class="parent-vpc-step-title">Step 1 — Data use disclosure</h3>
				<p class="parent-vpc-step-sub">
					You are consenting on behalf of <strong>{activePlayerEmail}</strong>.
					Read the full disclosure below, then scroll to the bottom to continue.
				</p>

				<div class="parent-vpc-disclosure" role="document" bind:this={disclosureEl} onscroll={onDisclosureScroll}>
					<h4>What data we collect</h4>
					<p>We collect the following categories of personal data for athletes registered through
					SSTRACKER, the Soccer Skills Development platform:</p>
					<ul>
						<li><strong>Identity data:</strong> athlete display name, email address, date of birth, team
						roster membership, and club affiliation.</li>
						<li><strong>Workout &amp; training data:</strong> repetition counts, training sets, session
						timestamps, video trial submissions, assigned drill completions, and XP / level progress.</li>
						<li><strong>Analytics data:</strong> aggregate performance metrics, attribute scores (speed,
						agility, technique, etc.), and positional comparisons within the club.</li>
						<li><strong>Communication data:</strong> in-app messages between coaches and athletes,
						notification delivery receipts.</li>
					</ul>

					<h4>How we use this data</h4>
					<p>Data is used exclusively to:</p>
					<ul>
						<li>Display the athlete's progress to the athlete, their parent/guardian, their coach,
						and their club director within their shared organizational scope.</li>
						<li>Enable coaches to assign, review, and approve training activities.</li>
						<li>Generate aggregate, de-identified club analytics for directors.</li>
					</ul>
					<p>We do <strong>not</strong> sell athlete data. We do <strong>not</strong> share data with
					third-party advertisers. Analytics data may be processed by Firebase/Google infrastructure
					subject to Google's sub-processor privacy terms.</p>

					<h4>Data retention and deletion</h4>
					<p>Minor athlete data is subject to time-limited retention. If parental consent is
					withdrawn or not verified within the platform's configured TTL window, all training data,
					passports, evaluation records, and roster memberships will be permanently purged and the
					associated Firebase Authentication account will be anonymized. You may request immediate
					deletion by contacting your club director at any time.</p>

					<h4>Your rights under COPPA &amp; FERPA</h4>
					<p>Under the Children's Online Privacy Protection Act (COPPA) and Family Educational Rights
					and Privacy Act (FERPA), you have the right to:</p>
					<ul>
						<li>Review all personal data collected about your child.</li>
						<li>Request correction or deletion of inaccurate data.</li>
						<li>Withdraw consent at any time (subject to reasonable processing delays).</li>
						<li>Receive a copy of any stored data within 30 days of a written request to your
						club director.</li>
					</ul>

					<h4>Policy version</h4>
					<p>This disclosure is version <strong>2026-04</strong>, effective April 2026.</p>

					<p class="parent-vpc-disclosure__scroll-prompt">
						<Icon name="nav.arrow-down" />
						Scroll to the bottom to confirm you have read this disclosure.
					</p>
				</div>

				<button
					type="button"
					class="parent-vpc-btn-update parent-vpc-btn-update--block {disclosureScrolled
						? ''
						: 'parent-vpc-btn-update--locked'}"
					disabled={!disclosureScrolled}
					aria-disabled={!disclosureScrolled}
					onclick={() => (wizardStage = 'step2')}
				>
					{#if disclosureScrolled}
						<Icon name="status.verified" />
						I have read the disclosure — continue
					{:else}
						<Icon name="nav.arrow-down" />
						Scroll to the bottom to continue ↓
					{/if}
				</button>

			{:else if wizardStage === 'step2'}
				<div class="parent-vpc-wizard-header">
					<button type="button" class="parent-vpc-back-btn" onclick={() => (wizardStage = 'step1')} aria-label="Back">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="parent-vpc-wizard-progress">
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="parent-vpc-wizard-progress__line parent-vpc-wizard-progress__line--done"></span>
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--active">2</span>
						<span class="parent-vpc-wizard-progress__line"></span>
						<span class="parent-vpc-wizard-progress__step">3</span>
					</div>
				</div>

				<h3 class="parent-vpc-step-title">Step 2 — Consent assertions</h3>
				<p class="parent-vpc-step-sub">
					Review each item and indicate your consent. Items marked <strong>Required</strong> must
					be accepted to proceed.
				</p>

				<ul class="parent-vpc-consent-items">
					<li class="parent-vpc-consent-item">
						<label class="parent-vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentWorkout} />
							<div class="parent-vpc-consent-item__text">
								<strong>Workout &amp; training data <span class="parent-vpc-required-tag">Required</span></strong>
								<span>Allow SSTRACKER to collect and store repetition counts, session logs,
								drill completions, and XP data for {activePlayerEmail}.</span>
							</div>
						</label>
					</li>
					<li class="parent-vpc-consent-item">
						<label class="parent-vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentIdentity} />
							<div class="parent-vpc-consent-item__text">
								<strong>Identity &amp; roster data <span class="parent-vpc-required-tag">Required</span></strong>
								<span>Allow the platform to store the athlete's display name, email address,
								club and team membership, and date of birth for access control.</span>
							</div>
						</label>
					</li>
					<li class="parent-vpc-consent-item">
						<label class="parent-vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentAnalytics} />
							<div class="parent-vpc-consent-item__text">
								<strong>Performance analytics <span class="parent-vpc-optional-tag">Optional</span></strong>
								<span>Allow attribute scoring, leaderboard rankings, and team-comparison
								analytics. Declining will exclude the athlete from club dashboards but
								will not affect training data logging.</span>
							</div>
						</label>
					</li>
					<li class="parent-vpc-consent-item">
						<label class="parent-vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentComms} />
							<div class="parent-vpc-consent-item__text">
								<strong>In-app communications <span class="parent-vpc-optional-tag">Optional</span></strong>
								<span>Allow coaches to send in-app messages and notifications to the athlete
								account.</span>
							</div>
						</label>
					</li>
					<li class="parent-vpc-consent-item">
						<label class="parent-vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentSponsor} />
							<div class="parent-vpc-consent-item__text">
								<strong>Sponsor &amp; partner updates <span class="parent-vpc-optional-tag">Optional</span></strong>
								<span>Receive director-approved club partner announcements in your guardian inbox.
								Separate from coach team messages. Never sent to minor accounts.</span>
							</div>
						</label>
					</li>
				</ul>

				<button
					type="button"
					class="parent-vpc-btn-update parent-vpc-btn-update--block"
					disabled={!consentWorkout || !consentIdentity}
					onclick={() => (wizardStage = 'step3')}
				>
					Continue to attestation
				</button>

			{:else if wizardStage === 'step3'}
				<div class="parent-vpc-wizard-header">
					<button type="button" class="parent-vpc-back-btn" onclick={() => (wizardStage = 'step2')} aria-label="Back">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="parent-vpc-wizard-progress">
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="parent-vpc-wizard-progress__line parent-vpc-wizard-progress__line--done"></span>
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="parent-vpc-wizard-progress__line parent-vpc-wizard-progress__line--done"></span>
						<span class="parent-vpc-wizard-progress__step parent-vpc-wizard-progress__step--active">3</span>
					</div>
				</div>

				<h3 class="parent-vpc-step-title">Step 3 — Digital attestation</h3>
				<p class="parent-vpc-step-sub">
					By entering your legal name and clicking <strong>Submit consent</strong>, you confirm that
					you are the legal parent or guardian of <strong>{activePlayerEmail}</strong> and that you
					have read, understood, and agree to the data use disclosure in Step 1.
				</p>

				<label class="parent-vpc-label" for="vpc-parent-name">Your legal name (as parent / guardian)</label>
				<input
					id="vpc-parent-name"
					type="text"
					class="parent-vpc-input"
					bind:value={parentDisplayName}
					placeholder="e.g. Jane Doe"
					autocomplete="name"
					disabled={submitting}
				/>

				<div class="parent-vpc-attestation-summary">
					<p><strong>Athlete:</strong> {activePlayerEmail}</p>
					<p><strong>Consenting to:</strong></p>
					<ul>
						<li>Workout &amp; training data — <strong>{consentWorkout ? 'Accepted' : 'Declined'}</strong></li>
						<li>Identity &amp; roster data — <strong>{consentIdentity ? 'Accepted' : 'Declined'}</strong></li>
						<li>Performance analytics — <strong>{consentAnalytics ? 'Accepted' : 'Declined'}</strong></li>
						<li>In-app communications — <strong>{consentComms ? 'Accepted' : 'Declined'}</strong></li>
						<li>Sponsor &amp; partner updates — <strong>{consentSponsor ? 'Accepted' : 'Declined'}</strong></li>
					</ul>
					<p class="parent-vpc-attestation-policy">Policy version: 2026-04 &mdash; {new Date().toLocaleDateString()}</p>
				</div>

				{#if submitError}
					<p class="parent-vpc-error" role="alert">{submitError}</p>
				{/if}

				<button
					type="button"
					class="parent-vpc-btn-update parent-vpc-btn-update--block"
					disabled={submitting || !parentDisplayName.trim()}
					onclick={submitConsent}
				>
					{#if submitting}
						<Icon name="status.loading" /> Submitting…
					{:else}
						<Icon name="status.seal-check" /> Submit consent
					{/if}
				</button>
			{/if}
			</div>
		</div>
	</div>
</div>
