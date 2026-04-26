<script>
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { getAvailableItems } from '$lib/gamification/armory.js';
	import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import Swal from 'sweetalert2';

	const profile = $derived(authStore.userProfile);
	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const operativeLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);

	/**
	 * Tactical Credit balance (Path B). Prefer Firestore `users` profile; optional fallback if ever mirrored on the auth user object.
	 * @see $lib/gamification/armory.js — all catalog prices use the same unit.
	 */
	const tacticalCredits = $derived(
		Math.max(
			0,
			Math.floor(
				Number(
					profile?.tacticalCredits ??
						(authStore.user && typeof /** @type {Record<string, unknown>} */ (authStore.user).tacticalCredits ===
						'number' ?
							/** @type {Record<string, unknown>} */ (authStore.user).tacticalCredits :
							0),
				) || 0,
			),
		),
	);

	const lineItems = $derived(getAvailableItems(operativeLevel));

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		if (authStore.role === 'player' && u?.uid) {
			playerEngine.attach(u.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
	});

	/**
	 * Phase 2 mock: no TC deduction yet (Phase 3 ledger).
	 * @param {import('$lib/gamification/armory.js').QuartermasterItem} item
	 */
	function requestDeployment(item) {
		void Swal.fire({
			text: `${item.title} requested. Awaiting Command approval.`,
			icon: 'success',
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 4500,
			timerProgressBar: true,
			background: '#05050a',
			color: '#e5e5e5',
		});
	}
</script>

<svelte:head>
	<title>Quartermaster · Armory · SSTRACKER</title>
</svelte:head>

<div class="qa-root" data-region="quartermaster-armory">
	<header class="qa-strap" aria-label="Tactical credit balance">
		<div class="qa-strap__grid">
			<div class="qa-strap__id">
				<p class="qa-eyebrow">Quartermaster / SIEM store</p>
				<h1 class="qa-title">Armory</h1>
				<p class="qa-sub">
					Clearance <span class="qa-mono">LVL {String(operativeLevel).padStart(2, '0')}</span> · line items
					priced in <strong>Tactical Credits</strong>
				</p>
			</div>
			<div class="qa-strap__bal" role="status">
				<p class="qa-eyebrow">Tactical credit balance</p>
				<p class="qa-mono qa-balance" aria-live="polite">
					{Number(tacticalCredits).toLocaleString()} <span class="qa-balance__unit">TC</span>
				</p>
			</div>
		</div>
	</header>

	<section class="qa-grid" aria-label="Available armory line items">
		{#each lineItems as item (item.id)}
			<article class="qa-card">
				<div class="qa-card__icon" aria-hidden="true">
					<i class="ph {item.icon}"></i>
				</div>
				<span
					class="qa-pill"
					class:qa-pill--phys={item.type === 'physical'}
					class:qa-pill--dig={item.type === 'digital'}
				>
					{item.type === 'physical' ? 'PHYSICAL' : 'DIGITAL'}
				</span>
				<h2 class="qa-card__title">{item.title}</h2>
				<p class="qa-card__desc">{item.description}</p>
				<p class="qa-card__cost">
					<span class="qa-eyebrow">List price</span>
					<span class="qa-mono"
						>{item.cost.toLocaleString()} <span class="qa-balance__unit">TC</span></span
					>
				</p>
				{#if tacticalCredits >= item.cost}
					<button
						type="button"
						class="qa-btn qa-btn--ready"
						onclick={() => requestDeployment(item)}
					>
						REQUEST DEPLOYMENT
					</button>
				{:else}
					<button type="button" class="qa-btn qa-btn--locked" disabled>INSUFFICIENT FUNDS</button>
				{/if}
			</article>
		{:else}
			<p class="qa-empty qa-mono">No line items at your clearance. Increase Operative level to reveal SKUs.</p>
		{/each}
	</section>
</div>

<style>
	/* Quartermaster — SIEM storefront (Path B) */
	.qa-root {
		--cyber: #00d4ff;
		--toxic: #39ff14;
		--border: rgba(255, 255, 255, 0.1);
		min-height: 0;
		box-sizing: border-box;
		padding: clamp(1rem, 2vw, 1.5rem);
		color: #fafafa;
		background: #000;
	}

	.qa-eyebrow {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(0, 212, 255, 0.55);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.qa-strap {
		margin-bottom: clamp(1.25rem, 2.5vw, 1.75rem);
		border: 1px solid var(--border);
		background: #05050a;
	}

	.qa-strap__grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.25rem;
		align-items: end;
		padding: 1.1rem 1.25rem;
	}

	@media (max-width: 640px) {
		.qa-strap__grid {
			grid-template-columns: 1fr;
		}
	}

	.qa-title {
		margin: 0.2rem 0 0.35rem;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #ecfeff;
	}

	.qa-sub {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.5);
		max-width: 40rem;
	}

	.qa-sub strong {
		color: rgba(0, 212, 255, 0.9);
		font-weight: 800;
	}

	.qa-strap__bal {
		text-align: right;
		min-width: 9rem;
	}

	.qa-balance {
		margin: 0.35rem 0 0;
		font-size: clamp(1.4rem, 3.5vw, 1.9rem);
		font-weight: 800;
		color: var(--cyber);
		text-shadow: 0 0 18px rgba(0, 212, 255, 0.45);
	}

	.qa-balance__unit {
		font-size: 0.75em;
		opacity: 0.8;
	}

	.qa-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
		gap: 1.1rem;
		align-items: stretch;
	}

	.qa-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.1rem 1.1rem 1.15rem;
		border: 1px solid var(--border);
		background: linear-gradient(165deg, #07070d 0%, #000 55%);
		box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.08);
	}

	.qa-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		margin-bottom: 0.75rem;
		border: 1px solid rgba(0, 212, 255, 0.28);
		background: #000;
		font-size: 1.5rem;
		color: var(--cyber);
	}

	.qa-pill {
		display: inline-block;
		align-self: flex-start;
		margin-bottom: 0.5rem;
		padding: 0.15rem 0.4rem;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		border: 1px solid var(--border);
		color: rgba(255, 255, 255, 0.7);
	}

	.qa-pill--phys {
		border-color: rgba(57, 255, 20, 0.35);
		color: #86efac;
	}

	.qa-pill--dig {
		border-color: rgba(0, 212, 255, 0.35);
		color: #a5f3fc;
	}

	.qa-card__title {
		margin: 0 0 0.45rem;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1.25;
	}

	.qa-card__desc {
		margin: 0 0 0.85rem;
		flex: 1 1 auto;
		font-size: 0.8rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
	}

	.qa-card__cost {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin: 0 0 0.9rem;
		font-size: 1.05rem;
		font-weight: 800;
		color: #fff;
	}

	.qa-btn {
		width: 100%;
		margin-top: auto;
		padding: 0.7rem 0.75rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		cursor: pointer;
		border-radius: 0.15rem;
		transition: box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.15s ease;
	}

	.qa-btn--ready {
		border: 1px solid rgba(0, 212, 255, 0.6);
		background: #000;
		color: #ecfeff;
		box-shadow:
			0 0 0 1px rgba(57, 255, 20, 0.2),
			0 0 24px rgba(0, 212, 255, 0.35);
	}

	.qa-btn--ready:hover {
		border-color: var(--toxic);
		box-shadow:
			0 0 32px rgba(57, 255, 20, 0.45),
			0 0 18px rgba(0, 212, 255, 0.4);
	}

	.qa-btn--ready:active {
		transform: translateY(1px);
	}

	.qa-btn--locked {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #0a0a0a;
		color: rgba(255, 255, 255, 0.28);
		cursor: not-allowed;
		box-shadow: none;
	}

	.qa-empty {
		grid-column: 1 / -1;
		margin: 0;
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.45);
		border: 1px dashed var(--border);
	}
</style>
