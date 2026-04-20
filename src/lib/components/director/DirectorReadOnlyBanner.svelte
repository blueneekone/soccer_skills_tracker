<script>
	/** @type {() => void} */
	let { onUpgrade = () => {} } = $props();
</script>

<div class="dir-readonly-banner" role="status">
	<div class="dir-readonly-banner__inner">
		<span class="dir-readonly-banner__icon" aria-hidden="true">!</span>
		<p class="dir-readonly-banner__text">
			Your subscription is past due. Your account is in <strong>Read-Only</strong> mode.
		</p>
		<button type="button" class="dir-readonly-banner__cta" onclick={onUpgrade}>Upgrade now</button>
	</div>
</div>

<style>
	.dir-readonly-banner {
		position: sticky;
		top: 0;
		z-index: 120;
		margin: 0 calc(-1 * var(--spacing-fluid, 16px)) clamp(12px, 2vw, 20px);
		padding: 0 var(--spacing-fluid, 16px);
	}

	.dir-readonly-banner__inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.65rem 1rem;
		padding: 0.65rem 1rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, #ef4444 35%, #f59e0b 25%);
		background: linear-gradient(
			120deg,
			color-mix(in srgb, #ef4444 12%, transparent),
			color-mix(in srgb, #f59e0b 14%, transparent)
		);
		box-shadow: 0 8px 24px -8px rgba(180, 83, 9, 0.35);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
	}

	.dir-readonly-banner__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		font-weight: 900;
		font-size: 0.85rem;
		background: color-mix(in srgb, #b45309 22%, transparent);
		color: #7c2d12;
	}

	.dir-readonly-banner__text {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
		line-height: 1.35;
	}

	.dir-readonly-banner__cta {
		border: none;
		border-radius: 999px;
		padding: 0.45rem 1rem;
		font-weight: 800;
		font-size: 0.8rem;
		cursor: pointer;
		color: #fff;
		background: linear-gradient(135deg, #b45309, #dc2626);
		box-shadow: 0 8px 24px -8px rgba(220, 38, 38, 0.45);
	}

	.dir-readonly-banner__cta:hover {
		filter: brightness(1.05);
	}
</style>
