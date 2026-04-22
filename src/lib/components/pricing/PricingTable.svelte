<script>
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const createStripeCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');

	let { clubSeatDefault = 100 } = $props();

	let clubQty = $state(clubSeatDefault);
	let busyTier = $state(/** @type {string | null} */ (null));
	let errorMsg = $state('');

	const role = $derived(authStore.role);
	const canPurchase = $derived(
		role === 'director' || role === 'super_admin' || role === 'global_admin',
	);
	const superNeedsClub = $derived(
		(role === 'super_admin' || role === 'global_admin') &&
			!(typeof authStore.userProfile?.clubId === 'string' && authStore.userProfile.clubId.trim())
	);

	/**
	 * @param {'tutor' | 'team' | 'club' | 'recruiter'} tierType
	 */
	async function checkout(tierType) {
		errorMsg = '';
		if (!canPurchase || superNeedsClub) return;
		busyTier = tierType;
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const successUrl = `${origin}/pricing?checkout=success`;
		const cancelUrl = `${origin}/pricing?checkout=cancel`;
		try {
			const payload = {
				tierType,
				successUrl,
				cancelUrl
			};
			if (tierType === 'club') {
				const q = parseInt(String(clubQty), 10);
				payload.clubSeatQuantity = Number.isFinite(q) && q >= 1 && q <= 100000 ? q : 100;
			}
			if (role === 'super_admin' || role === 'global_admin') {
				const cid =
					typeof authStore.userProfile?.clubId === 'string' ?
						authStore.userProfile.clubId.trim() :
						'';
				if (!cid) {
					errorMsg = 'Global admin: set a club scope on your profile before checkout.';
					busyTier = null;
					return;
				}
				payload.clubId = cid;
			}
			const res = await createStripeCheckoutSession(payload);
			const url = res.data && typeof res.data.url === 'string' ? res.data.url : '';
			if (url) {
				window.location.assign(url);
			} else {
				errorMsg = 'Checkout did not return a URL. Try again or contact support.';
			}
		} catch (e) {
			const err = /** @type {{ message?: string }} */ (e);
			errorMsg = err.message || 'Checkout failed.';
		} finally {
			busyTier = null;
		}
	}
</script>

<div class="pricing-bento" aria-label="Plans and pricing">
	{#if errorMsg}
		<p class="pricing-error" role="alert">{errorMsg}</p>
	{/if}

	<article class="glass-panel pricing-card">
		<p class="pricing-kicker">Solo Tutor</p>
		<h2 class="pricing-title">1–15 seats</h2>
		<p class="pricing-desc">Core tools for independent trainers and small groups.</p>
		<ul class="pricing-features">
			<li>Core roster &amp; session tools</li>
			<li>Up to 15 active seats</li>
		</ul>
		<button
			type="button"
			class="btn-pricing"
			disabled={!canPurchase || superNeedsClub || busyTier !== null}
			onclick={() => checkout('tutor')}
		>
			{busyTier === 'tutor' ? 'Opening…' : 'Choose Tutor'}
		</button>
	</article>

	<article class="glass-panel pricing-card">
		<p class="pricing-kicker">Single Team</p>
		<h2 class="pricing-title">Up to 25 seats</h2>
		<p class="pricing-desc">Game stats and team workflows for one squad.</p>
		<ul class="pricing-features">
			<li>Game stats &amp; team insights</li>
			<li>Up to 25 seats</li>
		</ul>
		<button
			type="button"
			class="btn-pricing"
			disabled={!canPurchase || superNeedsClub || busyTier !== null}
			onclick={() => checkout('team')}
		>
			{busyTier === 'team' ? 'Opening…' : 'Choose Team'}
		</button>
	</article>

	<article class="glass-panel pricing-card pricing-card--featured">
		<span class="pricing-badge">Recommended</span>
		<p class="pricing-kicker">Pro Club</p>
		<h2 class="pricing-title">100+ seats</h2>
		<p class="pricing-desc">Director’s OS, field scheduling, and club-wide operations.</p>
		<ul class="pricing-features">
			<li>Director’s OS &amp; scheduling</li>
			<li>Configurable seat pool (min 100)</li>
		</ul>
		<label class="club-qty">
			<span class="club-qty-label">Seats (club tier)</span>
			<input
				class="club-qty-input"
				type="number"
				min="100"
				max="100000"
				bind:value={clubQty}
			/>
		</label>
		<button
			type="button"
			class="btn-pricing btn-pricing--primary"
			disabled={!canPurchase || superNeedsClub || busyTier !== null}
			onclick={() => checkout('club')}
		>
			{busyTier === 'club' ? 'Opening…' : 'Choose Pro Club'}
		</button>
	</article>

	<article class="glass-panel pricing-card">
		<p class="pricing-kicker">Recruiter Portal</p>
		<h2 class="pricing-title">0 seats</h2>
		<p class="pricing-desc">Global search and verified analytics for recruiting staff.</p>
		<ul class="pricing-features">
			<li>Global search</li>
			<li>Verified analytics</li>
		</ul>
		<button
			type="button"
			class="btn-pricing"
			disabled={!canPurchase || superNeedsClub || busyTier !== null}
			onclick={() => checkout('recruiter')}
		>
			{busyTier === 'recruiter' ? 'Opening…' : 'Choose Recruiter'}
		</button>
	</article>
</div>

{#if !canPurchase}
	<p class="pricing-footnote">
		Only organization directors (or app admins) can purchase or change plans. Ask your club
		director to upgrade.
	</p>
{:else if superNeedsClub}
	<p class="pricing-footnote">
		Super admin: attach a <code>clubId</code> on your user profile before running checkout.
	</p>
{/if}

<style>
	.pricing-bento {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: clamp(14px, 2vw, 22px);
		align-items: stretch;
	}

	@media (max-width: 1100px) {
		.pricing-bento {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.pricing-bento {
			grid-template-columns: 1fr;
		}
	}

	.pricing-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: clamp(18px, 2.4vw, 26px);
		border-radius: 22px;
		min-height: 100%;
	}

	.pricing-card--featured {
		border: 1px solid color-mix(in srgb, var(--brand-primary) 45%, var(--glass-border));
		background: linear-gradient(
			155deg,
			color-mix(in srgb, var(--brand-primary) 12%, var(--glass-bg)),
			var(--glass-bg)
		);
		box-shadow: var(--shadow-liquid, var(--shadow-premium));
	}

	.pricing-badge {
		position: absolute;
		top: 14px;
		right: 14px;
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent, #8b5cf6));
		color: #fff;
	}

	.pricing-kicker {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted-slate);
	}

	.pricing-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 900;
		color: var(--text-primary);
	}

	.pricing-desc {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.45;
		color: var(--muted-slate);
		flex: 1;
	}

	.pricing-features {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--text-primary);
	}

	.club-qty {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--muted-slate);
	}

	.club-qty-input {
		border-radius: 12px;
		border: 1px solid var(--glass-border);
		padding: 0.5rem 0.65rem;
		font-weight: 800;
		background: var(--surface-subtle, rgba(255, 255, 255, 0.5));
		color: var(--text-primary);
	}

	.btn-pricing {
		margin-top: auto;
		border-radius: 14px;
		border: 1px solid var(--glass-border);
		padding: 0.75rem 1rem;
		font-weight: 800;
		cursor: pointer;
		background: var(--surface-subtle, rgba(255, 255, 255, 0.5));
		color: var(--text-primary);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.btn-pricing:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--shadow-premium);
	}

	.btn-pricing:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-pricing--primary {
		border-color: color-mix(in srgb, var(--brand-primary) 55%, transparent);
		background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent, #8b5cf6));
		color: #fff;
	}

	.pricing-error {
		grid-column: 1 / -1;
		margin: 0 0 0.25rem;
		padding: 0.65rem 0.85rem;
		border-radius: 12px;
		background: color-mix(in srgb, #ef4444 12%, transparent);
		border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.pricing-footnote {
		margin-top: 1.25rem;
		font-size: 0.88rem;
		color: var(--muted-slate);
		max-width: 52rem;
		line-height: 1.45;
	}
</style>
