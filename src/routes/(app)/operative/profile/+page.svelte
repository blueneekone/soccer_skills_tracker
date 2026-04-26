<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { doc, updateDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const isOperative = $derived(email.endsWith('@operative.local') && authStore.role === 'player');

	/** Remaining self-serve call sign requests (default 3 if unset). */
	const gamertagChangesLeft = $derived.by(() => {
		const g = profile?.gamertagChangesLeft;
		if (typeof g === 'number' && Number.isFinite(g) && g >= 0) {
			return g;
		}
		return 3;
	});

	/** Parent-approved or live display string (if any). */
	const pendingGamertag = $derived(
		typeof profile?.pendingGamertag === 'string' && profile.pendingGamertag.trim() !== '' ?
			profile.pendingGamertag.trim()
		:	null,
	);

	/** Shown as “active” on file — not the same as a pending request. */
	const currentCallsign = $derived(
		(typeof profile?.gamertag === 'string' && profile.gamertag.trim() !== '' ?
			profile.gamertag
		: typeof profile?.operativeCallsign === 'string' && profile.operativeCallsign.trim() !== '' ?
			profile.operativeCallsign
		: typeof profile?.playerName === 'string' && profile.playerName.trim() !== '' ?
			profile.playerName
		:	'—'),
	);

	const inputLocked = $derived(gamertagChangesLeft === 0 || pendingGamertag != null);
	let newCallsign = $state('');
	let err = $state('');
	let ok = $state('');
	let saving = $state(false);

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (!authStore.isAuthenticated) return;
		if (!isOperative) {
			void goto('/settings', { replaceState: true });
		}
	});

	async function submitRequest() {
		err = '';
		ok = '';
		if (inputLocked || !email) return;
		const t = newCallsign.trim();
		if (!t) {
			err = 'Enter a new callsign to send for approval.';
			return;
		}
		if (t.length > 200) {
			err = 'Callsign is too long.';
			return;
		}
		saving = true;
		try {
			const userRef = doc(db, 'users', email);
			// Quarantine: only pendingGamertag — not gamertag, playerName, or counters
			await updateDoc(userRef, { pendingGamertag: t });
			await authStore.refresh({ silent: true });
			newCallsign = '';
			ok = 'Request submitted. A parent can approve it from Command.';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not submit request.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="op-profile tw-mx-auto tw-w-full tw-max-w-lg tw-px-4 tw-pt-4 tw-pb-28 sm:tw-pb-8">
	<header class="tw-mb-6">
		<p class="tw-m-0 tw-mb-1 tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-amber-500/90">
			Operative
		</p>
		<h1 class="tw-m-0 tw-text-2xl tw-font-black tw-tracking-tight tw-text-zinc-100">Call sign</h1>
		<p class="tw-mt-2 tw-text-sm tw-leading-relaxed tw-text-zinc-400">
			Change requests are held for <strong class="tw-text-amber-200/90">Command</strong> (parent)
			approval. Your on-file name does not change until it is approved.
		</p>
	</header>

	<div
		class="tw-rounded-2xl tw-border tw-border-white/10 tw-bg-black/50 tw-px-4 tw-py-5 tw-shadow-lg tw-shadow-black/30"
	>
		<p class="tw-m-0 tw-mb-1 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-zinc-500">
			Active on file
		</p>
		<p
			class="tw-m-0 tw-mb-6 tw-font-mono tw-text-lg tw-font-bold tw-tracking-wide tw-text-cyan-200"
			aria-live="polite"
		>
			{currentCallsign}
		</p>

		<div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-baseline tw-gap-2">
			<span class="tw-text-xs tw-text-zinc-500">Self-serve changes left:</span>
			<span class="tw-font-mono tw-text-sm tw-text-zinc-200">{String(gamertagChangesLeft)}</span>
		</div>

		{#if gamertagChangesLeft === 0}
			<div
				class="tw-mb-4 tw-rounded-lg tw-border tw-border-red-500/30 tw-bg-red-950/30 tw-px-3 tw-py-2 tw-text-sm tw-text-red-200/95"
				role="status"
			>
				Maximum callsign changes reached. Callsign permanently locked.
			</div>
		{:else if pendingGamertag}
			<div
				class="tw-mb-4 tw-rounded-lg tw-border tw-border-amber-500/30 tw-bg-amber-950/20 tw-px-3 tw-py-2 tw-text-sm tw-text-amber-100/95"
				role="status"
			>
				Callsign change to &ldquo;{pendingGamertag}&rdquo; is awaiting Parent Command approval.
			</div>
		{/if}

		<label class="tw-mb-2 tw-block tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-zinc-500" for="op-new-callsign"
			>Request new call sign</label
		>
		<input
			id="op-new-callsign"
			type="text"
			class="tw-mb-3 tw-w-full tw-rounded-lg tw-border tw-border-zinc-600 tw-bg-zinc-950/80 tw-px-3 tw-py-2.5 tw-font-mono tw-text-sm tw-text-zinc-100 tw-outline-none focus:tw-border-cyan-500/50 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
			placeholder="e.g. Shadow-7"
			autocomplete="off"
			bind:value={newCallsign}
			disabled={inputLocked || saving}
		/>

		{#if err}
			<p class="tw-mb-2 tw-text-sm tw-text-red-300" role="alert">{err}</p>
		{/if}
		{#if ok}
			<p class="tw-mb-2 tw-text-sm tw-text-emerald-300" role="status">{ok}</p>
		{/if}

		<button
			type="button"
			class="tw-w-full tw-rounded-lg tw-border tw-border-cyan-500/40 tw-bg-cyan-950/30 tw-px-4 tw-py-2.5 tw-text-sm tw-font-extrabold tw-uppercase tw-tracking-wider tw-text-cyan-200 tw-transition hover:tw-border-cyan-400/60 hover:tw-bg-cyan-900/30 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
			disabled={inputLocked || saving || !newCallsign.trim()}
			onclick={() => void submitRequest()}
		>
			{saving ? 'Submitting…' : 'Submit for approval'}
		</button>
	</div>

	<p class="tw-mt-6 tw-text-center">
		<a
			href="/settings"
			class="tw-text-sm tw-font-medium tw-text-zinc-500 tw-underline tw-decoration-zinc-600 tw-underline-offset-2 hover:tw-text-zinc-300"
		>← Back to settings</a
		>
	</p>
</div>
