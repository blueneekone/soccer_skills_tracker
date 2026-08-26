<script lang="ts">
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { query, collection, where, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { goto } from '$app/navigation';

	// B815 Defensive Hydration
	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
	});

	let selectedRole = $state<string | null>(null);
	let childName = $state('');
	let isVpcTriggered = $state(false);
	let searchError = $state('');
	let isSearching = $state(false);

	const roles = [
		{ id: 'commissioner', label: 'Commissioner' },
		{ id: 'director', label: 'Director' },
		{ id: 'coach', label: 'Coach' },
		{ id: 'Guardian', label: 'Guardian' }
	];

	function selectRole(roleId: string) {
		selectedRole = roleId;
	}

	async function submitGuardian() {
		if (!childName.trim() || !db) return;
		isSearching = true;
		searchError = '';

		try {
			const q = query(
				collection(db, 'player_lookup'),
				where('playerName', '==', childName.trim())
			);
			const snap = await getDocs(q);

			if (snap.empty) {
				searchError = 'No player stub found with that name.';
			} else {
				// Trigger VPC Gate via Cloud Function
				const generateVpcChallenge = httpsCallable(functions, 'generateVpcChallenge');
				await generateVpcChallenge({ playerName: childName.trim() });
				isVpcTriggered = true;
			}
		} catch (err) {
			console.error('[clearance] Guardian lookup failed', err);
			searchError = 'An error occurred during verification.';
		} finally {
			isSearching = false;
		}
	}
</script>

<div class="tw-min-h-[100dvh] tw-w-full tw-bg-[#0a0a0a] tw-text-gray-100 tw-p-8 tw-box-border tw-font-sans">
	<div class="tw-max-w-4xl tw-mx-auto tw-grid tw-grid-cols-12 tw-gap-6">
		<div class="tw-col-span-12 md:tw-col-span-8 md:tw-col-start-3">
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-[24px] tw-p-10 tw-shadow-2xl">

				<header class="tw-mb-8 tw-text-center">
					<h1 class="tw-text-3xl tw-font-bold tw-tracking-tight tw-mb-2">Clearance Vault</h1>
					<p class="tw-text-[#94a3b8] tw-text-sm tw-tracking-wide">Select your clearance profile to proceed.</p>
				</header>

				{#if isVpcTriggered}
					<div class="tw-bg-emerald-900/20 tw-border tw-border-emerald-500/30 tw-rounded-[24px] tw-p-6 tw-text-center">
						<h2 class="tw-text-emerald-400 tw-font-bold tw-text-lg tw-mb-2">VPC Verification Triggered</h2>
						<p class="tw-text-emerald-200/70 tw-text-sm">
							Please check your email to complete the Verifiable Parental Consent process.
						</p>
					</div>
				{:else if !selectedRole && (!authStore.role || authStore.role === 'unassigned')}
					<div class="tw-flex tw-flex-col tw-gap-4">
						{#each roles as role}
							<button
								class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6] hover:tw-bg-[#1e293b]/80 tw-transition-colors tw-py-4 tw-px-6 tw-rounded-[24px] tw-text-left tw-font-medium tw-text-gray-200"
								onclick={() => selectRole(role.id)}
							>
								{role.label}
							</button>
						{/each}
					</div>
				{:else if selectedRole === 'Guardian'}
					<div class="tw-flex tw-flex-col tw-gap-6">
						<p class="tw-text-[#94a3b8] tw-text-sm tw-text-center">
							Please enter your child's exact name as it appears on the roster.
						</p>

						<div class="tw-flex tw-flex-col tw-gap-2">
							<input
								type="text"
								bind:value={childName}
								placeholder="Player Name"
								class="tw-w-full tw-bg-[#0a0a0a] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-rounded-[24px] tw-py-3 tw-px-4 tw-text-gray-100 tw-outline-none tw-transition-colors"
								disabled={isSearching}
							/>
							{#if searchError}
								<p class="tw-text-red-400 tw-text-xs tw-mt-1 tw-pl-2">{searchError}</p>
							{/if}
						</div>

						<button
							class="tw-w-full tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-black tw-font-bold tw-py-4 tw-px-6 tw-rounded-[24px] tw-transition-colors tw-disabled:opacity-50"
							onclick={submitGuardian}
							disabled={isSearching || !childName.trim()}
						>
							{isSearching ? 'VERIFYING...' : 'VERIFY PLAYER'}
						</button>

						<button
							class="tw-text-xs tw-text-[#94a3b8] hover:tw-text-gray-300 tw-mt-4"
							onclick={() => selectRole('')}
						>
							&larr; Back to Role Selection
						</button>
					</div>
				{:else}
					<div class="tw-text-center tw-py-8">
						<p class="tw-text-[#94a3b8]">This role routing is currently under construction.</p>
						<button
							class="tw-text-xs tw-text-[#14b8a6] hover:tw-text-teal-300 tw-mt-6"
							onclick={() => selectRole('')}
						>
							&larr; Back to Role Selection
						</button>
					</div>
				{/if}

			</div>
		</div>
	</div>
</div>
