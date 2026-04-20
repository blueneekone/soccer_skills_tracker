<script>
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import RecruiterSearchEngine from '$lib/components/recruiter/RecruiterSearchEngine.svelte';

	const canAccess = $derived(
		authStore.role === 'super_admin' ||
			(licenseEntitlementStore.entitlement &&
				String(licenseEntitlementStore.entitlement.tier || '').toLowerCase() === 'recruiter' &&
				String(licenseEntitlementStore.entitlement.subscription_status || '').toLowerCase() ===
					'active'),
	);

	const loadingEnt = $derived(licenseEntitlementStore.loading);
</script>

<svelte:head>
	<title>Recruiter marketplace · SSTRACKER</title>
</svelte:head>

{#if authStore.role === 'super_admin' || (!loadingEnt && canAccess)}
	<RecruiterSearchEngine />
{:else if !loadingEnt}
	<section class="recruiter-locked glass-panel">
		<h1 class="recruiter-locked-title">Recruiter access required</h1>
		<p class="recruiter-locked-lead">
			This intelligence layer is limited to organizations with an active <strong>Recruiter</strong> Stripe
			subscription. Upgrade to search verified athletes without exposing raw roster or PII from core
			collections.
		</p>
		<button type="button" class="primary-btn" onclick={() => goto('/pricing')}>
			View pricing
		</button>
	</section>
{:else}
	<p class="recruiter-loading">Checking subscription…</p>
{/if}

<style>
	.recruiter-locked {
		max-width: 520px;
		margin: clamp(24px, 5vw, 48px) auto;
		padding: clamp(22px, 4vw, 32px);
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(15, 23, 42, 0.75);
		color: #e2e8f0;
	}

	.recruiter-locked-title {
		margin: 0 0 12px;
		font-size: 1.35rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.recruiter-locked-lead {
		margin: 0 0 20px;
		line-height: 1.55;
		color: #94a3b8;
		font-size: 0.95rem;
	}

	.recruiter-loading {
		text-align: center;
		color: #94a3b8;
		padding: 48px 16px;
	}
</style>
