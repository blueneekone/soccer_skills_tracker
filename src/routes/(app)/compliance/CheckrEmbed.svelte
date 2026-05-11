<script lang="ts">
	import { browser } from '$app/environment';
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';

	const generateToken = httpsCallable(functions, 'generateCheckrEmbedToken');

	let status = $state<'loading' | 'alpha' | 'ready' | 'error'>('loading');
	let errorMsg = $state('');

	$effect(() => {
		if (!browser) return;

		let cancelled = false;

		function loadScript(src: string): Promise<void> {
			return new Promise((resolve, reject) => {
				if ((window as any).Checkr) {
					resolve();
					return;
				}
				const script = document.createElement('script');
				script.src = src;
				script.onload = () => resolve();
				script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
				document.head.appendChild(script);
			});
		}

		async function init() {
			const result = await generateToken({});
			const { embedToken, alphaMode } = result.data as any;

			if (cancelled) return;

			if (alphaMode === true || !embedToken) {
				status = 'alpha';
				return;
			}

			await loadScript('https://sdk.checkr.com/embed/v1/checkr.js');

			if (cancelled) return;

			(window as any).Checkr.mount({
				token: embedToken,
				elementId: 'checkr-embed-container',
				theme: 'dark'
			});
			status = 'ready';
		}

		init().catch((err: unknown) => {
			status = 'error';
			errorMsg = (err instanceof Error ? err.message : null) ?? 'Screening connection failed. Contact your Director.';
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="checkr-embed">
	{#if status === 'loading'}
		<div class="checkr-embed__skeleton" aria-busy="true">
			<div class="checkr-embed__spinner" aria-hidden="true"></div>
			<p class="checkr-embed__skeleton-label">ESTABLISHING SECURE CONNECTION…</p>
			<p class="checkr-embed__skeleton-sub">Encrypting channel · Contacting Checkr</p>
		</div>
	{/if}

	{#if status === 'alpha'}
		<div class="checkr-embed__alpha vanguard-card">
			<div class="checkr-embed__alpha-icon" aria-hidden="true">
				<i class="ph ph-shield-check"></i>
			</div>
			<h2 class="checkr-embed__alpha-title">SECURE CONNECTION ESTABLISHING</h2>
			<p class="checkr-embed__alpha-body">Pending Provider Verification</p>
			<div class="checkr-embed__alpha-badge">
				<span class="checkr-embed__pulse" aria-hidden="true"></span>
				ALPHA MODE — LIVE CHECKR API KEY PENDING AE APPROVAL
			</div>
			<p class="checkr-embed__alpha-hint">
				Contact your Director to use the <strong>[ SIMULATE CLEARANCE ]</strong> override
				in the Compliance Panopticon to unlock access today.
			</p>
		</div>
	{/if}

	{#if status === 'error'}
		<div class="checkr-embed__error" role="alert">
			<i class="ph ph-warning-circle" aria-hidden="true"></i>
			<p>{errorMsg}</p>
		</div>
	{/if}

	<div
		id="checkr-embed-container"
		class="tw-w-full tw-min-h-[600px] vanguard-card"
		style:display={status === 'ready' ? 'block' : 'none'}
		aria-label="Checkr background screening"
	></div>
</div>

<style>
	.checkr-embed {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Skeleton */
	.checkr-embed__skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 300px;
		border: 1px solid rgba(0, 240, 255, 0.1);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(12px);
		padding: 2rem;
		text-align: center;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.checkr-embed__spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(0, 240, 255, 0.15);
		border-top-color: var(--vanguard-cyan, #00f0ff);
		border-radius: 50%;
		animation: ceSpinAnim 0.8s linear infinite;
	}

	@keyframes ceSpinAnim {
		to { transform: rotate(360deg); }
	}

	.checkr-embed__skeleton-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: var(--vanguard-cyan, #00f0ff);
		text-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
	}

	.checkr-embed__skeleton-sub {
		margin: 0;
		font-size: 0.62rem;
		color: rgba(229, 231, 235, 0.35);
		letter-spacing: 0.08em;
	}

	/* Alpha placeholder */
	.checkr-embed__alpha {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: 2.5rem 2rem;
		text-align: center;
		min-height: 300px;
		justify-content: center;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.checkr-embed__alpha-icon {
		font-size: 3rem;
		color: var(--vanguard-cyan, #00f0ff);
		filter: drop-shadow(0 0 14px rgba(0, 240, 255, 0.55));
	}

	.checkr-embed__alpha-title {
		margin: 0;
		font-size: clamp(1rem, 3vw, 1.3rem);
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #e5e7eb;
	}

	.checkr-embed__alpha-body {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(229, 231, 235, 0.5);
	}

	.checkr-embed__alpha-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.3);
		background: rgba(251, 191, 36, 0.05);
		padding: 0.3rem 0.75rem;
		border-radius: 3px;
	}

	.checkr-embed__pulse {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fbbf24;
		box-shadow: 0 0 6px #fbbf24;
		animation: cePulseDot 1.4s ease-in-out infinite;
	}

	@keyframes cePulseDot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50%       { opacity: 0.35; transform: scale(0.5); }
	}

	.checkr-embed__alpha-hint {
		margin: 0;
		font-size: 0.68rem;
		color: rgba(229, 231, 235, 0.35);
		max-width: 400px;
		line-height: 1.6;
	}

	.checkr-embed__alpha-hint strong {
		color: rgba(0, 240, 255, 0.6);
	}

	/* Error */
	.checkr-embed__error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid rgba(255, 0, 60, 0.3);
		background: rgba(255, 0, 60, 0.04);
		border-radius: 6px;
		font-size: 0.75rem;
		color: var(--vanguard-red, #ff003c);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.checkr-embed__error i {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.checkr-embed__error p {
		margin: 0;
	}
</style>
