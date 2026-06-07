<script lang="ts">
	import { browser } from '$app/environment';
	import { auth } from '$lib/firebase.js';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { loadCheckrWebSdk, type CheckrWebSdk } from '$lib/compliance/loadCheckrWebSdk.js';
	import {
		buildNewInvitationOptions,
		buildReportsOverviewOptions,
		type CheckrInvitationSuccessResponse,
	} from '$lib/compliance/checkrCoachClearance.js';
	import { httpsCallable } from 'firebase/functions';
	import Icon from '$lib/components/ui/Icon.svelte';

	const generateToken = httpsCallable(functions, 'generateCheckrEmbedToken');

	type EmbedStatus = 'loading' | 'alpha' | 'invite' | 'sent' | 'tracking' | 'error';

	let status = $state<EmbedStatus>('loading');
	let errorMsg = $state('');
	let invitationPayload = $state<CheckrInvitationSuccessResponse | null>(null);
	let reportsMounted = $state(false);

	async function getSessionTokenHeaders(): Promise<Record<string, string>> {
		const user = auth.currentUser;
		if (!user) throw new Error('Sign in required for Checkr screening.');
		const token = await user.getIdToken();
		return { Authorization: `Bearer ${token}` };
	}

	function resolveCoachEmail(): string {
		return authStore.user?.email ?? authStore.userProfile?.email ?? '';
	}

	async function mountReportsOverview(Checkr: CheckrWebSdk) {
		if (reportsMounted) return;
		const uid = authStore.user?.uid;
		const email = resolveCoachEmail();
		if (!uid || !email) return;

		const options = buildReportsOverviewOptions({
			uid,
			email,
			getSessionTokenHeaders,
		});

		const embed = new Checkr.Embeds.ReportsOverview(options);
		embed.render('#checkr-status-container');
		reportsMounted = true;
		status = 'tracking';
	}

	$effect(() => {
		if (!browser) return;

		let cancelled = false;

		async function init() {
			const preflight = await generateToken({ preflight: true });
			const data = preflight.data as {
				alphaMode?: boolean;
				orgVaultCleared?: boolean;
			};

			if (cancelled) return;

			if (data.orgVaultCleared === true) {
				status = 'loading';
				return;
			}

			if (data.alphaMode === true) {
				status = 'alpha';
				return;
			}

			const email = resolveCoachEmail();
			const uid = authStore.user?.uid;

			if (!email) {
				status = 'error';
				errorMsg =
					'Your account does not have an email address. Add an email to your profile, then return to this page to start screening.';
				return;
			}

			if (!uid) {
				status = 'error';
				errorMsg = 'Sign in required to start background screening.';
				return;
			}

			const Checkr = await loadCheckrWebSdk();
			if (cancelled) return;

			const ctx = {
				uid,
				email,
				getSessionTokenHeaders,
				onInvitationSuccess: (response: CheckrInvitationSuccessResponse) => {
					if (cancelled) return;
					invitationPayload = response;
					status = 'sent';
					void mountReportsOverview(Checkr);
				},
				onInvitationError: (response: { errors?: Record<string, string[]> }) => {
					const parts: string[] = [];
					const errors = response?.errors;
					if (errors && typeof errors === 'object') {
						for (const [key, val] of Object.entries(errors)) {
							if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`);
						}
					}
					if (parts.length > 0) {
						errorMsg = parts.join(' — ');
						status = 'error';
					}
				},
			};

			const embedOptions = buildNewInvitationOptions(ctx);
			const embed = new Checkr.Embeds.NewInvitation(embedOptions);
			embed.render('#checkr-invite-container');
			status = 'invite';
		}

		init().catch((err: unknown) => {
			if (cancelled) return;
			status = 'error';
			if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
				errorMsg = String((err as { message: string }).message);
			} else {
				errorMsg =
					(err instanceof Error ? err.message : null) ??
					'Screening connection failed. Contact your Director.';
			}
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
			<p class="checkr-embed__skeleton-label">Connecting to Checkr…</p>
			<p class="checkr-embed__skeleton-sub">Preparing your screening form</p>
		</div>
	{/if}

	{#if status === 'alpha'}
		<div class="checkr-embed__alpha vanguard-card">
			<div class="checkr-embed__alpha-icon" aria-hidden="true">
				<Icon name="status.shield-check" size={48} />
			</div>
			<h2 class="checkr-embed__alpha-title">Secure connection establishing</h2>
			<p class="checkr-embed__alpha-body">Pending provider verification</p>
			<div class="checkr-embed__alpha-badge">
				<span class="checkr-embed__pulse" aria-hidden="true"></span>
				Alpha mode — live Checkr API key pending AE approval
			</div>
			<p class="checkr-embed__alpha-hint">
				Contact your Director to use the <strong>[ SIMULATE CLEARANCE ]</strong> override
				in the Compliance Panopticon to unlock access today.
			</p>
		</div>
	{/if}

	{#if status === 'error'}
		<div class="checkr-embed__error" role="alert">
			<Icon name="status.warning-circle" />
			<p>{errorMsg}</p>
		</div>
	{/if}

	{#if status === 'invite'}
		<div class="checkr-embed__intro">
			<p class="checkr-embed__intro-lead">
				Complete your background check to unlock coaching tools.
			</p>
			<p class="checkr-embed__intro-sub">
				You are inviting yourself using <strong>{resolveCoachEmail()}</strong>. Submit the
				form below — Checkr will email you a link to finish identity verification and
				payment. Your SSN and payment details stay inside Checkr, not on this platform.
			</p>
		</div>
	{/if}

	{#if status === 'sent' || status === 'tracking'}
		<div class="checkr-embed__success" role="status">
			<Icon name="status.verified" />
			<div>
				<p class="checkr-embed__success-lead">
					Invitation sent. Open the link in your email to finish screening.
				</p>
				<p class="checkr-embed__success-sub">
					This page will update when your clearance is approved. SSN and payment are
					handled only inside Checkr.
				</p>
				{#if invitationPayload?.candidate_id}
					<p class="checkr-embed__success-meta">
						Reference: {invitationPayload.candidate_id}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<div
		id="checkr-invite-container"
		class="checkr-embed__panel"
		class:checkr-embed__panel--hidden={status !== 'invite'}
		aria-label="Checkr background screening invitation"
	></div>

	<div
		id="checkr-status-container"
		class="checkr-embed__panel checkr-embed__panel--status"
		class:checkr-embed__panel--hidden={status !== 'tracking'}
		aria-label="Checkr screening status"
	></div>
</div>

<style>
	.checkr-embed {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	}

	.checkr-embed__panel {
		width: 100%;
		min-height: 600px;
		background: #ffffff;
		color: #111827;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
		padding: 1.25rem;
	}

	.checkr-embed__panel--hidden {
		display: none;
	}

	.checkr-embed__panel--status {
		min-height: 320px;
	}

	.checkr-embed__intro {
		padding: 0 0.25rem;
	}

	.checkr-embed__intro-lead {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: #111827;
	}

	.checkr-embed__intro-sub {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: #4b5563;
	}

	.checkr-embed__intro-sub strong {
		color: #111827;
		font-weight: 600;
	}

	.checkr-embed__success {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		padding: 1rem 1.25rem;
		background: #ecfdf5;
		border: 1px solid #a7f3d0;
		border-radius: 8px;
		color: #065f46;
	}

	.checkr-embed__success :global(svg) {
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.checkr-embed__success-lead {
		margin: 0 0 0.35rem;
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.checkr-embed__success-sub {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: #047857;
	}

	.checkr-embed__success-meta {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: #059669;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	/* Skeleton */
	.checkr-embed__skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 300px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		padding: 2rem;
		text-align: center;
	}

	.checkr-embed__spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid #e5e7eb;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: ceSpinAnim 0.8s linear infinite;
	}

	@keyframes ceSpinAnim {
		to {
			transform: rotate(360deg);
		}
	}

	.checkr-embed__skeleton-label {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.checkr-embed__skeleton-sub {
		margin: 0;
		font-size: 0.8125rem;
		color: #6b7280;
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
		color: var(--vanguard-cyan, #14b8a6);
		filter: drop-shadow(0 0 14px rgba(20, 184, 166, 0.55));
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
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.35;
			transform: scale(0.5);
		}
	}

	.checkr-embed__alpha-hint {
		margin: 0;
		font-size: 0.68rem;
		color: rgba(229, 231, 235, 0.35);
		max-width: 400px;
		line-height: 1.6;
	}

	.checkr-embed__alpha-hint strong {
		color: rgba(20, 184, 166, 0.6);
	}

	/* Error */
	.checkr-embed__error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		border-radius: 6px;
		font-size: 0.875rem;
		color: #b91c1c;
	}

	.checkr-embed__error :global(svg) {
		flex-shrink: 0;
	}

	.checkr-embed__error p {
		margin: 0;
	}
</style>
