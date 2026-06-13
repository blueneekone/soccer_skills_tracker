<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const clubId = $derived(page.params.clubId ?? '');

	interface ProgramPayload {
		ok: boolean;
		notFound?: boolean;
		closed?: boolean;
		notConfigured?: boolean;
		clubName?: string;
		seasonName?: string;
		seasonId?: string;
		feeAmountDollars?: number;
		registrationDeadline?: string | null;
	}

	let loading = $state(true);
	let program = $state<ProgramPayload | null>(null);
	let err = $state('');

	const isLoggedIn = $derived(browser && !authStore.isLoading && authStore.isAuthenticated);
	const isParent = $derived(authStore.role === 'parent');

	$effect(() => {
		const id = clubId.trim();
		if (!id || !browser) return;
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const fns = getFunctions(undefined, 'us-east1');
				const fn = httpsCallable<{ clubId: string }, ProgramPayload>(
					fns,
					'getPublicRegistrationProgram',
				);
				const res = await fn({ clubId: id });
				if (!cancelled) program = res.data;
			} catch (e) {
				if (!cancelled) err = e instanceof Error ? e.message : 'Could not load program.';
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function fmtFee(dollars: number | undefined) {
		if (!dollars || dollars <= 0) return 'Contact club';
		return `$${dollars.toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Club registration · SSTracker</title>
	<meta name="description" content="Register and pay for your club season on SSTracker." />
</svelte:head>

<div class="reg-root tw-mx-auto tw-max-w-xl tw-px-4 tw-py-16 tw-text-slate-100">
	{#if loading}
		<p class="tw-font-mono tw-text-sm tw-text-slate-400">Loading registration program…</p>
	{:else if err}
		<p class="tw-text-red-400">{err}</p>
	{:else if !program?.ok}
		<h1 class="tw-text-2xl tw-font-bold">Registration unavailable</h1>
		<p class="tw-mt-2 tw-text-slate-400">
			{#if program?.notFound}
				This club program was not found.
			{:else if program?.closed}
				Registration is closed for this season. Contact your club director.
			{:else}
				This club has not published a registration season yet.
			{/if}
		</p>
	{:else}
		<p class="tw-mb-1 tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-500">
			Season registration
		</p>
		<h1 class="tw-m-0 tw-text-3xl tw-font-black">{program.clubName}</h1>
		<p class="tw-mt-2 tw-text-lg tw-text-slate-300">{program.seasonName}</p>

		<dl class="reg-facts tw-mt-8 tw-space-y-3 tw-rounded-xl tw-border tw-border-slate-800 tw-bg-slate-900/50 tw-p-5">
			<div class="tw-flex tw-justify-between tw-gap-4">
				<dt class="tw-text-slate-500">Fee</dt>
				<dd class="tw-font-mono tw-font-bold tw-text-teal-300">
					{fmtFee(program.feeAmountDollars)}
				</dd>
			</div>
			{#if program.registrationDeadline}
				<div class="tw-flex tw-justify-between tw-gap-4">
					<dt class="tw-text-slate-500">Deadline</dt>
					<dd class="tw-font-mono">{program.registrationDeadline}</dd>
				</div>
			{/if}
		</dl>

		<div class="tw-mt-8 tw-flex tw-flex-col tw-gap-3">
			{#if isLoggedIn && isParent}
				<a href="/parent/payments" class="tw-vanguard-btn-primary tw-text-center">
					Continue to payment →
				</a>
			{:else if isLoggedIn}
				<p class="tw-text-sm tw-text-slate-400">
					Sign in with a parent account linked to this club to complete registration.
				</p>
				<a href="/login?redirect=/parent/payments" class="tw-vanguard-btn-secondary tw-text-center">
					Switch account
				</a>
			{:else}
				<a
					href="/login?redirect={encodeURIComponent(`/parent/payments`)}"
					class="tw-vanguard-btn-primary tw-text-center"
				>
					Sign in to register →
				</a>
				<a href="/setup" class="tw-vanguard-btn-secondary tw-text-center">
					New to SSTracker? Start here
				</a>
			{/if}
		</div>

		<p class="tw-mt-6 tw-text-xs tw-text-slate-600">
			Payments route to your club via Stripe Connect. Household-linked guardians pay for each athlete on the payments page.
		</p>
	{/if}
</div>
