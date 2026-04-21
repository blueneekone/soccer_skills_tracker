<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { auth } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';

	const userEmail = $derived(authStore.user?.email || '');
	const vpcStatus = $derived(authStore.userProfile?.vpcStatus || '');
	const statusLabel = $derived(() => {
		switch (vpcStatus) {
			case 'pending': return 'Pending — Awaiting parent';
			case 'pending_parent': return 'Pending — Awaiting parent';
			case 'parent_consented': return 'Parent consented — Awaiting director approval';
			default: return vpcStatus || 'Pending';
		}
	});

	let refreshing = $state(false);
	let copyDone = $state(false);

	// If VPC was approved in another session, redirect immediately.
	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const status = authStore.userProfile?.vpcStatus;
		if (status === 'verified' || status === 'not_required') {
			untrack(() => {
				const dest = applyLoginWaterfall(authStore.role, authStore.userProfile);
				goto(dest, { replaceState: true });
			});
		}
	});

	async function refreshStatus() {
		if (refreshing) return;
		refreshing = true;
		try {
			await authStore.refresh({ silent: false });
		} catch (e) {
			console.error('[vpc-pending] refresh error', e);
		} finally {
			refreshing = false;
		}
	}

	function copyParentLink() {
		if (!browser) return;
		const base = window.location.origin;
		const link = `${base}/parent/vpc`;
		navigator.clipboard.writeText(link).then(() => {
			copyDone = true;
			setTimeout(() => (copyDone = false), 2500);
		});
	}
</script>

<div class="vpc-pending-page">
	<div class="vpc-pending-card">
		<div class="vpc-pending__icon" aria-hidden="true">
			<i class="ph ph-lock-key-open"></i>
		</div>

		<h1 class="vpc-pending__title">Parental consent required</h1>
		<p class="vpc-pending__subtitle">
			Your account is in a privacy-protected holding state while parental consent is verified.
			You will gain full access once a parent completes the consent ceremony and your club director
			approves the request.
		</p>

		<div class="vpc-pending__status-row">
			<span class="vpc-pending__status-dot" aria-hidden="true"></span>
			<span class="vpc-pending__status-text">{statusLabel()}</span>
		</div>

		{#if userEmail}
			<div class="vpc-pending__info-block">
				<p class="vpc-pending__info-label">Your athlete account</p>
				<p class="vpc-pending__info-value">{userEmail}</p>
			</div>
		{/if}

		<div class="vpc-pending__steps">
			<h2 class="vpc-pending__steps-title">Next steps for your parent or guardian</h2>
			<ol class="vpc-pending__step-list">
				<li>
					<strong>Create a Parent account</strong> using the same platform at
					<a href="/login" target="_blank" rel="noopener noreferrer">{browser ? window.location.origin : ''}/login</a>.
					Select <em>Parent / guardian</em> during setup.
				</li>
				<li>
					<strong>Link to your athlete</strong> — your club director will link your household
					after the parent account is set up.
				</li>
				<li>
					<strong>Complete the consent ceremony</strong> at
					<em>Parent dashboard → Consent</em>. They must review the data-use disclosure and
					sign the digital attestation.
				</li>
				<li>
					<strong>Await director approval</strong> — your club director will receive an
					in-platform alert and approve the final VPC request.
				</li>
			</ol>
		</div>

		<div class="vpc-pending__actions">
			<button
				type="button"
				class="vpc-pending__btn vpc-pending__btn--outline"
				onclick={copyParentLink}
			>
				<i class="ph {copyDone ? 'ph-check' : 'ph-copy'}" aria-hidden="true"></i>
				{copyDone ? 'Copied!' : 'Copy parent consent link'}
			</button>
			<button
				type="button"
				class="vpc-pending__btn vpc-pending__btn--primary"
				disabled={refreshing}
				onclick={refreshStatus}
			>
				<i class="ph {refreshing ? 'ph-spinner' : 'ph-arrow-clockwise'}" aria-hidden="true"></i>
				{refreshing ? 'Checking…' : 'Refresh my status'}
			</button>
		</div>

		<p class="vpc-pending__footer-note">
			Questions? Contact your club director directly — they can expedite the approval process.
		</p>
	</div>
</div>

<style>
	.vpc-pending-page {
		min-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1.5rem, 4vw, 3rem) 1rem;
	}

	.vpc-pending-card {
		width: 100%;
		max-width: 540px;
		background: var(--surface-primary, #ffffff);
		border: 1px solid rgba(15, 23, 42, 0.09);
		border-radius: var(--radius-premium, 24px);
		padding: clamp(1.75rem, 5vw, 3rem);
		box-shadow: var(--shadow-liquid);
		text-align: center;
	}

	:global(html.dark) .vpc-pending-card {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.vpc-pending__icon {
		font-size: 3rem;
		color: var(--aggie-gold, #f59e0b);
		margin-bottom: 1rem;
		line-height: 1;
	}

	.vpc-pending__title {
		margin: 0 0 0.75rem;
		font-size: clamp(1.25rem, 3vw, 1.6rem);
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.vpc-pending__subtitle {
		margin: 0 0 1.25rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.vpc-pending__status-row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 9999px;
		padding: 6px 14px;
		margin-bottom: 1.25rem;
	}

	.vpc-pending__status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
		flex-shrink: 0;
	}

	.vpc-pending__status-text {
		font-size: 0.78rem;
		font-weight: 700;
		color: #b45309;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	:global(html.dark) .vpc-pending__status-text {
		color: #fbbf24;
	}

	.vpc-pending__info-block {
		background: rgba(15, 23, 42, 0.04);
		border: 1px solid rgba(15, 23, 42, 0.06);
		border-radius: var(--radius-inner, 12px);
		padding: 10px 14px;
		margin-bottom: 1.5rem;
		text-align: left;
	}

	:global(html.dark) .vpc-pending__info-block {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.07);
	}

	.vpc-pending__info-label {
		margin: 0 0 2px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.vpc-pending__info-value {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.vpc-pending__steps {
		text-align: left;
		margin-bottom: 1.75rem;
	}

	.vpc-pending__steps-title {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.vpc-pending__step-list {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.vpc-pending__step-list li {
		font-size: 0.875rem;
		color: var(--text-primary);
		line-height: 1.55;
	}

	.vpc-pending__step-list a {
		color: var(--brand-primary, #2563eb);
		text-decoration: underline;
	}

	.vpc-pending__actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 1.25rem;
	}

	@media (min-width: 420px) {
		.vpc-pending__actions {
			flex-direction: row;
		}
		.vpc-pending__btn {
			flex: 1;
		}
	}

	.vpc-pending__btn {
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
		transition: background 0.12s ease, opacity 0.12s ease;
	}

	.vpc-pending__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.vpc-pending__btn--primary {
		background: var(--aggie-gold, #f59e0b);
		color: #000;
		border: none;
	}

	.vpc-pending__btn--primary:not(:disabled):hover {
		background: #d97706;
	}

	.vpc-pending__btn--outline {
		background: transparent;
		color: var(--text-primary);
		border: 1px solid rgba(15, 23, 42, 0.15);
	}

	:global(html.dark) .vpc-pending__btn--outline {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.vpc-pending__btn--outline:hover {
		background: rgba(15, 23, 42, 0.04);
	}

	.vpc-pending__footer-note {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-secondary);
		opacity: 0.75;
	}
</style>
