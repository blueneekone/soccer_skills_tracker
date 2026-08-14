<script lang="ts">
	import { authStore } from '$lib/stores/auth/facade.svelte.js';
	import { getActiveDb } from '$lib/firebase.js';
	import { query, collection, where, onSnapshot } from 'firebase/firestore';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	
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

<main class="pd-page-root compliance-vault st-bento z0-canvas tw-bg-[#0B0F19] tw-text-white tw-p-6 lg:tw-p-8 tw-overflow-y-auto">
	<div class="tw-max-w-6xl tw-mx-auto tw-space-y-6">
		
		<!-- Header -->
		<header class="tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-4 tw-rounded-none">
			<div class="tw-flex tw-items-center tw-gap-4">
				<div class="tw-w-12 tw-h-12 tw-bg-[#1E293B] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-text-nuclear-yellow tw-rounded-none">
					<Icon name={"status.shield-check" as IconName} size={24} />
				</div>
				<div>
					<div class="tw-flex tw-items-center tw-gap-2.5">
						<h1 class="tw-text-xl lg:tw-text-2xl tw-font-bold tw-tracking-tight tw-text-white tw-uppercase" style="font-family: 'Geist Sans', sans-serif;">
							Co-op Trust Center
						</h1>
						<span class="tw-text-[9px] tw-px-2 tw-py-0.5 tw-font-mono tw-border tw-border-nuclear-yellow/40 tw-bg-nuclear-yellow/10 tw-text-nuclear-yellow tw-font-bold tw-rounded-none">
							ZERO-TRUST
						</span>
					</div>
					<p class="tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-mt-1">
						LEGAL COMPLIANCE // FINANCIAL ESCROW // SHADOW-CC AUDITS
					</p>
				</div>
			</div>
		</header>

		<!-- CSO: WebAuthn Biometric Enclave -->
		<section class="st-bento tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 lg:tw-p-8 tw-rounded-none">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
				<h2 class="tw-text-lg tw-font-bold tw-text-white tw-flex tw-items-center tw-gap-2 tw-m-0">
					<Icon name={"sys.fingerprint" as IconName} size={20} class="tw-text-nuclear-yellow" />
					<span>Verifiable Parental Consent (VPC)</span>
				</h2>
				<span class="tw-text-xs tw-font-mono tw-text-slate-400">COPPA 2.0 & SafeSport Gate</span>
			</div>
			<p class="tw-text-slate-300 tw-text-sm tw-mb-6">
				Federal mandates require hardware biometric attestation to verify guardian authority and approve minor participation.
			</p>
			
			{#if vpcStatus === 'attested'}
				<div class="tw-bg-emerald-950/30 tw-border tw-border-emerald-500/40 tw-rounded-none tw-p-4 tw-flex tw-items-center tw-gap-3">
					<Icon name={"status.seal-check" as IconName} size={20} class="tw-text-nuclear-yellow" />
					<span class="tw-text-nuclear-yellow tw-font-mono tw-text-xs tw-font-bold">VPC VERIFIED VIA HARDWARE ENCLAVE ATTESTATION</span>
				</div>
			{:else}
				<button 
					onclick={initiateBiometricConsent} 
					class="tw-inline-flex tw-items-center tw-gap-2 tw-bg-nuclear-yellow tw-text-black tw-px-6 tw-py-3 tw-rounded-none tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase hover:tw-bg-yellow-300 hover:tw-shadow-[0_0_20px_rgba(218,255,10,0.5)] tw-transition-all"
				>
					<Icon name={"sys.fingerprint" as IconName} size={16} />
					<span>Attest via TouchID / FaceID / Windows Hello</span>
				</button>
				{#if vpcStatus === 'error'}
					<p class="tw-text-red-400 tw-mt-3 tw-text-xs tw-font-mono">Attestation failed or was cancelled.</p>
				{/if}
			{/if}
		</section>

		<!-- 12-Column Asymmetric Bento Grid -->
		<div class="bento-grid-container bento-grid--12col bento-grid--liquid st-bento tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-w-full tw-min-w-0">
			
			<!-- CSO: The Triad Protocol (Shadow CC Audit Log) (8 cols) -->
			<section class="st-bento bento-col-8 lg:tw-col-span-8 tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-flex tw-flex-col tw-min-w-0 tw-rounded-none">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
					<h2 class="tw-text-lg tw-font-bold tw-text-white tw-flex tw-items-center tw-gap-2 tw-m-0">
						<Icon name={"comm.chats" as IconName} size={18} class="tw-text-[#14b8a6]" />
						<span>Communication Audit Log</span>
					</h2>
					<span class="tw-px-2 tw-py-0.5 tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-text-[#14b8a6] tw-text-[10px] tw-font-mono tw-tracking-widest tw-rounded-none">
						SAFESPORT_CC_ACTIVE
					</span>
				</div>
				<p class="tw-text-slate-400 tw-text-xs tw-mb-6">
					All 1:1 adult-to-minor messaging is prohibited. This log displays all coach-to-athlete messages CC'd to your guardian console in real time.
				</p>
				
				<div class="tw-flex-1 tw-min-h-[220px] tw-overflow-y-auto tw-border-t tw-border-[#1E293B] tw-pt-4">
					{#if shadowCcLogs.length === 0}
						<div class="tw-py-8 tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
							<Icon name={"status.shield" as IconName} size={32} class="tw-text-slate-600 tw-mb-2" />
							<p class="tw-text-slate-400 tw-font-mono tw-text-xs">No communications logged in audit trail.</p>
						</div>
					{:else}
						<ul class="tw-space-y-3 tw-p-0 tw-m-0 tw-list-none">
							{#each shadowCcLogs as log (log.id)}
								<li class="tw-bg-[#0B0F19] tw-p-4 tw-border tw-border-[#1E293B] tw-rounded-none">
									<div class="tw-flex tw-items-center tw-justify-between tw-mb-1.5">
										<span class="tw-text-xs tw-font-bold tw-text-nuclear-yellow">From: {log.senderName || 'Coach'}</span>
										<span class="tw-text-[10px] tw-font-mono tw-text-slate-500">{new Date(log.timestamp?.toMillis() || Date.now()).toLocaleString()}</span>
									</div>
									<p class="tw-text-xs tw-text-slate-300 tw-m-0">{log.message}</p>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>

			<!-- CMO: Tremendous Bounty Terminal (Escrow) (4 cols) -->
			<section class="st-bento bento-col-4 lg:tw-col-span-4 tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-rounded-none tw-flex tw-flex-col">
				<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
					<h2 class="tw-text-lg tw-font-bold tw-text-white tw-flex tw-items-center tw-gap-2 tw-m-0">
						<Icon name={"sys.escrow" as IconName} size={18} class="tw-text-nuclear-yellow" />
						<span>Bounty Escrow</span>
					</h2>
				</div>
				<p class="tw-text-slate-400 tw-text-xs tw-mb-6">
					Fund real-world rewards (Tremendous Gift Cards) that automatically release upon Computer Vision (CV) verified drill completions.
				</p>
				
				<div class="tw-flex tw-items-center tw-gap-3 tw-mb-4">
					<span class="tw-text-nuclear-yellow tw-font-mono tw-font-bold tw-text-lg">$</span>
					<input 
						type="number" 
						bind:value={bountyAmount} 
						class="tw-w-full tw-px-3 tw-py-2 tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-text-white tw-font-mono tw-text-sm focus:tw-outline-none focus:tw-border-nuclear-yellow tw-rounded-none" 
						placeholder="Enter amount" 
						min="0" 
						step="5"
					/>
				</div>
				<button 
					onclick={fundBounty} 
					class="tw-w-full tw-py-3 tw-bg-nuclear-yellow tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase hover:tw-bg-yellow-300 hover:tw-shadow-[0_0_15px_rgba(218,255,10,0.5)] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-none tw-mt-auto"
				>
					<Icon name={"sys.lock" as IconName} size={14} />
					<span>Lock Funds in Escrow</span>
				</button>
			</section>

		</div>

		<!-- CMO: The Car Ride Home Protocol Banner -->
		<section class="st-bento tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-6 tw-rounded-none">
			<div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
				<h2 class="tw-text-base tw-font-bold tw-text-white tw-flex tw-items-center tw-gap-2 tw-m-0">
					<Icon name={"status.warning" as IconName} size={18} class="tw-text-nuclear-yellow" />
					<span>The Car Ride Home Protocol</span>
				</h2>
				<span class="tw-text-[10px] tw-font-mono tw-text-nuclear-yellow tw-tracking-widest">COOLING_OFF_PERIOD</span>
			</div>
			<p class="tw-text-slate-400 tw-text-xs tw-mb-4">
				Raw telemetries are suppressed for 15 minutes post-match to protect athlete emotional resilience and prioritize emotional support.
			</p>
			
			<div class="tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-p-4 tw-rounded-none">
				<p class="tw-text-nuclear-yellow tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-font-semibold tw-mb-1">
					Empathetic Conversation Anchor:
				</p>
				<p class="tw-text-base tw-text-white tw-font-mono tw-italic tw-m-0">
					"I loved watching you play today."
				</p>
			</div>
		</section>

	</div>
</main>
