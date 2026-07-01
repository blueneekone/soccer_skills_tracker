<script lang="ts">
	import {
		ACQ_BADGE,
		ACQ_HEADLINE,
		ACQ_SUBHEAD,
		ACQ_HIGHLIGHTS,
		ACQ_LIMITATIONS,
		ACQ_CONTACT_EMAIL,
		ACQ_PDF_EXECUTIVE_BRIEF,
		ACQ_PDF_PROSPECTUS,
		ACQ_PDF_DIRECTOR_TRUST_BRIEF,
		ACQ_TRACTION_STRIP,
		ACQ_WAVE4_WINS,
		ACQ_DATA_ROOM_LINKS,
		MOAT_PILLARS,
		WIN_MESSAGE,
	} from '$lib/components/marketing/acquisition/acquisitionContent.js';

	export const prerender = true;
</script>

<svelte:head>
	<title>SSTracker — Strategic acquisition brief</title>
	<meta
		name="description"
		content="Acquisition overview for SSTracker: youth club development OS, household-first compliance, and tryout lifecycle on Firebase."
	/>
	<meta property="og:title" content="SSTracker — Strategic acquisition brief" />
	<meta property="og:description" content={ACQ_SUBHEAD} />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="acq-root">
	<header class="acq-hero">
		<p class="acq-eyebrow">{ACQ_BADGE}</p>
		<h1 class="acq-h1">{ACQ_HEADLINE}</h1>
		<p class="acq-lede">{ACQ_SUBHEAD}</p>
		<div class="acq-hero__actions">
			<a class="tw-vanguard-btn-primary" href={ACQ_PDF_EXECUTIVE_BRIEF} download>
				Download executive brief (PDF)
			</a>
			<a class="acq-btn-secondary" href={ACQ_PDF_PROSPECTUS} download>
				Download full prospectus (PDF)
			</a>
			<a class="acq-btn-secondary" href={ACQ_PDF_DIRECTOR_TRUST_BRIEF} download>
				Director trust brief (PDF)
			</a>
			<a
				class="acq-cta__ghost"
				href="mailto:{ACQ_CONTACT_EMAIL}?subject=SSTracker%20acquisition%20inquiry"
			>
				Contact acquisition →
			</a>
		</div>
	</header>

	<blockquote class="acq-win">
		<p>{WIN_MESSAGE}</p>
	</blockquote>

	<section class="acq-section" aria-labelledby="acq-traction-heading">
		<h2 id="acq-traction-heading" class="acq-h2">Launch status (factual)</h2>
		<div class="acq-traction">
			{#each ACQ_TRACTION_STRIP as row (row.label)}
				<div class="acq-traction__row">
					<span class="acq-traction__label">{row.label}</span>
					<span class="acq-traction__value">{row.value}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="acq-section" aria-labelledby="acq-wave4-heading">
		<h2 id="acq-wave4-heading" class="acq-h2">Wave 4 competitive wins</h2>
		<ul class="acq-list">
			{#each ACQ_WAVE4_WINS as win (win.id)}
				<li class="acq-list__item">
					<strong>{win.title}</strong>
					<span>{win.body}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="acq-section" aria-labelledby="acq-moat-heading">
		<h2 id="acq-moat-heading" class="acq-h2">Moat pillars</h2>
		<div class="acq-grid">
			{#each MOAT_PILLARS as pillar (pillar.id)}
				<article class="acq-card">
					<h3 class="acq-h3">{pillar.title}</h3>
					<p>{pillar.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="acq-section" aria-labelledby="acq-assets-heading">
		<h2 id="acq-assets-heading" class="acq-h2">Shipped platform assets</h2>
		<ul class="acq-list">
			{#each ACQ_HIGHLIGHTS as item (item.id)}
				<li class="acq-list__item">
					<strong>{item.title}</strong>
					<span>{item.body}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="acq-section" aria-labelledby="acq-limits-heading">
		<h2 id="acq-limits-heading" class="acq-h2">Known limitations (honest)</h2>
		<div class="acq-limits">
			{#each ACQ_LIMITATIONS as row (row.label)}
				<div class="acq-limit">
					<span class="acq-limit__label">{row.label}</span>
					<span class="acq-limit__status">{row.status}</span>
					<p class="acq-limit__note">{row.note}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="acq-section" aria-labelledby="acq-dataroom-heading">
		<h2 id="acq-dataroom-heading" class="acq-h2">Full data room (repo docs)</h2>
		<p class="acq-dataroom-lede">
			Paths below match the diligence index — bundle for NDA zip or GitHub read-only access.
		</p>
		<ul class="acq-dataroom">
			{#each ACQ_DATA_ROOM_LINKS as link (link.path)}
				<li>
					<code>{link.path}</code>
					{#if link.audience}
						<span class="acq-dataroom__audience">{link.audience}</span>
					{/if}
					<span class="acq-dataroom__label">{link.label}</span>
				</li>
			{/each}
		</ul>
	</section>

	<footer class="acq-cta">
		<p class="acq-cta__copy">Request demo access, QA tenant provisioning, or technical transfer pack.</p>
		<div class="acq-cta__actions">
			<a class="tw-vanguard-btn-primary" href="mailto:{ACQ_CONTACT_EMAIL}?subject=SSTracker%20acquisition%20inquiry">
				Contact acquisition →
			</a>
			<a class="acq-cta__ghost" href="/">Back to landing</a>
		</div>
		<!-- Prerender crawl targets for PDF print routes (not primary UX) -->
		<nav class="acq-print-crawl" aria-hidden="true" hidden>
			<a href="/acquisition/print/executive-brief">Print executive brief</a>
			<a href="/acquisition/print/prospectus">Print prospectus</a>
			<a href="/acquisition/print/director-trust-brief">Print director trust brief</a>
		</nav>
	</footer>
</div>

<style>
	.acq-root {
		max-width: 960px;
		margin: 0 auto;
		padding: clamp(6rem, 10vw, 7.5rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 6vw, 5rem);
		display: flex;
		flex-direction: column;
		gap: clamp(1.75rem, 4vw, 2.5rem);
		color: var(--vanguard-text-1, #ffffff);
	}

	.acq-hero {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.acq-eyebrow {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: #fbbf24;
	}

	.acq-h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 4vw, 2.6rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.acq-lede {
		margin: 0;
		max-width: 62ch;
		font-size: clamp(0.9375rem, 1.5vw, 1rem);
		line-height: 1.75;
		color: var(--vanguard-text-2, #e2e8f0);
	}

	.acq-hero__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.acq-btn-secondary {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 1rem;
		border: 1px solid #334155;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: #fbbf24;
		text-decoration: none;
		background: rgb(2 2 2 / 0.6);
		transition: border-color 150ms ease, background 150ms ease;
	}

	.acq-btn-secondary:hover {
		border-color: #fbbf24;
		background: rgb(251 191 36 / 0.08);
	}

	.acq-win {
		margin: 0;
		padding: clamp(1.25rem, 3vw, 1.75rem);
		border-left: 3px solid #fbbf24;
		background: rgb(15 23 42 / 0.45);
		border-radius: 0 8px 8px 0;
	}

	.acq-win p {
		margin: 0;
		font-size: clamp(1rem, 2vw, 1.125rem);
		line-height: 1.65;
		color: var(--vanguard-text-2, #e2e8f0);
	}

	.acq-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.acq-h2 {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgb(148 163 184 / 0.85);
	}

	.acq-traction {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border: 1px solid #334155;
		border-radius: 8px;
		overflow: hidden;
	}

	.acq-traction__row {
		display: grid;
		grid-template-columns: minmax(140px, 34%) 1fr;
		gap: 0.75rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid rgb(51 65 85 / 0.6);
		font-size: 0.8125rem;
	}

	.acq-traction__row:last-child {
		border-bottom: none;
	}

	.acq-traction__label {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: #fbbf24;
	}

	.acq-traction__value {
		color: var(--vanguard-text-3, #cbd5e1);
		line-height: 1.5;
	}

	.acq-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: 1rem;
	}

	.acq-card {
		padding: 1.25rem;
		border: 1px solid #334155;
		border-radius: 8px;
		background: rgb(2 2 2 / 0.6);
	}

	.acq-h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.acq-card p {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.65;
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.acq-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.acq-list__item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid rgb(30 41 59);
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.acq-list__item strong {
		color: var(--vanguard-text-1, #ffffff);
		font-weight: 700;
	}

	.acq-limits {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: 0.85rem;
	}

	.acq-limit {
		padding: 1rem;
		border: 1px solid rgb(51 65 85 / 0.7);
		border-radius: 8px;
		background: rgb(2 2 2 / 0.4);
	}

	.acq-limit__label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--vanguard-text-1, #ffffff);
	}

	.acq-limit__status {
		display: inline-block;
		margin-top: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #fbbf24;
	}

	.acq-limit__note {
		margin: 0.5rem 0 0;
		font-size: 0.8125rem;
		line-height: 1.55;
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.acq-dataroom-lede {
		margin: 0;
		font-size: 0.875rem;
		color: var(--vanguard-text-3, #cbd5e1);
	}

	.acq-dataroom {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		font-size: 0.8125rem;
	}

	.acq-dataroom li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.45rem 0;
		border-bottom: 1px solid rgb(30 41 59);
	}

	.acq-dataroom code {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: #94a3b8;
	}

	.acq-dataroom__audience {
		font-family: var(--font-mono);
		font-size: 0.5625rem;
		letter-spacing: 0.1em;
		color: #64748b;
	}

	.acq-dataroom__label {
		color: var(--vanguard-text-2, #e2e8f0);
	}

	.acq-cta {
		padding-top: 1rem;
		border-top: 1px solid rgb(30 41 59);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.acq-cta__copy {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--vanguard-text-2, #e2e8f0);
	}

	.acq-cta__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}

	.acq-cta__ghost {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--vanguard-text-3, #cbd5e1);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.acq-cta__ghost:hover {
		color: var(--vanguard-text-1, #ffffff);
	}

	@media (max-width: 640px) {
		.acq-traction__row {
			grid-template-columns: 1fr;
		}
	}
</style>
