<script lang="ts">
	import { browser } from '$app/environment';

	function reveal(node: Element, { delay = 0 }: { delay?: number } = {}) {
		if (!browser) return;
		(node as HTMLElement).style.transitionDelay = `${delay}ms`;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.classList.add('is-revealed');
					obs.disconnect();
				}
			},
			{ threshold: 0.08 },
		);
		obs.observe(node);
		return { destroy: () => obs.disconnect() };
	}

	const SECTIONS = [
		{
			id: 'development',
			eyebrow: 'PLAYER OS',
			title: 'Train → XP → coach intent',
			description:
				'Player HQ surfaces missions, telemetry, and adaptive homework. Coaches assign bounties with prescriptions; accepted intents lock Train sessions — honest progression, not a static drill PDF.',
			capabilities: [
				'Train logging with XP, streaks, and skill tree progression',
				'Coach bounty handoff with prescription-locked sessions',
				'Adaptive homework (RL-ready; launch default heuristic only)',
				'Armory stats investigation and proving grounds',
			],
		},
		{
			id: 'household',
			eyebrow: 'PARENT OS',
			title: 'Household graph & VPC',
			description:
				'Guardians link to athletes once; the graph resolves on admin roster, coach grid, and comms. VPC ceremony writes consent_records server-side — not a waiver checkbox.',
			capabilities: [
				'Household hub with guardian ↔ athlete linking',
				'VPC golden path with auditable consent records',
				'Co-op logging and car-ride debrief surfaces',
				'Parent Lounge per team with SafeSport monitoring',
			],
		},
		{
			id: 'comms',
			eyebrow: 'SAFESPORT COMMS',
			title: 'Household-gated messaging',
			description:
				'Coach→minor unsupervised DMs are blocked in rules and callables. Broadcasts CC guardians; household threads keep families in the loop without a free-for-all team chat.',
			capabilities: [
				'sendCoachPlayerMessage policy enforcement',
				'Parent CC on coach broadcasts',
				'Household threads for family visibility',
				'Incident reporting hooks for club staff',
			],
		},
		{
			id: 'logistics',
			eyebrow: 'COACH OS',
			title: 'Schedule · RSVP · tryouts',
			description:
				'Team logistics hub covers practice and game events with parent availability, attendance headcounts, and the full tryout lifecycle from public registration through roster placement.',
			capabilities: [
				'Event RSVP with parent push and calendar parity',
				'Match-day and attendance tooling',
				'Tryout OS — reg → eval → callback → roster + automated comms',
				'Registration-lite with Stripe path and installments',
			],
		},
		{
			id: 'drills',
			eyebrow: 'COACH OS',
			title: 'Spatial drill library',
			description:
				'Team and club drill libraries with a spatial designer persisting to teams/{teamId}/drills. Intent Engine picks from scoped catalogs — flat coach analytics, no gamification chrome.',
			capabilities: [
				'Spatial drill designer with team-scoped saves',
				'Club share when ready — not a global junk drawer',
				'Intent Engine integration with scoped catalogs',
				'Forge and match-day surfaces without Player OS chrome',
			],
		},
		{
			id: 'director-ops',
			eyebrow: 'DIRECTOR OS',
			title: 'Compliance · field ops · registration',
			description:
				'Director surfaces cover deployment calendar, eligibility matrix, coach clearance (Checkr embed), field booking, registrar workflows, and club broadcasts — tenant-scoped with audit trails.',
			capabilities: [
				'Eligibility matrix and coach clearance panopticon',
				'Field ops calendar and deployment windows',
				'Registration programs + drag-drop roster assign panel',
				'State roster CSV export (federation API Phases 2–4 partial)',
			],
		},
		{
			id: 'compliance-moat',
			eyebrow: 'COMPLIANCE MOAT',
			title: 'COPPA · retention · cells',
			description:
				'Cell-isolated Firestore, minor retention purge queue, WebAuthn passkey path, and zero-liability PII rules — architecture competitors bolt on after the fact.',
			capabilities: [
				'Firestore cells per tenant shard + registry routing',
				'Minor retention burn queue (functions-compliance)',
				'WebAuthn / passkey enrollment for guardians',
				'Immutable security_audit on sensitive operations',
			],
		},
	];
</script>

<svelte:head>
	<title>Features — SSTracker</title>
	<meta
		name="description"
		content="Player, Parent, Coach, and Director workspaces plus compliance architecture — the development OS for youth clubs."
	/>
</svelte:head>

<div class="feat-root">
	<header class="feat-header" use:reveal>
		<span class="feat-eyebrow">PERSONA SURFACES</span>
		<h1 class="feat-h1">What SSTracker ships today.</h1>
		<p class="feat-sub">
			Four workspaces and a compliance moat — aligned with Wave 4 launch parity. No fantasy modules;
			each section maps to live routes on https://sstracker.app.
		</p>
	</header>

	{#each SECTIONS as section, i (section.id)}
		<section
			id={section.id}
			class="mod-section"
			class:mod-section--alt={i % 2 === 1}
			aria-labelledby="mod-{section.id}-heading"
			use:reveal
		>
			<div class="mod-section__bar">
				<span class="mod-label">{section.eyebrow}</span>
				<h2 class="mod-h2" id="mod-{section.id}-heading">{section.title}</h2>
			</div>

			<div class="mod-section__body">
				<p class="mod-desc">{section.description}</p>
				<ul class="mod-caps" aria-label="{section.title} capabilities">
					{#each section.capabilities as cap}
						<li class="mod-cap">
							<span class="mod-cap__dot" aria-hidden="true"></span>
							{cap}
						</li>
					{/each}
				</ul>
			</div>
		</section>
	{/each}

	<div class="feat-cta" use:reveal>
		<h2 class="feat-cta__h2">See the acquisition brief</h2>
		<div class="feat-cta__actions">
			<a href="/acquisition" class="feat-cta__btn">ACQUISITION OVERVIEW →</a>
			<a href="/pricing" class="feat-cta__ghost">PRICING (PRE-COMMERCIAL)</a>
		</div>
	</div>
</div>

<style>
	:global(.is-revealed) {
		opacity: 1 !important;
		transform: none !important;
	}

	.feat-root {
		padding: 8rem 1.5rem 4rem;
		max-width: 1000px;
		margin: 0 auto;
		font-family: 'Geist Mono', ui-monospace, monospace;
	}

	.feat-header {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity 0.7s,
			transform 0.7s;
	}

	.feat-eyebrow {
		display: inline-block;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: #fbbf24;
		margin-bottom: 0.85rem;
	}

	.feat-h1 {
		font-size: clamp(1.8rem, 4.5vw, 3rem);
		font-weight: 900;
		color: white;
		margin: 0 0 0.85rem;
		line-height: 1.1;
	}

	.feat-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
		max-width: 560px;
		line-height: 1.75;
	}

	.mod-section {
		opacity: 0;
		transform: translateY(24px);
		transition:
			opacity 0.7s ease,
			transform 0.7s ease;
		border-radius: 8px;
		border: 1px solid #334155;
		background: rgb(2 2 2 / 0.55);
		padding: 2rem;
		margin-bottom: 1.5rem;
		scroll-margin-top: 80px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.mod-section--alt {
		background: rgb(15 23 42 / 0.35);
	}

	.mod-section__bar {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-bottom: 1px solid #334155;
		padding-bottom: 0.85rem;
	}

	.mod-label {
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: #fbbf24;
	}

	.mod-h2 {
		margin: 0;
		font-size: clamp(1rem, 2.5vw, 1.4rem);
		font-weight: 900;
		color: white;
	}

	.mod-section__body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.mod-desc {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
		line-height: 1.8;
	}

	.mod-caps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.mod-cap {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.5;
	}

	.mod-cap__dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #fbbf24;
		opacity: 0.75;
		margin-top: 5px;
		flex-shrink: 0;
	}

	.feat-cta {
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 0.7s ease,
			transform 0.7s ease;
		text-align: center;
		padding: 4rem 0;
	}

	.feat-cta__h2 {
		font-size: clamp(1.5rem, 3.5vw, 2.4rem);
		font-weight: 900;
		color: white;
		margin: 0 0 2rem;
	}

	.feat-cta__actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.feat-cta__btn {
		padding: 0.85rem 1.75rem;
		border-radius: 4px;
		background: rgb(251 191 36 / 0.08);
		border: 1px solid rgb(251 191 36 / 0.45);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #fbbf24;
		text-decoration: none;
		min-height: 48px;
		display: flex;
		align-items: center;
		transition: all 0.25s;
	}

	.feat-cta__btn:hover {
		background: rgb(251 191 36 / 0.14);
		transform: translateY(-2px);
	}

	.feat-cta__ghost {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.3);
		text-decoration: none;
		transition: color 0.2s;
	}

	.feat-cta__ghost:hover {
		color: white;
	}

	@media (max-width: 720px) {
		.mod-section__body {
			grid-template-columns: 1fr;
		}
		.mod-section {
			padding: 1.5rem;
		}
	}
</style>
