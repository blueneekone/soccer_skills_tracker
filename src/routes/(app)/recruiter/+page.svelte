<script>
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import RecruiterPortal from '$lib/components/recruiter/RecruiterPortal.svelte';

	const canAccess = $derived(
		authStore.role === 'super_admin' ||
			authStore.role === 'global_admin' ||
			authStore.role === 'recruiter' ||
			(licenseEntitlementStore.entitlement &&
				String(licenseEntitlementStore.entitlement.tier || '').toLowerCase() === 'recruiter' &&
				String(licenseEntitlementStore.entitlement.subscription_status || '').toLowerCase() ===
					'active'),
	);

	const loadingEnt = $derived(licenseEntitlementStore.loading);
</script>

<svelte:head>
	<title>Talent Intelligence · NEXUS COMMAND</title>
</svelte:head>

{#if authStore.role === 'super_admin' || authStore.role === 'global_admin' || authStore.role === 'recruiter' || (!loadingEnt && canAccess)}
	<RecruiterPortal />
{:else if !loadingEnt}
	<section class="recruiter-locked">
		<div class="recruiter-locked__icon" aria-hidden="true">⬡</div>
		<h1 class="recruiter-locked__title">TALENT INTEL RESTRICTED</h1>
		<p class="recruiter-locked__lead">
			This intelligence layer requires a <strong>Recruiter</strong> subscription or the
			<code>recruiter</code> custom claim. Upgrade to unlock verified athlete profiles without
			exposing PII from core roster collections.
		</p>
		<button type="button" class="recruiter-locked__btn" onclick={() => goto('/upgrade')}>
			VIEW PRICING
		</button>
	</section>
{:else}
	<p class="recruiter-checking">AUTHENTICATING CLEARANCE LEVEL…</p>
{/if}

<style>
	.recruiter-locked {
		max-width: 480px;
		margin: clamp(32px, 6vw, 64px) auto;
		padding: clamp(24px, 4vw, 40px);
		border: 1px solid rgba(0, 240, 255, 0.12);
		background: rgba(1, 4, 9, 0.9);
		backdrop-filter: blur(24px);
		border-radius: 16px;
		text-align: center;
		font-family: 'JetBrains Mono', monospace;
	}
	.recruiter-locked__icon {
		font-size: 2.5rem;
		color: rgba(0, 240, 255, 0.25);
		line-height: 1;
		margin-bottom: 1rem;
	}
	.recruiter-locked__title {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: white;
	}
	.recruiter-locked__lead {
		margin: 0 0 1.5rem;
		line-height: 1.6;
		color: rgba(148, 163, 184, 0.7);
		font-size: 0.7rem;
		letter-spacing: 0.04em;
	}
	.recruiter-locked__lead code {
		font-family: inherit;
		padding: 1px 5px;
		border-radius: 3px;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.15);
		color: #00f0ff;
	}
	.recruiter-locked__btn {
		padding: 0.65rem 1.6rem;
		border-radius: 8px;
		border: 1px solid rgba(0, 240, 255, 0.35);
		background: rgba(0, 240, 255, 0.06);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		color: #00f0ff;
		cursor: pointer;
		transition: background 0.2s, box-shadow 0.2s;
		min-height: 44px;
	}
	.recruiter-locked__btn:hover {
		background: rgba(0, 240, 255, 0.12);
		box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
	}
	.recruiter-checking {
		text-align: center;
		color: rgba(148, 163, 184, 0.5);
		padding: 48px 16px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
	}
</style>
