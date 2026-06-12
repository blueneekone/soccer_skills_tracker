<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { fetchClubCheckrConfig } from '$lib/compliance/checkrClubConfig.js';
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import CoachClearanceChecklist from '$lib/components/compliance/CoachClearanceChecklist.svelte';
	import NativeClearanceStatus from '$lib/components/compliance/NativeClearanceStatus.svelte';
	import CheckrEmbed from './CheckrEmbed.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	export const ssr = false;

	let clubName = $state('Your club');
	let liveClearance = $state<ClearanceDoc | null>(null);

	const profileClearance = $derived(
		(authStore.userProfile?.clearance as ClearanceDoc | undefined) ?? null,
	);
	const clearance = $derived(liveClearance ?? profileClearance);
	const coachEmail = $derived(authStore.user?.email ?? authStore.userProfile?.email ?? '');

	const showCheckrEmbed = $derived(
		Boolean(clearance?.invitationId || clearance?.checkrCandidateId),
	);

	$effect(() => {
		const clubId = authStore.userProfile?.clubId;
		if (!clubId) return;
		fetchClubCheckrConfig(clubId).then((cfg) => {
			if (cfg.clubName) clubName = cfg.clubName;
		});
	});

	$effect(() => {
		if (!browser) return;
		const email = authStore.user?.email ?? authStore.userProfile?.email;
		if (!email) return;

		const userRef = doc(db, 'users', email.toLowerCase());
		const unsub = onSnapshot(userRef, (snap) => {
			if (!snap.exists()) return;
			const cl = snap.data()?.clearance as ClearanceDoc | undefined;
			liveClearance = cl ?? null;
			const profile = authStore.userProfile;
			if (profile && cl) {
				authStore.setProfile({ ...profile, clearance: cl });
			}
		});

		return () => unsub();
	});

	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			const dest = untrack(() =>
				applyLoginWaterfall(authStore.role, authStore.userProfile),
			);
			untrack(() => goto(dest, { replaceState: true }));
		}
	});
</script>

<svelte:head>
	<title>Background Screening — SSTracker</title>
</svelte:head>

<div class="coach-clearance-page">
	<div class="coach-clearance-page__inner">
		<header class="coach-clearance-z4-chrome">
			<div class="coach-clearance-z4-chrome__icon" aria-hidden="true">
				<Icon name="status.shield-check" size={28} />
			</div>
			<div>
				<p class="coach-clearance-z4-chrome__eyebrow">Coach clearance</p>
				<h1 class="coach-clearance-z4-chrome__title">Background screening</h1>
				<p class="coach-clearance-z4-chrome__lead">
					Your club sponsors this screening. Complete the Checkr invitation when your director
					orders it — you will not pick packages or pay fees here.
				</p>
			</div>
		</header>

		<p class="coach-clearance-meta">Signed in as {coachEmail || '—'}</p>

		<div class="coach-clearance-z1-well">
			<CoachClearanceChecklist {clubName} {coachEmail} {clearance} />

			<div class="coach-clearance-tracking">
				<h2 class="coach-clearance-section-title">Screening status</h2>
				<NativeClearanceStatus {clearance} />
				{#if showCheckrEmbed}
					<details class="coach-clearance-embed">
						<summary>Live Checkr report details (optional)</summary>
						<p class="coach-clearance-embed-note">
							If this panel fails to load, your checklist and status above remain accurate.
						</p>
						<CheckrEmbed mode="tracking" {clearance} />
					</details>
				{/if}
			</div>
		</div>

		<p class="coach-clearance-privacy">
			<Icon name="sys.lock-simple" size={14} />
			Identity details and disclosures are handled only inside Checkr's secure flow.
		</p>
	</div>
</div>
