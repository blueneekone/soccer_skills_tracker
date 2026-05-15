<!--
  Minimal post-hero trust line — text-first, Geist Mono, 1px slate-800 chrome.
-->
<aside class="pbs-root" aria-label="Powered by Stripe, Checkr, and Firebase">
	<p class="pbs-line">
		<span class="pbs-kicker">POWERED BY</span>
		<span class="pbs-brands" aria-hidden="true">Stripe</span>
		<span class="pbs-dot" aria-hidden="true">•</span>
		<span class="pbs-brands" aria-hidden="true">Checkr</span>
		<span class="pbs-dot" aria-hidden="true">•</span>
		<span class="pbs-brands" aria-hidden="true">Firebase</span>
	</p>
</aside>

<style>
	.pbs-root {
		border-top: 1px solid rgb(30 41 59);
		background: rgb(2 6 23);
		padding-block: 0.65rem;
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.pbs-line {
		margin: 0;
		max-width: 1300px;
		margin-inline: auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.35rem 0.5rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184 / 0.45);
	}

	.pbs-kicker {
		letter-spacing: 0.32em;
		margin-right: 0.25rem;
	}

	.pbs-brands {
		letter-spacing: 0.12em;
		font-weight: 600;
		color: rgb(148 163 184 / 0.62);
	}

	.pbs-dot {
		color: rgb(51 65 85);
		font-weight: 400;
		user-select: none;
	}
</style>
