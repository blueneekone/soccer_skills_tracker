<script lang="ts">
	/**
	 * SensitiveView.svelte
	 * ────────────────────
	 * EPIC 5 — TASK 5.4: Sensitive Document Data Masking Component
	 *
	 * Renders a PII-safe "locked" placeholder for sensitive player documents
	 * (birth certificates, photo IDs, medical forms).  Access is only granted
	 * via the `getSensitiveDocumentUrl` Cloud Function, which:
	 *   1. Validates the caller is a director for the player's tenant
	 *   2. Writes an IMMUTABLE audit_logs entry before generating the URL
	 *   3. Returns a 5-minute signed URL
	 *
	 * States:
	 *   locked     — default; shows a blurred placeholder + REVEAL button
	 *   loading    — CF call in flight
	 *   revealed   — signed URL received; shows document + audit banner + timer
	 *   error      — CF call failed
	 *
	 * The component auto-relocks when the signed URL TTL expires (5 minutes).
	 * This is a best-effort UI lock — the URL itself expires server-side.
	 *
	 * Usage:
	 *   <SensitiveView
	 *     targetUserKey="player@example.com"
	 *     documentType="BIRTH_CERTIFICATE"
	 *     fileName="birth_cert.pdf"
	 *     label="Birth Certificate"
	 *   />
	 *
	 * Prerequisite:
	 *   The caller must be authenticated as a director or platform admin.
	 *   If not, the CF call will fail with permission-denied and the component
	 *   renders the error state.
	 */

	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		/** Lowercase email key of the target player (= users/ Firestore doc ID). */
		targetUserKey: string;
		/**
		 * Document classification.
		 * One of: BIRTH_CERTIFICATE | PHOTO_ID | MEDICAL_FORM |
		 *         GUARDIAN_AUTHORIZATION | INSURANCE_CARD | CUSTOM
		 */
		documentType: string;
		/** File name within the private/ Storage folder. */
		fileName: string;
		/** Human-readable label shown in the locked placeholder. */
		label?: string;
		/**
		 * Optional: if true the revealed document is rendered as an <img>.
		 * If false (default) a "VIEW DOCUMENT" button opens the URL in a new tab.
		 */
		isImage?: boolean;
		/** Custom CSS class for the outer wrapper. */
		class?: string;
	}

	let {
		targetUserKey,
		documentType,
		fileName,
		label = documentType.replace(/_/g, ' '),
		isImage = false,
		class: extraClass = '',
	}: Props = $props();

	// ── State ──────────────────────────────────────────────────────────────────
	type ViewPhase = 'locked' | 'loading' | 'revealed' | 'error';

	let phase = $state<ViewPhase>('locked');
	let signedUrl = $state('');
	let auditLogId = $state('');
	let expiresAt = $state<Date | null>(null);
	let errorMsg = $state('');
	let secondsRemaining = $state(0);
	let timerHandle: ReturnType<typeof setInterval> | null = null;

	const SIGNED_URL_TTL_SECONDS = 5 * 60; // 5 minutes — matches CF

	const functions = getFunctions();
	const getSensitiveDocumentUrlFn = httpsCallable<
		{ targetUserKey: string; documentType: string; fileName: string },
		{ signedUrl: string; expiresAt: string; auditLogId: string }
	>(functions, 'getSensitiveDocumentUrl');

	// ── Derived ────────────────────────────────────────────────────────────────
	const timerLabel = $derived(
		secondsRemaining > 0
			? `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`
			: '0:00',
	);

	const isAuthorized = $derived(
		authStore.isDirector || authStore.isAdmin,
	);

	// ── Handlers ───────────────────────────────────────────────────────────────

	function clearTimer() {
		if (timerHandle !== null) {
			clearInterval(timerHandle);
			timerHandle = null;
		}
	}

	function startExpiryCountdown(expiryDate: Date) {
		clearTimer();
		const tick = () => {
			const remaining = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));
			secondsRemaining = remaining;
			if (remaining <= 0) {
				clearTimer();
				// Auto-relock when timer hits zero
				phase = 'locked';
				signedUrl = '';
				auditLogId = '';
				expiresAt = null;
			}
		};
		tick();
		timerHandle = setInterval(tick, 1000);
	}

	async function handleReveal() {
		if (!isAuthorized) {
			errorMsg = 'You do not have permission to view sensitive documents.';
			phase = 'error';
			return;
		}

		phase = 'loading';
		errorMsg = '';

		try {
			const result = await getSensitiveDocumentUrlFn({
				targetUserKey,
				documentType,
				fileName,
			});
			signedUrl = result.data.signedUrl;
			auditLogId = result.data.auditLogId;
			expiresAt = new Date(result.data.expiresAt);
			phase = 'revealed';
			startExpiryCountdown(expiresAt);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			errorMsg = msg || 'Failed to retrieve document. Please try again.';
			phase = 'error';
		}
	}

	function handleRelock() {
		clearTimer();
		phase = 'locked';
		signedUrl = '';
		auditLogId = '';
		expiresAt = null;
		secondsRemaining = 0;
	}

	// Cleanup on component destroy
	$effect(() => {
		return () => clearTimer();
	});
</script>

<!-- ─── Root ─────────────────────────────────────────────────────────────── -->
<div class="sv-root {extraClass}" data-phase={phase}>

	<!-- ── PHASE: locked ───────────────────────────────────────────────────── -->
	{#if phase === 'locked' || phase === 'loading'}
		<div class="sv-locked">
			<div class="sv-locked__visual" aria-hidden="true">
				<!-- Blurred redacted placeholder -->
				<div class="sv-redacted">
					<div class="sv-redacted__line sv-redacted__line--w80"></div>
					<div class="sv-redacted__line sv-redacted__line--w60"></div>
					<div class="sv-redacted__line sv-redacted__line--w70"></div>
					<div class="sv-redacted__line sv-redacted__line--w40"></div>
				</div>
				<!-- Lock overlay -->
				<div class="sv-lock-overlay">
					<div class="sv-lock-icon">
						<Icon name="sys.lock" size={18} />
					</div>
				</div>
			</div>

			<div class="sv-locked__info">
				<p class="sv-locked__classification">
					<span class="sv-badge sv-badge--restricted">RESTRICTED</span>
					{label}
				</p>
				<p class="sv-locked__note">
					Document access is gated and audit-logged. Accessing this document
					will create a permanent compliance record.
				</p>
			</div>

			{#if !isAuthorized}
				<div class="sv-no-access">
					<span class="sv-no-access__icon" aria-hidden="true">⊘</span>
					<span class="sv-no-access__text">Insufficient permissions — Directors only</span>
				</div>
			{:else}
				<button
					class="sv-reveal-btn"
					onclick={handleReveal}
					disabled={phase === 'loading'}
					aria-label="Reveal {label} — access will be logged"
				>
					{#if phase === 'loading'}
						<span class="sv-reveal-btn__spinner" aria-hidden="true"></span>
						AUTHENTICATING...
					{:else}
					<Icon name="sys.eye" size={15} class="sv-reveal-btn__icon" />
						REVEAL DOCUMENT
					{/if}
				</button>
			{/if}
		</div>

	<!-- ── PHASE: revealed ─────────────────────────────────────────────────── -->
	{:else if phase === 'revealed'}
		<div class="sv-revealed">

			<!-- AUDIT BANNER — persistent while in revealed state -->
			<div class="sv-audit-banner" role="status" aria-live="polite">
				<div class="sv-audit-banner__left">
					<span class="sv-audit-banner__dot" aria-hidden="true"></span>
					<span class="sv-audit-banner__text">
						ACCESS LOGGED — This document access is being recorded for COPPA / compliance audit.
					</span>
				</div>
				<div class="sv-audit-banner__right">
					<span class="sv-audit-banner__timer" aria-label="Access expires in {timerLabel}">
						EXPIRES {timerLabel}
					</span>
					<button class="sv-relock-btn" onclick={handleRelock} aria-label="Relock document">
						<Icon name="sys.lock" size={11} />
						RELOCK
					</button>
				</div>
			</div>

			<!-- Document content -->
			<div class="sv-document">
				{#if isImage}
					<img
						src={signedUrl}
						alt="{label} — sensitive document"
						class="sv-document__image"
						loading="lazy"
					/>
				{:else}
					<div class="sv-document__file-view">
						<div class="sv-document__file-icon" aria-hidden="true">
							<svg viewBox="0 0 40 48" fill="none">
								<path d="M24 2H8a2 2 0 00-2 2v40a2 2 0 002 2h24a2 2 0 002-2V16L24 2z"
									stroke="rgba(20, 184, 166,0.4)" stroke-width="1.2"
									fill="rgba(20, 184, 166,0.06)" />
								<path d="M24 2v14h14"
									stroke="rgba(20, 184, 166,0.3)" stroke-width="1.2" />
								<path d="M13 26h14M13 32h10"
									stroke="rgba(20, 184, 166,0.3)" stroke-width="1" stroke-linecap="round" />
							</svg>
						</div>
						<div class="sv-document__file-info">
							<p class="sv-document__file-name">{fileName}</p>
							<p class="sv-document__file-type">{label}</p>
							{#if auditLogId}
								<p class="sv-document__audit-id">
									AUDIT REF: <code class="sv-code">{auditLogId.slice(0, 12)}…</code>
								</p>
							{/if}
						</div>
						<a
							href={signedUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="sv-view-btn"
							aria-label="View {label} in new tab"
						>
						<Icon name="nav.external" size={13} class="sv-view-btn__icon" />
							VIEW DOCUMENT
						</a>
					</div>
				{/if}
			</div>

		</div>

	<!-- ── PHASE: error ────────────────────────────────────────────────────── -->
	{:else if phase === 'error'}
		<div class="sv-error">
			<span class="sv-error__icon" aria-hidden="true">⚠</span>
			<div class="sv-error__body">
				<p class="sv-error__msg">{errorMsg}</p>
				<button class="sv-error__retry" onclick={() => (phase = 'locked')}>
					↩ BACK
				</button>
			</div>
		</div>
	{/if}

</div>

<style>
	/* ─── Root ──────────────────────────────────────────────────────────────── */
	.sv-root {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: rgba(8, 10, 18, 0.85);
		border: 1px solid rgba(20, 184, 166, 0.12);
		border-radius: 10px;
		overflow: hidden;
		transition: border-color 0.3s;
	}

	.sv-root[data-phase='revealed'] {
		border-color: rgba(240, 80, 80, 0.3);
		box-shadow: 0 0 0 1px rgba(240, 80, 80, 0.1), 0 0 24px rgba(240, 80, 80, 0.06);
	}

	/* ─── Locked state ──────────────────────────────────────────────────────── */
	.sv-locked {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
	}

	.sv-locked__visual {
		position: relative;
		height: 80px;
		border-radius: 6px;
		overflow: hidden;
	}

	.sv-redacted {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.875rem 1rem;
		height: 100%;
		filter: blur(5px);
		pointer-events: none;
		user-select: none;
	}

	.sv-redacted__line {
		height: 8px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 3px;
	}

	.sv-redacted__line--w80 { width: 80%; }
	.sv-redacted__line--w60 { width: 60%; }
	.sv-redacted__line--w70 { width: 70%; }
	.sv-redacted__line--w40 { width: 40%; }

	.sv-lock-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(2, 2, 8, 0.65);
		backdrop-filter: blur(2px);
	}

	.sv-lock-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 8px;
		color: rgba(20, 184, 166, 0.6);
	}

	.sv-lock-icon svg { width: 18px; height: 18px; }

	.sv-locked__info { display: flex; flex-direction: column; gap: 0.35rem; }

	.sv-locked__classification {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.6);
		letter-spacing: 0.04em;
	}

	.sv-locked__note {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.64rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.28);
	}

	/* ─── Badge ─────────────────────────────────────────────────────────────── */
	.sv-badge {
		display: inline-flex;
		align-items: center;
		padding: 1px 7px;
		border-radius: 3px;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		font-family: 'JetBrains Mono', monospace;
	}

	.sv-badge--restricted {
		background: rgba(240, 80, 80, 0.15);
		border: 1px solid rgba(240, 80, 80, 0.35);
		color: rgba(240, 100, 100, 0.9);
	}

	/* ─── No access ─────────────────────────────────────────────────────────── */
	.sv-no-access {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.875rem;
		background: rgba(240, 80, 80, 0.06);
		border: 1px solid rgba(240, 80, 80, 0.15);
		border-radius: 6px;
	}

	.sv-no-access__icon { font-size: 0.9rem; color: rgba(240, 80, 80, 0.5); }
	.sv-no-access__text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.35);
	}

	/* ─── Reveal button ─────────────────────────────────────────────────────── */
	.sv-reveal-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		background: rgba(20, 184, 166, 0.06);
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 6px;
		color: rgba(20, 184, 166, 0.7);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
	}

	.sv-reveal-btn:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.1);
		border-color: rgba(20, 184, 166, 0.45);
		color: #14b8a6;
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.1);
	}

	.sv-reveal-btn:disabled { opacity: 0.45; cursor: not-allowed; }

	.sv-reveal-btn__icon { width: 15px; height: 15px; }

	.sv-reveal-btn__spinner {
		width: 12px; height: 12px;
		border: 1.5px solid rgba(20, 184, 166, 0.3);
		border-top-color: #14b8a6;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* ─── Audit banner ──────────────────────────────────────────────────────── */
	.sv-audit-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: rgba(240, 80, 80, 0.1);
		border-bottom: 1px solid rgba(240, 80, 80, 0.2);
	}

	.sv-audit-banner__left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.sv-audit-banner__dot {
		flex-shrink: 0;
		width: 6px; height: 6px;
		background: rgba(240, 80, 80, 0.9);
		border-radius: 50%;
		animation: dotPulse 1.5s ease-in-out infinite;
	}

	@keyframes dotPulse {
		0%, 100% { opacity: 0.6; transform: scale(1); }
		50%       { opacity: 1;   transform: scale(1.25); }
	}

	.sv-audit-banner__text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: rgba(240, 120, 120, 0.9);
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.sv-audit-banner__right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.sv-audit-banner__timer {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: rgba(240, 199, 94, 0.8);
		letter-spacing: 0.08em;
	}

	.sv-relock-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.6rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
	}

	.sv-relock-btn svg { width: 11px; height: 11px; }
	.sv-relock-btn:hover { border-color: rgba(255, 255, 255, 0.35); color: rgba(255, 255, 255, 0.7); }

	/* ─── Document view ─────────────────────────────────────────────────────── */
	.sv-document { padding: 1rem; }

	.sv-document__image {
		width: 100%;
		border-radius: 6px;
		display: block;
	}

	.sv-document__file-view {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(20, 184, 166, 0.03);
		border: 1px solid rgba(20, 184, 166, 0.1);
		border-radius: 8px;
	}

	.sv-document__file-icon svg { width: 40px; height: 48px; }

	.sv-document__file-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sv-document__file-name {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.78rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.sv-document__file-type {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		color: rgba(20, 184, 166, 0.5);
		letter-spacing: 0.08em;
	}

	.sv-document__audit-id {
		margin: 0.2rem 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.22);
	}

	.sv-code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		color: rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.05);
		padding: 0 3px;
		border-radius: 2px;
	}

	/* ─── View button ───────────────────────────────────────────────────────── */
	.sv-view-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
		padding: 0.5rem 0.75rem;
		background: rgba(20, 184, 166, 0.08);
		border: 1px solid rgba(20, 184, 166, 0.3);
		border-radius: 6px;
		color: #14b8a6;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: all 0.15s;
		cursor: pointer;
	}

	.sv-view-btn:hover {
		background: rgba(20, 184, 166, 0.14);
		border-color: rgba(20, 184, 166, 0.55);
		box-shadow: 0 0 10px rgba(20, 184, 166, 0.12);
	}

	.sv-view-btn__icon { width: 13px; height: 13px; flex-shrink: 0; }

	/* ─── Error state ───────────────────────────────────────────────────────── */
	.sv-error {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
	}

	.sv-error__icon {
		font-size: 1rem;
		color: rgba(240, 199, 94, 0.7);
		flex-shrink: 0;
	}

	.sv-error__body { display: flex; flex-direction: column; gap: 0.5rem; }

	.sv-error__msg {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		line-height: 1.6;
		color: rgba(255, 100, 100, 0.8);
	}

	.sv-error__retry {
		padding: 0.35rem 0.75rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: all 0.15s;
		align-self: flex-start;
	}

	.sv-error__retry:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: rgba(255, 255, 255, 0.7);
	}
</style>
