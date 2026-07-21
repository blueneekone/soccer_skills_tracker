<script lang="ts">
	import type { RecruiterOnboardingEngine } from './RecruiterOnboardingEngine.svelte.js';
	import RecruiterOnboardingHUD from './RecruiterOnboardingHUD.svelte';

	let { engine }: { engine: RecruiterOnboardingEngine } = $props();
</script>

<div class="arena">
	<h1 class="text-2xl font-bold mb-4">Recruiter Onboarding</h1>

	<div class="mb-6">
		<span class="text-sm font-medium text-gray-500 mr-2">Clearance Status:</span>
		{#if !engine.loading}
			<RecruiterOnboardingHUD status={engine.status} />
		{:else}
			<span class="text-sm text-gray-400">Loading...</span>
		{/if}
	</div>

	{#if !engine.loading}
		{#if engine.status === 'not_started' || engine.status === 'pending'}
			<div class="pending-state p-4 bg-gray-50 rounded-md border border-gray-200">
				<h2 class="text-lg font-semibold mb-2">Application Pending</h2>
				<p class="text-sm text-gray-600">Your application is currently pending admin approval. Once approved, you will receive a background check invitation.</p>
			</div>
		{:else if engine.status === 'invited'}
			<div class="invited-state p-4 bg-blue-50 rounded-md border border-blue-200">
				<h2 class="text-lg font-semibold text-blue-800 mb-2">Background Check Required</h2>
				<p class="text-sm text-blue-600 mb-4">Please complete the Checkr background check using the invitation link sent to your email.</p>
				<!-- Checkr embed UI would typically go here -->
			</div>
		{:else if engine.status === 'clear'}
			<div class="cleared-state p-4 bg-green-50 rounded-md border border-green-200">
				<h2 class="text-lg font-semibold text-green-800 mb-2">Clearance Approved</h2>
				<p class="text-sm text-green-600">You are cleared to access prospect data.</p>
			</div>
		{:else}
			<div class="flagged-state p-4 bg-red-50 rounded-md border border-red-200">
				<h2 class="text-lg font-semibold text-red-800 mb-2">Clearance Review Required</h2>
				<p class="text-sm text-red-600">Please contact support regarding your background check status.</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.arena {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
