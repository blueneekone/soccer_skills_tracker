<script lang="ts">
	/**
	 * /parent/payments — Season Registration Payments
	 *
	 * Shows each linked player's payment status (including installment progress)
	 * and opens SeasonRegistration for pay-in-full or installment checkout.
	 */
	import { browser } from '$app/environment';
	import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import SeasonRegistration from '$lib/components/parent/SeasonRegistration.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { loadSeasonPaymentLedger } from '$lib/parent/loadSeasonPaymentLedger.js';
	import {
		displayStatusLabel,
		formatCents,
		installmentProgressLabel,
		parseInstallmentConfig,
		type PaymentDisplayStatus,
		type SeasonPaymentLedger,
	} from '$lib/parent/paymentInstallments.js';

	interface PlayerRow {
		email: string;
		displayName: string;
		ledger: SeasonPaymentLedger;
		paidAt: number | null;
	}

	interface ActiveSeason {
		seasonId: string;
		seasonName: string;
		feeAmountDollars: number;
		registrationDeadline: string | null;
		raw: Record<string, unknown>;
	}

	let players = $state<PlayerRow[]>([]);
	let activeSeason = $state<ActiveSeason | null>(null);
	let tenantId = $state('');
	let loading = $state(true);
	let err = $state('');
	let payingPlayerEmail = $state('');

	const profile = $derived(authStore.userProfile);
	const payingPlayer = $derived(players.find((p) => p.email === payingPlayerEmail) ?? null);
	const installmentConfig = $derived(
		activeSeason
			? parseInstallmentConfig(activeSeason.raw, activeSeason.feeAmountDollars)
			: { enabled: false, options: [1], minFeeDollars: 50 },
	);

	$effect(() => {
		if (!browser || authStore.isLoading) return;

		const parentEmail = (authStore.user?.email ?? '').toLowerCase();
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

			const orgSnap = await getDoc(doc(db, 'organizations', tid));
			const orgData = orgSnap.exists() ? orgSnap.data() : null;
			const rawSeason =
				orgData?.activeSeason && typeof orgData.activeSeason === 'object'
					? (orgData.activeSeason as Record<string, unknown>)
					: null;

			if (rawSeason && typeof rawSeason.seasonId === 'string') {
				activeSeason = {
					seasonId: rawSeason.seasonId,
					seasonName:
						typeof rawSeason.name === 'string'
							? rawSeason.name
							: `Season ${rawSeason.seasonId}`,
					feeAmountDollars:
						typeof rawSeason.feeAmountDollars === 'number' ? rawSeason.feeAmountDollars : 0,
					registrationDeadline:
						typeof rawSeason.registrationDeadline === 'string'
							? rawSeason.registrationDeadline
							: null,
					raw: rawSeason,
				};
			} else {
				activeSeason = null;
			}

			if (playerEmails.length === 0 || !activeSeason) {
				players = [];
				loading = false;
				return;
			}

			const totalFeeCents = Math.round(activeSeason.feeAmountDollars * 100);
			const rows: PlayerRow[] = await Promise.all(
				playerEmails.map(async (email) => {
					const userSnap = await getDoc(doc(db, 'users', email));
					const displayName =
						typeof userSnap.data()?.playerName === 'string'
							? (userSnap.data()!.playerName as string)
							: email.split('@')[0];

					const ledger = await loadSeasonPaymentLedger({
						parentEmail,
						playerEmail: email,
						tenantId: tid,
						seasonId: activeSeason!.seasonId,
						totalFeeCents,
						activeSeason: activeSeason!.raw,
						registrationDeadline: activeSeason!.registrationDeadline,
					});

					const latestPaidAt = ledger.registrations
						.filter((r) => r.paymentStatus === 'paid' && r.paidAt)
						.map((r) => r.paidAt as number)
						.sort((a, b) => b - a)[0] ?? null;

					return { email, displayName, ledger, paidAt: latestPaidAt };
				}),
			);

			players = rows;
		} catch (e: unknown) {
			err = e instanceof Error ? e.message : 'Failed to load payment data.';
		} finally {
			loading = false;
		}
	}

	function statusIcon(s: PaymentDisplayStatus): string {
		if (s === 'paid') return 'status.check';
		if (s === 'partial') return 'sys.clock';
		if (s === 'pending' || s === 'processing') return 'sys.clock';
		if (s === 'failed') return 'status.warning';
		return 'sys.credit-card';
	}

	function statusColor(s: PaymentDisplayStatus): string {
		if (s === 'paid') return 'tw-text-emerald-400';
		if (s === 'partial') return 'tw-text-sky-400';
		if (s === 'pending' || s === 'processing') return 'tw-text-amber-400';
		if (s === 'failed') return 'tw-text-red-400';
		return 'tw-text-slate-400';
	}

	function fmtDate(ms: number | null): string {
		if (!ms) return '';
		return new Date(ms).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function payButtonLabel(ledger: SeasonPaymentLedger): string {
		if (ledger.effectiveStatus === 'partial') {
			return `Pay installment ${formatCents(ledger.nextDueCents)}`;
		}
		return `Pay ${formatCents(ledger.totalFeeCents)}`;
	}

	function canPay(ledger: SeasonPaymentLedger): boolean {
		return (
			ledger.effectiveStatus === 'none' ||
			ledger.effectiveStatus === 'failed' ||
			ledger.effectiveStatus === 'partial'
		);
	}

	function openPayment(playerEmail: string) {
		payingPlayerEmail = playerEmail;
	}

	function closePayment() {
		payingPlayerEmail = '';
	}

	function handlePaid() {
		closePayment();
		const parentEmail = (authStore.user?.email ?? '').toLowerCase();
		const tid = tenantId.trim();
		if (parentEmail && tid) {
			void loadData(parentEmail, tid);
		}
	}
</script>

<svelte:head>
	<title>Payments · Parent Portal</title>
</svelte:head>

{#if payingPlayerEmail && payingPlayer && activeSeason}
	<SeasonRegistration
		playerEmail={payingPlayer.email}
		parentEmail={(authStore.user?.email ?? '').toLowerCase()}
		{tenantId}
		seasonId={activeSeason.seasonId}
		seasonName={activeSeason.seasonName}
		feeAmountDollars={activeSeason.feeAmountDollars}
		registrationDeadline={activeSeason.registrationDeadline}
		installmentOptions={installmentConfig.options}
		existingLedger={payingPlayer.ledger}
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
				· <span class="tw-font-mono">{formatCents(Math.round(activeSeason.feeAmountDollars * 100))}</span>
				registration fee
				{#if installmentConfig.enabled}
					· installment plans available
				{/if}
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
								{#if player.ledger.installmentCount > 1}
									<p class="tw-m-0 tw-mt-1 tw-font-mono tw-text-xs tw-text-slate-500">
										{installmentProgressLabel(player.ledger)}
									</p>
								{/if}
							</div>
						</div>

						<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-2">
							<div
								class="tw-flex tw-items-center tw-gap-1.5 {statusColor(player.ledger.effectiveStatus)}"
							>
								<Icon
									name={statusIcon(player.ledger.effectiveStatus) as IconName}
									size={15}
								/>
								<span class="tw-font-mono tw-text-sm tw-font-bold">
									{displayStatusLabel(player.ledger.effectiveStatus)}
								</span>
							</div>

							{#if player.ledger.effectiveStatus === 'paid'}
								{#if player.paidAt}
									<span class="tw-font-mono tw-text-xs tw-text-slate-500">
										{fmtDate(player.paidAt)}
									</span>
								{/if}
							{:else if canPay(player.ledger)}
								<button
									type="button"
									class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-teal-700/60 tw-bg-teal-900/30 tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-font-bold tw-tracking-wide tw-text-teal-300 tw-transition-colors hover:tw-bg-teal-900/60"
									onclick={() => openPayment(player.email)}
								>
									{payButtonLabel(player.ledger)}
								</button>
							{:else}
								<span class="tw-font-mono tw-text-xs tw-text-slate-500">In progress…</span>
							{/if}
						</div>
					</div>

					{#if player.ledger.installmentCount > 1 && player.ledger.effectiveStatus !== 'paid'}
						<ul class="tw-m-0 tw-mt-4 tw-list-none tw-space-y-1 tw-border-t tw-border-slate-800 tw-pt-3 tw-p-0">
							{#each player.ledger.schedule as item (item.index)}
								<li class="tw-flex tw-items-center tw-justify-between tw-font-mono tw-text-xs">
									<span class="tw-text-slate-500">
										Installment {item.index + 1}
										{#if item.dueDateIso}
											· due {item.dueDateIso}
										{/if}
									</span>
									<span
										class={item.status === 'paid'
											? 'tw-text-emerald-400'
											: item.status === 'overdue'
												? 'tw-text-red-400'
												: item.status === 'due'
													? 'tw-text-amber-300'
													: 'tw-text-slate-500'}
									>
										{formatCents(item.amountCents)}
										· {item.status}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>

		<p class="tw-mt-6 tw-text-xs tw-text-slate-600">
			Payments are processed securely via Stripe Connect. Pay in full or split into installments before
			the registration deadline. Funds route directly to your club director's connected account.
		</p>
	{/if}
</div>
