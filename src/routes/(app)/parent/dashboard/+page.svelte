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
	import UpcomingEventsRsvp from '$lib/components/parent/UpcomingEventsRsvp.svelte';
	import ClaimRosterSpot from '$lib/components/parent/ClaimRosterSpot.svelte';
	import '$lib/styles/parent-bounty-funding-panel.css';

	const engine = new CoOpEngine();
	const carRideEngine = new CarRideEngine();

	let showCreateBounty = $state(false);
	/** Resolved householdId passed down to ProofReviewQueue — set in onMount. */
	let resolvedHouseholdId = $state('');
	/** email → display name map for household children — built from households doc. */
	let childNames = $state<Record<string, string>>({});
	let childEmails = $state<string[]>([]);

	onMount(async () => {
		const user = authStore.user;
		const profile = authStore.userProfile as Record<string, unknown> | null;

		const parentEmail = (user as { email?: string } | null)?.email?.toLowerCase() ?? '';
		const householdId = (profile?.householdId as string | undefined) ?? '';
		const tenantId = authStore.tenantId ?? '';
		const clubId = (profile?.clubId as string | undefined) ?? tenantId;

		// Resolve child emails from the households doc — the authoritative source.
		let resolvedChildren: string[] = [];
		if (householdId) {
			try {
				const hSnap = await getDoc(doc(db, 'households', householdId));
				if (hSnap.exists()) {
					const hData = hSnap.data();
					const raw: unknown[] = hData.playerEmails ?? [];
					resolvedChildren = raw
						.map((e) => String(e ?? '').trim().toLowerCase())
						.filter(Boolean);

					// Build email→name map for ProofReviewQueue (uses playerNames parallel array).
					const rawNames: unknown[] = hData.playerNames ?? [];
					const nameMap: Record<string, string> = {};
					resolvedChildren.forEach((em, i) => {
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

		childEmails = resolvedChildren;
		resolvedHouseholdId = householdId;
		await engine.init(parentEmail, householdId, resolvedChildren);
		// Use the first linked child email for pending fixture detection.
		const linkedPlayerEmail = resolvedChildren[0] ?? '';
		const urlFixtureId = get(page).url.searchParams.get('fixtureId') ?? null;

		await carRideEngine.init(linkedPlayerEmail, tenantId, clubId, urlFixtureId);
	});

	onDestroy(() => {
		engine.destroy();
	});
</script>

<div class="parent-lounge-page">
	<div class="bento-grid bento-grid--12col bento-grid--liquid tw-w-full">
		<header class="bento-span-12 parent-lounge-page-head tw-flex tw-flex-wrap tw-items-center tw-gap-3">
			<p class="parent-lounge-eyebrow">Parent co-op</p>
			<h1 class="parent-lounge-page-title">Command dashboard</h1>
		</header>

			{#if carRideEngine.pendingFixtureId}
				<div class="bento-span-12 tw-min-w-0">
					<CarRideArena engine={carRideEngine} />
				</div>
			{/if}

			<div class="bento-span-12 tw-min-w-0">
				<ClaimRosterSpot />
			</div>

			<div class="bento-span-12 tw-min-w-0">
				<UpcomingEventsRsvp {childEmails} {childNames} />
			</div>

			<div class="bento-span-8 tw-min-w-0">
				<CoOpArena {engine} />
			</div>

		<aside
			class="parent-lounge-z2-panel parent-bounty-dispatch-panel bento-span-4 bento-cell tw-min-w-0"
			aria-label="Parent co-op operations"
		>
			<div>
				<p class="parent-lounge-eyebrow">Ops terminal</p>
				<h2 class="parent-lounge-page-title tw-mt-2 tw-text-sm">Bounty dispatch</h2>
				<p class="parent-lounge-meta tw-mt-2">
					Authorize household rewards and post-match protocols from this panel.
				</p>
			</div>
			<button
				type="button"
				class="parent-bounty-btn-deploy parent-bounty-btn-deploy--block"
				onclick={() => (showCreateBounty = true)}
			>
				Deploy bounty
			</button>
		</aside>

			<!-- B4b — advisory completion proof review queue -->
			{#if resolvedHouseholdId}
				<div class="bento-span-12 tw-min-w-0">
					<ProofReviewQueue householdId={resolvedHouseholdId} {childNames} />
				</div>
			{/if}
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
		<div class="parent-bounty-z3-modal-scrim" role="presentation">
			<button
				type="button"
				class="parent-bounty-z3-modal-scrim__hit"
				aria-label="Close bounty terminal"
				onclick={() => (showCreateBounty = false)}
			></button>

			<div class="parent-bounty-z3-modal" role="dialog" aria-modal="true" aria-label="Deploy bounty">
				<div class="parent-bounty-z3-modal__head">
					<button
						type="button"
						class="parent-bounty-btn-audit parent-bounty-btn-audit--sm"
						onclick={() => (showCreateBounty = false)}
					>
						Close
					</button>
				</div>

				<BountyTerminal {engine} />
			</div>
		</div>
	{/if}
</div>
