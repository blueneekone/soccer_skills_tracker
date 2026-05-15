<script lang="ts">
	import { browser } from '$app/environment';
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');

	const profile = $derived(authStore.userProfile);
	const householdId = $derived(
		profile?.householdId ? String(profile.householdId) : ''
	);

	let household = $state(/** @type {Record<string, unknown> | null} */ (null));
	/** @type {Record<string, string>} maps playerEmail -> their vpcStatus */
	let playerStatuses = $state({});
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

	// Wizard step 3 state
	let parentDisplayName = $state('');
	let submitting = $state(false);
	let submitError = $state('');

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

				const emails = Array.isArray(household?.playerEmails)
					? [...new Set(
						household.playerEmails
							.map((e) => String(e || '').trim().toLowerCase())
							.filter(Boolean)
					)]
					: [];

			if (emails.length > 0) {
				const statusMap = {};
				const userSnaps = await Promise.all(
					emails.map((em) => getDoc(doc(db, 'users', em)))
				);
				for (let i = 0; i < emails.length; i++) {
					const ud = userSnaps[i].exists() ? userSnaps[i].data() : {};
					statusMap[emails[i]] = ud?.vpcStatus || 'unknown';
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
			case 'verified': return { label: 'Verified', cls: 'badge--green' };
			case 'not_required': return { label: 'Not required', cls: 'badge--muted' };
			case 'parent_consented': return { label: 'Awaiting director', cls: 'badge--amber' };
			case 'pending':
			case 'pending_parent': return { label: 'Consent required', cls: 'badge--red' };
			default: return { label: 'Unknown', cls: 'badge--muted' };
		}
	}

	function startWizard(playerEmail) {
		activePlayerEmail = playerEmail;
		disclosureScrolled = false;
		consentWorkout = false;
		consentIdentity = false;
		consentAnalytics = false;
		consentComms = false;
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
			const payload = $state.snapshot({
				playerEmail: activePlayerEmail,
				parentDisplayName: parentDisplayName.trim(),
				consentItems: {
					workoutData: consentWorkout,
					identity: consentIdentity,
					analytics: consentAnalytics,
					comms: consentComms,
				},
			});
			await parentGrantVpcConsentFn(payload);
			playerStatuses = {
				...playerStatuses,
				[activePlayerEmail]: 'parent_consented',
			};
			wizardStage = 'done';
		} catch (e) {
			submitError = e instanceof Error ? e.message : String(e);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="view-section">
	<h2 class="view-title">Verifiable parental consent</h2>

	<div class="bento-section">
		<div class="vpc-card">

			{#if authStore.role !== 'parent'}
				<p class="vpc-muted">This page is for parent accounts only.</p>

			{:else if !householdId}
				<div class="vpc-empty-state">
					<Icon name="user.group" class="vpc-empty-state__icon" />
					<p class="vpc-empty-state__text">
						Your account is not linked to a household yet. Your club director must connect parent
						and athlete emails before the consent flow appears here.
					</p>
				</div>

			{:else if loadingHousehold}
				<p class="vpc-muted">Loading household…</p>

			{:else if loadErr}
				<p class="vpc-error" role="alert">{loadErr}</p>

			{:else if !household}
				<p class="vpc-muted">Household data unavailable.</p>

			{:else if playerEmails.length === 0}
				<p class="vpc-muted">No linked athlete emails found on this household.</p>

			{:else if wizardStage === 'done'}
				<!-- ── DONE STATE ─────────────────────────────────────────────── -->
				<div class="vpc-done">
					<div class="vpc-done__icon" aria-hidden="true"><Icon name="status.verified" /></div>
					<h3 class="vpc-done__title">Consent submitted</h3>
					<p class="vpc-done__body">
						Your digital consent for <strong>{activePlayerEmail}</strong> has been recorded.
						Your club director will receive an approval alert and must finalize the VPC in the platform.
					</p>
					<p class="vpc-done__body">
						Status will change from <em>Awaiting director</em> to <em>Verified</em> once the director approves.
					</p>
					<button type="button" class="vpc-btn vpc-btn--primary" onclick={cancelWizard}>
						Back to athletes
					</button>
				</div>

			{:else if wizardStage === 'select'}
				<!-- ── ATHLETE SELECT ─────────────────────────────────────────── -->
				<p class="vpc-intro">
					Complete the <strong>digital consent ceremony</strong> for each linked athlete below.
					Once you submit, your club director will receive an in-platform alert to finalize
					the Verifiable Parental Consent (VPC).
				</p>
				<ul class="vpc-athlete-list">
					{#each playerEmails as em}
						{@const badge = vpcStatusBadge(playerStatuses[em])}
						<li class="vpc-athlete-row">
							<div class="vpc-athlete-row__info">
								<span class="vpc-athlete-row__email">{em}</span>
								<span class="vpc-status-badge {badge.cls}">{badge.label}</span>
							</div>
							{#if playerStatuses[em] === 'verified' || playerStatuses[em] === 'not_required'}
								<span class="vpc-athlete-row__done">
									<Icon name="status.check" /> Complete
								</span>
							{:else if playerStatuses[em] === 'parent_consented'}
								<span class="vpc-athlete-row__done vpc-athlete-row__done--amber">
									Awaiting director approval
								</span>
							{:else}
								<button
									type="button"
									class="vpc-btn vpc-btn--primary vpc-btn--sm"
									onclick={() => startWizard(em)}
								>
									Begin consent ceremony
								</button>
							{/if}
						</li>
					{/each}
				</ul>

			{:else if wizardStage === 'step1'}
				<!-- ── STEP 1: DATA USE DISCLOSURE ───────────────────────────── -->
				<div class="vpc-wizard-header">
					<button type="button" class="vpc-back-btn" onclick={cancelWizard} aria-label="Cancel wizard">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="vpc-wizard-progress">
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--active">1</span>
						<span class="vpc-wizard-progress__line"></span>
						<span class="vpc-wizard-progress__step">2</span>
						<span class="vpc-wizard-progress__line"></span>
						<span class="vpc-wizard-progress__step">3</span>
					</div>
				</div>

				<h3 class="vpc-step-title">Step 1 — Data use disclosure</h3>
				<p class="vpc-step-sub">
					You are consenting on behalf of <strong>{activePlayerEmail}</strong>.
					Read the full disclosure below, then scroll to the bottom to continue.
				</p>

				<div class="vpc-disclosure" role="document" bind:this={disclosureEl} onscroll={onDisclosureScroll}>
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

					<p class="vpc-disclosure__scroll-prompt">
						<Icon name="nav.arrow-down" />
						Scroll to the bottom to confirm you have read this disclosure.
					</p>
				</div>

				<button
					type="button"
					class="vpc-btn vpc-btn--primary {disclosureScrolled ? 'vpc-btn--unlocked' : 'vpc-btn--locked'}"
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
				<!-- ── STEP 2: GRANULAR CONSENT ASSERTIONS ───────────────────── -->
				<div class="vpc-wizard-header">
					<button type="button" class="vpc-back-btn" onclick={() => (wizardStage = 'step1')} aria-label="Back">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="vpc-wizard-progress">
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="vpc-wizard-progress__line vpc-wizard-progress__line--done"></span>
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--active">2</span>
						<span class="vpc-wizard-progress__line"></span>
						<span class="vpc-wizard-progress__step">3</span>
					</div>
				</div>

				<h3 class="vpc-step-title">Step 2 — Consent assertions</h3>
				<p class="vpc-step-sub">
					Review each item and indicate your consent. Items marked <strong>Required</strong> must
					be accepted to proceed.
				</p>

				<ul class="vpc-consent-items">
					<li class="vpc-consent-item">
						<label class="vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentWorkout} />
							<div class="vpc-consent-item__text">
								<strong>Workout &amp; training data <span class="vpc-required-tag">Required</span></strong>
								<span>Allow SSTRACKER to collect and store repetition counts, session logs,
								drill completions, and XP data for {activePlayerEmail}.</span>
							</div>
						</label>
					</li>
					<li class="vpc-consent-item">
						<label class="vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentIdentity} />
							<div class="vpc-consent-item__text">
								<strong>Identity &amp; roster data <span class="vpc-required-tag">Required</span></strong>
								<span>Allow the platform to store the athlete's display name, email address,
								club and team membership, and date of birth for access control.</span>
							</div>
						</label>
					</li>
					<li class="vpc-consent-item">
						<label class="vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentAnalytics} />
							<div class="vpc-consent-item__text">
								<strong>Performance analytics <span class="vpc-optional-tag">Optional</span></strong>
								<span>Allow attribute scoring, leaderboard rankings, and team-comparison
								analytics. Declining will exclude the athlete from club dashboards but
								will not affect training data logging.</span>
							</div>
						</label>
					</li>
					<li class="vpc-consent-item">
						<label class="vpc-consent-item__label">
							<input type="checkbox" bind:checked={consentComms} />
							<div class="vpc-consent-item__text">
								<strong>In-app communications <span class="vpc-optional-tag">Optional</span></strong>
								<span>Allow coaches to send in-app messages and notifications to the athlete
								account.</span>
							</div>
						</label>
					</li>
				</ul>

				<button
					type="button"
					class="vpc-btn vpc-btn--primary"
					disabled={!consentWorkout || !consentIdentity}
					onclick={() => (wizardStage = 'step3')}
				>
					Continue to attestation
				</button>

			{:else if wizardStage === 'step3'}
				<!-- ── STEP 3: IDENTITY ATTESTATION ──────────────────────────── -->
				<div class="vpc-wizard-header">
					<button type="button" class="vpc-back-btn" onclick={() => (wizardStage = 'step2')} aria-label="Back">
						<Icon name="nav.arrow-left" />
					</button>
					<div class="vpc-wizard-progress">
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="vpc-wizard-progress__line vpc-wizard-progress__line--done"></span>
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--done">
							<Icon name="status.check" />
						</span>
						<span class="vpc-wizard-progress__line vpc-wizard-progress__line--done"></span>
						<span class="vpc-wizard-progress__step vpc-wizard-progress__step--active">3</span>
					</div>
				</div>

				<h3 class="vpc-step-title">Step 3 — Digital attestation</h3>
				<p class="vpc-step-sub">
					By entering your legal name and clicking <strong>Submit consent</strong>, you confirm that
					you are the legal parent or guardian of <strong>{activePlayerEmail}</strong> and that you
					have read, understood, and agree to the data use disclosure in Step 1.
				</p>

				<label class="vpc-label" for="vpc-parent-name">Your legal name (as parent / guardian)</label>
				<input
					id="vpc-parent-name"
					type="text"
					class="vpc-input"
					bind:value={parentDisplayName}
					placeholder="e.g. Jane Doe"
					autocomplete="name"
					disabled={submitting}
				/>

				<div class="vpc-attestation-summary">
					<p><strong>Athlete:</strong> {activePlayerEmail}</p>
					<p><strong>Consenting to:</strong></p>
					<ul>
						<li>Workout &amp; training data — <strong>{consentWorkout ? 'Accepted' : 'Declined'}</strong></li>
						<li>Identity &amp; roster data — <strong>{consentIdentity ? 'Accepted' : 'Declined'}</strong></li>
						<li>Performance analytics — <strong>{consentAnalytics ? 'Accepted' : 'Declined'}</strong></li>
						<li>In-app communications — <strong>{consentComms ? 'Accepted' : 'Declined'}</strong></li>
					</ul>
					<p class="vpc-attestation-policy">Policy version: 2026-04 &mdash; {new Date().toLocaleDateString()}</p>
				</div>

				{#if submitError}
					<p class="vpc-error" role="alert">{submitError}</p>
				{/if}

				<button
					type="button"
					class="vpc-btn vpc-btn--primary"
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

<style>
	.vpc-card {
		background: var(--surface-primary, #ffffff);
		border: 1px solid rgba(15, 23, 42, 0.09);
		border-radius: var(--radius-premium, 24px);
		padding: var(--bento-pad);
		box-shadow: var(--shadow-liquid);
	}

	:global(html.dark) .vpc-card {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.vpc-muted {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.vpc-error {
		margin: 0 0 1rem;
		color: #b91c1c;
		font-size: 0.875rem;
		font-weight: 600;
	}
	:global(html.dark) .vpc-error { color: #fca5a5; }

	.vpc-intro {
		margin: 0 0 1.25rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.vpc-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem 1rem;
		text-align: center;
	}
	:global(.vpc-empty-state__icon) {
		width: 2.25rem;
		height: 2.25rem;
		color: var(--text-secondary);
		opacity: 0.45;
	}
	.vpc-empty-state__text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.55;
		max-width: 360px;
	}

	/* Athlete list ─────────────────────────────────────────────────────────── */
	.vpc-athlete-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.vpc-athlete-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		padding: 12px 14px;
		border: 1px solid rgba(15, 23, 42, 0.07);
		border-radius: var(--radius-inner, 12px);
		background: rgba(15, 23, 42, 0.02);
	}

	:global(html.dark) .vpc-athlete-row {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.07);
	}

	.vpc-athlete-row__info {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.vpc-athlete-row__email {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.vpc-athlete-row__done {
		font-size: 0.78rem;
		font-weight: 600;
		color: #16a34a;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.vpc-athlete-row__done--amber { color: #b45309; }
	:global(html.dark) .vpc-athlete-row__done { color: #4ade80; }
	:global(html.dark) .vpc-athlete-row__done--amber { color: #fbbf24; }

	.vpc-status-badge {
		display: inline-block;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 8px;
		border-radius: 9999px;
		border: 1px solid transparent;
	}
	.badge--green  { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
	.badge--amber  { background: #fef3c7; color: #92400e; border-color: #fde68a; }
	.badge--red    { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
	.badge--muted  { background: rgba(15,23,42,0.06); color: var(--text-secondary); }
	:global(html.dark) .badge--green  { background: rgba(22,163,74,.2); color: #4ade80; border-color: rgba(22,163,74,.35); }
	:global(html.dark) .badge--amber  { background: rgba(217,119,6,.2); color: #fbbf24; border-color: rgba(217,119,6,.35); }
	:global(html.dark) .badge--red    { background: rgba(185,28,28,.2); color: #fca5a5; border-color: rgba(185,28,28,.35); }

	/* Done state ──────────────────────────────────────────────────────────── */
	.vpc-done {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.85rem;
		padding: 1rem 0 0.5rem;
	}
	.vpc-done__icon :global(svg) { width: 3rem; height: 3rem; color: #16a34a; }
	:global(html.dark) .vpc-done__icon { color: #4ade80; }
	.vpc-done__title { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary); }
	.vpc-done__body {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.6;
		max-width: 420px;
	}

	/* Wizard chrome ─────────────────────────────────────────────────────────── */
	.vpc-wizard-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.vpc-back-btn {
		background: transparent;
		border: 1px solid rgba(15,23,42,0.12);
		border-radius: 8px;
		padding: 6px 10px;
		cursor: pointer;
		font-size: 1rem;
		color: var(--text-secondary);
		line-height: 1;
		flex-shrink: 0;
		transition: background 0.1s;
	}
	.vpc-back-btn:hover { background: rgba(15,23,42,0.05); }
	:global(html.dark) .vpc-back-btn { border-color: rgba(255,255,255,0.12); }

	.vpc-wizard-progress {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.vpc-wizard-progress__step {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		background: rgba(15,23,42,0.06);
		color: var(--text-secondary);
		border: 1.5px solid rgba(15,23,42,0.12);
		flex-shrink: 0;
		transition: all 0.15s ease;
	}
	:global(html.dark) .vpc-wizard-progress__step {
		background: rgba(255,255,255,0.06);
		border-color: rgba(255,255,255,0.12);
	}
	.vpc-wizard-progress__step--active {
		background: var(--aggie-gold, #f59e0b);
		color: #000;
		border-color: var(--aggie-gold, #f59e0b);
	}
	.vpc-wizard-progress__step--done {
		background: #16a34a;
		color: #fff;
		border-color: #16a34a;
	}
	.vpc-wizard-progress__line {
		height: 2px;
		width: 32px;
		background: rgba(15,23,42,0.12);
		border-radius: 2px;
		flex-shrink: 0;
	}
	:global(html.dark) .vpc-wizard-progress__line { background: rgba(255,255,255,0.1); }
	.vpc-wizard-progress__line--done { background: #16a34a; }

	.vpc-step-title {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.vpc-step-sub {
		margin: 0 0 1.25rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.vpc-disclosure {
		border: 1px solid rgba(15,23,42,0.1);
		border-radius: var(--radius-inner, 12px);
		padding: 1rem 1.1rem;
		margin-bottom: 1.25rem;
		font-size: 0.8rem;
		line-height: 1.65;
		color: var(--text-secondary);
		background: rgba(15,23,42,0.02);
		/* Constrain height so the user must scroll to reach the bottom.
		   Without max-height + overflow-y the content expands to full height,
		   the scroll event never fires, and the accept button stays locked. */
		max-height: min(420px, 55vh);
		overflow-y: auto;
		/* Vanguard thin scrollbar — matches global app.css token */
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 240, 255, 0.35) rgba(15, 23, 42, 0.1);
	}
	:global(html.dark) .vpc-disclosure {
		background: rgba(255,255,255,0.02);
		border-color: rgba(255,255,255,0.08);
	}
	.vpc-disclosure h4 {
		margin: 1rem 0 0.35rem;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.vpc-disclosure h4:first-child { margin-top: 0; }
	.vpc-disclosure p { margin: 0 0 0.65rem; }
	.vpc-disclosure ul { margin: 0 0 0.65rem; padding-left: 1.2rem; }
	.vpc-disclosure li { margin-bottom: 0.35rem; }
	.vpc-disclosure__scroll-prompt {
		text-align: center;
		opacity: 0.55;
		font-style: italic;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 1rem;
	}

	/* Consent checkboxes ────────────────────────────────────────────────────── */
	.vpc-consent-items {
		list-style: none;
		padding: 0;
		margin: 0 0 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.vpc-consent-item {
		border: 1px solid rgba(15,23,42,0.08);
		border-radius: var(--radius-inner, 12px);
		padding: 12px 14px;
		background: rgba(15,23,42,0.015);
		transition: border-color 0.12s;
	}
	:global(html.dark) .vpc-consent-item {
		background: rgba(255,255,255,0.025);
		border-color: rgba(255,255,255,0.07);
	}

	.vpc-consent-item__label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		cursor: pointer;
	}
	.vpc-consent-item__label input[type='checkbox'] {
		margin-top: 3px;
		flex-shrink: 0;
	}
	.vpc-consent-item__text {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 0.85rem;
		color: var(--text-primary);
	}
	.vpc-consent-item__text span {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.vpc-required-tag {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #b91c1c;
		background: #fee2e2;
		border-radius: 4px;
		padding: 1px 5px;
		margin-left: 5px;
		vertical-align: middle;
	}
	:global(html.dark) .vpc-required-tag { background: rgba(185,28,28,.2); color: #fca5a5; }
	.vpc-optional-tag {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		background: rgba(15,23,42,0.07);
		border-radius: 4px;
		padding: 1px 5px;
		margin-left: 5px;
		vertical-align: middle;
	}

	/* Attestation summary ───────────────────────────────────────────────────── */
	.vpc-label {
		display: block;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}

	.vpc-input {
		display: block;
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid rgba(15,23,42,0.15);
		border-radius: 10px;
		font-size: 0.9rem;
		font-family: inherit;
		color: var(--text-primary);
		background: var(--surface-primary, #fff);
		margin-bottom: 1.25rem;
		outline: none;
		transition: border-color 0.12s;
	}
	.vpc-input:focus { border-color: var(--aggie-gold, #f59e0b); }
	:global(html.dark) .vpc-input {
		background: rgba(255,255,255,0.04);
		border-color: rgba(255,255,255,0.12);
		color: var(--text-primary);
	}

	.vpc-attestation-summary {
		background: rgba(15,23,42,0.03);
		border: 1px solid rgba(15,23,42,0.07);
		border-radius: var(--radius-inner, 12px);
		padding: 12px 14px;
		margin-bottom: 1.25rem;
		font-size: 0.82rem;
		color: var(--text-primary);
		line-height: 1.55;
	}
	:global(html.dark) .vpc-attestation-summary {
		background: rgba(255,255,255,0.03);
		border-color: rgba(255,255,255,0.07);
	}
	.vpc-attestation-summary p { margin: 0 0 0.5rem; }
	.vpc-attestation-summary ul { margin: 0 0 0.5rem; padding-left: 1.2rem; }
	.vpc-attestation-summary li { margin-bottom: 0.25rem; }
	.vpc-attestation-policy { font-size: 0.75rem; opacity: 0.55; margin-bottom: 0 !important; }

	/* Shared button ─────────────────────────────────────────────────────────── */
	.vpc-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 11px 18px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		border: none;
		/* z-index: ensure button sits above any glassmorphism backdrop overlays */
		position: relative;
		z-index: 10;
		transition:
			background 0.18s ease,
			opacity 0.18s ease,
			box-shadow 0.25s ease,
			color 0.18s ease,
			border-color 0.18s ease,
			transform 0.12s ease;
		width: 100%;
	}
	.vpc-btn:disabled { cursor: not-allowed; }
	.vpc-btn--sm { width: auto; padding: 7px 13px; font-size: 0.8rem; }

	/* Primary ─────────────────────────────────────────────────────────────── */
	.vpc-btn--primary { background: var(--aggie-gold, #f59e0b); color: #000; }
	.vpc-btn--primary:not(:disabled):hover { background: #d97706; }

	/* Locked state — clearly communicates "not yet" without being invisible */
	.vpc-btn--primary.vpc-btn--locked {
		background: rgba(15, 23, 42, 0.08);
		color: rgba(100, 116, 139, 0.8);
		border: 1px dashed rgba(100, 116, 139, 0.35);
		opacity: 0.65;
		cursor: not-allowed;
		box-shadow: none;
	}
	:global(html.dark) .vpc-btn--primary.vpc-btn--locked {
		background: rgba(255, 255, 255, 0.04);
		color: rgba(148, 163, 184, 0.6);
		border-color: rgba(148, 163, 184, 0.2);
	}

	/* Unlocked state — snaps to a glowing active appearance */
	.vpc-btn--primary.vpc-btn--unlocked {
		background: var(--aggie-gold, #f59e0b);
		color: #000;
		border: 1px solid transparent;
		opacity: 1;
		box-shadow: 0 0 18px rgba(245, 158, 11, 0.45);
		animation: vpc-btn-unlock 0.35s ease-out forwards;
	}
	.vpc-btn--primary.vpc-btn--unlocked:hover {
		background: #d97706;
		box-shadow: 0 0 26px rgba(245, 158, 11, 0.6);
		transform: translateY(-1px);
	}

	@keyframes vpc-btn-unlock {
		0% { transform: scale(0.98); box-shadow: none; }
		60% { transform: scale(1.015); }
		100% { transform: scale(1); box-shadow: 0 0 18px rgba(245, 158, 11, 0.45); }
	}
</style>
