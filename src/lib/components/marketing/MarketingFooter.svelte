<footer class="mf-root">
	<div class="mf-inner">
		<!-- Brand block -->
		<div class="mf-brand">
			<svg class="mf-brand__hex" viewBox="0 0 28 32" fill="none" aria-hidden="true">
				<polygon points="14,1 27,8 27,24 14,31 1,24 1,8" stroke="#14b8a6" stroke-width="1.5" fill="rgba(20, 184, 166,0.05)"/>
			</svg>
			<div>
				<p class="mf-brand__name">SSTRACKER</p>
				<p class="mf-brand__tagline">Club platform for athlete development & compliance.</p>
			</div>
		</div>

		<!-- Link columns -->
		<div class="mf-cols">
			<div class="mf-col">
				<h4 class="mf-col__title">PLATFORM</h4>
				<a href="/features" class="mf-link">Features</a>
				<a href="/pricing" class="mf-link">Pricing</a>
				<a href="/acquisition" class="mf-link">Acquisition</a>
				<a href="/setup" class="mf-link">Register</a>
			</div>
			<div class="mf-col">
				<h4 class="mf-col__title">LEGAL</h4>
				<a href="/privacy" class="mf-link">Privacy Policy</a>
				<a href="/terms" class="mf-link">Terms of Service</a>
			</div>
			<div class="mf-col">
				<h4 class="mf-col__title">PLATFORM STATUS</h4>
				<div class="mf-status">
					<span class="mf-status__dot" aria-hidden="true"></span>
					<span class="mf-status__label">All systems operational</span>
				</div>
				<p class="mf-uptime">99.98% uptime · 30 days</p>
			</div>
		</div>
	</div>

	<div class="mf-bottom">
		<p class="mf-copyright">© {new Date().getFullYear()} SSTracker. All rights reserved.</p>
		<p class="mf-stack">Built on Firebase · Svelte 5 · Zero-Trust Architecture</p>
	</div>
</footer>

<style>
	.mf-root {
		border-top: 1px solid rgb(30 41 59);
		background: rgb(2 6 23);
		font-family: 'Geist Mono', ui-monospace, monospace;
	}
	.mf-inner {
		max-width: 1180px;
		margin: 0 auto;
		padding: 3rem 1.5rem 2rem;
		display: flex;
		gap: 3rem;
		flex-wrap: wrap;
	}

	/* Brand */
	.mf-brand {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
		min-width: 200px;
	}
	.mf-brand__hex {
		width: 24px;
		height: 28px;
		flex-shrink: 0;
		margin-top: 2px;
		filter: drop-shadow(0 0 4px rgba(20, 184, 166, 0.4));
	}
	.mf-brand__name {
		margin: 0;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.7);
	}
	.mf-brand__tagline {
		margin: 0.3rem 0 0;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.25);
		letter-spacing: 0.04em;
		max-width: 200px;
		line-height: 1.6;
	}

	/* Columns */
	.mf-cols {
		display: flex;
		gap: 2.5rem;
		flex-wrap: wrap;
	}
	.mf-col {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 100px;
	}
	.mf-col__title {
		margin: 0 0 0.3rem;
		font-size: 0.42rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.25);
	}
	.mf-link {
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.38);
		text-decoration: none;
		transition: color 0.15s;
		letter-spacing: 0.04em;
		min-height: 28px;
		display: flex;
		align-items: center;
	}
	.mf-link:hover { color: rgba(20, 184, 166, 0.7); }

	/* Status */
	.mf-status {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.mf-status__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 6px rgba(34, 197, 94, 0.7);
		animation: mf-pulse 2s ease-in-out infinite;
		flex-shrink: 0;
	}
	.mf-status__label {
		font-size: 0.52rem;
		color: rgba(34, 197, 94, 0.7);
		letter-spacing: 0.04em;
	}
	.mf-uptime {
		margin: 0;
		font-size: 0.45rem;
		color: rgba(255, 255, 255, 0.18);
		letter-spacing: 0.06em;
	}

	/* Bottom bar */
	.mf-bottom {
		max-width: 1180px;
		margin: 0 auto;
		padding: 1rem 1.5rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}
	.mf-copyright {
		margin: 0;
		font-size: 0.48rem;
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 0.06em;
	}
	.mf-stack {
		margin: 0;
		font-size: 0.45rem;
		color: rgba(20, 184, 166, 0.25);
		letter-spacing: 0.08em;
	}

	@keyframes mf-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
