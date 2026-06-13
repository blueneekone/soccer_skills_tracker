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
	let reloadKey = $state(0);

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

	function resetEmbedState() {
		reportsMounted = false;
		errorMsg = '';
		status = 'idle';
	}

	function retryEmbed() {
		resetEmbedState();
		reloadKey += 1;
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
		void reloadKey;
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
		void reloadKey;
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

<div class="checkr-embed" data-status={status}>
	{#if showSelfInvite}
		<div id="checkr-invite-container" class="checkr-embed__panel" aria-label="Checkr invitation"></div>
	{/if}

	{#if status === 'loading'}
		<div class="checkr-embed__skeleton" aria-busy="true" aria-live="polite">
			<div class="checkr-embed__spinner" aria-hidden="true"></div>
			<p class="checkr-embed__skeleton-label">Connecting to Checkr…</p>
			<p class="checkr-embed__skeleton-hint">Report details load in a secure panel below.</p>
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
			<div class="checkr-embed__error-copy">
				<p>{errorMsg}</p>
				<button type="button" class="checkr-embed__retry" onclick={retryEmbed}>
					Retry connection
				</button>
			</div>
		</div>
	{/if}

	{#if canTrack || showSelfInvite}
		<div
			id="checkr-status-container"
			class="checkr-embed__panel checkr-embed__panel--status"
			class:checkr-embed__panel--hidden={status !== 'tracking'}
			aria-label="Checkr screening status"
			aria-busy={status === 'loading'}
		></div>
	{/if}
</div>
