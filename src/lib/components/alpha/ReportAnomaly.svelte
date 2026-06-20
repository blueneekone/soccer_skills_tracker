<script lang="ts">
	/**
	 * ReportAnomaly.svelte
	 * ────────────────────
	 * Alpha-phase "Report Anomaly" floating widget.
	 *
	 * Renders a persistent floating button in the bottom-right corner of the
	 * viewport.  On click it opens a minimalist Stark-tech modal where the
	 * user can describe an issue.
	 *
	 * Data captured automatically (never ask the user for these):
	 *   uid          — authStore.user.uid (or 'anonymous' if not signed in)
	 *   email        — authStore.user.email
	 *   url          — window.location.href at submission time
	 *   userAgent    — navigator.userAgent
	 *   timestamp    — Firestore serverTimestamp()
	 *
	 * Written to: Firestore `alpha_feedback/{autoId}`
	 *   Fields: uid, email, url, description, category, userAgent, timestamp
	 *
	 * Firestore rules: any authenticated user may CREATE one document.
	 * Only platform admins may READ the collection.
	 */

	import { browser } from '$app/environment';
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	// ── State ──────────────────────────────────────────────────────────────────
	let open = $state(false);
	let description = $state('');
	let category = $state<'bug' | 'ux' | 'data' | 'security' | 'other'>('bug');
	type Phase = 'idle' | 'sending' | 'sent' | 'error';
	let phase = $state<Phase>('idle');
	let errorMsg = $state('');

	const canSubmit = $derived(description.trim().length >= 10 && phase === 'idle');

	// ── Handlers ───────────────────────────────────────────────────────────────

	function toggle() {
		if (!open) {
			phase = 'idle';
			description = '';
			errorMsg = '';
		}
		open = !open;
	}

	function close() {
		open = false;
	}

	async function handleSubmit() {
		if (!canSubmit || !browser) return;
		phase = 'sending';
		errorMsg = '';

		try {
			await addDoc(collection(db, 'alpha_feedback'), {
				uid: authStore.user?.uid ?? 'anonymous',
				email: authStore.user?.email ?? null,
				url: window.location.href,
				description: description.trim(),
				category,
				userAgent: navigator.userAgent,
				timestamp: serverTimestamp(),
			});
			phase = 'sent';
			description = '';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
			phase = 'error';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- ─── Floating trigger button ──────────────────────────────────────────── -->
<button
	class="ra-trigger"
	onclick={toggle}
	aria-label="Report an anomaly or bug"
	title="Report Anomaly — Alpha Feedback"
>
	<Icon
		name={"status.warning-octagon" as IconName}
		size={16}
		strokeWidth={1.5}
		class="ra-trigger__icon"
	/>
	<span class="ra-trigger__label">ALPHA</span>
</button>

<!-- ─── Modal ────────────────────────────────────────────────────────────── -->
{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="ra-backdrop" onclick={close} aria-hidden="true"></div>

	<div
		class="ra-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="ra-modal-title"
	>
		<!-- Header -->
		<div class="ra-modal__header">
			<div class="ra-modal__badge" aria-hidden="true">
				<Icon
					name={"status.warning-octagon" as IconName}
					size={18}
					strokeWidth={1.5}
					class="tw-text-[rgba(240,199,94,0.85)]"
				/>
			</div>
			<div>
				<p class="ra-modal__eyebrow">VANGUARD · ALPHA CHANNEL</p>
				<h2 class="ra-modal__title" id="ra-modal-title">REPORT ANOMALY</h2>
			</div>
			<button class="ra-close" onclick={close} aria-label="Close anomaly report">✕</button>
		</div>

		{#if phase === 'sent'}
			<!-- Success state -->
			<div class="ra-success">
				<div class="ra-success__icon" aria-hidden="true">
					<Icon name="status.verified" size={44} class="tw-text-[#2dd4bf]" />
				</div>
				<p class="ra-success__msg">Anomaly logged. Thank you, Operative.</p>
				<button class="ra-submit" onclick={close}>CLOSE</button>
			</div>
		{:else}
			<!-- Form -->
			<form class="ra-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<!-- Category selector -->
				<div class="ra-field">
					<label class="ra-label" for="ra-category">CATEGORY</label>
					<div class="ra-category-row">
						{#each (['bug', 'ux', 'data', 'security', 'other'] as const) as cat}
							<button
								type="button"
								class="ra-cat-btn"
								class:ra-cat-btn--active={category === cat}
								onclick={() => (category = cat)}
							>
								{cat.toUpperCase()}
							</button>
						{/each}
					</div>
				</div>

				<!-- Description textarea -->
				<div class="ra-field">
					<label class="ra-label" for="ra-desc">DESCRIPTION <span class="ra-label__req">*</span></label>
					<textarea
						id="ra-desc"
						class="ra-textarea"
						bind:value={description}
						placeholder="Describe what happened — steps to reproduce, expected vs actual behaviour…"
						maxlength="4000"
						rows="5"
						disabled={phase === 'sending'}
					></textarea>
					<div class="ra-char-count">{description.length} / 4000</div>
				</div>

				<!-- Auto-captured context (display only) -->
				<div class="ra-context-strip">
					<span class="ra-context__label">AUTO-CAPTURED</span>
					<code class="ra-context__url">{browser ? window.location.pathname : '—'}</code>
				</div>

				{#if phase === 'error'}
					<p class="ra-error" role="alert">{errorMsg}</p>
				{/if}

				<button
					class="ra-submit"
					type="submit"
					disabled={!canSubmit || phase === 'sending'}
				>
					{#if phase === 'sending'}
						<span class="ra-submit__spinner" aria-hidden="true"></span>
						TRANSMITTING...
					{:else}
						▶ SUBMIT ANOMALY REPORT
					{/if}
				</button>

				<p class="ra-privacy-note">
					Your UID and current page URL are automatically included for diagnostic correlation.
				</p>
			</form>
		{/if}
	</div>
{/if}

<style>
	/* ─── Floating trigger ─────────────────────────────────────────────────── */
	.ra-trigger {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 8888;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		background: rgba(8, 10, 18, 0.9);
		border: 1px solid rgba(20, 184, 166, 0.2);
		border-radius: 20px;
		color: rgba(20, 184, 166, 0.6);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		cursor: pointer;
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		transition: all 0.2s;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	}

	.ra-trigger:hover {
		background: rgba(20, 184, 166, 0.08);
		border-color: rgba(20, 184, 166, 0.45);
		color: #14b8a6;
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.12), 0 4px 20px rgba(0, 0, 0, 0.5);
	}

	.ra-trigger__icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.ra-trigger__label {
		line-height: 1;
	}

	/* Field mode: pin bar + AppMenuSheet own anomaly — no floating alpha trigger */
	@media (max-width: 1023.98px) {
		.ra-trigger {
			display: none;
		}
	}

	/* ─── Backdrop ──────────────────────────────────────────────────────────── */
	.ra-backdrop {
		position: fixed;
		inset: 0;
		z-index: 8889;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
	}

	/* ─── Modal ─────────────────────────────────────────────────────────────── */
	.ra-modal {
		position: fixed;
		bottom: 4.5rem;
		right: 1.25rem;
		z-index: 8890;
		width: min(420px, calc(100vw - 2.5rem));
		background: rgba(6, 8, 16, 0.96);
		border: 1px solid rgba(20, 184, 166, 0.18);
		border-radius: 14px;
		box-shadow:
			0 0 40px rgba(20, 184, 166, 0.07),
			0 20px 60px rgba(0, 0, 0, 0.8),
			inset 0 1px 0 rgba(20, 184, 166, 0.1);
		overflow: hidden;
		font-family: var(--font-mono);
	}

	@media (max-width: 1023.98px) {
		.ra-modal {
			left: 0.75rem;
			right: 0.75rem;
			bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 3.25rem);
			width: min(420px, calc(100vw - 1.5rem));
		}
	}

	/* ─── Modal header ──────────────────────────────────────────────────────── */
	.ra-modal__header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.125rem 0.875rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.08);
		background: rgba(20, 184, 166, 0.04);
	}

	.ra-modal__badge {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ra-modal__eyebrow {
		margin: 0;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(20, 184, 166, 0.4);
	}

	.ra-modal__title {
		margin: 0.15rem 0 0;
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #ffffff;
	}

	.ra-close {
		margin-left: auto;
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.ra-close:hover {
		border-color: rgba(255, 77, 106, 0.4);
		color: rgba(255, 77, 106, 0.8);
	}

	/* ─── Form ──────────────────────────────────────────────────────────────── */
	.ra-form {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		padding: 1.125rem;
	}

	.ra-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.ra-label {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: rgba(20, 184, 166, 0.55);
	}

	.ra-label__req { color: rgba(255, 77, 106, 0.8); }

	/* Category buttons */
	.ra-category-row {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.ra-cat-btn {
		padding: 0.25rem 0.6rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.3);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
	}

	.ra-cat-btn--active {
		background: rgba(20, 184, 166, 0.1);
		border-color: rgba(20, 184, 166, 0.4);
		color: #14b8a6;
	}

	.ra-cat-btn:hover:not(.ra-cat-btn--active) {
		border-color: rgba(255, 255, 255, 0.25);
		color: rgba(255, 255, 255, 0.6);
	}

	/* Textarea */
	.ra-textarea {
		width: 100%;
		resize: vertical;
		min-height: 90px;
		padding: 0.6rem 0.75rem;
		background: rgba(20, 184, 166, 0.03);
		border: 1px solid rgba(20, 184, 166, 0.15);
		border-radius: 7px;
		color: #ffffff;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.6;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.ra-textarea::placeholder { color: rgba(255, 255, 255, 0.2); }
	.ra-textarea:focus { border-color: rgba(20, 184, 166, 0.4); }
	.ra-textarea:disabled { opacity: 0.45; cursor: not-allowed; }

	.ra-char-count {
		align-self: flex-end;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.2);
	}

	/* Auto-captured context strip */
	.ra-context-strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 5px;
	}

	.ra-context__label {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(20, 184, 166, 0.35);
		flex-shrink: 0;
	}

	.ra-context__url {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.25);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Error */
	.ra-error {
		margin: 0;
		font-size: 0.68rem;
		color: rgba(255, 77, 106, 0.8);
	}

	/* Submit button */
	.ra-submit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.7rem 1rem;
		background: linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(0, 180, 255, 0.07));
		border: 1px solid rgba(20, 184, 166, 0.38);
		border-radius: 7px;
		color: #14b8a6;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
	}

	.ra-submit:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(0, 180, 255, 0.12));
		border-color: rgba(20, 184, 166, 0.6);
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.15);
	}

	.ra-submit:disabled { opacity: 0.4; cursor: not-allowed; }

	.ra-submit__spinner {
		width: 12px;
		height: 12px;
		border: 1.5px solid rgba(20, 184, 166, 0.3);
		border-top-color: #14b8a6;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.ra-privacy-note {
		margin: 0;
		font-size: 0.58rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.18);
		text-align: center;
	}

	/* ─── Success state ─────────────────────────────────────────────────────── */
	.ra-success {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.875rem;
		padding: 1.5rem 1.125rem 1.25rem;
		text-align: center;
	}

	.ra-success__icon svg {
		width: 44px;
		height: 44px;
		filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.35));
	}

	.ra-success__msg {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
