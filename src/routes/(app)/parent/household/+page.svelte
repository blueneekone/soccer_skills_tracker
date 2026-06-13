<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { httpsCallable } from 'firebase/functions';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		query,
		updateDoc,
		where,
		writeBatch,
	} from 'firebase/firestore';
	import { db, functions } from '$lib/firebase.js';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import ParentPrivacyDashboard from '$lib/components/compliance/ParentPrivacyDashboard.svelte';
	import TransferPortal from '$lib/components/player/TransferPortal.svelte';
	import type { HouseholdOperativeRow } from '$lib/types/household.js';
	import {
		buildEnrichedOperativeRows,
		loadHouseholdOperativeRows,
	} from '$lib/parent/householdOperatives.js';

	const DISPATCH_CODE_INTEL = {
		title: 'DISPATCH CODES',
		instructions: [
			'1. A Dispatch Code securely links your player to their official team roster.',
			'2. Head Coaches generate these secure codes and text them to parents.',
			'3. If you do not have a code, please ask your coach before continuing.',
		],
	};

	const parentSignCoppaWaiver = httpsCallable(functions, 'parentSignCoppaWaiver');
	const parentProvisionOperative = httpsCallable(functions, 'parentProvisionOperative');
	const generatePlayerOTP = httpsCallable(functions, 'generatePlayerOTP');

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
	let operativeCallsign = $state('');
	/** @type {string} */
	let lastDispatch = $state('');
	/** @type {string} */
	let teamDispatchCode = $state('');

	/** @type {HouseholdOperativeRow[]} */
	let operativeRows = $state([]);

	/** @type {string | null} */
	let otpGenBusyKey = $state(null);

	/** @type {string | null} */
	let gtActionBusyKey = $state(null);

	/** @type {false | { code: string; expiresAt: number; displayName: string }} */
	let otpDialog = $state<false | { code: string; expiresAt: number; displayName: string }>(false);

	/** Ticks so countdown text updates every second. */
	let otpCountdownTick = $state(0);

	/** @type {boolean} */
	let copyFeedback = $state(false);

	$effect(() => {
		if (!browser) return;
		if (otpDialog === false) return;
		lockBody();
		return () => unlockBody();
	});

	$effect(() => {
		if (!browser) return;
		if (!otpDialog) return;
		const id = setInterval(() => {
			otpCountdownTick = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	const otpSecondsLeft = $derived.by(() => {
		const dialog = otpDialog;
		if (dialog === false) return 0;
		void otpCountdownTick;
		return Math.max(0, Math.ceil((dialog.expiresAt - Date.now()) / 1000));
	});

	const otpCountdownLabel = $derived.by(() => {
		const s = otpSecondsLeft;
		const m = Math.floor(s / 60);
		const r = s % 60;
		return `${m}:${r.toString().padStart(2, '0')}`;
	});

	/** @returns {Promise<void>} */
	async function refreshHouseholdOperatives() {
		operativeRows = await loadHouseholdOperativeRows(db, householdId);
	}

	/**
	 * @param {HouseholdOperativeRow} row
	 */
	async function approveGamertagForRow(row) {
		actErr = '';
		if (!coppaSigned) {
			actErr = 'Sign the waiver before approving a Gamertag change.';
			return;
		}
		const em = row.email;
		if (!em.endsWith('@operative.local') || !row.pendingGamertag) return;
		if (row.gamertagChangesLeft <= 0) {
			actErr = 'No gamertag changes remaining for this operative.';
			return;
		}
		gtActionBusyKey = em;
		try {
			const uref = doc(db, 'users', em);
			const snap = await getDoc(uref);
			if (!snap.exists()) {
				throw new Error('Operative profile not found.');
			}
			const d = snap.data() || {};
			const pending = typeof d.pendingGamertag === 'string' ? d.pendingGamertag.trim() : '';
			if (!pending) {
				throw new Error('No pending request.');
			}
			const left = typeof d.gamertagChangesLeft === 'number' ? d.gamertagChangesLeft : 3;
			if (left <= 0) {
				throw new Error('No changes remaining.');
			}
			const nextLeft = left - 1;
			const batch = writeBatch(db);
			batch.update(uref, {
				gamertag: pending,
				playerName: pending,
				pendingGamertag: null,
				gamertagChangesLeft: nextLeft,
			});
			const plref = doc(db, 'player_lookup', em);
			const pls = await getDoc(plref);
			if (pls.exists()) {
				batch.update(plref, { playerName: pending });
			}
			await batch.commit();
			await refreshHouseholdOperatives();
		} catch (e) {
			actErr = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */ (e).message) : 'Approve failed';
		} finally {
			gtActionBusyKey = null;
		}
	}

	/**
	 * @param {HouseholdOperativeRow} row
	 */
	async function denyGamertagForRow(row) {
		actErr = '';
		if (!coppaSigned) {
			actErr = 'Sign the waiver before updating gamertag requests.';
			return;
		}
		const em = row.email;
		if (!em.endsWith('@operative.local') || !row.pendingGamertag) return;
		gtActionBusyKey = em;
		try {
			await updateDoc(doc(db, 'users', em), { pendingGamertag: null });
			await refreshHouseholdOperatives();
		} catch (e) {
			actErr = e && typeof e === 'object' && 'message' in e ? String(/** @type {*} */ (e).message) : 'Deny failed';
		} finally {
			gtActionBusyKey = null;
		}
	}

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
						operativeRows = [];
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
					operativeRows = await buildEnrichedOperativeRows(db, d);
				} else {
					coppaSigned = false;
					coppaAt = null;
					operativeRows = [];
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
		const oper = operativeCallsign.trim();
		const slug = oper.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (!childName.trim() || !oper) {
			actErr = 'Enter the operative display name and Operative Callsign (username).';
			return;
		}
		if (slug.length < 2) {
			actErr = 'Operative Callsign must include at least two letters or numbers.';
			return;
		}
		if (slug.length > 32) {
			actErr = 'Operative Callsign: use a shorter name (2–32 letters or numbers after normalizing).';
			return;
		}
		// Server builds the same proxy as `${slug}@operative.local` for Firebase Auth; payload sends operativeCallsign only.
		actionBusy = true;
		lastDispatch = '';
		try {
			const teamCodeOpt = teamDispatchCode.trim();
			const payload: Record<string, string> = {
				childName: childName.trim(),
				operativeCallsign: oper,
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
			operativeCallsign = '';
			teamDispatchCode = '';
			await authStore.refresh({ silent: true });
			if (householdId) {
				const hs = await getDoc(doc(db, 'households', householdId));
				if (hs.exists()) {
					operativeRows = await buildEnrichedOperativeRows(db, hs.data() || {});
				}
			}
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

	function closeOtpDialog() {
		otpDialog = false;
		copyFeedback = false;
	}

	/**
	 * @param {{ email: string; name: string }} row
	 */
	async function generateOtpForRow(row) {
		actErr = '';
		if (!coppaSigned) {
			actErr = 'Sign the waiver before issuing clearance codes.';
			return;
		}
		otpGenBusyKey = row.email;
		try {
			const res = await generatePlayerOTP({ childEmail: row.email });
			const data = (res && typeof res === 'object' && 'data' in res ? res.data : res) as {
				code?: unknown;
				expiresAt?: unknown;
			} | null;
			const code = data && typeof data === 'object' && data.code != null ? String(data.code) : '';
			const iso = data && typeof data === 'object' && data.expiresAt != null ? String(data.expiresAt) : '';
			if (!code) {
				throw new Error('No code returned.');
			}
			const expiresAt = iso ?
				new Date(iso).getTime() :
				Date.now() + 10 * 60 * 1000;
			otpDialog = { code, expiresAt, displayName: row.name };
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {*} */ (e).message) :
					'Could not generate code.';
			actErr = msg;
		} finally {
			otpGenBusyKey = null;
		}
	}

	async function copyOtpToClipboard() {
		if (!browser || !otpDialog || typeof otpDialog !== 'object') return;
		try {
			await navigator.clipboard.writeText(otpDialog.code);
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2000);
		} catch {
			actErr = 'Clipboard unavailable. Copy the code manually.';
		}
	}

	/** @param {KeyboardEvent} e */
	function onOtpKeydown(e) {
		if (e.key === 'Escape' && otpDialog) {
			e.preventDefault();
			closeOtpDialog();
		}
	}
</script>

<svelte:head>
	<title>Household · Clearance · SSTRACKER</title>
</svelte:head>

<svelte:window onkeydown={onOtpKeydown} />

<div
	class="phh parent-lounge-page tw-mx-auto tw-w-full tw-max-w-3xl"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	data-region="household-clearance"
>
	<header class="phh-page-head bento-mb-lg">
		<div class="phh-page-head__actions">
			<button
				type="button"
				class="phh-sign-out"
				onclick={() => void handleSignOut()}
			>
				Secure Sign Out
			</button>
		</div>
		<div class="tw-text-center">
			<p class="phh-eyebrow tw-mb-1">Parent OS · TIER-0 ACCESS</p>
			<h1 class="phh-title tw-mb-2 tw-text-xl tw-font-extrabold tw-tracking-tight tw-text-white md:tw-text-2xl">
				Household Clearance Center
			</h1>
			<p class="tw-mx-auto tw-max-w-prose tw-text-sm tw-text-white/50">
				Classified provisioning. Minors do not self-register. Digital signatures and dispatch codes
				are the only valid ingress paths.
			</p>
		</div>
	</header>

	{#if loadErr}
		<div
			class="bento-mb-md tw-border tw-border-red-500/50 tw-bg-red-950/30 tw-px-4 tw-py-3 tw-text-sm tw-text-red-200"
			role="alert"
		>
			{loadErr}
		</div>
	{/if}

	<div
		class="bento-grid bento-grid--12col bento-grid--liquid tw-min-h-0 tw-w-full"
	>
		<!-- COPPA & liability block -->
		<section
			class="phh-surface parent-lounge-z2-panel parent-lounge-z2-panel--warn bento-span-12 tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5"
			aria-labelledby="phh-coppa"
		>
			<div class="tw-mb-3 tw-flex tw-flex-col tw-gap-1">
				<span class="phh-eyebrow tw-text-red-400/90">COPPA &amp; LIABILITY</span>
				<h2 id="phh-coppa" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-200">
					Minor accounts locked
				</h2>
			</div>
			<p class="bento-mb-md tw-text-sm tw-leading-relaxed tw-text-white/70">
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

		<!-- Linked operatives — ephemeral OTP login -->
		{#if operativeRows.length > 0}
			<section
				class="phh-surface parent-lounge-z2-panel bento-span-12 tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5"
				aria-labelledby="phh-active-ops"
			>
				<div class="tw-mb-3">
					<span class="phh-eyebrow tw-text-cyan-200/80">Household roster</span>
					<h2
						id="phh-active-ops"
						class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white"
					>
						Active operatives
					</h2>
				</div>
				<p class="tw-mb-3 tw-text-xs tw-leading-relaxed tw-text-white/50">
					Issue a 10-minute clearance code your athlete can enter with their Operative Callsign on
					the login page.
				</p>
				<ul class="tw-m-0 tw-list-none bento-stack-sm tw-p-0">
					{#each operativeRows as row (row.email)}
						<li
							class="tw-flex tw-min-w-0 tw-flex-col tw-gap-2 tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-3"
						>
							<div class="tw-min-w-0">
								<p class="phh-mono tw-m-0 tw-text-sm tw-font-bold tw-text-cyan-100/90">
									{row.name}
								</p>
								{#if row.email.endsWith('@operative.local')}
									<div class="phh-cmd-hud tw-mt-2 tw-border tw-border-cyan-500/20 tw-bg-black/60 tw-px-2 tw-py-2">
										<p class="phh-eyebrow tw-mb-0.5 !tw-text-[0.5rem] tw-text-cyan-200/60">
											Login Callsign
										</p>
										<p class="phh-cmd-callsign phh-mono tw-m-0 tw-text-lg tw-font-black tw-text-cyan-200 sm:tw-text-xl">
											{row.loginCallsign || '—'}
										</p>
										<p
											class="phh-mono tw-m-0 tw-mt-1 tw-text-[0.65rem] tw-break-all tw-text-white/40"
										>
											{row.email}
										</p>
										<div class="tw-mt-2 tw-flex tw-flex-wrap tw-items-baseline tw-gap-2">
											<span class="phh-eyebrow !tw-m-0 !tw-text-[0.5rem]">Dispatch</span>
											{#if row.hudErr}
												<span class="phh-mono tw-text-xs tw-text-amber-300/80">{row.hudErr}</span>
											{:else if row.dispatchCode}
												<span
													class="phh-mono tw-text-sm tw-font-bold tw-tracking-widest tw-text-[#7dff9a]"
													>{row.dispatchCode}</span
												>
											{:else}
												<span class="phh-mono tw-text-xs tw-text-white/35">—</span>
											{/if}
										</div>
									</div>
									{#if row.pendingGamertag}
										<div
											class="phh-gt-queue tw-mt-2 tw-border tw-border-amber-500/50 tw-bg-amber-950/20 tw-px-2.5 tw-py-2.5"
											role="status"
										>
											<p
												class="phh-eyebrow tw-mb-1 !tw-text-[0.55rem] tw-text-amber-200/90"
											>
												Action required
											</p>
											<p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-amber-50/90">
												Operative requested a new Gamertag: <span class="tw-font-semibold"
													>{row.pendingGamertag}</span
												>. They have
												<span class="tw-font-semibold">{row.gamertagChangesLeft}</span> changes
												remaining.
											</p>
											<div
												class="tw-mt-2 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center"
											>
												<button
													type="button"
													class="phh-gt-approve"
													disabled={!coppaSigned ||
														gtActionBusyKey !== null ||
														actionBusy ||
														row.gamertagChangesLeft <= 0}
													onclick={() => approveGamertagForRow(row)}
												>
													{gtActionBusyKey === row.email ? '…' : 'Approve'}
												</button>
												<button
													type="button"
													class="phh-gt-deny"
													disabled={!coppaSigned || gtActionBusyKey !== null || actionBusy}
													onclick={() => denyGamertagForRow(row)}
												>
													{gtActionBusyKey === row.email ? '…' : 'Deny'}
												</button>
											</div>
										</div>
									{/if}
								{:else}
									<p class="phh-mono tw-m-0 tw-text-xs tw-text-white/40">
										{row.callsign ? `Callsign: ${row.callsign}` : row.email}
									</p>
								{/if}
							</div>
							<div class="tw-flex tw-shrink-0 sm:tw-justify-end">
								<button
									type="button"
									class="phh-dispatch-gen tw-w-full sm:tw-w-auto"
									disabled={!coppaSigned ||
										otpGenBusyKey !== null ||
										gtActionBusyKey !== null ||
										actionBusy}
									onclick={() => generateOtpForRow(row)}
								>
									{otpGenBusyKey === row.email ? 'Working…' : 'Generate clearance code'}
								</button>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Operative generation -->
		<section
			class="phh-surface parent-lounge-z2-panel bento-span-12 tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5"
			aria-labelledby="phh-ops"
		>
			<div class="tw-mb-3">
				<span class="phh-eyebrow tw-text-cyan-200/80">Operative generation</span>
				<h2 id="phh-ops" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white">
					Credential dispatch
				</h2>
			</div>
			<p class="bento-mb-md tw-text-sm tw-text-white/55">
				Register the minor’s <span class="tw-text-white/80">legal display name</span> and a unique
				<span class="tw-text-white/80">Operative Callsign</span> (username for sign-in). A proxy
				account is created automatically. The engine issues a one-time
				<span class="phh-mono tw-text-cyan-300">DISPATCH</span> code for Operative login.
			</p>
			<div class="tw-min-w-0 bento-grid bento-grid--2col bento-grid--liquid">
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
					<span class="phh-eyebrow tw-mb-1 tw-block"
						>Operative Callsign <span class="tw-text-red-300/80">(required)</span></span
					>
					<input
						class="phh-input"
						type="text"
						autocomplete="username"
						placeholder="e.g. Red-Fox, striker99"
						bind:value={operativeCallsign}
					/>
				</label>
				<div class="phh-field tw-block tw-w-full md:tw-col-span-2">
					<div class="tw-mb-1 tw-flex tw-items-center tw-gap-2">
						<label
							for="phh-dispatch-code"
							class="phh-eyebrow tw-m-0 tw-block tw-text-cyan-300/80"
						>
							Dispatch Code <span class="tw-text-white/40">(optional)</span>
						</label>
						<IntelModal
							title={DISPATCH_CODE_INTEL.title}
							instructions={DISPATCH_CODE_INTEL.instructions}
						/>
					</div>
					<input
						id="phh-dispatch-code"
						class="phh-input phh-input--cyan"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder="e.g. AB-1K2M"
						bind:value={teamDispatchCode}
					/>
					<p class="tw-mt-1 tw-text-xs tw-text-slate-400">
						Your 6-digit team code (Provided by your coach).
					</p>
				</div>
			</div>
			<div class="bento-mt-md">
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
					class="tw-mt-3 tw-min-w-0 tw-border tw-border-[#2dd4bf]/40 tw-bg-[#05050a] tw-px-3 tw-py-3"
					role="status"
				>
					<p class="phh-eyebrow tw-mb-1 tw-text-[#2dd4bf]">Last dispatch (share once; keep secure)</p>
					<p class="phh-mono tw-break-all tw-text-lg tw-text-[#7dff9a] sm:tw-text-xl">
						{lastDispatch}
					</p>
				</div>
			{/if}
		</section>

		<section
			class="phh-surface parent-lounge-z2-panel bento-span-12 tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5"
			aria-labelledby="phh-transfer"
		>
			<div class="tw-mb-3">
				<span class="phh-eyebrow tw-text-white/50">Club transfer</span>
				<h2
					id="phh-transfer"
					class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white"
				>
					Vanguard transfer protocol
				</h2>
			</div>
			<p class="tw-mb-3 tw-text-xs tw-leading-relaxed tw-text-white/50">
				Initiate a player transfer to another club. You will receive a token to share with the
				destination registrar; confirm with their auth code when prompted.
			</p>
			<TransferPortal
				role="parent"
				playerEmail={operativeRows[0]?.email && !operativeRows[0].email.endsWith('@operative.local')
					? operativeRows[0].email
					: ''}
			/>
		</section>
	</div>

	{#if actErr}
		<div
			class="bento-mt-md tw-border tw-border-amber-500/50 tw-bg-amber-950/20 tw-px-4 tw-py-3 tw-text-sm tw-text-amber-100"
			role="alert"
		>
			{actErr}
		</div>
	{/if}
</div>

{#if otpDialog !== false}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="phh-otp-backdrop"
		role="presentation"
		onclick={closeOtpDialog}
	>
		<div
			class="phh-otp-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="phh-otp-title"
			onclick={(e) => e.stopPropagation()}
		>
			<p class="phh-eyebrow tw-mb-2 tw-text-cyan-300/80">Clearance code</p>
			<h3 id="phh-otp-title" class="phh-otp-h3 tw-m-0">
				{otpDialog.displayName}
			</h3>
			<p class="phh-mono phh-otp-code tw-my-4 tw-text-center tw-tracking-[0.2em] tw-text-[#7dff9a]">
				{otpDialog.code}
			</p>
			<p class="tw-mb-3 tw-text-center tw-text-xs tw-leading-relaxed tw-text-white/45">
				This clearance code expires 10 minutes after it is generated.
			</p>
			<div
				class="phh-otp-ttl bento-mb-md tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-cyan-200/80"
			>
				<span class="phh-eyebrow !tw-m-0 tw-text-[0.6rem]">Expires in</span>
				<span class="phh-mono tw-text-lg tw-font-black tw-text-cyan-300 tw-tabular-nums"
					>{otpCountdownLabel}</span
				>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
				<button type="button" class="phh-btn phh-btn--cyan phh-otp-btn" onclick={copyOtpToClipboard}>
					{copyFeedback ? 'Copied' : 'Copy to clipboard'}
				</button>
				<button type="button" class="phh-btn phh-otp-btn phh-otp-btn--close" onclick={closeOtpDialog}
					>Dismiss</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	:global([data-region='household-clearance'] *) {
		box-sizing: border-box;
	}
	.phh-page-head {
		position: relative;
	}
	.phh-page-head__actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.5rem;
	}
	.phh-sign-out {
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		touch-action: manipulation;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.phh-sign-out:hover {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.45);
		box-shadow: 0 0 18px rgba(248, 113, 113, 0.12);
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
		/* Sprint 1.1: tactile liquid shadow + inner highlight */
		box-shadow: var(--shadow-liquid);
		background-image: linear-gradient(
			160deg,
			rgba(255, 255, 255, 0.03) 0%,
			rgba(255, 255, 255, 0) 60%
		);
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

	.phh-dispatch-gen {
		flex-shrink: 0;
		align-self: stretch;
		padding: 0.55rem 0.75rem;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
		color: #67e8f9;
		background: rgba(8, 47, 73, 0.55);
		border: 1px solid rgba(20, 184, 166, 0.45);
		border-radius: 0.2rem;
		cursor: pointer;
		box-shadow: none;
		transition:
			background 0.12s ease,
			border-color 0.12s ease;
	}

	.phh-dispatch-gen:hover:not(:disabled) {
		background: rgba(8, 47, 73, 0.75);
		border-color: rgba(20, 184, 166, 0.65);
	}

	.phh-dispatch-gen:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.phh-cmd-callsign {
		font-variant-ligatures: none;
		letter-spacing: 0.04em;
	}

	.phh-gt-approve,
	.phh-gt-deny {
		min-height: 2.5rem;
		padding: 0.4rem 0.9rem;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
		border-radius: 0.2rem;
		cursor: pointer;
	}
	.phh-gt-approve {
		color: #05050a;
		background: linear-gradient(180deg, #7dff9a 0%, #3ecf6a 100%);
		border: 1px solid rgba(125, 255, 154, 0.9);
	}
	.phh-gt-approve:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.phh-gt-deny {
		color: #fecaca;
		background: rgba(127, 29, 29, 0.4);
		border: 1px solid rgba(248, 113, 113, 0.45);
	}
	.phh-gt-deny:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.phh-otp-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
	}

	.phh-otp-panel {
		width: 100%;
		max-width: 22rem;
		padding: 1.25rem 1.25rem 1rem;
		border: 1px solid rgba(20, 184, 166, 0.5);
		border-radius: 0.35rem;
		background: #05050a;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 28px rgba(20, 184, 166, 0.12);
	}

	.phh-otp-h3 {
		font-size: 1.05rem;
		font-weight: 800;
		color: #fff;
		letter-spacing: 0.02em;
	}

	.phh-otp-code {
		font-size: clamp(1.5rem, 5vw, 1.9rem);
		font-weight: 800;
		line-height: 1.2;
		text-shadow: 0 0 18px rgba(125, 255, 154, 0.25);
	}

	.phh-otp-ttl {
		font-variant-numeric: tabular-nums;
	}

	.phh-otp-btn {
		min-height: 2.75rem;
		margin: 0;
	}

	.phh-otp-btn--close {
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
	}

	.phh-otp-btn--close:hover {
		border-color: rgba(255, 255, 255, 0.4);
	}

	/* ── Privacy Dashboard accordion ─────────────────────────────────────── */
	.phh-privacy-details {
		border: 1px solid rgba(255, 50, 80, 0.15);
		border-radius: 8px;
		overflow: hidden;
	}
	.phh-privacy-summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		background: rgba(255, 50, 80, 0.04);
		cursor: pointer;
		list-style: none;
		font-family: 'JetBrains Mono', monospace;
	}
	.phh-privacy-summary::-webkit-details-marker { display: none; }
	.phh-privacy-label {
		font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em;
		color: rgba(255, 50, 80, 0.6);
	}
	.phh-privacy-name {
		font-size: 0.72rem; font-weight: 600; color: rgba(255, 255, 255, 0.65);
	}
	.phh-privacy-chevron {
		margin-left: auto; font-size: 0.65rem; color: rgba(255, 255, 255, 0.25);
		transition: transform 0.2s;
	}
	.phh-privacy-details[open] .phh-privacy-chevron { transform: rotate(90deg); }
</style>

{#if operativeRows.length > 0}
	<!-- Privacy Dashboard — shows PII access log for each linked operative. -->
	<div class="tw-mx-auto tw-w-full tw-max-w-3xl tw-px-3 tw-pb-6 md:tw-px-6">
		{#each operativeRows as row (row.email)}
			<details class="phh-privacy-details bento-mt-md">
				<summary class="phh-privacy-summary">
					<span class="phh-privacy-label">PRIVACY LOG</span>
					<span class="phh-privacy-name">{row.name || row.email}</span>
					<span class="phh-privacy-chevron" aria-hidden="true">▸</span>
				</summary>
				<div class="tw-mt-2">
					<ParentPrivacyDashboard childEmail={row.email} />
				</div>
			</details>
		{/each}
	</div>
{/if}
