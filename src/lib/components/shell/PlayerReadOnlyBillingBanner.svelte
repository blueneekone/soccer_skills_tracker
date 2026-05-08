<script>
	import { goto } from '$app/navigation';

	let { onPricing = async () => await goto('/upgrade'), reasons = [], onSettings = undefined } =
		$props();
</script>

<div class="prob-banner" role="status">
	<div class="prob-banner__strip">
		<span class="prob-banner__pulse" aria-hidden="true"></span>
		<div class="prob-banner__content">
			<p class="prob-banner__title">Tenant billing lock — athlete mode restricted</p>
			<ul class="prob-banner__list">
				{#each reasons.slice(0, 3) as r (r)}
					<li>{r}</li>
				{/each}
			</ul>
			<p class="prob-banner__hint">
				Aligns with Director read-only posture (SOC2-style operational gate).
			</p>
		</div>
		<div class="prob-banner__actions">
			{#if onSettings}
				<button type="button" class="prob-banner__btn prob-banner__btn--ghost" onclick={() => onSettings()}>
					Settings
				</button>
			{/if}
			<button type="button" class="prob-banner__btn prob-banner__btn--primary" onclick={() => void onPricing()}>
				View pricing
			</button>
		</div>
	</div>
</div>

<style>
	.prob-banner {
		position: sticky;
		top: 0;
		z-index: 130;
		margin: 0 0 clamp(10px, 2vw, 16px);
	}

	.prob-banner__strip {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem 1rem;
		padding: 0.65rem 1rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, #00f0ff 28%, #f97316 22%);
		background: linear-gradient(
			125deg,
			color-mix(in srgb, #0ea5e9 10%, transparent),
			color-mix(in srgb, #c2410c 8%, transparent)
		);
		box-shadow:
			0 0 0 1px color-mix(in srgb, #000 35%, transparent) inset,
			0 12px 32px -12px rgba(8, 47, 73, 0.55);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.prob-banner__pulse {
		flex: 0 0 auto;
		width: 10px;
		height: 10px;
		margin-top: 6px;
		border-radius: 50%;
		background: #f97316;
		box-shadow: 0 0 14px rgba(249, 115, 22, 0.9);
		animation: probPulse 1.8s ease-in-out infinite;
	}

	@keyframes probPulse {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.08);
		}
	}

	.prob-banner__content {
		flex: 1 1 200px;
		min-width: 0;
	}

	.prob-banner__title {
		margin: 0 0 0.35rem;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #e2e8f0;
	}

	.prob-banner__list {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.4;
		color: #f8fafc;
	}

	.prob-banner__hint {
		margin: 0.4rem 0 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: color-mix(in srgb, #94a3b8 90%, transparent);
	}

	.prob-banner__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.prob-banner__btn {
		cursor: pointer;
		border-radius: 999px;
		padding: 0.45rem 1rem;
		font-weight: 800;
		font-size: 0.75rem;
		border: 1px solid color-mix(in srgb, #00f0ff 35%, transparent);
	}

	.prob-banner__btn--ghost {
		background: color-mix(in srgb, #0f172a 40%, transparent);
		color: #e2e8f0;
	}

	.prob-banner__btn--primary {
		color: #0f172a;
		background: linear-gradient(135deg, #38bdf8, #fbbf24);
		border-color: color-mix(in srgb, #38bdf8 50%, transparent);
		box-shadow: 0 8px 22px -8px rgba(56, 189, 248, 0.5);
	}

	.prob-banner__btn:hover {
		filter: brightness(1.06);
	}
</style>
