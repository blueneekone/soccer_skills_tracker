<script lang="ts">
	import { REVENUE_ENGINES } from './landingContent.js';

	let sectionEl: HTMLElement;
	let revealed = $state(false);

	$effect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					revealed = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.15 }
		);

		if (sectionEl) observer.observe(sectionEl);

		return () => observer.disconnect();
	});
</script>

<section
	class="bm-section"
	class:bm-section--revealed={revealed}
	bind:this={sectionEl}
	aria-label="Enterprise Pricing Model"
>
	<div class="bm-wrapper">
		<div
			class="bm-readout vanguard-card tw-border-slate-800"
			role="region"
			aria-labelledby="bm-readout-title"
		>
			<header class="bm-readout__hdr">
				<div class="bm-readout__hdr-left">
					<span class="bm-readout__kicker">REVENUE_CMD</span>
					<span class="bm-readout__sep" aria-hidden="true">/</span>
					<span id="bm-readout-title" class="bm-readout__title">The $0 Platform Fee</span>
				</div>
				<span class="bm-readout__mode" aria-hidden="true">READOUT · STATIC</span>
			</header>

			<div class="bm-readout__table-wrap">
				<table class="bm-readout__table">
					<thead>
						<tr>
							<th scope="col">PARAM_ID</th>
							<th scope="col" class="bm-num">VALUE</th>
							<th scope="col">CLASS</th>
							<th scope="col" class="bm-status">STS</th>
							<th scope="col" class="bm-link">ACK</th>
						</tr>
					</thead>
					<tbody>
						{#each REVENUE_ENGINES as engine (engine.id)}
							<tr>
								<td class="bm-mono">{engine.readoutKey}</td>
								<td class="bm-mono bm-num bm-val">{engine.label}</td>
								<td>{engine.value}</td>
								<td class="bm-status"><span class="bm-pill">{engine.status}</span></td>
								<td class="bm-link">
									<a class="bm-ack" href={engine.href}>DISCLOSURE</a>
								</td>
							</tr>
							<tr class="bm-readout__sub">
								<td colspan="5">{engine.descriptor}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<footer class="bm-readout__foot">
				<span class="bm-readout__hash" aria-hidden="true">CHK: FEES_FULL_DISCLOSURE_V1</span>
				<p class="bm-readout__note">
					Clubs pay nothing until athletes transact — then a fractional micro-percentage.
					<a class="bm-readout__a" href="/pricing">/pricing →</a>
				</p>
			</footer>
		</div>
	</div>
</section>

<style>
	.bm-section {
		width: 100%;
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1rem, 5vw, 3rem);
	}

	.bm-wrapper {
		max-width: 900px;
		margin-inline: auto;
	}

	.bm-readout {
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: none;
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 0.55s ease,
			transform 0.55s ease;
	}

	.bm-section--revealed .bm-readout {
		opacity: 1;
		transform: none;
	}

	.bm-readout__hdr {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		padding: 0.65rem 0.85rem;
		background: rgb(2 6 23);
		border-bottom: 1px solid rgb(30 41 59);
		font-family: 'Geist Mono', ui-monospace, monospace;
	}

	.bm-readout__hdr-left {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.5rem;
		min-width: 0;
	}

	.bm-readout__kicker {
		font-size: 0.5625rem;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: rgb(71 85 105);
	}

	.bm-readout__sep {
		color: rgb(51 65 85);
		font-weight: 400;
	}

	.bm-readout__title {
		font-size: clamp(0.75rem, 2vw, 0.875rem);
		font-weight: 800;
		letter-spacing: 0.06em;
		color: rgb(226 232 240);
	}

	.bm-readout__mode {
		font-size: 0.5rem;
		letter-spacing: 0.2em;
		color: rgb(51 65 85);
		flex-shrink: 0;
	}

	.bm-readout__table-wrap {
		overflow-x: auto;
	}

	.bm-readout__table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.625rem;
		letter-spacing: 0.04em;
	}

	.bm-readout__table thead th {
		text-align: left;
		padding: 0.5rem 0.65rem;
		background: rgb(2 6 23);
		color: rgb(71 85 105);
		font-weight: 700;
		letter-spacing: 0.14em;
		border-bottom: 1px solid rgb(30 41 59);
		white-space: nowrap;
	}

	.bm-readout__table tbody td {
		padding: 0.5rem 0.65rem;
		vertical-align: top;
		color: rgb(203 213 225 / 0.92);
		border-bottom: 1px solid rgb(30 41 59);
		line-height: 1.45;
	}

	.bm-readout__table tbody tr.bm-readout__sub td {
		padding-top: 0.35rem;
		padding-bottom: 0.65rem;
		color: rgb(100 116 139);
		font-size: 0.5625rem;
		letter-spacing: 0.03em;
		border-bottom: 1px solid rgb(30 41 59);
	}

	.bm-mono {
		font-weight: 700;
		color: rgb(226 232 240 / 0.95) !important;
	}

	.bm-num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.bm-val {
		font-size: 0.75rem;
		color: var(--vanguard-accent) !important;
		font-weight: 900;
	}

	.bm-status {
		white-space: nowrap;
	}

	.bm-pill {
		display: inline-block;
		padding: 1px 6px;
		border: 1px solid rgb(51 65 85);
		border-radius: 2px;
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: rgb(148 163 184 / 0.85);
	}

	.bm-link {
		text-align: right;
		white-space: nowrap;
	}

	.bm-ack {
		color: var(--vanguard-accent);
		text-decoration: none;
		font-weight: 800;
		letter-spacing: 0.1em;
		transition: opacity 0.15s ease;
	}

	.bm-ack:hover {
		opacity: 0.75;
	}

	.bm-readout__foot {
		padding: 0.65rem 0.85rem;
		background: rgb(2 6 23);
		border-top: 1px solid rgb(30 41 59);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.bm-readout__hash {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.5rem;
		letter-spacing: 0.16em;
		color: rgb(51 65 85);
	}

	.bm-readout__note {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.625rem;
		font-weight: 400;
		line-height: 1.65;
		color: rgb(100 116 139);
		letter-spacing: 0;
	}

	.bm-readout__a {
		color: rgb(148 163 184 / 0.85);
		text-decoration: none;
		margin-left: 0.35rem;
		font-weight: 700;
	}

	.bm-readout__a:hover {
		color: var(--vanguard-accent);
	}
</style>
