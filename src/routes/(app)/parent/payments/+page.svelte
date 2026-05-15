<script lang="ts">
	/**
	 * /parent/payments — Season Registration Payments
	 *
	 * Shows each linked player's current payment status for the active season
	 * and allows the parent to open the Secure Payment Terminal (SeasonRegistration)
	 * to complete registration.
	 */
	import { browser } from '$app/environment';
	import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import SeasonRegistration from '$lib/components/parent/SeasonRegistration.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	// ── Types ─────────────────────────────────────────────────────────────────

	type PaymentStatus = 'none' | 'pending' | 'processing' | 'paid' | 'failed';

	interface PlayerRow {
		email: string;
		displayName: string;
		paymentStatus: PaymentStatus;
		paidAt: number | null;
		feeAmountCents: number;
	}

	interface ActiveSeason {
		seasonId: string;
		seasonName: string;
		feeAmountDollars: number;
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let players = $state<PlayerRow[]>([]);
	let activeSeason = $state<ActiveSeason | null>(null);
	let tenantId = $state('');
	let loading = $state(true);
	let err = $state('');

	/** Email of the player whose payment modal is currently open. */
	let payingPlayerEmail = $state('');

	// ── Derived ───────────────────────────────────────────────────────────────

	const profile = $derived(authStore.userProfile);
	const payingPlayer = $derived(players.find((p) => p.email === payingPlayerEmail) ?? null);

	// ── Data load ─────────────────────────────────────────────────────────────

	$effect(() => {
		if (!browser || authStore.isLoading) return;

		const parentEmail = (authStore.user?.email ?? '').toLowerCase();
		const rawTid =
			/** @type {string | undefined} */ (
				(authStore.user as unknown as { accessToken?: string } | null)
					?.accessToken
			) ?? '';

		// Resolve tenantId from profile (stored after provisioning)
		const tid =
			typeof (profile as Record<string, unknown>)?.clubId === 'string'
				? String((profile as Record<string, unknown>).clubId)
				: typeof (profile as Record<string, unknown>)?.tenantId === 'string'
					? String((profile as Record<string, unknown>).tenantId)
					: '';

		if (!parentEmail || !tid) {
			loading = false;
			return;
		}

		tenantId = tid;

		void loadData(parentEmail, tid);
	});

	async function loadData(parentEmail: string, tid: string) {
		loading = true;
		err = '';
		try {
			// 1. Get household to find linked player emails
			const hq = query(
				collection(db, 'households'),
				where('parentEmails', 'array-contains', parentEmail),
				limit(1),
			);
			const hs = await getDocs(hq);
			const playerEmails: string[] =
				hs.empty
					? []
					: ((hs.docs[0].data()?.playerEmails as string[] | undefined) ?? []).filter(
							(e) => typeof e === 'string',
						);

			// 2. Get active season from organization
			const orgSnap = await getDoc(doc(db, 'organizations', tid));
			const orgData = orgSnap.exists() ? orgSnap.data() : null;
			const rawSeason = orgData?.activeSeason as
				| { seasonId?: string; name?: string; feeAmountDollars?: number }
				| undefined;

			if (rawSeason?.seasonId) {
				activeSeason = {
					seasonId: rawSeason.seasonId,
					seasonName: rawSeason.name ?? `Season ${rawSeason.seasonId}`,
					feeAmountDollars: rawSeason.feeAmountDollars ?? 0,
				};
			} else {
				activeSeason = null;
			}

			// 3. For each player, fetch latest season_registration
			if (playerEmails.length === 0 || !activeSeason) {
				players = [];
				loading = false;
				return;
			}

			const rows: PlayerRow[] = await Promise.all(
				playerEmails.map(async (email) => {
					const rq = query(
						collection(db, 'season_registrations'),
						where('playerEmail', '==', email),
						where('tenantId', '==', tid),
						where('seasonId', '==', activeSeason!.seasonId),
						limit(1),
					);
					const rs = await getDocs(rq);

					const userSnap = await getDoc(doc(db, 'users', email));
					const displayName =
						typeof userSnap.data()?.playerName === 'string'
							? (userSnap.data()!.playerName as string)
							: email.split('@')[0];

					if (rs.empty) {
						return {
							email,
							displayName,
							paymentStatus: 'none' as PaymentStatus,
							paidAt: null,
							feeAmountCents: Math.round(activeSeason!.feeAmountDollars * 100),
						};
					}

					const d = rs.docs[0].data();
					return {
						email,
						displayName,
						paymentStatus: (d.paymentStatus as PaymentStatus) ?? 'none',
						paidAt: d.paidAt?.toMillis?.() ?? null,
						feeAmountCents: d.feeAmountCents ?? 0,
					};
				}),
			);

			players = rows;
		} catch (e: unknown) {
			err = e instanceof Error ? e.message : 'Failed to load payment data.';
		} finally {
			loading = false;
		}
	}

	// ── Status helpers ────────────────────────────────────────────────────────

	function statusLabel(s: PaymentStatus): string {
		if (s === 'paid') return 'Paid';
		if (s === 'pending') return 'Pending';
		if (s === 'processing') return 'Processing';
		if (s === 'failed') return 'Failed';
		return 'Not paid';
	}

	function statusIcon(s: PaymentStatus): string {
		if (s === 'paid') return 'status.check';
		if (s === 'pending' || s === 'processing') return 'sys.clock';
		if (s === 'failed') return 'status.warning';
		return 'sys.credit-card';
	}

	function statusColor(s: PaymentStatus): string {
		if (s === 'paid') return 'tw-text-emerald-400';
		if (s === 'pending' || s === 'processing') return 'tw-text-amber-400';
		if (s === 'failed') return 'tw-text-red-400';
		return 'tw-text-slate-400';
	}

	function fmtCents(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function fmtDate(ms: number | null): string {
		if (!ms) return '';
		return new Date(ms).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function openPayment(playerEmail: string) {
		payingPlayerEmail = playerEmail;
	}

	function closePayment() {
		payingPlayerEmail = '';
	}

	function handlePaid() {
		// Refresh the player's status in the list
		const idx = players.findIndex((p) => p.email === payingPlayerEmail);
		if (idx !== -1) {
			players[idx] = { ...players[idx], paymentStatus: 'paid' };
		}
		closePayment();
	}
</script>

<svelte:head>
	<title>Payments · Parent Portal</title>
</svelte:head>

{#if payingPlayerEmail && payingPlayer && activeSeason}
	<SeasonRegistration
		playerEmail={payingPlayer.email}
		{tenantId}
		seasonId={activeSeason.seasonId}
		seasonName={activeSeason.seasonName}
		feeAmountDollars={activeSeason.feeAmountDollars}
		onclose={closePayment}
		onpaid={handlePaid}
	/>
{/if}

<div class="pp-root tw-mx-auto tw-box-border tw-w-full tw-max-w-3xl tw-min-w-0 tw-px-4 tw-pb-24 tw-pt-6">
	<header class="tw-mb-8 tw-min-w-0">
		<p class="tw-mb-1 tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-500">
			Parent Portal
		</p>
		<h1 class="tw-m-0 tw-font-sans tw-text-2xl tw-font-black tw-tracking-tight tw-text-slate-100">
			Season Payments
		</h1>
		{#if activeSeason}
			<p class="tw-mt-1 tw-text-sm tw-text-slate-400">
				Active season: <span class="tw-font-semibold tw-text-slate-300">{activeSeason.seasonName}</span>
				· <span class="tw-font-mono">{fmtCents(Math.round(activeSeason.feeAmountDollars * 100))}</span> registration fee
			</p>
		{/if}
	</header>

	{#if loading}
		<div class="tw-flex tw-items-center tw-gap-3 tw-py-12 tw-text-slate-400">
			<div class="tw-h-5 tw-w-5 tw-animate-spin tw-rounded-full tw-border-2 tw-border-slate-700 tw-border-t-teal-500"></div>
			<span class="tw-font-mono tw-text-sm">Loading payment status…</span>
		</div>
	{:else if err}
		<div class="tw-rounded-xl tw-border tw-border-red-500/30 tw-bg-red-950/30 tw-p-5">
			<p class="tw-font-mono tw-text-sm tw-text-red-400">{err}</p>
		</div>
	{:else if !activeSeason}
		<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-16 tw-text-center">
			<Icon name="sys.credit-card" size={36} class="tw-text-slate-600" />
			<p class="tw-font-sans tw-text-base tw-font-semibold tw-text-slate-400">No active season</p>
			<p class="tw-text-sm tw-text-slate-500">
				Your club hasn't configured a registration season yet. Contact your club director.
			</p>
		</div>
	{:else if players.length === 0}
		<div class="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-16 tw-text-center">
			<Icon name="user.group" size={36} class="tw-text-slate-600" />
			<p class="tw-font-sans tw-text-base tw-font-semibold tw-text-slate-400">No linked players</p>
			<p class="tw-text-sm tw-text-slate-500">
				Link a player to your household from the <a href="/parent/household" class="tw-text-teal-400 hover:tw-text-teal-300">Household</a> tab.
			</p>
		</div>
	{:else}
		<ul class="tw-m-0 tw-list-none tw-space-y-4 tw-p-0">
			{#each players as player (player.email)}
				<li class="tw-rounded-2xl tw-border tw-border-slate-800 tw-bg-slate-900/60 tw-p-5">
					<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
						<!-- Player identity -->
						<div class="tw-flex tw-min-w-0 tw-items-center tw-gap-3">
							<div
								class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-800 tw-font-mono tw-text-sm tw-font-black tw-text-slate-300"
								aria-hidden="true"
							>
								{player.displayName.slice(0, 2).toUpperCase()}
							</div>
							<div class="tw-min-w-0">
								<p class="tw-m-0 tw-truncate tw-font-sans tw-font-bold tw-text-slate-100">
									{player.displayName}
								</p>
								<p class="tw-m-0 tw-truncate tw-font-mono tw-text-xs tw-text-slate-500">
									{player.email}
								</p>
							</div>
						</div>

						<!-- Status + action -->
						<div class="tw-flex tw-shrink-0 tw-items-center tw-gap-3">
							<div class="tw-flex tw-items-center tw-gap-1.5 {statusColor(player.paymentStatus)}">
								<Icon name={statusIcon(player.paymentStatus) as IconName} size={15} />
								<span class="tw-font-mono tw-text-sm tw-font-bold">{statusLabel(player.paymentStatus)}</span>
							</div>

							{#if player.paymentStatus === 'paid'}
								{#if player.paidAt}
									<span class="tw-font-mono tw-text-xs tw-text-slate-500">
										{fmtDate(player.paidAt)}
									</span>
								{/if}
							{:else if player.paymentStatus === 'none' || player.paymentStatus === 'failed'}
								<button
									type="button"
									class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-teal-700/60 tw-bg-teal-900/30 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-tracking-wide tw-text-teal-300 tw-transition-colors hover:tw-bg-teal-900/60"
									onclick={() => openPayment(player.email)}
								>
									Pay {fmtCents(Math.round(activeSeason.feeAmountDollars * 100))}
								</button>
							{:else}
								<span class="tw-font-mono tw-text-xs tw-text-slate-500">In progress…</span>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<p class="tw-mt-6 tw-text-xs tw-text-slate-600">
			Payments are processed securely via Stripe Connect. Funds route directly to your club director's connected account.
		</p>
	{/if}
</div>
