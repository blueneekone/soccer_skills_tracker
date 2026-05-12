<script lang="ts">
	/**
	 * MagicUplinkComposer.svelte
	 * ───────────────────────────
	 * Phase 2, Epic 3 — Passwordless Magic Uplinks.
	 *
	 * Bento glass panel that lets directors/coaches compose and dispatch a
	 * single-use passwordless invite link (Magic Uplink) via email.
	 *
	 * Replaces the legacy `generateInviteCode + copy-link` flow in UplinkTerminal.
	 *
	 * Props:
	 *   currentClubId  string
	 *   clubTeams      Array<{ id: string; name: string }>
	 */

	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import type {
		MintMagicUplinkPayload,
		MintMagicUplinkResult,
		MagicUplinkPurpose,
	} from '$lib/types/magicUplink.js';

	type Props = {
		currentClubId: string;
		clubTeams: Array<{ id: string; name: string }>;
	};

	const { currentClubId, clubTeams }: Props = $props();

	// ── Callable ──────────────────────────────────────────────────────────────

	const mintFn = httpsCallable<MintMagicUplinkPayload, MintMagicUplinkResult>(
		functions,
		'mintMagicUplink',
	);

	// ── Purpose → role mapping ────────────────────────────────────────────────

	type PurposeOption = {
		value: MagicUplinkPurpose;
		label: string;
		defaultRole: string;
		scopeType: 'none' | 'team' | 'household';
		defaultTtlDays: number;
	};

	const PURPOSE_OPTIONS: PurposeOption[] = [
		{ value: 'player',    label: 'Player',     defaultRole: 'player',    scopeType: 'none',      defaultTtlDays: 7  },
		{ value: 'parent',    label: 'Parent',     defaultRole: 'parent',    scopeType: 'household',  defaultTtlDays: 7  },
		{ value: 'coach',     label: 'Coach',      defaultRole: 'coach',     scopeType: 'team',       defaultTtlDays: 14 },
		{ value: 'director',  label: 'Director',   defaultRole: 'director',  scopeType: 'none',       defaultTtlDays: 14 },
		{ value: 'registrar', label: 'Registrar',  defaultRole: 'registrar', scopeType: 'none',       defaultTtlDays: 14 },
		{ value: 'recruiter', label: 'Recruiter',  defaultRole: 'recruiter', scopeType: 'none',       defaultTtlDays: 30 },
	];

	// ── Form state ────────────────────────────────────────────────────────────

	let targetEmail   = $state('');
	let purpose       = $state<MagicUplinkPurpose>('player');
	let role          = $state('player');
	let selectedTeamId = $state('');
	let householdId   = $state('');
	let expiryDays    = $state(7);

	let isSending   = $state(false);
	let toastMsg    = $state('');
	let toastOk     = $state(true);
	let toastTimer  = $state<ReturnType<typeof setTimeout> | null>(null);

	// ── Derived ───────────────────────────────────────────────────────────────

	const selectedPurpose = $derived(PURPOSE_OPTIONS.find((p) => p.value === purpose)!);
	const showTeamPicker  = $derived(selectedPurpose?.scopeType === 'team');
	const showHousehold   = $derived(selectedPurpose?.scopeType === 'household');
	const expiryHours     = $derived(expiryDays * 24);

	const previewExpiry = $derived(() => {
		const d = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	});

	const canSend = $derived(
		targetEmail.includes('@') &&
		!isSending &&
		(!showTeamPicker || selectedTeamId) &&
		expiryDays >= 1 && expiryDays <= 30,
	);

	// ── Handlers ──────────────────────────────────────────────────────────────

	function syncRoleOnPurposeChange() {
		const opt = PURPOSE_OPTIONS.find((p) => p.value === purpose);
		if (opt) {
			role = opt.defaultRole;
			expiryDays = opt.defaultTtlDays;
			selectedTeamId = '';
			householdId = '';
		}
	}

	function showToast(msg: string, ok = true) {
		toastMsg = msg;
		toastOk  = ok;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => { toastMsg = ''; }, 4000);
	}

	async function handleSend() {
		if (!canSend) return;
		isSending = true;

		try {
			const payload: MintMagicUplinkPayload = {
				targetEmail: targetEmail.toLowerCase().trim(),
				purpose,
				role,
				clubId: currentClubId,
				expiryHours,
				...(showTeamPicker && selectedTeamId && { teamId: selectedTeamId }),
				...(showHousehold && householdId     && { householdId }),
			};

			const result = await mintFn(payload);
			const expiry = new Date(result.data.expiresAt).toLocaleDateString('en-US', {
				month: 'short', day: 'numeric', year: 'numeric',
			});
			showToast(`Magic Uplink sent to ${payload.targetEmail} — expires ${expiry}`, true);
			targetEmail    = '';
			selectedTeamId = '';
			householdId    = '';
		} catch (err: unknown) {
			const msg = (err instanceof Error ? err.message : null) ?? 'Failed to mint uplink.';
			showToast(msg, false);
		} finally {
			isSending = false;
		}
	}
</script>

<div class="composer">

	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="composer-header">
		<div class="composer-header-left">
			<span class="badge">MAGIC UPLINK</span>
			<p class="subtitle">PASSWORDLESS INVITE — SINGLE-USE · TIME-LOCKED</p>
		</div>
		<span class="status-dot" aria-hidden="true"></span>
	</div>

	<!-- ── Email ──────────────────────────────────────────────────────────── -->
	<div class="field-group">
		<label class="field-label" for="mu-email">RECIPIENT EMAIL</label>
		<input
			id="mu-email"
			type="email"
			class="field-input"
			placeholder="athlete@example.com"
			bind:value={targetEmail}
			autocomplete="email"
			spellcheck="false"
		/>
	</div>

	<!-- ── Purpose + Role ─────────────────────────────────────────────────── -->
	<div class="field-row">
		<div class="field-group flex-1">
			<label class="field-label" for="mu-purpose">PURPOSE</label>
			<select
				id="mu-purpose"
				class="field-input"
				bind:value={purpose}
				onchange={syncRoleOnPurposeChange}
			>
				{#each PURPOSE_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>
		<div class="field-group flex-1">
			<label class="field-label" for="mu-role">ROLE CLAIM</label>
			<input
				id="mu-role"
				type="text"
				class="field-input"
				bind:value={role}
				placeholder="e.g. coach"
			/>
		</div>
	</div>

	<!-- ── Team picker (coach) ────────────────────────────────────────────── -->
	{#if showTeamPicker}
		<div class="field-group">
			<label class="field-label" for="mu-team">TARGET TEAM</label>
			<select id="mu-team" class="field-input" bind:value={selectedTeamId}>
				<option value="" disabled>Select team…</option>
				{#each clubTeams as team (team.id)}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- ── Household ID (parent) ──────────────────────────────────────────── -->
	{#if showHousehold}
		<div class="field-group">
			<label class="field-label" for="mu-household">HOUSEHOLD ID (optional)</label>
			<input
				id="mu-household"
				type="text"
				class="field-input"
				placeholder="household doc ID"
				bind:value={householdId}
			/>
		</div>
	{/if}

	<!-- ── Expiry slider ──────────────────────────────────────────────────── -->
	<div class="field-group">
		<div class="slider-header">
			<label class="field-label" for="mu-expiry">EXPIRY</label>
			<span class="slider-val">{expiryDays}d · expires {previewExpiry()}</span>
		</div>
		<input
			id="mu-expiry"
			type="range"
			class="expiry-slider"
			min="1"
			max="30"
			step="1"
			bind:value={expiryDays}
		/>
		<div class="slider-ticks">
			<span>1d</span><span>7d</span><span>14d</span><span>30d</span>
		</div>
	</div>

	<!-- ── Preview pane ───────────────────────────────────────────────────── -->
	<div class="preview-pane" aria-label="Invite preview">
		<p class="preview-label">PREVIEW</p>
		<p class="preview-line">
			<span class="preview-key">TO</span>
			<span class="preview-val">{targetEmail || '—'}</span>
		</p>
		<p class="preview-line">
			<span class="preview-key">ROLE</span>
			<span class="preview-val">{role || '—'} ({purpose})</span>
		</p>
		<p class="preview-line">
			<span class="preview-key">EXPIRES</span>
			<span class="preview-val">{previewExpiry()}</span>
		</p>
		<p class="preview-line">
			<span class="preview-key">METHOD</span>
			<span class="preview-val">EMAIL · SINGLE-USE · SCRYPT</span>
		</p>
	</div>

	<!-- ── Send button ────────────────────────────────────────────────────── -->
	<button class="send-btn" disabled={!canSend} onclick={handleSend} aria-busy={isSending}>
		{#if isSending}
			<span class="spin" aria-hidden="true">⟳</span> DISPATCHING…
		{:else}
			⚡ SEND MAGIC UPLINK
		{/if}
	</button>

	<!-- ── Toast ──────────────────────────────────────────────────────────── -->
	{#if toastMsg}
		<div class="toast" class:toast--error={!toastOk} role="status" aria-live="polite">
			{toastMsg}
		</div>
	{/if}

</div>

<style>
	.composer {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 1.75rem;
		background: rgba(2,4,9,0.88);
		border: 1px solid rgba(0,240,255,0.14);
		border-radius: 24px;
		backdrop-filter: blur(36px);
		-webkit-backdrop-filter: blur(36px);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		position: relative;
		overflow: hidden;
	}

	.composer::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,240,255,0.045) 0%, transparent 70%);
		pointer-events: none;
	}

	/* ── Header ── */
	.composer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.composer-header-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.badge {
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(0,240,255,0.85);
		background: rgba(0,240,255,0.08);
		border: 1px solid rgba(0,240,255,0.25);
		border-radius: 4px;
		padding: 2px 8px;
		display: inline-block;
		width: fit-content;
	}

	.subtitle {
		margin: 0;
		font-size: 0.52rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		color: rgba(229,231,235,0.28);
		text-transform: uppercase;
	}

	.status-dot {
		display: block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #00f0ff;
		box-shadow: 0 0 8px #00f0ff, 0 0 20px rgba(0,240,255,0.4);
		animation: pulse 2s ease-in-out infinite;
		flex-shrink: 0;
	}

	/* ── Fields ── */
	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.flex-1 {
		flex: 1;
		min-width: 140px;
	}

	.field-label {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(0,240,255,0.45);
		text-transform: uppercase;
	}

	.field-input {
		background: #010409;
		border: 1px solid rgba(0,240,255,0.22);
		border-radius: 8px;
		color: #e5e7eb;
		font-family: inherit;
		font-size: 0.78rem;
		padding: 0.65rem 0.85rem;
		outline: none;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.18s, box-shadow 0.18s;
		appearance: none;
	}

	.field-input:focus {
		border-color: rgba(0,240,255,0.55);
		box-shadow: 0 0 0 1px rgba(0,240,255,0.2), 0 0 12px rgba(0,240,255,0.06);
	}

	/* ── Expiry slider ── */
	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.slider-val {
		font-size: 0.6rem;
		color: rgba(0,240,255,0.65);
		letter-spacing: 0.08em;
	}

	.expiry-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 3px;
		background: rgba(0,240,255,0.15);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.expiry-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #00f0ff;
		box-shadow: 0 0 8px rgba(0,240,255,0.6);
		cursor: pointer;
	}

	.slider-ticks {
		display: flex;
		justify-content: space-between;
		font-size: 0.48rem;
		color: rgba(255,255,255,0.2);
		letter-spacing: 0.12em;
		margin-top: 2px;
	}

	/* ── Preview pane ── */
	.preview-pane {
		background: rgba(0,240,255,0.025);
		border: 1px solid rgba(0,240,255,0.12);
		border-radius: 10px;
		padding: 1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.preview-label {
		margin: 0 0 4px;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(0,240,255,0.35);
	}

	.preview-line {
		margin: 0;
		display: flex;
		gap: 0.75rem;
		font-size: 0.65rem;
	}

	.preview-key {
		color: rgba(0,240,255,0.4);
		min-width: 60px;
		letter-spacing: 0.1em;
	}

	.preview-val {
		color: rgba(229,231,235,0.6);
		word-break: break-all;
	}

	/* ── Send button ── */
	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.9rem 1.5rem;
		width: 100%;
		font-family: inherit;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #00f0ff;
		background: rgba(0,240,255,0.07);
		border: 1px solid rgba(0,240,255,0.4);
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity 0.18s;
		box-shadow: 0 0 18px rgba(0,240,255,0.06), inset 0 1px 0 rgba(0,240,255,0.07);
	}

	.send-btn:hover:not(:disabled) {
		background: rgba(0,240,255,0.13);
		border-color: rgba(0,240,255,0.65);
		box-shadow: 0 0 28px rgba(0,240,255,0.18), inset 0 1px 0 rgba(0,240,255,0.1);
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.spin {
		display: inline-block;
		animation: spin 0.75s linear infinite;
	}

	/* ── Toast ── */
	.toast {
		padding: 0.65rem 1rem;
		background: rgba(0,230,130,0.07);
		border: 1px solid rgba(0,230,130,0.3);
		border-radius: 8px;
		font-size: 0.66rem;
		color: rgba(0,230,130,0.9);
		letter-spacing: 0.06em;
		animation: fadeIn 0.25s ease;
	}

	.toast--error {
		background: rgba(255,77,106,0.06);
		border-color: rgba(255,77,106,0.3);
		color: rgba(255,77,106,0.9);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.4; }
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-4px); }
		to   { opacity: 1; transform: translateY(0); }
	}
</style>
