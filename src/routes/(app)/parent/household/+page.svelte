<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc } from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const parentSignCoppaWaiver = httpsCallable(functions, 'parentSignCoppaWaiver');
	const parentProvisionOperative = httpsCallable(functions, 'parentProvisionOperative');

	const role = $derived(authStore.role);
	const profile = $derived(authStore.userProfile);
	const userEmail = $derived((authStore.user?.email || '').toLowerCase());

	/** @type {string} */
	let householdId = $state('');
	/** @type {import('firebase/firestore').Timestamp | null} */
	let coppaAt = $state(null);
	let coppaSigned = $state(false);
	let loadErr = $state('');
	let loadBusy = $state(true);
	let actionBusy = $state(false);
	let actErr = $state('');

	/** @type {string} */
	let childName = $state('');
	/** @type {string} */
	let childEmail = $state('');
	/** @type {string} */
	let lastDispatch = $state('');
	/** @type {string} */
	let teamDispatchCode = $state('');

	$effect(() => {
		if (browser && !authStore.isLoading && authStore.isAuthenticated) {
			if (role !== 'parent') {
				goto('/parent/vpc', { replaceState: true });
			}
		}
	});

	$effect(() => {
		// re-fetch when token/profile updates after waiver
		void profile?.householdId;
		if (!browser) return;
		if (authStore.isLoading) return;
		if (!userEmail) return;
		let cancelled = false;
		loadErr = '';
		loadBusy = true;
		(async () => {
			try {
				const p = profile;
				const hid = p?.householdId && String(p.householdId).trim() ? String(p.householdId) : '';
				if (!hid) {
					if (!cancelled) {
						householdId = '';
						coppaAt = null;
						coppaSigned = false;
						loadBusy = false;
					}
					return;
				}
				if (cancelled) return;
				const snap = await getDoc(doc(db, 'households', hid));
				if (cancelled) return;
				householdId = hid;
				if (snap.exists()) {
					const d = snap.data() || {};
					coppaSigned = d.coppaSigned === true;
					coppaAt = d.coppaSignedAt ?? null;
				} else {
					coppaSigned = false;
					coppaAt = null;
				}
			} catch (e) {
				if (!cancelled) loadErr = e instanceof Error ? e.message : 'Read failed';
			} finally {
				if (!cancelled) loadBusy = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	async function signWaiver() {
		actErr = '';
		actionBusy = true;
		try {
			/** @type {unknown} */
			const res = await parentSignCoppaWaiver({});
			const d = res && typeof res === 'object' && 'data' in res ? res.data : res;
			if (d && typeof d === 'object' && 'householdId' in d) {
				householdId = String(/** @type {*} */(d).householdId);
			}
			await authStore.refresh({ silent: true });
			const hid = (authStore.userProfile?.householdId || '').toString() || householdId;
			if (hid) {
				const snap = await getDoc(doc(db, 'households', hid));
				if (snap.exists()) {
					const x = snap.data() || {};
					coppaSigned = x.coppaSigned === true;
					coppaAt = x.coppaSignedAt ?? null;
				}
			} else {
				coppaSigned = true;
			}
		} catch (e) {
			actErr = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */(e).message) : 'Waiver failed';
		} finally {
			actionBusy = false;
		}
	}

	async function provision() {
		actErr = '';
		if (!coppaSigned) {
			actErr = 'Complete COPPA & liability clearance before provisioning operatives.';
			return;
		}
		if (!childName.trim() || !childEmail.trim()) {
			actErr = 'Enter the operative display name and email.';
			return;
		}
		actionBusy = true;
		lastDispatch = '';
		try {
			const teamCodeOpt = teamDispatchCode.trim();
			/** @type {Record<string, string>} */
			const payload = {
				childName: childName.trim(),
				childEmail: childEmail.trim().toLowerCase(),
			};
			if (teamCodeOpt) {
				payload.teamInviteCode = teamCodeOpt;
			}
			const res = await parentProvisionOperative(payload);
			const data = res && typeof res === 'object' && 'data' in res ? res.data : res;
			const outCode =
				data && typeof data === 'object' && 'dispatchCode' in data ?
					String(/** @type {*} */(data).dispatchCode) :
					'';
			lastDispatch = outCode;
			childName = '';
			childEmail = '';
			teamDispatchCode = '';
			await authStore.refresh({ silent: true });
		} catch (e) {
			actErr = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */(e).message) : 'Provision failed';
		} finally {
			actionBusy = false;
		}
	}

	function fmtTs(ts) {
		if (!ts || typeof ts.toDate !== 'function') return '—';
		try {
			return ts.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

<svelte:head>
	<title>Household · Clearance · SSTRACKER</title>
</svelte:head>

<div
	class="phh tw-mx-auto tw-w-full tw-max-w-3xl tw-bg-black tw-px-3 tw-pb-10 tw-pt-4 md:tw-px-6"
	data-region="household-clearance"
>
	<header class="tw-mb-6 tw-text-center">
		<p class="phh-eyebrow tw-mb-1">Parent OS · TIER-0 ACCESS</p>
		<h1 class="phh-title tw-mb-2 tw-text-xl tw-font-extrabold tw-tracking-tight tw-text-white md:tw-text-2xl">
			Household Clearance Center
		</h1>
		<p class="tw-mx-auto tw-max-w-prose tw-text-sm tw-text-white/50">
			Classified provisioning. Minors do not self-register. Digital signatures and dispatch codes
			are the only valid ingress paths.
		</p>
	</header>

	{#if loadErr}
		<div
			class="tw-mb-4 tw-border tw-border-red-500/50 tw-bg-red-950/30 tw-px-4 tw-py-3 tw-text-sm tw-text-red-200"
			role="alert"
		>
			{loadErr}
		</div>
	{/if}

	<div
		class="tw-flex tw-min-h-0 tw-flex-col tw-gap-4 md:tw-grid md:tw-grid-cols-1 md:tw-gap-5 lg:tw-grid-cols-1"
	>
		<!-- COPPA & liability block -->
		<section
			class="phh-surface tw-min-w-0 tw-border-2 tw-border-red-500/60 tw-px-3 tw-py-4 tw-shadow-[0_0_24px_rgba(239,68,68,0.12)] sm:tw-px-4 md:tw-px-5"
			aria-labelledby="phh-coppa"
		>
			<div class="tw-mb-3 tw-flex tw-flex-col tw-gap-1">
				<span class="phh-eyebrow tw-text-red-400/90">COPPA &amp; LIABILITY</span>
				<h2 id="phh-coppa" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-200">
					Minor accounts locked
				</h2>
			</div>
			<p class="tw-mb-4 tw-text-sm tw-leading-relaxed tw-text-white/70">
				Until you execute the digital signature below, child operative accounts in this household
				remain <span class="tw-font-semibold tw-text-red-200">inert (no self-initiation)</span>.
				By signing, you assert parental authority to provision credentials per club policy and
				federal child-privacy law.
			</p>
			<div
				class="phh-row tw-mb-3 tw-flex tw-min-h-[3.25rem] tw-flex-col tw-gap-1 tw-border tw-border-white/10 tw-bg-black/60 tw-px-3 tw-py-2.5 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
			>
				<span class="phh-eyebrow">Clearance file</span>
				<div class="tw-text-right">
					{#if coppaSigned}
						<span class="phh-mono tw-text-cyan-300">SIGNED</span>
						<div class="phh-mono tw-text-xs tw-text-white/50">{fmtTs(coppaAt)}</div>
					{:else if loadBusy}
						<span class="phh-mono tw-text-white/40">SCANNING…</span>
					{:else}
						<span class="phh-mono tw-text-amber-400">PENDING SIGNATURE</span>
					{/if}
				</div>
			</div>
			<p class="phh-eyebrow tw-mb-2">Household / club line</p>
			<div class="phh-mono tw-mb-3 tw-text-xs tw-break-all tw-text-white/70">
				HH: {householdId || '— (created on sign)'} · Club: {profile?.clubId ? String(profile.clubId) : '—'}
			</div>
			<button
				type="button"
				class="phh-btn tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest"
				class:phh-btn--dim={coppaSigned}
				disabled={coppaSigned || actionBusy || loadBusy}
				onclick={signWaiver}
			>
				{coppaSigned ? 'Waiver on file' : 'Sign waiver &amp; authorize'}
			</button>
		</section>

		<!-- Operative generation -->
		<section
			class="phh-surface tw-min-w-0 tw-border tw-border-cyan-500/30 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5"
			aria-labelledby="phh-ops"
		>
			<div class="tw-mb-3">
				<span class="phh-eyebrow tw-text-cyan-200/80">Operative generation</span>
				<h2 id="phh-ops" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white">
					Credential dispatch
				</h2>
			</div>
			<p class="tw-mb-4 tw-text-sm tw-text-white/55">
				Register the minor’s <span class="tw-text-white/80">legal display name</span> and
				<span class="tw-text-white/80">email you control</span>. The engine issues a one-time
				<span class="phh-mono tw-text-cyan-300">DISPATCH</span> code for Operative login.
			</p>
			<div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-3 md:tw-grid md:tw-grid-cols-2 md:tw-gap-4">
				<label class="phh-field tw-block tw-w-full">
					<span class="phh-eyebrow tw-mb-1 tw-block">Operative name</span>
					<input
						class="phh-input"
						type="text"
						autocomplete="name"
						placeholder="Full name (minor)"
						bind:value={childName}
					/>
				</label>
				<label class="phh-field tw-block tw-w-full">
					<span class="phh-eyebrow tw-mb-1 tw-block">Operative email</span>
					<input
						class="phh-input"
						type="email"
						autocomplete="email"
						inputmode="email"
						placeholder="athlete@example.com"
						bind:value={childEmail}
					/>
				</label>
				<label class="phh-field tw-block tw-w-full md:tw-col-span-2">
					<span class="phh-eyebrow tw-mb-1 tw-block tw-text-cyan-300/80"
						>Team dispatch code <span class="tw-text-white/40">(optional)</span></span
					>
					<input
						class="phh-input phh-input--cyan"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder="e.g. AB-1K2M"
						bind:value={teamDispatchCode}
					/>
				</label>
			</div>
			<div class="tw-mt-4">
				<button
					type="button"
					class="phh-btn phh-btn--cyan tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest"
					disabled={!coppaSigned || actionBusy}
					onclick={provision}
				>
					Generate operative credentials
				</button>
			</div>
			{#if lastDispatch}
				<div
					class="tw-mt-3 tw-min-w-0 tw-border tw-border-[#39ff14]/40 tw-bg-[#05050a] tw-px-3 tw-py-3"
					role="status"
				>
					<p class="phh-eyebrow tw-mb-1 tw-text-[#39ff14]">Last dispatch (share once; keep secure)</p>
					<p class="phh-mono tw-break-all tw-text-lg tw-text-[#7dff9a] sm:tw-text-xl">
						{lastDispatch}
					</p>
				</div>
			{/if}
		</section>
	</div>

	{#if actErr}
		<div
			class="tw-mt-4 tw-border tw-border-amber-500/50 tw-bg-amber-950/20 tw-px-4 tw-py-3 tw-text-sm tw-text-amber-100"
			role="alert"
		>
			{actErr}
		</div>
	{/if}
</div>

<style>
	:global([data-region='household-clearance'] *) {
		box-sizing: border-box;
	}
	.phh-eyebrow {
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}
	.phh-title {
		font-family: system-ui, sans-serif;
	}
	.phh-surface {
		background: #05050a;
	}
	.phh-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
	}
	.phh-input {
		width: 100%;
		min-height: 3.25rem;
		padding: 0.7rem 0.9rem;
		font-size: 1rem;
		touch-action: manipulation;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: #000;
		color: #fafafa;
		border-radius: 0.25rem;
	}
	.phh-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.phh-input:focus {
		outline: 1px solid #00d4ff;
		outline-offset: 1px;
		box-shadow: 0 0 18px rgba(0, 212, 255, 0.2);
	}
	.phh-input--cyan {
		min-height: 3.25rem;
		border: 1px solid rgba(0, 212, 255, 0.45);
		background: #000;
	}
	.phh-input--cyan:focus {
		outline: 1px solid #00d4ff;
		outline-offset: 1px;
		border-color: rgba(0, 212, 255, 0.7);
		box-shadow: 0 0 20px rgba(0, 212, 255, 0.25);
	}
	.phh-btn {
		background: #000;
		color: #fff;
		border: 1px solid rgba(248, 113, 113, 0.5);
		cursor: pointer;
		transition: box-shadow 0.2s, border-color 0.2s;
	}
	.phh-btn:hover:not(:disabled) {
		box-shadow: 0 0 22px rgba(248, 113, 113, 0.35);
	}
	.phh-btn:disabled,
	.phh-btn--dim:disabled,
	.phh-btn--dim {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
	}
	.phh-btn--cyan {
		border-color: rgba(0, 212, 255, 0.45);
		color: #c9f4ff;
	}
	.phh-btn--cyan:hover:not(:disabled) {
		box-shadow: 0 0 22px rgba(0, 212, 255, 0.35);
	}
</style>
