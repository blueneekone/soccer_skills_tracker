<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { CoOpEngine } from '$lib/states/CoOpEngine.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { doc, getDoc } from 'firebase/firestore';
	import CoOpArena from '$lib/components/parent/co-op/CoOpArena.svelte';
	import CoOpHUD from '$lib/components/parent/co-op/CoOpHUD.svelte';
	import BountyTerminal from './BountyTerminal.svelte';
	import { CarRideEngine } from './CarRideEngine.svelte.js';
	import CarRideArena from './CarRideArena.svelte';
	import CarRideHUD from './CarRideHUD.svelte';
	import ProofReviewQueue from '$lib/components/parent/ProofReviewQueue.svelte';

	const engine = new CoOpEngine();
	const carRideEngine = new CarRideEngine();

	let showCreateBounty = $state(false);
	/** Resolved householdId passed down to ProofReviewQueue — set in onMount. */
	let resolvedHouseholdId = $state('');
	/** email → display name map for household children — built from households doc. */
	let childNames = $state<Record<string, string>>({});

	onMount(async () => {
		const user = authStore.user;
		const profile = authStore.userProfile as Record<string, unknown> | null;

		const parentEmail = (user as { email?: string } | null)?.email?.toLowerCase() ?? '';
		const householdId = (profile?.householdId as string | undefined) ?? '';
		const tenantId = authStore.tenantId ?? '';
		const clubId = (profile?.clubId as string | undefined) ?? tenantId;

		// Resolve child emails from the households doc — the authoritative source.
		// parentProvisionOperative writes to households/{id}.playerEmails; the parent profile doc is never updated.
		let childEmails: string[] = [];
		if (householdId) {
			try {
				const hSnap = await getDoc(doc(db, 'households', householdId));
				if (hSnap.exists()) {
					const hData = hSnap.data();
					const raw: unknown[] = hData.playerEmails ?? [];
					childEmails = raw
						.map((e) => String(e ?? '').trim().toLowerCase())
						.filter(Boolean);

					// Build email→name map for ProofReviewQueue (uses playerNames parallel array).
					const rawNames: unknown[] = hData.playerNames ?? [];
					const nameMap: Record<string, string> = {};
					childEmails.forEach((em, i) => {
						const nm =
							typeof rawNames[i] === 'string' && (rawNames[i] as string).trim()
								? (rawNames[i] as string).trim()
								: em.split('@')[0];
						nameMap[em] = nm;
					});
					childNames = nameMap;
				}
			} catch (err) {
				console.error('[parent dashboard] household read', err);
			}
		}

		resolvedHouseholdId = householdId;
		await engine.init(parentEmail, householdId, childEmails);

		// Phase 4, Epic 8 — Car Ride Home Protocol.
		// Use the first linked child email for pending fixture detection.
		// The FCM deep link may supply a ?fixtureId= query param to pre-target.
		const linkedPlayerEmail = childEmails[0] ?? '';
		const urlFixtureId = get(page).url.searchParams.get('fixtureId') ?? null;

		await carRideEngine.init(linkedPlayerEmail, tenantId, clubId, urlFixtureId);
	});

	onDestroy(() => {
		engine.destroy();
	});
</script>

<div class="tw-relative tw-min-h-screen tw-bg-[#020202] tw-overflow-hidden">
	<!-- Ambient glow decoration -->
	<div
		class="tw-absolute tw-inset-0 tw-pointer-events-none"
		aria-hidden="true"
	>
		<div
			class="tw-absolute tw-top-0 tw-left-1/4 tw-w-[600px] tw-h-[600px] tw-rounded-full -tw-translate-x-1/2 -tw-translate-y-1/2 tw-opacity-[0.03]"
			style="background: radial-gradient(circle, #14b8a6 0%, transparent 70%);"
		></div>
		<div
			class="tw-absolute tw-bottom-0 tw-right-1/4 tw-w-[400px] tw-h-[400px] tw-rounded-full tw-translate-x-1/2 tw-translate-y-1/2 tw-opacity-[0.025]"
			style="background: radial-gradient(circle, #a78bfa 0%, transparent 70%);"
		></div>
	</div>

	<!-- Page content — Sprint 1.1: 12-col liquid bento -->
	<div class="tw-relative tw-z-10" style="padding: var(--bento-pad-liquid);">
		<div class="bento-grid bento-grid--12col bento-grid--liquid tw-w-full">
			<header class="bento-span-12 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
				<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
					//
				</span>
				<h1 class="tw-font-mono tw-text-[14px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
					PARENT CO-OP COMMAND
				</h1>
				<span
					class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/25 tw-uppercase tw-ml-2"
				>
					PHASE 3 · EPIC 5.4
				</span>
			</header>

			{#if carRideEngine.pendingFixtureId}
				<div class="bento-span-12 tw-min-w-0">
					<CarRideArena engine={carRideEngine} />
				</div>
			{/if}

			<div class="bento-span-8 tw-min-w-0">
				<CoOpArena {engine} />
			</div>

			<aside
				class="vanguard-surface vanguard-surface--liquid bento-span-4 bento-cell tw-flex tw-min-h-[280px] tw-min-w-0 tw-flex-col tw-justify-between tw-rounded-vanguard"
				aria-label="Parent co-op operations"
			>
				<div>
					<p class="tw-m-0 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-[#14b8a6]/80">
						Ops terminal
					</p>
					<h2 class="tw-mt-2 tw-m-0 tw-font-mono tw-text-sm tw-font-black tw-uppercase tw-tracking-wider tw-text-slate-100">
						Bounty dispatch
					</h2>
					<p class="tw-mt-2 tw-text-xs tw-leading-relaxed tw-text-slate-500">
						Authorize household rewards and post-match protocols from this panel.
					</p>
				</div>
				<button
					type="button"
					class="vanguard-btn-primary tw-w-full"
					onclick={() => (showCreateBounty = true)}
				>
					Create bounty
				</button>
			</aside>

			<!-- B4b — advisory completion proof review queue -->
			{#if resolvedHouseholdId}
				<div class="bento-span-12 tw-min-w-0">
					<ProofReviewQueue householdId={resolvedHouseholdId} {childNames} />
				</div>
			{/if}
		</div>
	</div>

	<!-- HUD overlay (pointer-events-none at root, children opt in) -->
	<CoOpHUD
		{engine}
		{showCreateBounty}
		onCreateBounty={() => (showCreateBounty = true)}
	/>

	<!-- Phase 4, Epic 8 — Car Ride Home HUD (fixed overlay, z-60) -->
	<CarRideHUD engine={carRideEngine} />

	<!-- Create Bounty Modal -->
	{#if showCreateBounty}
		<div
			class="tw-fixed tw-inset-0 tw-bg-black/60 tw-z-50 tw-flex tw-items-center tw-justify-center tw-pointer-events-auto"
			style="backdrop-filter: blur(4px);"
		>
			<!-- Backdrop click-away -->
			<button
				class="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-cursor-default"
				aria-label="Close bounty terminal"
				onclick={() => (showCreateBounty = false)}
			></button>

			<!-- Modal panel -->
			<div
				class="tw-relative tw-z-10 tw-w-full tw-max-w-lg tw-max-h-[90vh] tw-overflow-y-auto tw-mx-4"
				style="scrollbar-width: thin; scrollbar-color: rgba(20, 184, 166,0.2) transparent;"
			>
				<!-- Close button -->
				<div class="tw-flex tw-justify-end tw-mb-2">
					<button
						onclick={() => (showCreateBounty = false)}
						class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-border tw-border-[#14b8a6]/20 tw-text-[#14b8a6]/50 tw-bg-[#040f16]/80 tw-rounded-lg tw-px-3 tw-py-1.5 tw-transition-all tw-duration-150 hover:tw-border-[#14b8a6]/50 hover:tw-text-[#14b8a6]/80"
					>
						[ × CLOSE ]
					</button>
				</div>

				<BountyTerminal {engine} />
			</div>
		</div>
	{/if}
</div>
