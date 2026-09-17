<script lang="ts">
	/**
	 * TransferPortal.svelte — Vanguard Transfer Protocol UI
	 * ───────────────────────────────────────────────────────
	 * Three-panel interface that adapts to the caller's role:
	 *
	 *   PARENT VIEW:  Initiate transfer → receive token ID → enter auth code
	 *   DIRECTOR VIEW: Enter token ID → await parent auth code
	 *
	 * PROTOCOL FLOW (displayed as a live state machine)
	 * ──────────────────────────────────────────────────
	 *  Step 1 (Parent)    → initiatePlayerTransfer CF   → status: pending
	 *  Step 2 (Director)  → presentTransferToken CF     → status: director_accepted
	 *  Step 3 (Parent)    → confirmPlayerTransfer CF    → status: completed
	 *
	 * The UI renders each step as a numbered "phase" in a vertical progress rail.
	 * Completed phases glow green; the active phase pulses cyan.
	 */

	import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		role: 'parent' | 'director' | 'global_admin';
		playerEmail?: string; // pre-fill for parent view
	}

	let { role, playerEmail = '' }: Props = $props();

	const fns = functions;

	// ── State machine ─────────────────────────────────────────────────────────

	type Stage =
		| 'idle'
		| 'parent_initiating'
		| 'parent_initiated'   // has tokenId, awaiting director
		| 'director_entering'
		| 'director_accepted'  // director has accepted, awaiting parent auth code
		| 'parent_confirming'
		| 'completed'
		| 'error';

	let stage = $state<Stage>('idle');
	let isLoading = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	// ── Form fields ───────────────────────────────────────────────────────────

	let targetPlayerEmail = $state(playerEmail);
	let tokenId = $state('');                // shown after parent initiates
	let directorTokenInput = $state('');    // director enters this
	let authCode = $state('');              // parent enters this after director accepts
	let expiresAt = $state<string | null>(null);
	let directorResult = $state<{
		playerName: string;
		destinationClubName: string;
		authCodeSentTo: string;
	} | null>(null);
	let completedResult = $state<{
		playerName: string;
		newTenantId: string;
	} | null>(null);

	// ── Derived ───────────────────────────────────────────────────────────────

	const isParent = $derived(role === 'parent');
	const isDirector = $derived(role === 'director' || role === 'global_admin');

	const currentStep = $derived(
		stage === 'idle' || stage === 'parent_initiating' ? 1
		: stage === 'parent_initiated' || stage === 'director_entering' || stage === 'director_accepted' ? 2
		: stage === 'parent_confirming' ? 3
		: 4,
	);

	// ── Handlers ──────────────────────────────────────────────────────────────

	async function handleInitiate() {
		if (!targetPlayerEmail.trim()) { errorMsg = 'Player email is required.'; return; }
		isLoading = true;
		errorMsg = null;
		stage = 'parent_initiating';
		try {
			const fn = httpsCallable<
				{ playerEmail: string },
				{ tokenId: string; expiresAt: string; message: string }
			>(fns, 'initiatePlayerTransfer');
			const res = await fn({ playerEmail: targetPlayerEmail.trim().toLowerCase() });
			tokenId = res.data.tokenId;
			expiresAt = res.data.expiresAt;
			stage = 'parent_initiated';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Failed to initiate transfer.';
			stage = 'error';
		} finally {
			isLoading = false;
		}
	}

	async function handleDirectorPresent() {
		if (!directorTokenInput.trim()) { errorMsg = 'Transfer token is required.'; return; }
		isLoading = true;
		errorMsg = null;
		stage = 'director_entering';
		try {
			const fn = httpsCallable<
				{ tokenId: string },
				{ playerName: string; destinationClubName: string; authCodeSentTo: string }
			>(fns, 'presentTransferToken');
			const res = await fn({ tokenId: directorTokenInput.trim() });
			directorResult = res.data;
			stage = 'director_accepted';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Token rejected.';
			stage = 'error';
		} finally {
			isLoading = false;
		}
	}

	async function handleConfirm() {
		if (!authCode.trim()) { errorMsg = 'Auth code is required.'; return; }
		if (!tokenId.trim()) { errorMsg = 'Token ID is required.'; return; }
		isLoading = true;
		errorMsg = null;
		stage = 'parent_confirming';
		try {
			const fn = httpsCallable<
				{ tokenId: string; authCode: string },
				{ success: boolean; newTenantId: string; playerName: string }
			>(fns, 'confirmPlayerTransfer');
			const res = await fn({ tokenId: tokenId.trim(), authCode: authCode.trim() });
			completedResult = { playerName: res.data.playerName, newTenantId: res.data.newTenantId };
			stage = 'completed';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Confirmation failed.';
			stage = 'error';
		} finally {
			isLoading = false;
		}
	}

	function reset() {
		stage = 'idle';
		errorMsg = null;
		successMsg = null;
		tokenId = '';
		directorTokenInput = '';
		authCode = '';
		directorResult = null;
		completedResult = null;
		expiresAt = null;
	}

	// ── Progress step helper ──────────────────────────────────────────────────

	function stepColor(n: number): string {
		if (n < currentStep) return '#14b8a6';
		if (n === currentStep) return '#14b8a6';
		return 'rgba(20, 184, 166, 0.2)';
	}
</script>

<div class="vanguard-panel z2-panel siem-panel tw-w-full tw-mx-auto tw-font-mono tw-space-y-0 tw-overflow-hidden">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="tw-flex tw-items-center tw-justify-between tw-px-5 tw-py-4 tw-bg-[var(--color-navy-slate)] tw-border-b tw-border-[var(--color-structural-grey)]">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-relative">
				<Icon name="status.shield-check" size={24} class="tw-text-data-cyan tw-drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
			</div>
			<div>
				<h2 class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white tw-font-mono">
					Vanguard transfer protocol
				</h2>
				<div class="tw-text-xs tw-text-slate-400 tw-mt-1 tw-tracking-wide">
					{isParent ? 'PARENT AUTHORIZATION TERMINAL' : 'DIRECTOR TOKEN ACCEPTANCE MODULE'}
				</div>
			</div>
		</div>
		<div
			class="tw-px-2.5 tw-py-1 tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-font-bold tw-tracking-widest tw-font-mono tw-border tw-border-amber-500/40 tw-text-amber-500 tw-bg-amber-500/10 tw-rounded-[2px] tw-uppercase"
		>RESTRICTED</div>
	</div>

	<!-- ── Progress rail ──────────────────────────────────────────────────── -->
	<div class="tw-px-5 tw-py-4" style="border-bottom: 1px solid rgba(20, 184, 166, 0.06);">
		<div class="tw-flex tw-items-center tw-gap-0">
			{#each [
				{ n: 1, label: 'PARENT INITIATES' },
				{ n: 2, label: 'DIRECTOR ACCEPTS' },
				{ n: 3, label: 'PARENT CONFIRMS' },
				{ n: 4, label: 'DATA PORTED' },
			] as step}
				<div class="tw-flex-1 tw-flex tw-flex-col tw-items-center tw-gap-1">
					<div
						class="tw-w-6 tw-h-6 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-xs tw-font-bold tw-transition-all tw-duration-500"
						style="
							border: 1.5px solid {stepColor(step.n)};
							color: {stepColor(step.n)};
							background: {step.n < currentStep ? 'rgba(20, 184, 166,0.1)' : step.n === currentStep ? 'rgba(20, 184, 166, 0.08)' : 'transparent'};
							box-shadow: {step.n === currentStep ? '0 0 12px rgba(20, 184, 166, 0.3)' : 'none'};
						"
					>
						{step.n < currentStep ? '✓' : step.n}
					</div>
					<span class="tw-text-center" style="font-size: clamp(0.625rem, 1vw, 0.75rem); color: {stepColor(step.n)}; letter-spacing: 0.05em;">
						{step.label}
					</span>
				</div>
				{#if step.n < 4}
					<div class="tw-flex-1 tw-h-px" style="background: {step.n < currentStep ? 'rgba(20, 184, 166,0.5)' : 'rgba(20, 184, 166, 0.1)'};"></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- ── Active panel ───────────────────────────────────────────────────── -->
	<div class="tw-p-5 tw-space-y-4">

		<!-- ── COMPLETED ───────────────────────────────────────────────────── -->
		{#if stage === 'completed'}
			<div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-py-4 tw-text-center">
			<div
				class="tw-w-16 tw-h-16 tw-rounded-full tw-flex tw-items-center tw-justify-center"
				style="
					background: rgba(20, 184, 166,0.08);
					border: 2px solid rgba(20, 184, 166,0.6);
					box-shadow: 0 0 40px rgba(20, 184, 166,0.2);
					color: #14b8a6;
				"
			>
				<Icon name="status.check" size={28} strokeWidth={2.5} />
			</div>
				<div class="tw-space-y-1">
					<div class="tw-text-sm tw-font-bold" style="color: #14b8a6; text-shadow: 0 0 20px rgba(20, 184, 166,0.5);">
						TRANSFER PROTOCOL COMPLETE
					</div>
					{#if completedResult}
						<div class="tw-text-xs" style="color: rgba(20, 184, 166, 0.5);">
							{completedResult.playerName} has been ported to the new club.<br/>
							XP, Tier, and Scout's Six stats preserved.
						</div>
						<div class="tw-text-xs tw-mt-1" style="color: rgba(20, 184, 166, 0.25);">
							DESTINATION TENANT: {completedResult.newTenantId}
						</div>
					{/if}
				</div>
				<button
					onclick={reset}
					class="tw-px-5 tw-py-2 tw-text-xs tw-tracking-widest tw-transition-all tw-font-mono hover:tw-bg-[rgba(20, 184, 166,0.08)]"
				style="border: 1px solid rgba(20, 184, 166,0.4); color: #14b8a6;"
				>[ CLOSE PROTOCOL ]</button>
			</div>

		<!-- ── ERROR ─────────────────────────────────────────────────────── -->
		{:else if stage === 'error'}
			<div class="tw-space-y-4">
				<div class="tw-px-4 tw-py-3 tw-space-y-1" style="background: rgba(255,64,96,0.07); border: 1px solid rgba(255,64,96,0.4);">
					<div class="tw-text-xs tw-font-bold" style="color: #ff4060;">⚠ PROTOCOL FAILURE</div>
					<div class="tw-text-xs" style="color: rgba(255,100,120,0.8);">{errorMsg}</div>
				</div>
				<button
					onclick={reset}
					class="tw-px-5 tw-py-2 tw-text-xs tw-tracking-widest tw-transition-all tw-font-mono hover:tw-bg-[rgba(255,64,96,0.08)]"
				style="border: 1px solid rgba(255,64,96,0.4); color: #ff4060;"
				>[ RESET ]</button>
			</div>

		<!-- ── PARENT: STEP 1 — INITIATE ─────────────────────────────────── -->
		{:else if isParent && (stage === 'idle' || stage === 'parent_initiating')}
			<div class="tw-space-y-4">
				<div class="tw-px-4 tw-py-3 tw-text-xs tw-leading-relaxed tw-bg-[var(--color-atompunk-amber)]/10 tw-border tw-border-[var(--color-atompunk-amber)]/30 tw-text-[var(--color-atompunk-amber)]/90 tw-rounded-[2px]">
					<Icon name="status.warning" size={16} class="tw-inline tw-mr-1.5 tw-align-text-bottom" />
					ZERO-TRUST PROTOCOL: Transfers are irreversible without re-initiation.
					Only the COPPA-verified parent account may authorize movement of player data.
				</div>

				<div class="tw-space-y-1">
					<label class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-tracking-widest tw-font-mono tw-text-slate-400 tw-uppercase">Player Email</label>
					<input
						type="email"
						bind:value={targetPlayerEmail}
						placeholder="player@club.com"
						autocomplete="email"
						class="vanguard-input tw-font-mono tw-w-full"
					/>
				</div>

				{#if errorMsg}
					<div class="tw-text-xs tw-px-3 tw-py-1.5" style="color: #ff4060; border: 1px solid rgba(255,64,96,0.3);">{errorMsg}</div>
				{/if}

				<button
					onclick={handleInitiate}
					disabled={isLoading}
					class="vanguard-btn-primary tw-w-full"
				>
					{isLoading ? 'Generating Token...' : 'Initiate Transfer Protocol'}
				</button>
			</div>

		<!-- ── PARENT: STEP 1 DONE — Show token + auth code entry ──────── -->
		{:else if isParent && stage === 'parent_initiated'}
			<div class="tw-space-y-5">
				<div class="tw-px-4 tw-py-4 tw-space-y-2 tw-bg-data-cyan/10 tw-border tw-border-data-cyan/30 tw-rounded-[2px]">
					<div class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-tracking-widest tw-font-mono tw-text-data-cyan/70">TRANSFER TOKEN GENERATED</div>
					<div class="tw-text-sm tw-font-mono tw-font-bold tw-break-all tw-text-data-cyan">{tokenId}</div>
					{#if expiresAt}
						<div class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-text-data-cyan/60 tw-font-mono">EXPIRES: {new Date(expiresAt).toLocaleString()}</div>
					{/if}
					<div class="tw-text-xs tw-text-data-cyan/80 tw-mt-2">
						Send this token to the receiving Club Director.<br/>
						Your auth code has been emailed to your COPPA-verified address.
					</div>
				</div>

				<div class="tw-space-y-1">
					<label for="tp-auth-code" class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-tracking-widest tw-font-mono tw-text-slate-400 tw-uppercase">Enter Auth Code (from email)</label>
					<input
						id="tp-auth-code"
						type="text"
						bind:value={authCode}
						placeholder="XXXXXXXXXXXX"
						maxlength="12"
						class="vanguard-input tw-font-mono tw-w-full tw-text-lg tw-font-bold tw-tracking-[0.25em] tw-uppercase"
					/>
					<div class="tw-text-xs tw-text-slate-500 tw-mt-1">
						Auth code is available after the Director accepts the token (Step 2).
					</div>
				</div>

				{#if errorMsg}
					<div class="tw-text-xs tw-px-3 tw-py-1.5" style="color: #ff4060; border: 1px solid rgba(255,64,96,0.3);">{errorMsg}</div>
				{/if}

				<button
					onclick={handleConfirm}
					disabled={isLoading || !authCode.trim()}
					class="vanguard-btn-primary tw-w-full"
				>
					{isLoading ? 'Authorizing...' : 'Cryptographic Confirm'}
				</button>
			</div>

		<!-- ── DIRECTOR: STEP 2 — Enter token ────────────────────────────── -->
		{:else if isDirector && (stage === 'idle' || stage === 'director_entering')}
			<div class="tw-space-y-5">
				<div class="tw-px-4 tw-py-3 tw-text-xs tw-leading-relaxed tw-bg-[var(--color-navy-slate)] tw-border tw-border-[var(--color-structural-grey)] tw-text-[var(--text-secondary)] tw-rounded-[2px]">
					<Icon name="status.info" size={16} class="tw-inline tw-mr-1.5 tw-align-text-bottom tw-text-slate-400" />
					Obtain the Transfer Token from the player's parent account, then enter it below.
					The parent will receive a cryptographic auth code to confirm the transfer.
				</div>

				<div class="tw-space-y-1">
					<label for="tp-dir-token" class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-tracking-widest tw-font-mono tw-text-slate-400 tw-uppercase">Transfer Token</label>
					<textarea
						id="tp-dir-token"
						bind:value={directorTokenInput}
						placeholder="64-character transfer token"
						rows="2"
						class="vanguard-input tw-font-mono tw-w-full tw-resize-none tw-break-all"
					></textarea>
				</div>

				{#if errorMsg}
					<div class="tw-text-xs tw-px-3 tw-py-1.5" style="color: #ff4060; border: 1px solid rgba(255,64,96,0.3);">{errorMsg}</div>
				{/if}

				<button
					onclick={handleDirectorPresent}
					disabled={isLoading || !directorTokenInput.trim()}
					class="vanguard-btn-primary tw-w-full"
				>
					{isLoading ? 'Validating Token...' : 'Accept Transfer Token'}
				</button>
			</div>

		<!-- ── DIRECTOR: STEP 2 DONE — awaiting parent ───────────────────── -->
		{:else if isDirector && stage === 'director_accepted'}
			{#if directorResult}
				<div class="tw-space-y-4">
					<div class="tw-px-4 tw-py-4 tw-bg-data-cyan/10 tw-border tw-border-data-cyan/30 tw-rounded-[2px]">
						<div class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-tracking-widest tw-font-mono tw-font-bold tw-text-data-cyan tw-mb-2">TOKEN ACCEPTED</div>
						<div class="tw-text-xs tw-space-y-1 tw-text-data-cyan/70 tw-font-mono">
							<div>PLAYER: <span class="tw-text-data-cyan tw-font-bold">{directorResult.playerName}</span></div>
							<div>DESTINATION: <span class="tw-text-data-cyan tw-font-bold">{directorResult.destinationClubName}</span></div>
						</div>
					</div>
					<div class="tw-text-xs tw-leading-relaxed tw-text-slate-400">
						Auth code dispatched to <strong class="tw-text-slate-200">{directorResult.authCodeSentTo}</strong>.<br/>
						The parent must enter the code to complete the transfer.<br/>
						This terminal will remain open until confirmation is received.
					</div>
					<div class="tw-flex tw-items-center tw-gap-2 tw-animate-pulse tw-mt-2">
						<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-data-cyan tw-shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
						<span class="tw-text-xs tw-font-mono tw-text-data-cyan/80 tw-tracking-widest">AWAITING PARENT AUTHORIZATION...</span>
					</div>
				</div>
			{/if}

		<!-- ── PARENT CONFIRMING ──────────────────────────────────────────── -->
		{:else if stage === 'parent_confirming'}
			<div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-py-4 tw-text-center">
				<div class="tw-relative tw-w-12 tw-h-12">
					<div class="tw-w-full tw-h-full tw-rounded-full tw-border-2 tw-animate-spin" style="border-color: rgba(20, 184, 166, 0.15); border-top-color: #14b8a6;"></div>
				</div>
				<span class="tw-text-xs tw-animate-pulse" style="color: rgba(20, 184, 166, 0.6);">
					EXECUTING ATOMIC DATA PORT...
				</span>
				<span class="tw-text-xs" style="color: rgba(20, 184, 166, 0.3);">
					XP · TIER · SCOUT'S SIX STATS · ACADEMIC RECORDS
				</span>
			</div>
		{/if}

	</div>

	<!-- ── Footer ─────────────────────────────────────────────────────────── -->
	<div class="tw-px-5 tw-py-3 tw-flex tw-items-center tw-justify-between tw-bg-[var(--color-void-black)] tw-border-t tw-border-[var(--color-structural-grey)]">
		<span class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-font-mono tw-text-slate-500 tw-tracking-widest">
			COPPA-VERIFIED · HMAC-SHA256 · 48H TOKEN TTL
		</span>
		<span class="tw-text-[length:clamp(0.625rem,1vw,0.75rem)] tw-font-mono tw-text-slate-500 tw-tracking-widest">
			VANGUARD NEXUS v4
		</span>
	</div>
</div>
