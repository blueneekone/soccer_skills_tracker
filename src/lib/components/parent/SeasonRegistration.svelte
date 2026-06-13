<script lang="ts">
	/**
	 * SeasonRegistration.svelte — Secure Payment Terminal
	 * ──────────────────────────────────────────────────────
	 * A fullscreen modal that looks like a classified secure data uplink,
	 * not a checkout page. Parents pay season registration fees here.
	 *
	 * STRIPE ELEMENTS
	 * ───────────────
	 * Stripe CardElement is mounted inside the card-input div.
	 * CommerceEngine handles:
	 *   1. createIntent() → gets clientSecret from CF
	 *   2. confirmPayment(cardElement, name) → Stripe.js confirmCardPayment
	 *   3. Real-time listener updates paymentStatus when webhook fires
	 *
	 * SECURITY
	 * ────────
	 * The player's activeSeason is locked at the Firestore rules level:
	 *   allow read <season_data>: if paymentStatus == 'paid' OR isDirector/isCoach
	 * The CommerceEngine also exposes isPaid for conditional UI rendering.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { CommerceEngine } from '$lib/services/commerce.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { saveInstallmentPlan } from '$lib/parent/paymentInstallmentPrefs.js';
	import {
		buildInstallmentSchedule,
		formatCents,
		splitAmountCents,
		type SeasonPaymentLedger,
	} from '$lib/parent/paymentInstallments.js';

	interface Props {
		playerEmail: string;
		parentEmail?: string;
		tenantId: string;
		seasonId: string;
		seasonName: string;
		feeAmountDollars: number;
		registrationDeadline?: string | null;
		installmentOptions?: number[];
		existingLedger?: SeasonPaymentLedger | null;
		onclose?: () => void;
		onpaid?: () => void;
	}

	let {
		playerEmail,
		parentEmail = '',
		tenantId,
		seasonId,
		seasonName,
		feeAmountDollars,
		registrationDeadline = null,
		installmentOptions = [1],
		existingLedger = null,
		onclose,
		onpaid,
	}: Props = $props();

	const commerce = new CommerceEngine(playerEmail, tenantId, seasonId);

	const totalFeeCents = $derived(Math.round(feeAmountDollars * 100));
	const paidCents = $derived(existingLedger?.paidCents ?? 0);
	const remainingCents = $derived(Math.max(0, totalFeeCents - paidCents));
	const continuingInstallments = $derived(paidCents > 0 && remainingCents > 0);
	const selectableOptions = $derived(
		[...new Set(installmentOptions.filter((n) => Number.isFinite(n) && n >= 1))].sort(
			(a, b) => a - b,
		),
	);
	let installmentCount = $state(
		existingLedger?.installmentCount && existingLedger.installmentCount > 1
			? existingLedger.installmentCount
			: selectableOptions[selectableOptions.length - 1] ?? 1,
	);
	const chargeCents = $derived.by(() => {
		if (continuingInstallments && existingLedger) {
			return existingLedger.nextDueCents;
		}
		if (installmentCount <= 1) return totalFeeCents;
		return splitAmountCents(totalFeeCents, installmentCount)[0] ?? totalFeeCents;
	});
	const chargeDollars = $derived(chargeCents / 100);
	const previewSchedule = $derived(
		buildInstallmentSchedule({
			totalFeeCents,
			installmentCount,
			paidCents,
			deadlineIso: registrationDeadline,
		}),
	);
	const registrationComplete = $derived(remainingCents <= 0 || paidCents >= totalFeeCents);

	// ── Stripe Elements state ─────────────────────────────────────────────────

	let cardElement: unknown = null;
	let stripe: unknown = null;
	let cardMounted = $state(false);
	let cardError = $state<string | null>(null);
	let cardholderName = $state('');

	// ── Phase machine ─────────────────────────────────────────────────────────
	// idle → loading → form → processing → confirmed | error
	type Phase = 'idle' | 'loading' | 'form' | 'processing' | 'confirmed' | 'error';
	let phase = $state<Phase>('idle');
	let scanlinePos = $state(0);
	let scanInterval: ReturnType<typeof setInterval> | null = null;

	// ── Pulse animation ───────────────────────────────────────────────────────
	let pulseActive = $state(false);
	function startPulse() {
		pulseActive = true;
		setTimeout(() => (pulseActive = false), 2000);
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	onMount(async () => {
		commerce.init();

		if (registrationComplete) {
			phase = 'confirmed';
			onpaid?.();
			return;
		}

		phase = 'idle';
	});

	onDestroy(() => {
		commerce.destroy();
		if (scanInterval) clearInterval(scanInterval);
		if (cardElement) (cardElement as { destroy?: () => void }).destroy?.();
	});

	// Watch for real-time payment confirmation
	$effect(() => {
		if (commerce.paymentStatus === 'paid') {
			phase = 'confirmed';
			onpaid?.();
		}
	});

	// ── Stripe Elements mount ─────────────────────────────────────────────────

	/**
	 * Svelte action to mount the Stripe CardElement.
	 * Must be synchronous — async init runs as a fire-and-forget inside.
	 */
	function mountCard(node: HTMLDivElement): { destroy: () => void } {
		(async () => {
			try {
				const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
				if (!key) return;

				const win = window as unknown as { Stripe?: (k: string) => unknown };
				if (!win.Stripe) {
					await new Promise<void>((res, rej) => {
						const s = document.createElement('script');
						s.src = 'https://js.stripe.com/v3/';
						s.onload = () => res();
						s.onerror = () => rej();
						document.head.appendChild(s);
					});
				}
				stripe = (window as unknown as { Stripe: (k: string) => unknown }).Stripe(key);
				const elements = (stripe as { elements: () => { create: (t: string, o: unknown) => unknown } }).elements();
				cardElement = elements.create('card', {
					style: {
						base: {
							color: '#14b8a6',
							fontFamily: '"Space Mono", "Courier New", monospace',
							fontSize: '14px',
							letterSpacing: '0.08em',
							'::placeholder': { color: '#0a7a7a' },
							iconColor: '#14b8a6',
						},
						invalid: { color: '#ff4060', iconColor: '#ff4060' },
					},
					hidePostalCode: false,
				});
				(cardElement as { mount: (el: HTMLDivElement) => void; on: (ev: string, cb: (e: { error?: { message: string } }) => void) => void }).mount(node);
				(cardElement as { on: (ev: string, cb: (e: { error?: { message: string } }) => void) => void }).on('change', (event) => {
					cardError = event.error?.message ?? null;
				});
				cardMounted = true;
			} catch {
				cardMounted = false;
			}
		})();
		return {
			destroy() {
				(cardElement as { destroy?: () => void } | null)?.destroy?.();
			},
		};
	}

	// ── Handlers ──────────────────────────────────────────────────────────────

	async function handleInitiatePayment() {
		phase = 'loading';
		startPulse();
		if (parentEmail && installmentCount > 1 && !continuingInstallments) {
			await saveInstallmentPlan(parentEmail, tenantId, seasonId, playerEmail, {
				installmentCount,
				totalFeeCents,
			});
		}
		await commerce.createIntent(chargeDollars);
		if (commerce.error) { phase = 'error'; return; }
		phase = 'form';

		// Start scanline animation
		scanInterval = setInterval(() => {
			scanlinePos = (scanlinePos + 2) % 100;
		}, 30);
	}

	async function handleConfirmPayment() {
		if (!cardholderName.trim()) { cardError = 'Cardholder name is required.'; return; }

		phase = 'processing';
		startPulse();

		if (cardElement && stripe) {
			await commerce.confirmPayment(cardElement, cardholderName);
		} else {
			// Stripe is not configured/available — never fabricate a "paid" state.
			// Real confirmation only happens via the webhook-backed paymentStatus listener.
			cardError =
				'Secure payment is unavailable right now. Please try again later or contact your club administrator.';
			phase = 'form';
			return;
		}

		if (commerce.error) { phase = 'error'; }
	}

	function handleRetry() {
		commerce['error'] = null;
		phase = 'idle';
		cardholderName = '';
		cardError = null;
	}

	// ── Formatters ────────────────────────────────────────────────────────────

	const hexFee = $derived(
		'0x' + chargeCents.toString(16).toUpperCase().padStart(6, '0'),
	);
</script>

<!-- ── Backdrop ──────────────────────────────────────────────────────────────── -->
<div
	role="dialog"
	aria-modal="true"
	aria-label="Season Registration Payment"
	class="fixed inset-0 z-50 flex items-center justify-center"
	style="background: rgba(0,0,0,0.85); backdrop-filter: blur(var(--vanguard-blur-lg)) saturate(180%); -webkit-backdrop-filter: blur(var(--vanguard-blur-lg)) saturate(180%);"
>
	<!-- Close target -->
	<button
		class="absolute inset-0 w-full h-full cursor-default"
		onclick={() => onclose?.()}
		aria-label="Close payment terminal"
	></button>

	<!-- ── Terminal panel ───────────────────────────────────────────────────── -->
	<div
		class="relative z-10 w-full max-w-lg mx-4"
		style="
			background: rgba(0, 8, 20, 0.96);
			border: 1px solid rgba(0, 255, 255, 0.25);
			border-radius: 4px;
			box-shadow: 0 0 60px rgba(0,255,255,0.08), 0 0 120px rgba(0,255,255,0.03);
		"
	>
		<!-- Corner accents -->
		<div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style="border-color: rgba(0,255,255,0.6);"></div>
		<div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style="border-color: rgba(0,255,255,0.6);"></div>
		<div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style="border-color: rgba(0,255,255,0.6);"></div>
		<div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style="border-color: rgba(0,255,255,0.6);"></div>

		<!-- Header bar -->
		<div
			class="flex items-center justify-between px-5 py-3"
			style="border-bottom: 1px solid rgba(0,255,255,0.12); background: rgba(0,255,255,0.04);"
		>
			<div class="flex items-center gap-3">
				<div
					class="w-2 h-2 rounded-full"
					class:animate-pulse={phase === 'processing' || phase === 'loading'}
					style="background: {phase === 'confirmed' ? '#2dd4bf' : phase === 'error' ? '#ff4060' : '#14b8a6'}; box-shadow: 0 0 8px currentColor;"
				></div>
				<span class="font-mono text-xs tracking-widest" style="color: rgba(0,255,255,0.7);">
					SECURE PAYMENT TERMINAL v2.4
				</span>
			</div>
			<button
				onclick={() => onclose?.()}
				class="font-mono text-xs px-2 py-1 transition-colors"
				style="color: rgba(0,255,255,0.4);"
				aria-label="Close"
			>[ ESC ]</button>
		</div>

		<!-- Body -->
		<div class="p-6 space-y-5">

			<!-- Season briefing block -->
			<div
				class="rounded-sm p-4 space-y-2"
				style="background: rgba(0,255,255,0.03); border: 1px solid rgba(0,255,255,0.08);"
			>
				<div class="flex justify-between items-start">
					<div>
						<div class="font-mono text-xs tracking-widest mb-1" style="color: rgba(0,255,255,0.5);">OPERATION</div>
						<div class="font-mono text-sm font-bold" style="color: #14b8a6;">{seasonName}</div>
					</div>
					<div class="text-right">
						<div class="font-mono text-xs tracking-widest mb-1" style="color: rgba(0,255,255,0.5);">FEE PAYLOAD</div>
						<div class="font-mono text-xl font-bold" style="color: #14b8a6; text-shadow: 0 0 20px rgba(0,255,255,0.5);">
							{formatCents(chargeCents)}
						</div>
						{#if installmentCount > 1 || continuingInstallments}
							<div class="font-mono text-xs" style="color: rgba(0,255,255,0.35);">
								{continuingInstallments ? 'Next installment' : `Installment 1 of ${installmentCount}`}
								· season total {formatCents(totalFeeCents)}
							</div>
						{/if}
						<div class="font-mono text-xs" style="color: rgba(0,255,255,0.3);">{hexFee}</div>
					</div>
				</div>
				<div
					class="flex items-center gap-2 pt-1"
					style="border-top: 1px solid rgba(0,255,255,0.08);"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
						<path d="M12 2L2 7l10 5 10-5-10-5zm0 10L2 7v10l10 5 10-5V7L12 12z" stroke="#2dd4bf" stroke-width="1.5"/>
					</svg>
					<span class="font-mono text-xs" style="color: rgba(0,255,255,0.4);">
						Player status locked until payment confirmed · Stripe Connect secured
					</span>
				</div>
			</div>

			<!-- ── PHASE: IDLE ──────────────────────────────────────────────────── -->
			{#if phase === 'idle'}
				<div class="space-y-4 text-center py-2">
					<div class="font-mono text-xs leading-relaxed" style="color: rgba(0,255,255,0.5);">
						ENCRYPT PAYMENT AND TRANSMIT VIA SECURE CHANNEL.<br/>
						FUNDS ROUTE DIRECTLY TO CLUB DIRECTOR'S CONNECTED ACCOUNT.<br/>
						CHOOSE PAY-IN-FULL OR AN INSTALLMENT PLAN BELOW.
					</div>

					{#if !continuingInstallments && selectableOptions.length > 1}
						<div
							class="rounded-sm p-3 space-y-2 text-left"
							style="background: rgba(0,255,255,0.02); border: 1px solid rgba(0,255,255,0.08);"
						>
							<div class="font-mono text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">
								PAYMENT PLAN
							</div>
							<div class="flex flex-wrap gap-2">
								{#each selectableOptions as option (option)}
									<button
										type="button"
										class="px-3 py-2 font-mono text-xs tracking-wide transition-all"
										style="
											border: 1px solid {installmentCount === option ? 'rgba(0,255,255,0.55)' : 'rgba(0,255,255,0.2)'};
											color: {installmentCount === option ? '#14b8a6' : 'rgba(0,255,255,0.45)'};
											background: {installmentCount === option ? 'rgba(0,255,255,0.1)' : 'transparent'};
										"
										onclick={() => (installmentCount = option)}
									>
										{option === 1 ? 'Pay in full' : `${option} payments`}
									</button>
								{/each}
							</div>
							{#if installmentCount > 1}
								<ul class="m-0 p-0 list-none space-y-1">
									{#each previewSchedule as row (row.index)}
										<li class="flex justify-between font-mono text-xs" style="color: rgba(0,255,255,0.35);">
											<span>
												#{row.index + 1}
												{#if row.dueDateIso} · {row.dueDateIso}{/if}
											</span>
											<span>{formatCents(row.amountCents)}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{:else if continuingInstallments && existingLedger}
						<div
							class="rounded-sm p-3 text-left font-mono text-xs"
							style="background: rgba(0,255,255,0.02); border: 1px solid rgba(0,255,255,0.08); color: rgba(0,255,255,0.45);"
						>
							Continuing {existingLedger.installmentCount}-payment plan ·
							{formatCents(existingLedger.paidCents)} paid ·
							{formatCents(existingLedger.remainingCents)} remaining
						</div>
					{/if}

					<button
						onclick={handleInitiatePayment}
						class="w-full py-3 font-mono text-sm font-bold tracking-widest transition-all duration-200"
						style="
							background: rgba(0,255,255,0.08);
							border: 1px solid rgba(0,255,255,0.4);
							color: #14b8a6;
							letter-spacing: 0.15em;
						"
						onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(0,255,255,0.15)')}
						onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(0,255,255,0.08)')}
					>[ INITIATE {continuingInstallments ? 'NEXT INSTALLMENT' : 'SECURE PAYMENT'} ]</button>
				</div>

			<!-- ── PHASE: LOADING ─────────────────────────────────────────────── -->
			{:else if phase === 'loading'}
				<div class="flex flex-col items-center gap-4 py-6">
					<div class="relative">
						<div
							class="w-12 h-12 rounded-full border-2 animate-spin"
							style="border-color: rgba(0,255,255,0.2); border-top-color: #14b8a6;"
						></div>
						<div class="absolute inset-2 rounded-full border border-dashed animate-spin"
							style="animation-direction: reverse; border-color: rgba(0,255,255,0.15); animation-duration: 3s;"
						></div>
					</div>
					<span class="font-mono text-xs tracking-widest animate-pulse" style="color: rgba(0,255,255,0.6);">
						ESTABLISHING SECURE CHANNEL...
					</span>
				</div>

			<!-- ── PHASE: FORM ────────────────────────────────────────────────── -->
			{:else if phase === 'form'}
				<div class="space-y-4 relative overflow-hidden">
					<!-- Scanline effect -->
					<div
						class="absolute inset-0 pointer-events-none z-10"
						style="
							background: linear-gradient(
								transparent {scanlinePos - 2}%,
								rgba(0,255,255,0.04) {scanlinePos}%,
								transparent {scanlinePos + 2}%
							);
							transition: background 30ms linear;
						"
					></div>

					<!-- Cardholder name -->
					<div class="space-y-1">
						<label class="font-mono text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">
							CARDHOLDER IDENTITY
						</label>
						<input
							type="text"
							bind:value={cardholderName}
							placeholder="FULL NAME ON CARD"
							autocomplete="cc-name"
							class="w-full px-3 py-2.5 font-mono text-sm bg-transparent outline-none transition-colors"
							style="
								border: 1px solid rgba(0,255,255,0.2);
								border-radius: 2px;
								color: #14b8a6;
								letter-spacing: 0.06em;
							"
							onfocus={(e) => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.5)')}
							onblur={(e) => (e.currentTarget.style.borderColor = 'rgba(0,255,255,0.2)')}
						/>
					</div>

					<!-- Card element container -->
					<div class="space-y-1">
						<label class="font-mono text-xs tracking-widest" style="color: rgba(0,255,255,0.5);">
							PAYMENT VECTOR
						</label>
						<div
							use:mountCard
							class="w-full px-3 py-3"
							style="
								border: 1px solid rgba(0,255,255,0.2);
								border-radius: 2px;
								min-height: 44px;
								background: rgba(0,255,255,0.02);
							"
						></div>
						{#if cardError}
							<p class="font-mono text-xs" style="color: #ff4060;">⚠ {cardError}</p>
						{/if}
						{#if !cardMounted}
							<p class="font-mono text-xs" style="color: rgba(255,64,96,0.7);">
								SECURE CARD ENTRY UNAVAILABLE · Payment cannot be processed right now
							</p>
						{/if}
					</div>

					<!-- Fee breakdown -->
					<div
						class="rounded-sm p-3 space-y-1"
						style="background: rgba(0,255,255,0.02); border: 1px solid rgba(0,255,255,0.06);"
					>
						<div class="flex justify-between font-mono text-xs" style="color: rgba(0,255,255,0.4);">
							<span>SEASON FEE (TOTAL)</span>
							<span>{formatCents(totalFeeCents)}</span>
						</div>
						{#if installmentCount > 1 || continuingInstallments}
							<div class="flex justify-between font-mono text-xs" style="color: rgba(0,255,255,0.35);">
								<span>THIS CHARGE</span>
								<span>{formatCents(chargeCents)}</span>
							</div>
						{/if}
						<div
							class="flex justify-between font-mono text-xs font-bold pt-1"
							style="color: #14b8a6; border-top: 1px solid rgba(0,255,255,0.08);"
						>
							<span>TOTAL CHARGE</span>
							<span>{formatCents(chargeCents)}</span>
						</div>
					</div>

					{#if commerce.error}
						<div
							class="px-3 py-2 font-mono text-xs"
							style="background: rgba(255,64,96,0.08); border: 1px solid rgba(255,64,96,0.3); color: #ff4060;"
						>
							⚠ {commerce.error}
						</div>
					{/if}

					<button
						onclick={handleConfirmPayment}
						disabled={commerce.isConfirming}
						class="w-full py-3 font-mono text-sm font-bold tracking-widest transition-all duration-200 disabled:opacity-40"
						style="
							background: rgba(0,255,255,0.1);
							border: 1px solid rgba(0,255,255,0.5);
							color: #14b8a6;
							letter-spacing: 0.15em;
						"
						onmouseenter={(e) => { if (!commerce.isConfirming) e.currentTarget.style.background = 'rgba(0,255,255,0.18)'; }}
						onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(0,255,255,0.1)')}
					>
						{commerce.isConfirming ? '[ TRANSMITTING... ]' : '[ AUTHORIZE PAYMENT ]'}
					</button>
				</div>

			<!-- ── PHASE: PROCESSING ──────────────────────────────────────────── -->
			{:else if phase === 'processing'}
				<div class="flex flex-col items-center gap-4 py-6 text-center">
					<div class="relative w-16 h-16">
						<svg viewBox="0 0 100 100" class="w-full h-full animate-spin" style="animation-duration: 4s;">
							<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,255,255,0.1)" stroke-width="2"/>
							<circle cx="50" cy="50" r="40" fill="none" stroke="#14b8a6" stroke-width="2"
								stroke-dasharray="40 211" stroke-dashoffset="0" stroke-linecap="round"/>
						</svg>
						<div class="absolute inset-0 flex items-center justify-center font-mono text-xs" style="color: #14b8a6;">
							TXN
						</div>
					</div>
					<div class="space-y-1">
						<div class="font-mono text-sm font-bold animate-pulse" style="color: #14b8a6;">PROCESSING PAYMENT</div>
						<div class="font-mono text-xs" style="color: rgba(0,255,255,0.4);">
							Awaiting Stripe confirmation signal...
						</div>
						<div class="font-mono text-xs" style="color: rgba(0,255,255,0.3);">
							Season status will unlock automatically on confirmation.
						</div>
					</div>
				</div>

			<!-- ── PHASE: CONFIRMED ───────────────────────────────────────────── -->
			{:else if phase === 'confirmed'}
				<div class="flex flex-col items-center gap-5 py-4 text-center">
				<div
					class="w-16 h-16 rounded-full flex items-center justify-center"
					style="background: rgba(45, 212, 191,0.1); border: 2px solid rgba(45, 212, 191,0.6); box-shadow: 0 0 30px rgba(45, 212, 191,0.2); color: #2dd4bf;"
				>
					<Icon name="status.check" size={28} strokeWidth={2.5} />
				</div>
					<div class="space-y-2">
						<div class="font-mono text-base font-bold" style="color: #2dd4bf; text-shadow: 0 0 20px rgba(45, 212, 191,0.4);">
							{installmentCount > 1 && chargeCents < totalFeeCents
								? 'INSTALLMENT RECEIVED'
								: 'PAYMENT CONFIRMED'}
						</div>
						<div class="font-mono text-xs" style="color: rgba(0,255,255,0.5);">
							{#if installmentCount > 1 && chargeCents < totalFeeCents}
								Installment recorded. Return to Payments when the next installment is due.<br/>
								Remaining balance: {formatCents(Math.max(0, totalFeeCents - paidCents - chargeCents))}
							{:else}
								Season registration complete.<br/>
								Player status: ACTIVE
							{/if}
						</div>
						{#if commerce.registration?.paidAt}
							<div class="font-mono text-xs" style="color: rgba(0,255,255,0.3);">
								AUTHORIZED {new Date(commerce.registration.paidAt).toUTCString()}
							</div>
						{/if}
					</div>
					<button
						onclick={() => onclose?.()}
						class="px-6 py-2 font-mono text-xs tracking-widest transition-all"
						style="border: 1px solid rgba(45, 212, 191,0.4); color: #2dd4bf;"
						onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(45, 212, 191,0.08)')}
						onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
					>[ CLOSE TERMINAL ]</button>
				</div>

			<!-- ── PHASE: ERROR ───────────────────────────────────────────────── -->
			{:else if phase === 'error'}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div
						class="w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
						style="background: rgba(255,64,96,0.08); border: 2px solid rgba(255,64,96,0.5);"
					>
						<span class="font-mono text-xl" style="color: #ff4060;">!</span>
					</div>
					<div class="space-y-1">
						<div class="font-mono text-sm font-bold" style="color: #ff4060;">PAYMENT FAILED</div>
						<div class="font-mono text-xs" style="color: rgba(255,100,130,0.7);">
							{commerce.error ?? 'An unknown error occurred.'}
						</div>
					</div>
					<button
						onclick={handleRetry}
						class="px-6 py-2 font-mono text-xs tracking-widest transition-all"
						style="border: 1px solid rgba(255,64,96,0.4); color: #ff4060;"
						onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(255,64,96,0.08)')}
						onmouseleave={(e) => (e.currentTarget.style.background = 'transparent')}
					>[ RETRY ]</button>
				</div>
			{/if}

		</div>

		<!-- Footer -->
		<div
			class="px-5 py-2 flex items-center justify-between"
			style="border-top: 1px solid rgba(0,255,255,0.06);"
		>
			<span class="font-mono text-xs" style="color: rgba(0,255,255,0.2);">
				256-BIT TLS · PCI DSS · STRIPE CONNECT
			</span>
			<span class="font-mono text-xs" style="color: rgba(0,255,255,0.2);">
				{pulseActive ? '▶ ACTIVE' : '■ STANDBY'}
			</span>
		</div>
	</div>
</div>
