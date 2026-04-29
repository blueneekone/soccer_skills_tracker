<script>
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { getAvailableItems, processDeploymentRequest } from '$lib/gamification/armory.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';
	import Swal from 'sweetalert2';

	/** @type {'quartermaster' | 'vault'} */
	let armoryWorkspace = $state('quartermaster');

	/** Pro card vault slots (foundation for gacha). Index 0 = operative legend. */
	const VAULT_SLOT_COUNT = 6;
	/** Required operative level per slot index (progressive unlocks). */
	const VAULT_UNLOCK_LEVELS = [1, 5, 8, 12, 16, 20];

	const profile = $derived(authStore.userProfile);
	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const operativeLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
	const rankLabel = $derived(getCurrentRank(totalXpHud).rank);

	const email = $derived((authStore.user?.email || '').toLowerCase());
	const playerEmailKey = $derived(email);
	const vaultDisplayName = $derived(
		(profile?.playerName && String(profile.playerName).trim()) ||
			email.split('@')[0] ||
			'Operative',
	);

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

	let armoryBusy = $state(false);

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
	 * Quartermaster: deduct TC via {@link processDeploymentRequest}, then optimistically update local profile.
	 * @param {import('$lib/gamification/armory.js').QuartermasterItem} item
	 */
	async function requestDeployment(item) {
		if (armoryBusy) return;
		/** @type {import('firebase/auth').User | null} */
		const u = authStore.user;
		/** `users/{email}` profile — `clubId` is not on Firebase `User` in the client SDK. */
		const prof = profile;
		const clubId = typeof prof?.clubId === 'string' && prof.clubId.trim() ? prof.clubId.trim() : '';
		if (!u) {
			void Swal.fire({
				text: 'You must be signed in to request deployment.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		if (!clubId) {
			void Swal.fire({
				text: 'Missing club context. Complete team setup or contact Command.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		armoryBusy = true;
		try {
			await processDeploymentRequest(u, item, clubId);
			const after = authStore.userProfile;
			if (after) {
				const o = /** @type {Record<string, unknown> & { tacticalCredits?: number }} */ (after);
				const prev = Math.max(0, Math.floor(Number(o.tacticalCredits) || 0));
				authStore.setProfile({ ...o, tacticalCredits: Math.max(0, prev - item.cost) });
			}
			void Swal.fire({
				text: `DEPLOYMENT CONFIRMED: ${item.title} requested. Credits deducted.`,
				icon: 'success',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 4500,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Deployment could not be completed.';
			void Swal.fire({
				text: msg,
				icon: 'error',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 5000,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} finally {
			armoryBusy = false;
		}
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

	<nav class="qa-workspace" aria-label="Armory workspace">
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'quartermaster'}
			onclick={() => (armoryWorkspace = 'quartermaster')}
			aria-pressed={armoryWorkspace === 'quartermaster'}
		>
			Quartermaster
		</button>
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'vault'}
			onclick={() => (armoryWorkspace = 'vault')}
			aria-pressed={armoryWorkspace === 'vault'}
		>
			The Vault
		</button>
	</nav>

	{#if armoryWorkspace === 'quartermaster'}
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
							disabled={armoryBusy}
							onclick={async () => {
								await requestDeployment(item);
							}}
						>
							REQUEST DEPLOYMENT
						</button>
					{:else}
						<button type="button" class="qa-btn qa-btn--locked" disabled>INSUFFICIENT FUNDS</button>
					{/if}
				</article>
			{:else}
				<p class="qa-empty qa-mono">
					No line items at your clearance. Increase Operative level to reveal SKUs.
				</p>
			{/each}
		</section>
	{:else}
		<section class="vault" aria-labelledby="vault-legend-heading">
			<header class="vault__head">
				<p id="vault-legend-heading" class="vault__mega-title">
					[ THE VAULT - UNLOCKED LEGENDS ]
				</p>
				<p class="vault__sub">
					Collectible Pro Player Cards will drop from Gacha packs. Slot <span class="qa-mono">01</span> is
					reserved for your operative dossier; additional legends unlock as you rank up.
				</p>
			</header>

			<div class="vault__grid">
				{#each Array.from({ length: VAULT_SLOT_COUNT }, (_, i) => i) as slotIndex (slotIndex)}
					{@const needLevel = VAULT_UNLOCK_LEVELS[slotIndex] ?? 99}
					{@const slotUnlocked = operativeLevel >= needLevel}
					<div class="vault__cell">
						{#if !slotUnlocked}
							<div class="vault-slot vault-slot--locked" aria-label="Locked legend slot">
								<i class="ph ph-lock-key vault-slot__lock" aria-hidden="true"></i>
								<p class="vault-slot__label">Classified</p>
								<p class="vault-slot__hint">Unlock at Level {needLevel}</p>
							</div>
						{:else if slotIndex === 0 && playerEmailKey}
							<div class="vault-slot vault-slot--card">
								<p class="vault-slot__ribbon qa-mono">Operative dossier · Slot 01</p>
								<ProPlayerCard
									playerEmailKey={playerEmailKey}
									playerDisplayName={vaultDisplayName}
									operativeAvatar={profile?.operativeAvatar}
									rankLabel={rankLabel}
									telemetryTotalXp={totalXpHud.toLocaleString()}
									telemetryWorkouts=""
									telemetryJoinDate=""
								/>
							</div>
						{:else if slotIndex === 0}
							<div class="vault-slot vault-slot--locked" aria-label="Sign in required">
								<i class="ph ph-user-circle vault-slot__lock" aria-hidden="true"></i>
								<p class="vault-slot__label">No operative key</p>
								<p class="vault-slot__hint">Sign in to bind your dossier card.</p>
							</div>
						{:else}
							<div class="vault-slot vault-slot--vacant" aria-label="Empty legend slot">
								<i class="ph ph-cards-three vault-slot__vacant-icon" aria-hidden="true"></i>
								<p class="vault-slot__label">Vacant slot</p>
								<p class="vault-slot__hint">
									Pro legends you unlock from packs will appear here. Drops incoming.
								</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}
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

	.qa-workspace {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: clamp(1.1rem, 2.2vw, 1.5rem);
		padding: 0.35rem;
		border-radius: 0.35rem;
		border: 1px solid var(--border);
		background: rgba(5, 5, 10, 0.85);
		box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.06);
	}

	.qa-workspace__tab {
		flex: 1 1 auto;
		min-width: 8rem;
		padding: 0.65rem 1rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		cursor: pointer;
		border: 1px solid transparent;
		border-radius: 0.2rem;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background 0.2s ease;
	}

	.qa-workspace__tab:hover {
		color: rgba(236, 254, 255, 0.85);
		border-color: rgba(0, 212, 255, 0.25);
	}

	.qa-workspace__tab--active {
		color: #ecfeff;
		border-color: rgba(0, 212, 255, 0.45);
		background: linear-gradient(165deg, rgba(0, 212, 255, 0.12) 0%, rgba(0, 0, 0, 0.4) 100%);
		box-shadow:
			0 0 20px rgba(0, 212, 255, 0.15),
			inset 0 0 0 1px rgba(57, 255, 20, 0.12);
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

	/* ─── The Vault (Gacha foundation) ───────────────────────── */
	.vault {
		min-width: 0;
	}

	.vault__head {
		margin-bottom: clamp(1.25rem, 2.5vw, 2rem);
		padding-bottom: clamp(1rem, 2vw, 1.35rem);
		border-bottom: 1px solid rgba(0, 212, 255, 0.15);
	}

	.vault__mega-title {
		margin: 0 0 0.75rem;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-size: clamp(0.78rem, 2.4vw, 1.15rem);
		font-weight: 900;
		letter-spacing: 0.12em;
		line-height: 1.35;
		text-transform: uppercase;
		color: #a5f3fc;
		text-shadow:
			0 0 22px rgba(0, 212, 255, 0.35),
			0 0 48px rgba(57, 255, 20, 0.12);
	}

	.vault__sub {
		margin: 0;
		max-width: 52rem;
		font-size: 0.8rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.52);
	}

	.vault__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(1rem, 2vw, 1.35rem);
		align-items: start;
	}

	@media (max-width: 960px) {
		.vault__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 520px) {
		.vault__grid {
			grid-template-columns: 1fr;
		}
	}

	.vault__cell {
		min-width: 0;
	}

	.vault-slot {
		box-sizing: border-box;
		min-height: 12rem;
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 1.25rem 1rem;
	}

	.vault-slot--locked {
		border: 2px dashed rgba(255, 255, 255, 0.14);
		background: linear-gradient(165deg, rgba(8, 8, 12, 0.95) 0%, rgba(0, 0, 0, 0.65) 100%);
		box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
	}

	.vault-slot--vacant {
		border: 2px dashed rgba(0, 212, 255, 0.22);
		background: linear-gradient(
			165deg,
			rgba(0, 212, 255, 0.04) 0%,
			rgba(5, 5, 10, 0.9) 55%,
			#000 100%
		);
		box-shadow: inset 0 0 32px rgba(0, 212, 255, 0.04);
	}

	.vault-slot--card {
		align-items: stretch;
		justify-content: flex-start;
		padding: 0;
		border: 1px solid rgba(0, 212, 255, 0.2);
		background: rgba(5, 5, 12, 0.55);
		box-shadow:
			0 0 28px rgba(0, 212, 255, 0.08),
			inset 0 0 0 1px rgba(255, 255, 255, 0.04);
	}

	.vault-slot__ribbon {
		margin: 0;
		padding: 0.45rem 0.65rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(165, 243, 252, 0.95);
		background: rgba(0, 0, 0, 0.45);
		border-bottom: 1px solid rgba(0, 212, 255, 0.18);
	}

	.vault-slot__lock {
		font-size: 2.25rem;
		color: rgba(148, 163, 184, 0.55);
		margin-bottom: 0.5rem;
		filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.15));
	}

	.vault-slot__vacant-icon {
		font-size: 2.1rem;
		color: rgba(0, 212, 255, 0.45);
		margin-bottom: 0.5rem;
	}

	.vault-slot__label {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.72);
	}

	.vault-slot__hint {
		margin: 0;
		max-width: 14rem;
		font-size: 0.72rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.42);
	}

	.vault-slot--card :global(.pro-card-outer) {
		margin-bottom: 0;
	}
</style>
