<script>
	import { auth, db } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';

	let playerName = $state('');
	let privacyProfile = $state('strict_minor_defaults');
	let telemetryOptIn = $state(false);
	let errorMsg = $state('');
	let saveMsg = $state('');
	let saving = $state(false);

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role);

	const clubLabel = $derived.by(() => {
		const cid = profile?.clubId;
		if (!cid) return '—';
		const c = teamsStore.clubs.find((x) => x.id === cid);
		return c ? c.name || c.id : cid;
	});

	const teamLabel = $derived.by(() => {
		const tid = profile?.teamId;
		if (!tid || tid === 'admin') {
			if (role === 'super_admin' || role === 'director') return 'All teams (admin)';
			if (role === 'registrar') return 'Club-wide (not on a player roster)';
			return '—';
		}
		const t = teamsStore.teams.find((x) => x.id === tid);
		return t ? t.name || t.id : tid;
	});

	$effect(() => {
		if (authStore.isAuthenticated && !teamsStore.loaded) {
			teamsStore.load(authStore.role);
		}
	});

	$effect(() => {
		if (!profile) return;
		playerName = String(profile.playerName ?? '');
		privacyProfile = String(profile.privacyProfile ?? 'strict_minor_defaults');
		telemetryOptIn = Boolean(profile.telemetryOptIn);
	});

	async function saveProfile() {
		errorMsg = '';
		saveMsg = '';
		const trimmed = playerName.trim();
		if (!trimmed && role !== 'super_admin' && role !== 'director') {
			errorMsg = 'Display name is required.';
			return;
		}
		if (!auth.currentUser?.email) {
			errorMsg = 'Not signed in.';
			return;
		}
		saving = true;
		try {
			const userRef = doc(db, 'users', auth.currentUser.email.toLowerCase());
			const payload = {
				playerName: trimmed || profile?.playerName || auth.currentUser.email.split('@')[0],
				privacyProfile,
				telemetryOptIn,
				settingsUpdatedAt: new Date()
			};
			await updateDoc(userRef, payload);
			await authStore.refresh({ silent: true });
			saveMsg = 'Profile saved.';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not save profile.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="view-section settings-page">
	<div class="card">
		<div class="card-header">
			<span>Profile &amp; settings</span>
		</div>
		<div class="card-body settings-body">
			<p class="text-sm-sub settings-lead">
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

			<label class="settings-label-block" for="display-name">Display name</label>
			<input
				id="display-name"
				class="settings-input"
				type="text"
				autocomplete="name"
				bind:value={playerName}
			/>

			<label class="settings-label-block" for="privacy">Privacy profile</label>
			<select id="privacy" class="settings-input" bind:value={privacyProfile}>
				<option value="strict_minor_defaults">Strict defaults (recommended for youth)</option>
				<option value="standard">Standard</option>
			</select>

			<label class="settings-checkbox-row">
				<input type="checkbox" bind:checked={telemetryOptIn} />
				<span>Allow optional telemetry / analytics sharing (separate from core app use)</span>
			</label>

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

			<button class="primary-btn btn-orange w-100" type="button" onclick={saveProfile} disabled={saving}>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	</div>
</div>

<style>
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
		gap: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.settings-checkbox-row input {
		margin-top: 4px;
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
</style>
