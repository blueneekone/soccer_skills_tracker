<script>
	import { normalizeStickerVariant } from '$lib/gamification/seasonOneData.js';

	/**
	 * Shared foil / variant chrome for stickers and ProPlayerCard shells.
	 * @type {{
	 *   variant?: string;
	 *   class?: string;
	 *   children: import('svelte').Snippet;
	 * }}
	 */
	let {
		variant = 'base',
		class: className = '',
		children,
	} = $props();

	const v = $derived(normalizeStickerVariant(variant));
	const variantClass = $derived(
		v === 'alt-art' ? 'svc--alt-art' : v === 'holo' ? 'svc--holo' : v === 'radiant' ? 'svc--radiant' : 'svc--base',
	);
</script>

<div
	class="svc-root tw-relative tw-isolate tw-overflow-hidden tw-rounded-xl tw-transition-[box-shadow,border-color] tw-duration-300 {variantClass} {className}"
	data-print-variant={v}
>
	{#if v === 'holo'}
		<div class="svc-holo svc-holo-a tw-pointer-events-none" aria-hidden="true"></div>
		<div class="svc-holo svc-holo-b tw-pointer-events-none" aria-hidden="true"></div>
	{/if}
	{#if v === 'radiant'}
		<div class="svc-radiant-glow tw-pointer-events-none" aria-hidden="true"></div>
	{/if}
	{#if v === 'alt-art'}
		<div class="svc-shatter tw-pointer-events-none" aria-hidden="true"></div>
		<div class="svc-gold-vein tw-pointer-events-none" aria-hidden="true"></div>
	{/if}

	<div class="svc-inner tw-relative tw-z-[1] tw-h-full tw-min-h-0">
		{@render children()}
	</div>
</div>

<style>
	/* ─── Base (liquid glass accent — outer chrome from parent) ─── */
	.svc--base {
		box-shadow:
			0 0 24px rgba(20, 184, 166, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	/* ─── Holo foil ─── */
	.svc--holo {
		box-shadow:
			0 0 28px rgba(199, 210, 254, 0.15),
			inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.svc-holo {
		position: absolute;
		inset: -35%;
		opacity: 0.55;
		mix-blend-mode: color-dodge;
		filter: saturate(1.15);
	}

	.svc-holo-a {
		background: linear-gradient(
			118deg,
			transparent 28%,
			rgba(255, 255, 255, 0.05) 38%,
			rgba(220, 235, 255, 0.75) 46%,
			rgba(255, 255, 255, 0.35) 52%,
			rgba(180, 210, 255, 0.5) 58%,
			transparent 72%
		);
		animation: svc-holo-shift-a 4.8s ease-in-out infinite;
	}

	.svc-holo-b {
		background: linear-gradient(
			-125deg,
			transparent 30%,
			rgba(255, 250, 230, 0.45) 48%,
			rgba(255, 255, 255, 0.65) 52%,
			transparent 68%
		);
		mix-blend-mode: overlay;
		opacity: 0.4;
		animation: svc-holo-shift-b 6.2s ease-in-out infinite;
	}

	@keyframes svc-holo-shift-a {
		0%,
		100% {
			transform: translate(-12%, -8%) rotate(-6deg) scale(1.05);
		}
		50% {
			transform: translate(14%, 12%) rotate(6deg) scale(1.08);
		}
	}

	@keyframes svc-holo-shift-b {
		0%,
		100% {
			transform: translate(10%, 6%) rotate(8deg);
		}
		50% {
			transform: translate(-14%, -10%) rotate(-4deg);
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.svc--holo:hover .svc-holo-a {
			animation-duration: 3s;
			opacity: 0.72;
		}
		.svc--holo:hover .svc-holo-b {
			animation-duration: 3.8s;
			opacity: 0.52;
		}
	}

	/* ─── Radiant ─── */
	.svc--radiant {
		animation: svc-radiant-pulse 2.4s ease-in-out infinite;
		border: 1px solid rgba(52, 211, 153, 0.55);
		box-shadow:
			0 0 22px rgba(16, 185, 129, 0.45),
			0 0 48px rgba(45, 212, 191, 0.18),
			inset 0 0 24px rgba(16, 185, 129, 0.06);
	}

	.svc-radiant-glow {
		position: absolute;
		inset: -20%;
		background: radial-gradient(circle at 50% 40%, rgba(167, 243, 208, 0.35), transparent 55%);
		opacity: 0.55;
		animation: svc-radiant-glow 2.4s ease-in-out infinite;
		mix-blend-mode: screen;
	}

	@keyframes svc-radiant-pulse {
		0%,
		100% {
			box-shadow:
				0 0 18px rgba(16, 185, 129, 0.38),
				0 0 36px rgba(45, 212, 191, 0.12),
				inset 0 0 20px rgba(16, 185, 129, 0.05);
			border-color: rgba(52, 211, 153, 0.45);
		}
		50% {
			box-shadow:
				0 0 32px rgba(16, 185, 129, 0.62),
				0 0 56px rgba(52, 211, 153, 0.28),
				inset 0 0 28px rgba(167, 243, 208, 0.12);
			border-color: rgba(167, 243, 208, 0.92);
		}
	}

	@keyframes svc-radiant-glow {
		50% {
			opacity: 0.85;
			transform: scale(1.04);
		}
	}

	/* ─── Alt art (obsidian + gold + shattered) ─── */
	.svc--alt-art {
		border: 1px solid rgba(212, 175, 55, 0.42);
		background: linear-gradient(155deg, #070708 0%, #0a0c14 38%, #080604 72%, #12100a 100%);
		box-shadow:
			0 0 36px rgba(212, 175, 55, 0.14),
			inset 0 0 80px rgba(0, 0, 0, 0.85),
			inset 0 1px 0 rgba(212, 175, 55, 0.12);
	}

	.svc-shatter {
		position: absolute;
		inset: 0;
		opacity: 0.22;
		mix-blend-mode: overlay;
		background-image:
			linear-gradient(
				115deg,
				transparent 40%,
				rgba(255, 255, 255, 0.06) 42%,
				transparent 44%,
				transparent 62%,
				rgba(255, 255, 255, 0.05) 64%,
				transparent 68%
			),
			repeating-linear-gradient(
				-35deg,
				rgba(255, 255, 255, 0.03) 0 2px,
				transparent 2px 9px,
				rgba(255, 255, 255, 0.02) 9px 11px,
				transparent 11px 18px
			);
		animation: svc-shatter-shift 10s linear infinite;
	}

	.svc-gold-vein {
		position: absolute;
		inset: -1px;
		border-radius: inherit;
		background: linear-gradient(
			135deg,
			rgba(212, 175, 55, 0) 20%,
			rgba(212, 175, 55, 0.25) 45%,
			rgba(250, 204, 21, 0.12) 52%,
			rgba(212, 175, 55, 0) 78%
		);
		opacity: 0.55;
		mix-blend-mode: soft-light;
		pointer-events: none;
	}

	@keyframes svc-shatter-shift {
		to {
			transform: translate3d(4%, -3%, 0);
		}
	}
</style>
