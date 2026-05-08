<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { storage } from '$lib/firebase.js';
	import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { getApp } from 'firebase/app';

	export const ssr = false;

	// ── Redirect if already cleared ─────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			untrack(() => goto('/coach', { replaceState: true }));
		}
	});

	// ── Upload state ─────────────────────────────────────────────────────────
	/** @typedef {{ file: File|null, url: string, progress: number, status: 'idle'|'uploading'|'done'|'error', error: string }} DocSlot */

	/** @type {DocSlot} */
	let safesport = $state({ file: null, url: '', progress: 0, status: 'idle', error: '' });
	/** @type {DocSlot} */
	let concussion = $state({ file: null, url: '', progress: 0, status: 'idle', error: '' });

	let submitting = $state(false);
	let submitted = $state(false);
	let submitError = $state('');

	const bothUploaded = $derived(safesport.status === 'done' && concussion.status === 'done');

	// ── File upload helper ────────────────────────────────────────────────────
	/**
	 * @param {File} file
	 * @param {'safesport'|'concussion'} docType
	 */
	async function uploadDoc(file, docType) {
		const uid = authStore.user?.uid;
		const tenantId = authStore.tenantId || authStore.userProfile?.clubId;
		if (!uid || !tenantId) return;

		const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
		const path = `compliance/${tenantId}/${uid}/${docType}_${Date.now()}.${ext}`;
		const storageRef = ref(storage, path);

		const slot = docType === 'safesport' ? safesport : concussion;
		slot.status = 'uploading';
		slot.progress = 0;
		slot.error = '';

		const task = uploadBytesResumable(storageRef, file, {
			contentType: file.type,
		});

		await new Promise((resolve, reject) => {
			task.on(
				'state_changed',
				(snapshot) => {
					const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
					if (docType === 'safesport') safesport.progress = pct;
					else concussion.progress = pct;
				},
				(err) => {
					if (docType === 'safesport') {
						safesport.status = 'error';
						safesport.error = err.message;
					} else {
						concussion.status = 'error';
						concussion.error = err.message;
					}
					reject(err);
				},
				async () => {
					const dlUrl = await getDownloadURL(task.snapshot.ref);
					if (docType === 'safesport') {
						safesport.url = dlUrl;
						safesport.status = 'done';
					} else {
						concussion.url = dlUrl;
						concussion.status = 'done';
					}
					resolve(undefined);
				},
			);
		});
	}

	/** @param {Event} e */
	function onSafesportChange(e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const f = input.files?.[0];
		if (f) {
			safesport.file = f;
			uploadDoc(f, 'safesport').catch(() => {});
		}
	}

	/** @param {Event} e */
	function onConcussionChange(e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const f = input.files?.[0];
		if (f) {
			concussion.file = f;
			uploadDoc(f, 'concussion').catch(() => {});
		}
	}

	// ── Notify Director ───────────────────────────────────────────────────────
	async function notifyDirector() {
		if (!bothUploaded || submitting) return;
		submitting = true;
		submitError = '';
		try {
			const fns = getFunctions(getApp(), 'us-east1');
			const markUploaded = httpsCallable(fns, 'markDocumentsUploaded');
			await markUploaded({ safesportUrl: safesport.url, concussionUrl: concussion.url });
			submitted = true;
		} catch (err) {
			submitError = /** @type {Error} */ (err).message ?? 'Submission failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Clearance Terminal — Vanguard Protocol</title>
</svelte:head>

<div class="ct-root">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<header class="ct-header">
		<div class="ct-shield" aria-hidden="true">
			<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M32 4L8 14v18c0 14 11 26 24 28 13-2 24-14 24-28V14L32 4Z"
					stroke="currentColor"
					stroke-width="2.5"
					fill="none"
				/>
				<line x1="32" y1="22" x2="32" y2="34" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				<circle cx="32" cy="41" r="2.5" fill="currentColor" />
			</svg>
		</div>
		<div class="ct-header__text">
			<div class="ct-badge">CLEARANCE PROTOCOL — ALPHA</div>
			<h1 class="ct-title">ACCESS RESTRICTED</h1>
			<p class="ct-subtitle">
				Your coaching credentials require verification before War Room access is granted.
				Upload the required compliance documents below.
			</p>
		</div>
	</header>

	<!-- ── Identity strip ────────────────────────────────────────────────────── -->
	<div class="ct-strip">
		<span>UID: {authStore.user?.uid ?? '—'}</span>
		<span>ROLE: {authStore.role?.toUpperCase() ?? '—'}</span>
		<span>CLUB: {authStore.userProfile?.clubId ?? '—'}</span>
		<span>STATUS: {authStore.userProfile?.clearance?.status?.toUpperCase() ?? 'PENDING'}</span>
	</div>

	{#if submitted}
		<!-- ── Submission confirmed ────────────────────────────────────────────── -->
		<div class="ct-card ct-card--success">
			<div class="ct-success-icon" aria-hidden="true">
				<i class="ph ph-check-circle"></i>
			</div>
			<h2 class="ct-card__heading">DOCUMENTS TRANSMITTED</h2>
			<p class="ct-card__body">
				Your compliance documents have been securely transmitted to your Club Director for review.
				Your War Room access will be unlocked once your credentials are verified.
			</p>
			<p class="ct-card__meta">
				This page will update automatically when your clearance is granted.
			</p>
		</div>
	{:else}
		<!-- ── Upload grid ─────────────────────────────────────────────────────── -->
		<div class="ct-upload-grid">
			<!-- SafeSport -->
			<div class="ct-upload-zone {safesport.status === 'done' ? 'ct-upload-zone--done' : safesport.status === 'error' ? 'ct-upload-zone--error' : ''}">
				<div class="ct-upload-zone__header">
					<span class="ct-upload-zone__icon" aria-hidden="true">
						<i class="ph ph-certificate"></i>
					</span>
					<div>
						<div class="ct-upload-zone__title">SafeSport Certificate</div>
						<div class="ct-upload-zone__sub">PDF or image — max 10 MB</div>
					</div>
					{#if safesport.status === 'done'}
						<span class="ct-badge--ok" aria-label="Uploaded">
							<i class="ph ph-check-circle"></i> UPLOADED
						</span>
					{/if}
				</div>

				{#if safesport.status === 'uploading'}
					<div class="ct-progress" role="progressbar" aria-valuenow={safesport.progress} aria-valuemin="0" aria-valuemax="100">
						<div class="ct-progress__bar" style="width: {safesport.progress}%"></div>
					</div>
					<div class="ct-progress__label">{safesport.progress}%</div>
				{/if}

				{#if safesport.status === 'error'}
					<p class="ct-error">{safesport.error}</p>
				{/if}

				{#if safesport.status !== 'uploading'}
					<label class="ct-file-label" for="safesport-input">
						<i class="ph ph-upload-simple"></i>
						{safesport.status === 'done' ? 'REPLACE FILE' : 'SELECT FILE'}
						<input
							id="safesport-input"
							type="file"
							accept=".pdf,.png,.jpg,.jpeg,.webp"
							class="ct-file-input"
							onchange={onSafesportChange}
						/>
					</label>
				{/if}

				{#if safesport.file && safesport.status !== 'idle'}
					<div class="ct-filename">
						<i class="ph ph-file-text" aria-hidden="true"></i>
						{safesport.file.name}
					</div>
				{/if}
			</div>

			<!-- CDC Concussion Protocol -->
			<div class="ct-upload-zone {concussion.status === 'done' ? 'ct-upload-zone--done' : concussion.status === 'error' ? 'ct-upload-zone--error' : ''}">
				<div class="ct-upload-zone__header">
					<span class="ct-upload-zone__icon" aria-hidden="true">
						<i class="ph ph-brain"></i>
					</span>
					<div>
						<div class="ct-upload-zone__title">CDC Concussion Protocol</div>
						<div class="ct-upload-zone__sub">PDF or image — max 10 MB</div>
					</div>
					{#if concussion.status === 'done'}
						<span class="ct-badge--ok" aria-label="Uploaded">
							<i class="ph ph-check-circle"></i> UPLOADED
						</span>
					{/if}
				</div>

				{#if concussion.status === 'uploading'}
					<div class="ct-progress" role="progressbar" aria-valuenow={concussion.progress} aria-valuemin="0" aria-valuemax="100">
						<div class="ct-progress__bar" style="width: {concussion.progress}%"></div>
					</div>
					<div class="ct-progress__label">{concussion.progress}%</div>
				{/if}

				{#if concussion.status === 'error'}
					<p class="ct-error">{concussion.error}</p>
				{/if}

				{#if concussion.status !== 'uploading'}
					<label class="ct-file-label" for="concussion-input">
						<i class="ph ph-upload-simple"></i>
						{concussion.status === 'done' ? 'REPLACE FILE' : 'SELECT FILE'}
						<input
							id="concussion-input"
							type="file"
							accept=".pdf,.png,.jpg,.jpeg,.webp"
							class="ct-file-input"
							onchange={onConcussionChange}
						/>
					</label>
				{/if}

				{#if concussion.file && concussion.status !== 'idle'}
					<div class="ct-filename">
						<i class="ph ph-file-text" aria-hidden="true"></i>
						{concussion.file.name}
					</div>
				{/if}
			</div>
		</div>

		<!-- ── Background Check section ────────────────────────────────────────── -->
		<div class="ct-card ct-card--pending">
			<div class="ct-card__row">
				<i class="ph ph-fingerprint ct-card__icon" aria-hidden="true"></i>
				<div>
					<div class="ct-card__heading">Identity Verification</div>
					<div class="ct-card__body">Background check via Yardstik integration.</div>
				</div>
				<div class="ct-pulse-badge" aria-label="Pending API integration">
					<span class="ct-pulse-dot"></span>
					PENDING API INTEGRATION
				</div>
			</div>
		</div>

		<!-- ── Submit ────────────────────────────────────────────────────────────── -->
		<div class="ct-submit-row">
			{#if submitError}
				<p class="ct-error">{submitError}</p>
			{/if}
			<button
				class="ct-btn-primary {!bothUploaded || submitting ? 'ct-btn-primary--disabled' : ''}"
				disabled={!bothUploaded || submitting}
				onclick={notifyDirector}
			>
				{#if submitting}
					<i class="ph ph-circle-notch ct-spin" aria-hidden="true"></i>
					TRANSMITTING…
				{:else}
					<i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>
					NOTIFY DIRECTOR FOR REVIEW
				{/if}
			</button>
			{#if !bothUploaded}
				<p class="ct-hint">Upload both documents to enable submission.</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.ct-root {
		min-height: 100dvh;
		background: var(--vanguard-bg, #010409);
		background-image:
			linear-gradient(rgba(255, 0, 60, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 0, 60, 0.04) 1px, transparent 1px);
		background-size: 3rem 3rem;
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 1.5rem;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.ct-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		max-width: 540px;
	}

	.ct-shield {
		width: 4rem;
		height: 4rem;
		color: var(--vanguard-red, #ff003c);
		animation: ctShieldPulse 2s ease-in-out infinite;
		filter: drop-shadow(0 0 12px rgba(255, 0, 60, 0.6));
	}

	@keyframes ctShieldPulse {
		0%, 100% { opacity: 0.8; transform: scale(1); }
		50%       { opacity: 1;   transform: scale(1.05); }
	}

	.ct-badge {
		font-size: 0.6rem;
		letter-spacing: 0.24em;
		font-weight: 700;
		color: var(--vanguard-red, #ff003c);
		border: 1px solid rgba(255, 0, 60, 0.3);
		padding: 0.2rem 0.6rem;
		border-radius: 2px;
		display: inline-block;
	}

	.ct-title {
		margin: 0;
		font-size: clamp(1.4rem, 4vw, 2rem);
		font-weight: 900;
		letter-spacing: 0.14em;
		color: var(--vanguard-red, #ff003c);
		text-shadow: 0 0 24px rgba(255, 0, 60, 0.5);
	}

	.ct-subtitle {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(229, 231, 235, 0.6);
		line-height: 1.6;
	}

	/* ── Identity strip ──────────────────────────────────────────────────────── */
	.ct-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		justify-content: center;
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		color: rgba(0, 240, 255, 0.45);
		border-top: 1px solid rgba(0, 240, 255, 0.08);
		border-bottom: 1px solid rgba(0, 240, 255, 0.08);
		padding: 0.5rem 1rem;
		width: 100%;
		max-width: 680px;
	}

	/* ── Cards ───────────────────────────────────────────────────────────────── */
	.ct-card {
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(0, 240, 255, 0.12);
		border-radius: 8px;
		padding: 1.25rem 1.5rem;
		width: 100%;
		max-width: 680px;
		backdrop-filter: blur(12px);
	}

	.ct-card--success {
		border-color: rgba(0, 240, 255, 0.35);
		background: rgba(0, 240, 255, 0.04);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
	}

	.ct-card--pending {
		border-color: rgba(255, 191, 36, 0.25);
	}

	.ct-card__row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ct-card__icon {
		font-size: 1.5rem;
		color: #fbbf24;
		flex-shrink: 0;
	}

	.ct-card__heading {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: #e5e7eb;
	}

	.ct-card__body {
		margin: 0.25rem 0 0;
		font-size: 0.73rem;
		color: rgba(229, 231, 235, 0.55);
	}

	.ct-card__meta {
		font-size: 0.68rem;
		color: rgba(229, 231, 235, 0.4);
	}

	.ct-success-icon {
		font-size: 3rem;
		color: var(--vanguard-cyan, #00f0ff);
		filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.5));
	}

	/* ── Upload grid ─────────────────────────────────────────────────────────── */
	.ct-upload-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: 100%;
		max-width: 680px;
	}

	@media (max-width: 540px) {
		.ct-upload-grid { grid-template-columns: 1fr; }
	}

	.ct-upload-zone {
		background: rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(0, 240, 255, 0.15);
		border-radius: 8px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: border-color 0.2s;
	}

	.ct-upload-zone--done {
		border-color: rgba(0, 240, 255, 0.4);
		background: rgba(0, 240, 255, 0.03);
	}

	.ct-upload-zone--error {
		border-color: rgba(255, 0, 60, 0.45);
		background: rgba(255, 0, 60, 0.03);
	}

	.ct-upload-zone__header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.ct-upload-zone__icon {
		font-size: 1.4rem;
		color: var(--vanguard-cyan, #00f0ff);
		flex-shrink: 0;
	}

	.ct-upload-zone__title {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #e5e7eb;
	}

	.ct-upload-zone__sub {
		font-size: 0.65rem;
		color: rgba(229, 231, 235, 0.4);
		margin-top: 0.2rem;
	}

	.ct-badge--ok {
		margin-left: auto;
		flex-shrink: 0;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--vanguard-cyan, #00f0ff);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* ── Progress ─────────────────────────────────────────────────────────────── */
	.ct-progress {
		height: 4px;
		background: rgba(0, 240, 255, 0.12);
		border-radius: 2px;
		overflow: hidden;
	}

	.ct-progress__bar {
		height: 100%;
		background: linear-gradient(90deg, var(--vanguard-cyan, #00f0ff), #a78bfa);
		border-radius: 2px;
		transition: width 0.2s ease;
		box-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
	}

	.ct-progress__label {
		font-size: 0.62rem;
		color: rgba(0, 240, 255, 0.6);
		text-align: right;
	}

	/* ── File input ───────────────────────────────────────────────────────────── */
	.ct-file-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--vanguard-cyan, #00f0ff);
		border: 1px solid rgba(0, 240, 255, 0.3);
		padding: 0.45rem 0.85rem;
		border-radius: 4px;
		transition: all 0.15s;
		width: fit-content;
	}

	.ct-file-label:hover {
		background: rgba(0, 240, 255, 0.08);
		border-color: rgba(0, 240, 255, 0.6);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
	}

	.ct-file-input {
		display: none;
	}

	.ct-filename {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.65rem;
		color: rgba(229, 231, 235, 0.5);
		word-break: break-all;
	}

	.ct-error {
		font-size: 0.68rem;
		color: var(--vanguard-red, #ff003c);
		margin: 0;
	}

	/* ── Pulse badge ──────────────────────────────────────────────────────────── */
	.ct-pulse-badge {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.25);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
	}

	.ct-pulse-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fbbf24;
		box-shadow: 0 0 8px #fbbf24;
		animation: ctPulseDot 1.4s ease-in-out infinite;
	}

	@keyframes ctPulseDot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.4; transform: scale(0.6); }
	}

	/* ── Submit row ───────────────────────────────────────────────────────────── */
	.ct-submit-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		max-width: 680px;
	}

	.ct-btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--vanguard-bg, #010409);
		background: var(--vanguard-cyan, #00f0ff);
		border: none;
		padding: 0.7rem 2rem;
		border-radius: 4px;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(0, 240, 255, 0.35);
		transition: all 0.2s;
		min-height: 44px;
	}

	.ct-btn-primary:not(.ct-btn-primary--disabled):hover {
		box-shadow: 0 0 28px rgba(0, 240, 255, 0.6);
		transform: translateY(-1px);
	}

	.ct-btn-primary--disabled {
		opacity: 0.35;
		cursor: not-allowed;
		box-shadow: none;
	}

	.ct-hint {
		font-size: 0.65rem;
		color: rgba(229, 231, 235, 0.35);
		margin: 0;
		text-align: center;
	}

	.ct-spin {
		animation: ctSpinAnim 0.8s linear infinite;
	}

	@keyframes ctSpinAnim {
		to { transform: rotate(360deg); }
	}
</style>
