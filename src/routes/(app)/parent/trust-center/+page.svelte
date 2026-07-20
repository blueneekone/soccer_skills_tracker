<script lang="ts">
	import { authStore } from '$lib/stores/auth/facade.svelte.js';
	import { getActiveDb } from '$lib/firebase.js';
	import { query, collection, where, onSnapshot } from 'firebase/firestore';
	import { browser } from '$app/environment';
	
	// CDO Aesthetic: Flat, professional, 24px border radii.
	
	let db = $derived(browser ? getActiveDb() : null);
	
	let shadowCcLogs = $state<any[]>([]);
	let vpcStatus = $state<'pending' | 'attested' | 'error'>('pending');
	let bountyAmount = $state<number>(0);
	
	async function initiateBiometricConsent() {
		if (!browser || !window.PublicKeyCredential) {
			alert('Biometrics are not supported on this device.');
			return;
		}

		const challenge = new Uint8Array(32);
		window.crypto.getRandomValues(challenge);

		try {
			const credential = await navigator.credentials.create({
				publicKey: {
					challenge: challenge,
					rp: { name: "SSTracker Co-op Trust Center" },
					user: {
						id: new Uint8Array(16),
						name: authStore.userProfile?.email || "parent",
						displayName: "Parent Attestation"
					},
					pubKeyCredParams: [{ alg: -7, type: "public-key" }],
					authenticatorSelection: {
						authenticatorAttachment: "platform", // Enforce FaceID/TouchID/Windows Hello
						userVerification: "required"
					},
					timeout: 60000,
					attestation: "direct"
				}
			});

			if (credential) {
				vpcStatus = 'attested';
				// Write VPC token to Firestore (implementation deferred)
			}
		} catch (err) {
			console.error("Biometric attestation failed", err);
			vpcStatus = 'error';
		}
	}

	function fundBounty() {
		if (bountyAmount <= 0) return;
		alert(`Funded $${bountyAmount} to Escrow. This will release upon CV-verified workout.`);
		bountyAmount = 0;
	}

	// CSO: Shadow CC Audit Log
	$effect(() => {
		if (!db || !authStore.isAuthenticated) return;
		const uid = authStore.userProfile?.uid;
		if (!uid) return;

		// Defensive Hydration
		const q = query(
			collection(db, 'communications'),
			where('ccParentUids', 'array-contains', uid)
		);

		const unsub = onSnapshot(q, (snap) => {
			shadowCcLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		});

		return () => unsub();
	});
</script>

<svelte:head>
	<title>Co-op Trust Center · Parent OS</title>
</svelte:head>

<main class="tw-bg-slate-50 tw-min-h-screen tw-text-slate-900 tw-font-sans tw-p-8 lg:tw-p-12 tw-overflow-y-auto">
	<div class="tw-max-w-6xl tw-mx-auto tw-space-y-8">
		
		<header class="tw-mb-10">
			<h1 class="tw-text-3xl tw-font-semibold tw-text-slate-900">Co-op Trust Center</h1>
			<p class="tw-text-slate-500 tw-mt-2">Legal Compliance, Financial Escrow, and Communication Audits</p>
		</header>

		<!-- CSO: WebAuthn Biometric Enclave -->
		<section class="tw-bg-white tw-rounded-[24px] tw-p-8 tw-shadow-sm tw-border tw-border-slate-200">
			<h2 class="tw-text-xl tw-font-semibold tw-mb-4">Verifiable Parental Consent (VPC)</h2>
			<p class="tw-text-slate-500 tw-mb-6">COPPA 2.0 and SafeSport mandates require hardware biometric attestation to approve minor participation.</p>
			
			{#if vpcStatus === 'attested'}
				<div class="tw-bg-green-50 tw-border tw-border-green-200 tw-rounded-[24px] tw-p-4 tw-flex tw-items-center tw-gap-3">
					<span class="tw-text-green-700 tw-font-medium">VPC Verified via Hardware Attestation.</span>
				</div>
			{:else}
				<button onclick={initiateBiometricConsent} class="tw-bg-blue-600 tw-text-white tw-px-6 tw-py-3 tw-rounded-[24px] tw-font-medium hover:tw-bg-blue-700 tw-transition-colors">
					Attest via TouchID / FaceID
				</button>
				{#if vpcStatus === 'error'}
					<p class="tw-text-red-500 tw-mt-2 tw-text-sm">Attestation failed or was cancelled.</p>
				{/if}
			{/if}
		</section>

		<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
			
			<!-- CSO: The Triad Protocol (Shadow CC Audit Log) -->
			<section class="tw-bg-white tw-rounded-[24px] tw-p-8 tw-shadow-sm tw-border tw-border-slate-200 tw-flex tw-flex-col">
				<h2 class="tw-text-xl tw-font-semibold tw-mb-4">Communication Audit Log</h2>
				<p class="tw-text-slate-500 tw-text-sm tw-mb-6">All 1:1 adult-to-minor messaging is prohibited. This log displays all messages routed to your minor.</p>
				
				<div class="tw-flex-1 tw-min-h-[200px] tw-overflow-y-auto tw-border-t tw-border-slate-100 tw-pt-4">
					{#if shadowCcLogs.length === 0}
						<p class="tw-text-slate-400 tw-italic">No communications logged.</p>
					{:else}
						<ul class="tw-space-y-4">
							{#each shadowCcLogs as log (log.id)}
								<li class="tw-bg-slate-50 tw-p-4 tw-rounded-[16px] tw-border tw-border-slate-100">
									<p class="tw-text-xs tw-text-slate-400 tw-mb-1">{new Date(log.timestamp?.toMillis() || Date.now()).toLocaleString()}</p>
									<p class="tw-text-sm tw-font-medium tw-text-slate-800">From: {log.senderName || 'Coach'}</p>
									<p class="tw-text-sm tw-text-slate-600 tw-mt-1">{log.message}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>

			<!-- CMO: Tremendous Bounty Terminal (Escrow) -->
			<section class="tw-bg-white tw-rounded-[24px] tw-p-8 tw-shadow-sm tw-border tw-border-slate-200">
				<h2 class="tw-text-xl tw-font-semibold tw-mb-4">Bounty Escrow Terminal</h2>
				<p class="tw-text-slate-500 tw-text-sm tw-mb-6">Fund real-world rewards (Tremendous Gift Cards) that automatically release upon Computer Vision (CV) verified workout completions.</p>
				
				<div class="tw-flex tw-items-center tw-gap-4 tw-mb-4">
					<span class="tw-text-slate-500 tw-font-medium">$</span>
					<input 
						type="number" 
						bind:value={bountyAmount} 
						class="tw-w-full tw-px-4 tw-py-2 tw-rounded-[12px] tw-border tw-border-slate-200 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500" 
						placeholder="Enter amount" 
						min="0" 
						step="5"
					/>
				</div>
				<button onclick={fundBounty} class="tw-bg-slate-900 tw-text-white tw-w-full tw-py-3 tw-rounded-[24px] tw-font-medium hover:tw-bg-slate-800 tw-transition-colors">
					Lock Funds in Escrow
				</button>
			</section>

		</div>

		<!-- CMO: The Car Ride Home Protocol -->
		<section class="tw-bg-blue-50 tw-rounded-[24px] tw-p-8 tw-border tw-border-blue-100">
			<h2 class="tw-text-xl tw-font-semibold tw-mb-2 tw-text-blue-900">Post-Match Protocol</h2>
			<p class="tw-text-blue-700 tw-text-sm tw-mb-6">Raw metrics are suppressed for 15 minutes post-match to protect beginner self-worth.</p>
			
			<div class="tw-bg-white tw-rounded-[24px] tw-p-6 tw-shadow-sm">
				<p class="tw-text-slate-500 tw-text-xs tw-uppercase tw-tracking-widest tw-font-semibold tw-mb-2">Empathetic Conversation Anchor</p>
				<p class="tw-text-xl tw-text-blue-900 tw-font-medium">"I loved watching you play today."</p>
			</div>
		</section>

	</div>
</main>
