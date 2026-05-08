<script lang="ts">
	/**
	 * Settings Terminal — VANGUARD NEXUS v4
	 * ────────────────────────────────────────
	 * High-density, role-based configuration hub with "Stark Tech" aesthetic.
	 *
	 * TABS
	 * ────
	 *  PROFILE       — Display name, avatar, theme (all roles)
	 *  NOTIFICATIONS — FCM permission + circuit-breaker preference matrix (all roles)
	 *  OPERATIONS    — Billing portal, org defaults, role mgmt (director/coach)
	 *  FAMILY UNIT   — COPPA status, linked players, minor data deletion (parent)
	 *  DANGER ZONE   — Password reset, account deletion (all roles)
	 *
	 * NOTIFICATION AUTO-SAVE
	 * ──────────────────────
	 * $effect watches the preferences object. Any change debounces 800ms then
	 * writes to Firestore via updateDoc(). A "⚡ SETTINGS SYNCED" flash confirms.
	 * No manual "Save" button for notifications.
	 */

	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
	import { doc, updateDoc, getDoc } from 'firebase/firestore';
	import { sendPasswordResetEmail } from 'firebase/auth';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import { fcmService } from '$lib/services/messaging.svelte.js';
	import OperativeAvatarDesigner from '$lib/components/player/OperativeAvatarDesigner.svelte';
	import {
		OPERATIVE_AVATAR_VERSION,
		parseOperativeAvatar,
	} from '$lib/avatars/operativeAvatar.js';

	// ── Tab state ─────────────────────────────────────────────────────────────

	type Tab = 'profile' | 'notifications' | 'operations' | 'family' | 'danger';
	let activeTab = $state<Tab>('profile');

	// Pre-typed static config (avoids TypeScript casts inside templates)
	const THEME_OPTIONS: Array<{ key: 'system' | 'dark' | 'light'; label: string }> = [
		{ key: 'system', label: 'SYSTEM' },
		{ key: 'dark',   label: 'DARK'   },
		{ key: 'light',  label: 'LIGHT'  },
	];

	// ── Auth / role ───────────────────────────────────────────────────────────

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role ?? '');
	const email = $derived((authStore.user?.email ?? '').toLowerCase());
	const uid = $derived(authStore.user?.uid ?? '');
	const tenantId = $derived(authStore.tenantId ?? profile?.clubId ?? '');

	const isPlayer    = $derived(role === 'player');
	const isCoach     = $derived(role === 'coach');
	const isDirector  = $derived(role === 'director' || role === 'super_admin' || role === 'global_admin');
	const isParent    = $derived(role === 'parent');
	const showOps     = $derived(isCoach || isDirector);
	const showFamily  = $derived(isParent);

	// TABS must be declared AFTER showOps/showFamily so $derived can reference them
	const TABS = $derived<Array<{ key: Tab; label: string; show: boolean }>>([
		{ key: 'profile',       label: 'PROFILE',       show: true       },
		{ key: 'notifications', label: 'NOTIFICATIONS', show: true       },
		{ key: 'operations',    label: 'OPERATIONS',    show: showOps    },
		{ key: 'family',        label: 'FAMILY UNIT',   show: showFamily },
		{ key: 'danger',        label: 'DANGER ZONE',   show: true       },
	]);

	const isOperativeProxy = $derived(
		email.endsWith('@operative.local') && isPlayer,
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
			if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
			return age < 13;
		}
		return false;
	});

	// ── Profile tab state ─────────────────────────────────────────────────────

	let playerName  = $state('');
	let privacyProfile = $state('strict_minor_defaults');
	let telemetryOptIn = $state(false);
	let profileError = $state('');
	let profileSaveMsg = $state('');
	let profileSaving = $state(false);
	let operativeAvatar = $state({
		v: OPERATIVE_AVATAR_VERSION,
		seed: `v${OPERATIVE_AVATAR_VERSION}|22|55|38|71`,
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
			if (isDirector) return 'All teams (admin)';
			if (role === 'registrar') return 'Club-wide';
			return '—';
		}
		const t = teamsStore.teams.find((x) => x.id === tid);
		return t ? t.name || t.id : tid;
	});

	$effect(() => {
		if (!profile) return;
		playerName     = String(profile.playerName ?? '');
		privacyProfile = String(profile.privacyProfile ?? 'strict_minor_defaults');
		telemetryOptIn = Boolean(profile.telemetryOptIn);
		if (isMinorAccount) { privacyProfile = 'strict_minor_defaults'; telemetryOptIn = false; }
		const av = parseOperativeAvatar(profile.operativeAvatar);
		if (av) operativeAvatar = av;
	});

	async function saveProfile() {
		profileError = '';
		profileSaveMsg = '';
		const trimmed = playerName.trim();
		if (!trimmed && !isDirector && role !== 'super_admin' && role !== 'global_admin') {
			profileError = 'Display name is required.';
			return;
		}
		if (!auth.currentUser?.email) { profileError = 'Not signed in.'; return; }
		if (isOperativeProxy) { profileError = 'Use the Operative Call Sign screen.'; return; }
		profileSaving = true;
		try {
			const userRef = doc(db, 'users', auth.currentUser.email.toLowerCase());
			await updateDoc(userRef, {
				playerName: trimmed || profile?.playerName || email.split('@')[0],
				privacyProfile: isMinorAccount ? 'strict_minor_defaults' : privacyProfile,
				telemetryOptIn: isMinorAccount ? false : telemetryOptIn,
				settingsUpdatedAt: new Date(),
				...(isPlayer && !isOperativeProxy ? { operativeAvatar } : {}),
			});
			await authStore.refresh({ silent: true });
			profileSaveMsg = 'PROFILE UPDATED';
		} catch (err: unknown) {
			profileError = err instanceof Error ? err.message : 'Save failed.';
		} finally {
			profileSaving = false;
		}
	}

	// ── Notifications tab state ────────────────────────────────────────────────

	interface UserPreferences {
		push_weatherAlerts: boolean;
		push_gameReminders: boolean;
		push_messages: boolean;
		email_weeklyReport: boolean;
	}

	// Role-based defaults
	const prefsDefaults = $derived<UserPreferences>({
		push_weatherAlerts: isCoach || isDirector,
		push_gameReminders: true,
		push_messages: true,
		email_weeklyReport: false,
	});

	let prefs = $state<UserPreferences>({
		push_weatherAlerts: isCoach || isDirector,
		push_gameReminders: true,
		push_messages: true,
		email_weeklyReport: false,
	});

	let prefsSyncMsg = $state('');
	let prefsSyncTimer: ReturnType<typeof setTimeout> | null = null;
	let prefsLoaded = $state(false);
	let prefsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Load preferences from Firestore once on mount
	onMount(async () => {
		fcmService.init();
		if (!email) return;
		try {
			const snap = await getDoc(doc(db, 'users', email));
			if (snap.exists()) {
				const data = snap.data();
				if (data.preferences) {
					prefs = { ...prefsDefaults, ...data.preferences };
				}
			}
		} catch { /* silent — use defaults */ }
		prefsLoaded = true;
	});

	// Auto-save preferences: debounced 800ms after any change
	$effect(() => {
		// Capture all prefs fields to track them
		const snapshot = { ...prefs };
		if (!prefsLoaded || !email) return;

		if (prefsDebounceTimer) clearTimeout(prefsDebounceTimer);
		prefsDebounceTimer = setTimeout(async () => {
			try {
				await updateDoc(doc(db, 'users', email), { preferences: snapshot });
				prefsSyncMsg = '⚡ SETTINGS SYNCED';
				if (prefsSyncTimer) clearTimeout(prefsSyncTimer);
				prefsSyncTimer = setTimeout(() => (prefsSyncMsg = ''), 2500);
			} catch { /* silent */ }
		}, 800);
	});

	// ── Notifications: FCM permission flow ────────────────────────────────────

	let showPermissionContext = $state(false);

	async function handleRequestPermission() {
		showPermissionContext = false;
		await fcmService.requestAndRegister();
	}

	// ── Danger zone ───────────────────────────────────────────────────────────

	let resetSent = $state(false);
	let resetError = $state('');

	async function sendPasswordReset() {
		resetError = '';
		if (!email) return;
		try {
			await sendPasswordResetEmail(auth, email);
			resetSent = true;
		} catch (err: unknown) {
			resetError = err instanceof Error ? err.message : 'Reset failed.';
		}
	}
</script>

<!-- ── PAGE ROOT ──────────────────────────────────────────────────────────── -->
<div class="st-root">

	<!-- Terminal header -->
	<div class="st-header">
		<div class="st-header-left">
			<div class="st-header-dot"></div>
			<div>
				<div class="st-header-title">VANGUARD SETTINGS TERMINAL</div>
				<div class="st-header-meta">{email} · {role.toUpperCase()}</div>
			</div>
		</div>
		<div class="st-header-right">
			<span class="st-header-ref">UID:{uid.slice(0,8).toUpperCase()}</span>
		</div>
	</div>

	<!-- Tab rail -->
	<nav class="st-tabs" aria-label="Settings sections">
		{#each TABS as item (item.key)}
			{#if item.show}
				<button
					class="st-tab"
					class:st-tab--active={activeTab === item.key}
					class:st-tab--danger={item.key === 'danger' && activeTab !== 'danger'}
					onclick={() => (activeTab = item.key)}
					aria-selected={activeTab === item.key}
					role="tab"
				>{item.label}</button>
			{/if}
		{/each}
	</nav>

	<!-- ── PANEL: PROFILE ─────────────────────────────────────────────────── -->
	{#if activeTab === 'profile'}
		<div class="st-panel">

			<div class="st-section">
				<div class="st-section-label">IDENTITY MATRIX</div>
				<div class="st-info-grid">
					<div class="st-info-row"><span class="st-info-key">EMAIL</span><span class="st-info-val">{email || '—'}</span></div>
					<div class="st-info-row"><span class="st-info-key">ROLE</span><span class="st-info-val" style="color: #00ffff;">{role.toUpperCase()}</span></div>
					<div class="st-info-row"><span class="st-info-key">CLUB</span><span class="st-info-val">{clubLabel}</span></div>
					<div class="st-info-row"><span class="st-info-key">TEAM</span><span class="st-info-val">{teamLabel}</span></div>
					<div class="st-info-row"><span class="st-info-key">TENANT</span><span class="st-info-val" style="font-size:10px;">{tenantId || '—'}</span></div>
				</div>
			</div>

			<div class="st-section">
				<div class="st-section-label">DISPLAY NAME</div>
				{#if isOperativeProxy}
					<p class="st-hint">Call sign changes require parent approval. Use <a href="/operative/profile" class="st-link">Operative Profile</a>.</p>
					<input class="st-input" type="text" readonly value={String(profile?.playerName || playerName || '—')} />
				{:else}
					<input class="st-input" id="display-name" type="text" autocomplete="name" bind:value={playerName} placeholder="Display name…" />
				{/if}
			</div>

			{#if !isMinorAccount}
				<div class="st-section">
					<div class="st-section-label">PRIVACY PROFILE</div>
					<select class="st-input" bind:value={privacyProfile}>
						<option value="strict_minor_defaults">Strict defaults (recommended)</option>
						<option value="standard">Standard</option>
					</select>
				</div>

				<div class="st-section">
					<label class="st-checkbox-row">
						<input type="checkbox" bind:checked={telemetryOptIn} />
						<span>Allow optional telemetry & analytics sharing</span>
					</label>
				</div>
			{:else}
				<div class="st-section">
					<div class="st-hint st-hint--amber">
						⚠ Minor account — privacy is locked to strict defaults.
					</div>
				</div>
			{/if}

			{#if isPlayer && !isOperativeProxy}
				<div class="st-section">
					<div class="st-section-label">OPERATIVE AVATAR</div>
					<p class="st-hint">Vector portrait — only a compact seed is stored (no photo uploads).</p>
					<OperativeAvatarDesigner bind:operativeAvatar />
				</div>
			{/if}

			<div class="st-section">
				<div class="st-section-label">APPEARANCE</div>
				<div class="st-theme-row" role="group" aria-label="Theme">
					{#each THEME_OPTIONS as opt (opt.key)}
						<button
							class="st-theme-btn"
							class:st-theme-btn--active={themeStore.preference === opt.key}
							onclick={() => themeStore.setPreference(opt.key)}
						>{opt.label}</button>
					{/each}
				</div>
			</div>

			{#if profileError}
				<div class="st-error">⚠ {profileError}</div>
			{/if}
			{#if profileSaveMsg}
				<div class="st-success">✓ {profileSaveMsg}</div>
			{/if}

			<button class="st-action-btn" onclick={saveProfile} disabled={profileSaving}>
				{profileSaving ? '[ SYNCING... ]' : '[ SAVE PROFILE ]'}
			</button>
		</div>

	<!-- ── PANEL: NOTIFICATIONS ───────────────────────────────────────────── -->
	{:else if activeTab === 'notifications'}
		<div class="st-panel">

			<!-- FCM permission status -->
			<div class="st-section">
				<div class="st-section-label">DEVICE TELEMETRY UPLINK</div>

				{#if fcmService.permission === 'unsupported'}
					<div class="st-hint st-hint--amber">
						⚠ Web Push is not supported in this browser or the VAPID key is not configured.
					</div>

				{:else if fcmService.permission === 'denied'}
					<div class="st-permission-card st-permission-card--denied">
						<div class="st-permission-icon">⊘</div>
						<div>
							<div class="st-permission-title">UPLINK BLOCKED</div>
							<p class="st-permission-sub">
								Notification permission was denied. To re-enable, open your browser's
								site settings and allow notifications for this site.
							</p>
						</div>
					</div>

				{:else if fcmService.isGranted && fcmService.token}
					<div class="st-permission-card st-permission-card--active">
						<div class="st-permission-icon">◈</div>
						<div>
							<div class="st-permission-title">UPLINK ACTIVE</div>
							<p class="st-permission-sub">
								Device registered · Token: {fcmService.token.slice(0, 12)}…
							</p>
						</div>
					</div>

				{:else}
					<!-- Pre-prompt context card -->
					<div class="st-permission-card st-permission-card--pending">
						<div class="st-permission-icon">◇</div>
						<div>
							<div class="st-permission-title">UPLINK OFFLINE</div>
							<p class="st-permission-sub">
								Vanguard Protocol requires telemetry access for safety alerts (AEGIS weather),
								game reminders, and direct messages from your coaching staff.
								No marketing notifications are sent.
							</p>
						</div>
					</div>

					{#if showPermissionContext}
						<div class="st-context-box">
							<div class="st-context-label">TELEMETRY SCOPE</div>
							<ul class="st-context-list">
								<li>⛅ Weather & lightning safety alerts (AEGIS)</li>
								<li>🏟 Match day reminders (24h + 1h before kickoff)</li>
								<li>✉ Direct messages from coaches</li>
							</ul>
							<p class="st-context-note">You can disable any category below. This prompt authorises the browser only.</p>
							<div class="st-context-actions">
								<button class="st-action-btn" onclick={handleRequestPermission} disabled={fcmService.isRegistering}>
									{fcmService.isRegistering ? '[ AUTHORIZING... ]' : '[ AUTHORIZE TELEMETRY ]'}
								</button>
								<button class="st-ghost-btn" onclick={() => (showPermissionContext = false)}>CANCEL</button>
							</div>
						</div>
					{:else}
						<button class="st-action-btn" style="margin-top: 0.75rem;" onclick={() => (showPermissionContext = true)}>
							[ ENABLE PUSH NOTIFICATIONS ]
						</button>
					{/if}

					{#if fcmService.error}
						<div class="st-error">⚠ {fcmService.error}</div>
					{/if}
				{/if}
			</div>

			<!-- Notification matrix -->
			<div class="st-section">
				<div class="st-section-label">NOTIFICATION MATRIX</div>
				<p class="st-hint">Toggle each relay independently. Changes sync automatically.</p>

				<div class="st-matrix">
					{@render relayRow(
						'push_weatherAlerts',
						'WEATHER ALERTS',
						'AEGIS lightning and severe weather warnings. Recommended for coaches.',
						prefs.push_weatherAlerts,
						(v) => (prefs.push_weatherAlerts = v),
						!isMinorAccount,
					)}
					{@render relayRow(
						'push_gameReminders',
						'GAME REMINDERS',
						'24h and 1h before scheduled fixtures.',
						prefs.push_gameReminders,
						(v) => (prefs.push_gameReminders = v),
						true,
					)}
					{@render relayRow(
						'push_messages',
						'DIRECT MESSAGES',
						'Real-time messages from coaching staff.',
						prefs.push_messages,
						(v) => (prefs.push_messages = v),
						!isMinorAccount,
					)}
					{@render relayRow(
						'email_weeklyReport',
						'WEEKLY REPORT EMAIL',
						'Digest of XP gains, training stats, and season progress.',
						prefs.email_weeklyReport,
						(v) => (prefs.email_weeklyReport = v),
						!isMinorAccount,
					)}
				</div>

				{#if prefsSyncMsg}
					<div class="st-sync-flash">{prefsSyncMsg}</div>
				{/if}
			</div>
		</div>

	<!-- ── PANEL: OPERATIONS (director / coach) ───────────────────────────── -->
	{:else if activeTab === 'operations' && showOps}
		<div class="st-panel">
			<div class="st-section">
				<div class="st-section-label">BILLING & SUBSCRIPTION</div>
				<p class="st-hint">Manage your club's plan, payment method, and invoice history.</p>
				<a href="/upgrade" class="st-action-btn" style="text-decoration:none; display:inline-flex;">
					[ BILLING PORTAL ]
				</a>
			</div>

			<div class="st-section">
				<div class="st-section-label">ORGANISATION MANAGEMENT</div>
				<div class="st-link-grid">
					<a href="/director" class="st-link-card">
						<div class="st-link-card-title">MISSION CONTROL</div>
						<div class="st-link-card-sub">Roster, invites, season config</div>
					</a>
					<a href="/coach/tactical" class="st-link-card">
						<div class="st-link-card-title">WAR ROOM</div>
						<div class="st-link-card-sub">Tactical board, fixtures, facilities</div>
					</a>
					{#if isDirector}
						<a href="/admin/organizations" class="st-link-card">
							<div class="st-link-card-title">ADMIN CONSOLE</div>
							<div class="st-link-card-sub">Clubs, teams, global users</div>
						</a>
					{/if}
				</div>
			</div>

			<div class="st-section">
				<div class="st-section-label">STRIPE CONNECT</div>
				<p class="st-hint">Connect your club's bank account to receive season registration fees directly.</p>
				<a href="/director?stripe=onboard" class="st-ghost-btn" style="display:inline-flex; text-decoration:none;">
					[ CONNECT STRIPE ACCOUNT ]
				</a>
			</div>
		</div>

	<!-- ── PANEL: FAMILY UNIT (parent) ───────────────────────────────────── -->
	{:else if activeTab === 'family' && showFamily}
		<div class="st-panel">
			<div class="st-section">
				<div class="st-section-label">COPPA VERIFICATION STATUS</div>
				<div class="st-info-grid">
					<div class="st-info-row">
						<span class="st-info-key">VPC STATUS</span>
						<span class="st-info-val" style="color: {profile?.vpcVerified ? '#00ff88' : '#f59e0b'};">
							{profile?.vpcVerified ? '✓ VERIFIED' : '⚠ PENDING VERIFICATION'}
						</span>
					</div>
					<div class="st-info-row">
						<span class="st-info-key">HOUSEHOLD</span>
						<span class="st-info-val">{profile?.householdId ?? '—'}</span>
					</div>
				</div>
				{#if !profile?.vpcVerified}
					<div class="st-hint st-hint--amber">
						Your COPPA parental consent is pending. Check your email for the verification link
						or contact your club director.
					</div>
				{/if}
			</div>

			<div class="st-section">
				<div class="st-section-label">LINKED PLAYERS</div>
				{#if profile?.playerEmails?.length > 0}
					<div class="st-info-grid">
						{#each profile.playerEmails as playerEmail (playerEmail)}
							<div class="st-info-row">
								<span class="st-info-key">PLAYER</span>
								<span class="st-info-val">{playerEmail}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="st-hint">No players linked. Contact your club director to link your child's account.</p>
				{/if}
			</div>

			<div class="st-section">
				<div class="st-section-label" style="color: rgba(239,68,68,0.8);">MINOR DATA PROTOCOL</div>
				<p class="st-hint">
					To request deletion of a minor's data under COPPA, contact your club director
					or platform support. All data deletion requests are logged and audited.
				</p>
				<a
					href={`mailto:support@sstracker.app?subject=MINOR%20DATA%20DELETION&body=Tenant%20ID%3A%20${tenantId}%0AParent%20UID%3A%20${uid}%0ARequest%3A%20Delete%20minor%20data`}
					class="st-danger-btn"
					style="display:inline-flex; text-decoration:none;"
				>[ REQUEST DATA DELETION ]</a>
			</div>
		</div>

	<!-- ── PANEL: DANGER ZONE ─────────────────────────────────────────────── -->
	{:else if activeTab === 'danger'}
		<div class="st-panel">
			<div class="st-section">
				<div class="st-section-label" style="color: rgba(239,68,68,0.8);">PASSWORD RESET</div>
				<p class="st-hint">Send a password reset link to {email}.</p>
				{#if resetSent}
					<div class="st-success">✓ Reset link sent to {email}</div>
				{:else}
					<button class="st-danger-btn" onclick={sendPasswordReset}>
						[ SEND RESET LINK ]
					</button>
					{#if resetError}<div class="st-error">⚠ {resetError}</div>{/if}
				{/if}
			</div>

			<div class="st-section">
				<div class="st-section-label" style="color: rgba(239,68,68,0.8);">ANOMALY REPORT</div>
				<p class="st-hint">
					Found a data error? Use the ⚠ Report Anomaly button in the sidebar
					to send a pre-formatted correction request to the platform team.
				</p>
			</div>
		</div>
	{/if}
</div>

<!-- ── Circuit Breaker Relay Row ──────────────────────────────────────────── -->
{#snippet relayRow(
	key: string,
	label: string,
	description: string,
	value: boolean,
	onChange: (v: boolean) => void,
	enabled: boolean,
)}
	<div class="st-relay-row" class:st-relay-row--disabled={!enabled}>
		<div class="st-relay-info">
			<div class="st-relay-label">{label}</div>
			<div class="st-relay-desc">{description}</div>
		</div>
		<button
			class="st-relay"
			class:st-relay--on={value}
			class:st-relay--disabled={!enabled}
			onclick={() => { if (enabled) onChange(!value); }}
			role="switch"
			aria-checked={value}
			aria-label={label}
			disabled={!enabled}
			title={enabled ? (value ? 'Click to disable' : 'Click to enable') : 'Locked for minor accounts'}
		>
			<!-- Track segments — 4 "circuit" segments that light up left-to-right when ON -->
			{#each [0,1,2,3] as seg (seg)}
				<div
					class="st-relay-seg"
					class:st-relay-seg--lit={value && seg < 3}
					class:st-relay-seg--tip={seg === 3}
				></div>
			{/each}
			<!-- Knob -->
			<div class="st-relay-knob"></div>
			<!-- State label -->
			<span class="st-relay-state">{value ? 'ON' : 'OFF'}</span>
		</button>
	</div>
{/snippet}

<style>
	/* ── Root ─────────────────────────────────────────────────────────────── */
	.st-root {
		max-width: 740px;
		margin: 0 auto;
		font-family: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace;
		color: #e2e8f0;
	}

	/* ── Terminal Header ──────────────────────────────────────────────────── */
	.st-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 20px 12px;
		background: rgba(0, 8, 20, 0.9);
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-bottom: none;
		border-radius: 4px 4px 0 0;
	}
	.st-header-left { display: flex; align-items: center; gap: 12px; }
	.st-header-dot {
		width: 8px; height: 8px;
		border-radius: 50%;
		background: #00ffff;
		box-shadow: 0 0 8px #00ffff;
		animation: st-dot-pulse 2.5s ease-in-out infinite;
	}
	@keyframes st-dot-pulse {
		0%, 100% { opacity: 0.6; box-shadow: 0 0 6px #00ffff; }
		50%       { opacity: 1;   box-shadow: 0 0 16px #00ffff; }
	}
	.st-header-title {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(0, 255, 255, 0.9);
		text-shadow: 0 0 14px rgba(0, 255, 255, 0.4);
	}
	.st-header-meta {
		font-size: 9px;
		letter-spacing: 0.08em;
		color: rgba(0, 255, 255, 0.35);
		margin-top: 2px;
	}
	.st-header-right { display: flex; align-items: center; }
	.st-header-ref {
		font-size: 9px;
		letter-spacing: 0.12em;
		color: rgba(0, 255, 255, 0.2);
	}

	/* ── Tab Rail ─────────────────────────────────────────────────────────── */
	.st-tabs {
		display: flex;
		background: rgba(0, 6, 16, 0.95);
		border-left: 1px solid rgba(0, 255, 255, 0.15);
		border-right: 1px solid rgba(0, 255, 255, 0.15);
		border-bottom: 1px solid rgba(0, 255, 255, 0.12);
		overflow-x: auto;
	}
	.st-tab {
		flex-shrink: 0;
		padding: 10px 18px;
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(0, 255, 255, 0.35);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.st-tab:hover { color: rgba(0, 255, 255, 0.7); background: rgba(0, 255, 255, 0.04); }
	.st-tab--active {
		color: #00ffff;
		border-bottom-color: #00ffff;
		background: rgba(0, 255, 255, 0.06);
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
	}
	.st-tab--danger { color: rgba(239, 68, 68, 0.4); }
	.st-tab--danger:hover { color: rgba(239, 68, 68, 0.75); background: rgba(239, 68, 68, 0.04); }

	/* ── Panel ────────────────────────────────────────────────────────────── */
	.st-panel {
		background: rgba(0, 8, 20, 0.9);
		border: 1px solid rgba(0, 255, 255, 0.12);
		border-top: none;
		border-radius: 0 0 4px 4px;
		padding: 0;
	}

	/* ── Section ──────────────────────────────────────────────────────────── */
	.st-section {
		padding: 18px 20px;
		border-bottom: 1px solid rgba(0, 255, 255, 0.06);
	}
	.st-section:last-child { border-bottom: none; }

	.st-section-label {
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: rgba(0, 255, 255, 0.5);
		margin-bottom: 10px;
	}

	/* ── Info grid ────────────────────────────────────────────────────────── */
	.st-info-grid { display: flex; flex-direction: column; gap: 4px; }
	.st-info-row {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: 3px 0;
		border-bottom: 1px solid rgba(0, 255, 255, 0.04);
	}
	.st-info-row:last-child { border-bottom: none; }
	.st-info-key {
		font-size: 8px;
		letter-spacing: 0.18em;
		color: rgba(0, 255, 255, 0.35);
		min-width: 70px;
		flex-shrink: 0;
	}
	.st-info-val { font-size: 11px; color: rgba(0, 255, 255, 0.75); word-break: break-all; }

	/* ── Input / Select ───────────────────────────────────────────────────── */
	.st-input {
		width: 100%;
		padding: 8px 10px;
		font-family: inherit;
		font-size: 11px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(0, 255, 255, 0.18);
		border-radius: 2px;
		color: #e2e8f0;
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
		margin-top: 6px;
		/* Support dark color-scheme for native date/time pickers */
		color-scheme: dark;
	}
	.st-input:focus { border-color: rgba(0, 255, 255, 0.45); }

	/* ── Checkbox row ─────────────────────────────────────────────────────── */
	.st-checkbox-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: rgba(0, 255, 255, 0.6);
		cursor: pointer;
	}
	.st-checkbox-row input { accent-color: #00ffff; }

	/* ── Hints ────────────────────────────────────────────────────────────── */
	.st-hint {
		font-size: 10px;
		color: rgba(0, 255, 255, 0.35);
		line-height: 1.5;
		margin: 0 0 8px;
	}
	.st-hint--amber { color: rgba(251, 191, 36, 0.7); }

	/* ── Messages ─────────────────────────────────────────────────────────── */
	.st-error {
		font-size: 10px;
		color: #f87171;
		padding: 6px 10px;
		background: rgba(239, 68, 68, 0.07);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: 2px;
		margin-top: 8px;
	}
	.st-success {
		font-size: 10px;
		color: #4ade80;
		padding: 6px 10px;
		background: rgba(74, 222, 128, 0.07);
		border: 1px solid rgba(74, 222, 128, 0.25);
		border-radius: 2px;
		margin-top: 8px;
	}

	/* ── Buttons ──────────────────────────────────────────────────────────── */
	.st-action-btn {
		padding: 9px 20px;
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: #00ffff;
		background: rgba(0, 255, 255, 0.08);
		border: 1px solid rgba(0, 255, 255, 0.4);
		border-radius: 2px;
		cursor: pointer;
		transition: background 0.15s, box-shadow 0.15s;
		margin-top: 10px;
		min-height: 38px;
	}
	.st-action-btn:hover:not(:disabled) {
		background: rgba(0, 255, 255, 0.16);
		box-shadow: 0 0 14px rgba(0, 255, 255, 0.2);
	}
	.st-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
	.st-ghost-btn {
		padding: 7px 14px;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.16em;
		color: rgba(0, 255, 255, 0.4);
		background: transparent;
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-radius: 2px;
		cursor: pointer;
		margin-top: 10px;
		transition: color 0.15s;
	}
	.st-ghost-btn:hover { color: rgba(0, 255, 255, 0.7); }
	.st-danger-btn {
		padding: 9px 18px;
		font-family: inherit;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(239, 68, 68, 0.9);
		background: rgba(239, 68, 68, 0.06);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 2px;
		cursor: pointer;
		transition: background 0.15s;
		margin-top: 8px;
	}
	.st-danger-btn:hover { background: rgba(239, 68, 68, 0.13); }

	/* ── Theme picker ─────────────────────────────────────────────────────── */
	.st-theme-row { display: flex; gap: 4px; margin-top: 8px; }
	.st-theme-btn {
		flex: 1;
		padding: 7px;
		font-family: inherit;
		font-size: 8px;
		letter-spacing: 0.15em;
		background: transparent;
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-radius: 2px;
		color: rgba(0, 255, 255, 0.4);
		cursor: pointer;
		transition: all 0.15s;
	}
	.st-theme-btn--active {
		background: rgba(0, 255, 255, 0.1);
		border-color: rgba(0, 255, 255, 0.5);
		color: #00ffff;
	}

	/* ── FCM Permission cards ─────────────────────────────────────────────── */
	.st-permission-card {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 12px 14px;
		border-radius: 3px;
		margin-bottom: 10px;
	}
	.st-permission-card--pending {
		background: rgba(0, 255, 255, 0.03);
		border: 1px solid rgba(0, 255, 255, 0.12);
	}
	.st-permission-card--active {
		background: rgba(0, 255, 136, 0.05);
		border: 1px solid rgba(0, 255, 136, 0.25);
	}
	.st-permission-card--denied {
		background: rgba(239, 68, 68, 0.04);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}
	.st-permission-icon {
		font-size: 20px;
		color: rgba(0, 255, 255, 0.4);
		flex-shrink: 0;
		margin-top: 2px;
	}
	.st-permission-title { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: rgba(0, 255, 255, 0.8); margin-bottom: 4px; }
	.st-permission-sub { font-size: 10px; color: rgba(0, 255, 255, 0.4); margin: 0; line-height: 1.5; }

	.st-context-box {
		background: rgba(0, 255, 255, 0.04);
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-radius: 3px;
		padding: 14px;
		margin-top: 8px;
	}
	.st-context-label { font-size: 8px; letter-spacing: 0.22em; color: rgba(0, 255, 255, 0.45); margin-bottom: 8px; }
	.st-context-list { margin: 0 0 8px 0; padding-left: 1.2em; font-size: 10px; color: rgba(0, 255, 255, 0.55); line-height: 1.8; }
	.st-context-note { font-size: 9px; color: rgba(0, 255, 255, 0.3); margin: 0 0 10px; }
	.st-context-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

	/* ── Notification Matrix ──────────────────────────────────────────────── */
	.st-matrix { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; }

	.st-relay-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(0, 255, 255, 0.07);
		border-radius: 2px;
		gap: 12px;
		transition: background 0.15s;
	}
	.st-relay-row:hover { background: rgba(0, 255, 255, 0.03); }
	.st-relay-row--disabled { opacity: 0.4; }

	.st-relay-info { flex: 1; min-width: 0; }
	.st-relay-label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(0, 255, 255, 0.8); margin-bottom: 2px; }
	.st-relay-desc { font-size: 9px; color: rgba(0, 255, 255, 0.3); line-height: 1.4; }

	/* ── Circuit Breaker / Relay toggle ───────────────────────────────────── */
	.st-relay {
		position: relative;
		display: flex;
		align-items: center;
		width: 68px;
		height: 26px;
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(0, 255, 255, 0.15);
		border-radius: 2px;
		cursor: pointer;
		padding: 3px 4px;
		gap: 2px;
		transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
		overflow: hidden;
	}
	.st-relay:focus-visible { outline: 1px solid rgba(0, 255, 255, 0.6); }
	.st-relay--on {
		background: rgba(0, 255, 255, 0.08);
		border-color: rgba(0, 255, 255, 0.5);
		box-shadow: 0 0 12px rgba(0, 255, 255, 0.18), inset 0 0 8px rgba(0, 255, 255, 0.04);
	}
	.st-relay--disabled { cursor: not-allowed; }

	/* Segment "teeth" — decorative circuit indicators */
	.st-relay-seg {
		width: 8px;
		height: 12px;
		border-radius: 1px;
		background: rgba(0, 255, 255, 0.1);
		border: 1px solid rgba(0, 255, 255, 0.12);
		transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
		flex-shrink: 0;
	}
	.st-relay-seg--lit {
		background: rgba(0, 255, 255, 0.35);
		border-color: rgba(0, 255, 255, 0.5);
		box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
	}
	/* Tip segment — the "live contact" indicator */
	.st-relay-seg--tip {
		width: 6px;
		height: 14px;
		margin-left: 1px;
	}
	.st-relay--on .st-relay-seg--tip {
		background: #00ffff;
		border-color: #00ffff;
		box-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
	}

	/* Knob — slides right when ON */
	.st-relay-knob {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		width: 6px;
		height: 18px;
		background: rgba(0, 255, 255, 0.2);
		border: 1px solid rgba(0, 255, 255, 0.3);
		border-radius: 1px;
		transition: background 0.2s, box-shadow 0.2s;
	}
	.st-relay--on .st-relay-knob {
		background: #00ffff;
		box-shadow: 0 0 8px rgba(0, 255, 255, 0.7);
	}

	/* State label */
	.st-relay-state {
		position: absolute;
		right: 15px;
		font-size: 7px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(0, 255, 255, 0.25);
		pointer-events: none;
	}
	.st-relay--on .st-relay-state { color: rgba(0, 255, 255, 0.5); }

	/* ── Sync flash ───────────────────────────────────────────────────────── */
	.st-sync-flash {
		margin-top: 10px;
		font-size: 9px;
		letter-spacing: 0.18em;
		color: #00ff88;
		text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
		animation: st-flash 0.3s ease-out;
	}
	@keyframes st-flash {
		from { opacity: 0; transform: translateY(-4px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Operations: link grid ────────────────────────────────────────────── */
	.st-link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin-top: 8px; }
	.st-link-card {
		padding: 12px;
		background: rgba(0, 255, 255, 0.03);
		border: 1px solid rgba(0, 255, 255, 0.12);
		border-radius: 3px;
		text-decoration: none;
		transition: background 0.15s, border-color 0.15s;
	}
	.st-link-card:hover { background: rgba(0, 255, 255, 0.07); border-color: rgba(0, 255, 255, 0.28); }
	.st-link-card-title { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(0, 255, 255, 0.8); margin-bottom: 3px; }
	.st-link-card-sub { font-size: 9px; color: rgba(0, 255, 255, 0.3); line-height: 1.4; }

	.st-link { color: rgba(0, 255, 255, 0.7); text-decoration: underline; }
</style>
