<script lang="ts">
	import { browser } from '$app/environment';
	import { auth } from '$lib/firebase.js';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { loadCheckrWebSdk, type CheckrWebSdk } from '$lib/compliance/loadCheckrWebSdk.js';
	import {
		buildNewInvitationOptions,
		buildReportsOverviewOptions,
		COACH_SELF_START_ENABLED,
		type CheckrInvitationSuccessResponse,
	} from '$lib/compliance/checkrCoachClearance.js';
	import type { ClearanceDoc } from '$lib/types/backgroundCheck.js';
	import { httpsCallable } from 'firebase/functions';
	import Icon from '$lib/components/ui/Icon.svelte';

	type Props = {
		mode?: 'tracking' | 'self-invite';
		clearance?: ClearanceDoc | null;
	};

	let { mode = 'tracking', clearance = null }: Props = $props();

	const generateToken = httpsCallable(functions, 'generateCheckrEmbedToken');

	type EmbedStatus = 'idle' | 'loading' | 'alpha' | 'tracking' | 'error';

	let status = $state<EmbedStatus>('idle');
	let errorMsg = $state('');
	let reportsMounted = $state(false);

	const canTrack = $derived(
		Boolean(
			clearance?.invitationId ||
				clearance?.invitationUrl ||
				clearance?.checkrCandidateId ||
				clearance?.status === 'pending',
		),
	);

	const showSelfInvite = $derived(mode === 'self-invite' && COACH_SELF_START_ENABLED);

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

	async function mountSelfInvite(Checkr: CheckrWebSdk) {
		const uid = authStore.user?.uid;
		const email = resolveCoachEmail();
		if (!uid || !email) {
			status = 'error';
			errorMsg = 'Sign in required to start background screening.';
			return;
		}

		const ctx = {
			uid,
			email,
			getSessionTokenHeaders,
			onInvitationSuccess: (_response: CheckrInvitationSuccessResponse) => {
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
	}

	$effect(() => {
		if (!browser) return;
		if (showSelfInvite) return;
		if (!canTrack) {
			status = 'idle';
			return;
		}

		let cancelled = false;

		async function initTracking() {
			status = 'loading';
			errorMsg = '';

			const preflight = await generateToken({ preflight: true });
			const data = preflight.data as { alphaMode?: boolean; orgVaultCleared?: boolean };

			if (cancelled) return;
			if (data.orgVaultCleared === true) return;
			if (data.alphaMode === true) {
				status = 'alpha';
				return;
			}

			const Checkr = await loadCheckrWebSdk();
			if (cancelled) return;
			await mountReportsOverview(Checkr);
		}

		initTracking().catch((err: unknown) => {
			if (cancelled) return;
			status = 'error';
			errorMsg =
				err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: err instanceof Error
						? err.message
						: 'Unable to load screening status. Contact your club administrator.';
		});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!browser || !showSelfInvite) return;

		let cancelled = false;

		async function initSelfInvite() {
			status = 'loading';
			const preflight = await generateToken({ preflight: true });
			const data = preflight.data as { alphaMode?: boolean };
			if (cancelled) return;
			if (data.alphaMode === true) {
				status = 'alpha';
				return;
			}
			const Checkr = await loadCheckrWebSdk();
			if (cancelled) return;
			await mountSelfInvite(Checkr);
		}

		initSelfInvite().catch((err: unknown) => {
			if (cancelled) return;
			status = 'error';
			errorMsg = err instanceof Error ? err.message : 'Screening connection failed.';
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if showSelfInvite}
	<div id="checkr-invite-container" class="checkr-embed__panel" aria-label="Checkr invitation"></div>
{/if}

{#if status === 'loading'}
	<div class="checkr-embed__skeleton" aria-busy="true">
		<div class="checkr-embed__spinner" aria-hidden="true"></div>
		<p class="checkr-embed__skeleton-label">Loading screening status…</p>
	</div>
{/if}

{#if status === 'alpha'}
	<div class="checkr-embed__alpha" role="status">
		<Icon name="status.shield-check" size={32} />
		<p class="checkr-embed__alpha-body">
			Live Checkr connection is pending platform approval. Your director can use simulate
			clearance for QA, or order screening once Checkr is credentialed.
		</p>
	</div>
{/if}

{#if status === 'error'}
	<div class="checkr-embed__error" role="alert">
		<Icon name="status.warning-circle" />
		<p>{errorMsg}</p>
	</div>
{/if}

{#if canTrack || showSelfInvite}
	<div
		id="checkr-status-container"
		class="checkr-embed__panel checkr-embed__panel--status"
		class:checkr-embed__panel--hidden={status !== 'tracking'}
		aria-label="Checkr screening status"
	></div>
{/if}

<style>
	.checkr-embed__panel {
		width: 100%;
		min-height: 280px;
		background: #ffffff;
		color: #111827;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 1rem;
	}

	.checkr-embed__panel--hidden {
		display: none;
	}

	.checkr-embed__skeleton {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 180px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		padding: 1.5rem;
		text-align: center;
	}

	.checkr-embed__spinner {
		width: 1.75rem;
		height: 1.75rem;
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
		color: #4b5563;
	}

	.checkr-embed__alpha {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		text-align: center;
		color: #374151;
	}

	.checkr-embed__alpha-body {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		max-width: 36rem;
	}

	.checkr-embed__error {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		border-radius: 8px;
		font-size: 0.875rem;
		color: #b91c1c;
	}

	.checkr-embed__error p {
		margin: 0;
		line-height: 1.5;
	}
</style>
