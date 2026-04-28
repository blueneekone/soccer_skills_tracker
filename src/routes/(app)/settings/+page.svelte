<script>
	import { auth, db } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import OperativeAvatarDesigner from '$lib/components/player/OperativeAvatarDesigner.svelte';
	import {
		OPERATIVE_AVATAR_VERSION,
		parseOperativeAvatar,
	} from '$lib/avatars/operativeAvatar.js';

	let playerName = $state('');
	let privacyProfile = $state('strict_minor_defaults');
	let telemetryOptIn = $state(false);
	let errorMsg = $state('');
	let saveMsg = $state('');
	let saving = $state(false);

	const defaultAvatar = () => ({
		v: OPERATIVE_AVATAR_VERSION,
		seed: `v${OPERATIVE_AVATAR_VERSION}|22|55|38|71`,
	});

	let operativeAvatar = $state(defaultAvatar());

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role);
	const isPlayer = $derived(role === 'player');
	const isOperativeProxy = $derived(
		(authStore.user?.email || '').toLowerCase().endsWith('@operative.local') && role === 'player',
	);

	const isMinorAccount = $derived.by(() => {
		const p = profile;
		if (!p) return false;
		if (p.isMinor === true) return true;
		if (p.isMinor === false) return false;
		const dob = p.dateOfBirth;
		if (dob && typeof dob.toDate === 'function') {
			const d = dob.toDate();
			const now = new Date();
			let age = now.getFullYear() - d.getFullYear();
			const m = now.getMonth() - d.getMonth();
			if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
				age--;
			}
			return age < 13;
		}
		return false;
	});

	const clubLabel = $derived.by(() => {
		const cid = profile?.clubId;
		if (!cid) return '—';
		const c = teamsStore.clubs.find((x) => x.id === cid);
		return c ? c.name || c.id : cid;
	});

	const teamLabel = $derived.by(() => {
		const tid = profile?.teamId;
		if (!tid || tid === 'admin') {
			if (role === 'super_admin' || role === 'global_admin' || role === 'director') return 'All teams (admin)';
			if (role === 'registrar') return 'Club-wide (not on a player roster)';
			return '—';
		}
		const t = teamsStore.teams.find((x) => x.id === tid);
		return t ? t.name || t.id : tid;
	});

	$effect(() => {
		if (!profile) return;
		playerName = String(profile.playerName ?? '');
		privacyProfile = String(profile.privacyProfile ?? 'strict_minor_defaults');
		telemetryOptIn = Boolean(profile.telemetryOptIn);
		if (isMinorAccount) {
			privacyProfile = 'strict_minor_defaults';
			telemetryOptIn = false;
		}
		const parsedAv = parseOperativeAvatar(profile?.operativeAvatar);
		if (parsedAv) operativeAvatar = parsedAv;
	});

	async function saveProfile() {
		errorMsg = '';
		saveMsg = '';
		const trimmed = playerName.trim();
		if (!trimmed && role !== 'super_admin' && role !== 'global_admin' && role !== 'director') {
			errorMsg = 'Display name is required.';
			return;
		}
		if (!auth.currentUser?.email) {
			errorMsg = 'Not signed in.';
			return;
		}
		if (isOperativeProxy) {
			errorMsg = 'Call sign changes use the Operative Call sign screen.';
			return;
		}
		saving = true;
		try {
			const userRef = doc(db, 'users', auth.currentUser.email.toLowerCase());
			const privacy = isMinorAccount ? 'strict_minor_defaults' : privacyProfile;
			const telemetry = isMinorAccount ? false : telemetryOptIn;
			const payload = {
				playerName: trimmed || profile?.playerName || auth.currentUser.email.split('@')[0],
				privacyProfile: privacy,
				telemetryOptIn: telemetry,
				settingsUpdatedAt: new Date(),
				...(isPlayer && !isOperativeProxy ? { operativeAvatar } : {}),
			};
			await updateDoc(userRef, payload);
			// #region agent log
			fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Debug-Session-Id': 'dd2828',
				},
				body: JSON.stringify({
					sessionId: 'dd2828',
					runId: 'avatar-save',
					hypothesisId: 'H2',
					location: 'settings/+page.svelte:saveProfile',
					message: 'operative_avatar_saved',
					data: { hasAvatar: Boolean(isPlayer && !isOperativeProxy) },
					timestamp: Date.now(),
				}),
			}).catch(() => {});
			// #endregion
			await authStore.refresh({ silent: true });
			saveMsg = 'Profile saved.';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not save profile.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="view-section settings-page" class:pos-settings={isPlayer}>
	{#if isPlayer}
		<header class="pos-set-hero">
			<div class="pos-set-hero__copy">
				<span class="pos-set-hero__eyebrow">Control room</span>
				<h2 class="pos-set-hero__title">Profile &amp; settings</h2>
				<p class="pos-set-hero__sub">
					Identity, privacy, and appearance — everything that follows you across Player OS.
				</p>
			</div>
			<div class="pos-set-hero__icon" aria-hidden="true">
				<i class="ph ph-sliders-horizontal"></i>
			</div>
		</header>
	{/if}

	<div class="card">
		<div class="card-header">
			<span>{isPlayer ? 'Account' : 'Profile & settings'}</span>
		</div>
		<div class="card-body settings-body">
			<p class="text-sm-sub settings-lead" class:pos-set-lead--muted={isPlayer}>
				Account details below stay in sync with Firebase. Club and team association is locked after setup for
				data integrity; contact your club director to move you to another team.
			</p>

			<div class="settings-grid">
				<div class="settings-field">
					<span class="settings-label">Email</span>
					<span class="settings-value">{authStore.user?.email ?? '—'}</span>
				</div>
				<div class="settings-field">
					<span class="settings-label">Role</span>
					<span class="settings-value">{role}</span>
				</div>
				<div class="settings-field">
					<span class="settings-label">Club</span>
					<span class="settings-value">{clubLabel}</span>
				</div>
				<div class="settings-field">
					<span class="settings-label">Team</span>
					<span class="settings-value">{teamLabel}</span>
				</div>
			</div>

			<hr class="settings-divider" />

			{#if isOperativeProxy}
				<p class="settings-label-block">Display / call sign</p>
				<p class="text-sm-sub settings-lead" style="margin: 0 0 0.75rem">
					Call sign &amp; display changes go through
					<a href="/operative/profile" style="color: var(--pp-accent, #f59e0b); font-weight: 600"
						>Call sign (Operative)</a
					>
					— parent approval is required. The value below is read-only here.
				</p>
				<input
					class="settings-input"
					type="text"
					readonly
					aria-label="Call sign (read only)"
					value={String(profile?.playerName || playerName || '—')}
				/>
			{:else}
				<label class="settings-label-block" for="display-name">Display name</label>
				<input
					id="display-name"
					class="settings-input"
					type="text"
					autocomplete="name"
					bind:value={playerName}
				/>
			{/if}

			{#if isMinorAccount}
				<span class="settings-label-block">Privacy profile</span>
				<p class="minor-privacy-note">
					Minor accounts use maximum privacy defaults (Epic 1.4). Only your director can adjust COPPA fields.
				</p>
			{:else}
				<label class="settings-label-block" for="privacy">Privacy profile</label>
				<select id="privacy" class="settings-input" bind:value={privacyProfile}>
					<option value="strict_minor_defaults">Strict defaults (recommended for youth)</option>
					<option value="standard">Standard</option>
				</select>
			{/if}

			<label class="settings-checkbox-row" class:disabled-row={isMinorAccount}>
				<input type="checkbox" bind:checked={telemetryOptIn} disabled={isMinorAccount} />
				<span>Allow optional telemetry / analytics sharing (separate from core app use)</span>
			</label>

			<hr class="settings-divider" />

			{#if isPlayer && !isOperativeProxy}
				<span class="settings-label-block">Operative avatar</span>
				<p class="text-sm-sub settings-lead" style="margin: 0 0 0.75rem">
					Choose a vector operative portrait — only a short seed is stored (generated illustration).
					No photo uploads.
				</p>
				<div style="margin-bottom: 1rem">
					<OperativeAvatarDesigner bind:operativeAvatar />
				</div>
			{/if}

			<hr class="settings-divider" />

			<span class="settings-label-block">Appearance</span>
			<div class="theme-segment" role="group" aria-label="Theme">
				<button
					type="button"
					class="theme-btn"
					class:active={themeStore.preference === 'system'}
					onclick={() => themeStore.setPreference('system')}
				>
					System
				</button>
				<button
					type="button"
					class="theme-btn"
					class:active={themeStore.preference === 'light'}
					onclick={() => themeStore.setPreference('light')}
				>
					Light
				</button>
				<button
					type="button"
					class="theme-btn"
					class:active={themeStore.preference === 'dark'}
					onclick={() => themeStore.setPreference('dark')}
				>
					Dark
				</button>
			</div>

			{#if errorMsg}
				<div class="auth-error-msg" role="alert">{errorMsg}</div>
			{/if}
			{#if saveMsg}
				<p class="settings-save-ok" role="status">{saveMsg}</p>
			{/if}

			<button
				class="primary-btn btn-orange w-100"
				class:pos-set-save={isPlayer}
				type="button"
				onclick={saveProfile}
				disabled={saving}
			>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	</div>
</div>

<style>
	/* ─── Player OS settings ───────────────────────────────────── */
	.pos-settings.settings-page {
		padding-top: 0;
	}

	.pos-set-hero {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: clamp(18px, 3vw, 24px);
		padding: clamp(16px, 3vw, 22px);
		border-radius: 20px;
		background: linear-gradient(
			135deg,
			rgba(245, 158, 11, 0.12),
			rgba(34, 211, 238, 0.1)
		);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 24px 48px -32px rgba(0, 0, 0, 0.9);
	}

	.pos-set-hero__eyebrow {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--pp-accent, #f59e0b);
		margin-bottom: 6px;
	}

	.pos-set-hero__title {
		margin: 0 0 6px;
		font-size: clamp(1.35rem, 4vw, 1.75rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		color: var(--pp-text-primary, #f4f4f5);
	}

	.pos-set-hero__sub {
		margin: 0;
		max-width: 44ch;
		font-size: 0.88rem;
		font-weight: 600;
		line-height: 1.5;
		color: var(--pp-text-secondary, #c4c4ce);
	}

	.pos-set-hero__icon {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 16px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: var(--pp-accent, #f59e0b);
		font-size: 1.35rem;
		box-shadow: 0 0 28px -6px rgba(245, 158, 11, 0.35);
	}

	.pos-set-lead--muted {
		opacity: 0.88;
		color: var(--pp-text-secondary, #c4c4ce);
	}

	.pos-settings :global(.card-header) {
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.72rem;
	}

	.pos-settings .settings-field {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pos-settings .settings-label {
		color: var(--pp-text-secondary, #c4c4ce);
	}

	.pos-settings .settings-value {
		color: var(--pp-text-primary, #f4f4f5);
	}

	.pos-settings .settings-divider {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.pos-settings .settings-input {
		background: rgba(0, 0, 0, 0.35);
		border-color: rgba(255, 255, 255, 0.12);
		color: var(--pp-text-primary, #f4f4f5);
	}

	.pos-settings .settings-input:focus {
		outline: none;
		border-color: rgba(34, 211, 238, 0.45);
		box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
	}

	.pos-settings .theme-btn {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		color: var(--pp-text-primary, #f4f4f5);
	}

	.pos-settings .theme-btn.active {
		border-color: var(--pp-accent-cool, #22d3ee);
		box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.2);
		background: rgba(34, 211, 238, 0.1);
	}

	.pos-settings .minor-privacy-note {
		background: rgba(0, 0, 0, 0.28);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--pp-text-secondary, #c4c4ce);
	}

	.pos-set-save.primary-btn {
		background: linear-gradient(145deg, var(--pp-accent, #f59e0b), #fbbf24);
		color: #0a0a0a;
		font-weight: 900;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 16px 36px -12px rgba(245, 158, 11, 0.55);
	}

	.settings-body {
		display: flex;
		flex-direction: column;
		gap: clamp(12px, 2vw, 16px);
	}

	.settings-lead {
		margin: 0;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
	}

	.settings-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: clamp(12px, 2vw, 16px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.04);
	}

	:global(html.dark) .settings-field {
		background: rgba(15, 23, 42, 0.35);
	}

	.settings-label {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-slate);
	}

	.settings-value {
		font-weight: 700;
		word-break: break-word;
	}

	.settings-divider {
		border: none;
		border-top: 1px solid rgba(15, 23, 42, 0.08);
		margin: clamp(8px, 1.5vw, 12px) 0;
	}

	:global(html.dark) .settings-divider {
		border-top-color: rgba(226, 232, 240, 0.12);
	}

	.settings-label-block {
		font-weight: 800;
		font-size: 0.9rem;
	}

	.settings-input {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		font: inherit;
		background: var(--glass-bg);
		color: inherit;
	}

	.settings-checkbox-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.settings-checkbox-row input {
		margin-top: 0.125rem;
	}

	.theme-segment {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.theme-btn {
		flex: 1;
		min-width: 88px;
		padding: clamp(10px, 2vw, 12px) 14px;
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.theme-btn.active {
		border-color: var(--aggie-gold);
		box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.25);
	}

	.settings-save-ok {
		margin: 0;
		color: var(--success-green);
		font-weight: 700;
		font-size: 0.9rem;
		text-align: center;
	}

	.minor-privacy-note {
		margin: 0;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		background: rgba(15, 23, 42, 0.04);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.45;
	}

	:global(html.dark) .minor-privacy-note {
		background: rgba(15, 23, 42, 0.35);
	}

	.disabled-row {
		opacity: 0.65;
		cursor: not-allowed;
	}
</style>
