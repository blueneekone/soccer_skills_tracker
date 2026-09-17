<script lang="ts">
	import { untrack } from 'svelte';
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

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { UnlinkPhoneVerificationInput, UnlinkPhoneVerificationResult } from '$lib/types/phoneVerification.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import { fcmService } from '$lib/services/messaging.svelte.js';
	import {
		computeIsMinorAccount,
		computeIsOperativeProxy,
		getPrefsDefaults,
		loadUserPreferences,
		saveProfile as saveProfileHandler,
		saveUserPreferences,
		sendPasswordReset as sendPasswordResetHandler,
		type UserPreferences,
	} from '$lib/settings/playerSettingsHandlers.js';

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

	const isOperativeProxy = $derived(computeIsOperativeProxy(email, role));
	const isMinorAccount = $derived(computeIsMinorAccount(profile));

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (role === 'player') {
   untrack(() => {
     void goto('/player/settings', { replaceState: true });
   });
		}
	});

	// ── Profile tab state ─────────────────────────────────────────────────────

	let playerName  = $state('');
	let privacyProfile = $state('strict_minor_defaults');
	let telemetryOptIn = $state(false);
	let profileError = $state('');
	let profileSaveMsg = $state('');
	let profileSaving = $state(false);

	// ── Phone Verification state (Phase 2, Epic 3) ────────────────────────────

	let phoneUnlinking  = $state(false);
	let phoneUnlinkError = $state('');
	const unlinkPhoneFn = httpsCallable<UnlinkPhoneVerificationInput, UnlinkPhoneVerificationResult>(
		functions,
		'unlinkPhoneVerification',
	);

	async function handleUnlinkPhone() {
		if (!confirm('Remove your verified phone number from this account?')) return;
		phoneUnlinking   = true;
		phoneUnlinkError = '';
		try {
			await unlinkPhoneFn({});
			// Refresh the auth store so phoneVerified + phoneNumber update.
			await authStore.refresh({ silent: true });
		} catch (err: unknown) {
			phoneUnlinkError = (err instanceof Error ? err.message : null) ?? 'Failed to unlink phone.';
		} finally {
			phoneUnlinking = false;
		}
	}
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
	});

	async function saveProfile() {
		profileError = '';
		profileSaveMsg = '';
		profileSaving = true;
		const result = await saveProfileHandler({
			playerName,
			privacyProfile,
			telemetryOptIn,
			isMinorAccount,
			profile,
			email,
			role,
		});
		profileSaving = false;
		if (result.error) {
			profileError = result.error;
			return;
		}
		await authStore.refresh({ silent: true });
		profileSaveMsg = 'PROFILE UPDATED';
	}

	// ── Notifications tab state ────────────────────────────────────────────────

	const prefsDefaults = $derived(getPrefsDefaults(role));

	let prefs = $state<UserPreferences>({
		push_weatherAlerts: false,
		push_gameReminders: true,
		push_messages: true,
		email_weeklyReport: false,
	});

	let prefsSyncMsg = $state('');
	let prefsSyncTimer: ReturnType<typeof setTimeout> | null = null;
	let prefsLoaded = $state(false);
	let prefsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		fcmService.init();
		if (!email) return;
		(async () => {
			prefs = await loadUserPreferences(email, prefsDefaults);
			prefsLoaded = true;
		})();
	});

	$effect(() => {
		const snapshot = { ...prefs };
		if (!prefsLoaded || !email) return;

		if (prefsDebounceTimer) clearTimeout(prefsDebounceTimer);
		prefsDebounceTimer = setTimeout(async () => {
			try {
				await saveUserPreferences(email, snapshot);
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
		const result = await sendPasswordResetHandler(email);
		if (result.error) {
			resetError = result.error;
			return;
		}
		resetSent = true;
	}
</script>

<!-- ── PAGE ROOT ──────────────────────────────────────────────────────────── -->
{#if role === 'player'}
	<!-- Redirecting to /player/settings -->
{:else}
<div class="pd-page-root tw-w-full tw-max-w-4xl tw-mx-auto tw-p-4 md:tw-p-6">

	<div class="pd-content-wrap">
	<!-- Terminal header -->
	<div class="tw-flex tw-flex-col md:tw-flex-row md:tw-items-center tw-justify-between tw-mb-8 tw-gap-4">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-[#14b8a6] tw-animate-pulse"></div>
			<div>
				<div class="tw-text-xl tw-font-bold tw-text-[#FAFAFA]">VANGUARD SETTINGS TERMINAL</div>
				<div class="tw-text-xs tw-font-mono tw-text-[#f59e0b]">{email} · {role.toUpperCase()}</div>
			</div>
		</div>
		<div class="st-header-right">
			<span class="tw-text-[10px] tw-font-mono tw-text-[#94A3B8]">UID:{uid.slice(0,8).toUpperCase()}</span>
		</div>
	</div>

	<!-- Tab rail -->
	<nav class="tw-flex tw-gap-2 tw-overflow-x-auto tw-mb-6 tw-pb-2 tw-border-b tw-border-[#334155]" aria-label="Settings sections">
		{#each TABS as item (item.key)}
			{#if item.show}
				<button
					class="tw-px-4 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#94A3B8] hover:tw-text-[#f59e0b] tw-whitespace-nowrap tw-transition-colors"
					class:tw-text-[#f59e0b]={activeTab === item.key}
					class:tw-border-b-2={activeTab === item.key}
					class:tw-border-[#f59e0b]={activeTab === item.key}
					class:tw-text-red-400={item.key === 'danger' && activeTab !== 'danger'}
					class:hover:tw-text-red-300={item.key === 'danger' && activeTab !== 'danger'}
					onclick={() => (activeTab = item.key)}
					aria-selected={activeTab === item.key}
					role="tab"
				>{item.label}</button>
			{/if}
		{/each}
	</nav>

	<!-- ── PANEL: PROFILE ─────────────────────────────────────────────────── -->
	{#if activeTab === 'profile'}
		<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-gap-6 tw-mb-6">

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">IDENTITY MATRIX</div>
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-font-mono">
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]"><span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">EMAIL</span><span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{email || '—'}</span></div>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]"><span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">ROLE</span><span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]" style="color: #14b8a6;">{role.toUpperCase()}</span></div>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]"><span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">CLUB</span><span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{clubLabel}</span></div>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]"><span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">TEAM</span><span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{teamLabel}</span></div>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]"><span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">TENANT</span><span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]" style="font-size:10px;">{tenantId || '—'}</span></div>
				</div>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">DISPLAY NAME</div>
				{#if isOperativeProxy}
					<p class="tw-text-xs tw-text-[#94A3B8]">Call sign changes require parent approval. Use <a href="/operative/profile" class="st-link">Operative Profile</a>.</p>
					<input class="vanguard-input tw-w-full" type="text" readonly value={String(profile?.playerName || playerName || '—')} />
				{:else}
					<input class="vanguard-input tw-w-full" id="display-name" type="text" autocomplete="name" bind:value={playerName} placeholder="Display name…" />
				{/if}
			</div>

			{#if !isMinorAccount}
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">PRIVACY PROFILE</div>
					<select class="vanguard-input tw-w-full" bind:value={privacyProfile}>
						<option value="strict_minor_defaults">Strict defaults (recommended)</option>
						<option value="standard">Standard</option>
					</select>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-4">
					<label class="st-checkbox-row">
						<input type="checkbox" bind:checked={telemetryOptIn} />
						<span>Allow optional telemetry & analytics sharing</span>
					</label>
				</div>
			{:else}
				<div class="tw-flex tw-flex-col tw-gap-4">
					<div class="tw-text-xs tw-text-[#f59e0b]">
						⚠ Minor account — privacy is locked to strict defaults.
					</div>
				</div>
			{/if}

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">APPEARANCE</div>
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

		<!-- ── Phone Verification Bento card (Phase 2, Epic 3) ────────────── -->
		{#if !isMinorAccount}
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">PHONE VERIFICATION</div>
				<div class="phone-card">
					{#if authStore.phoneVerified && authStore.phoneNumber}
						<div class="phone-verified-row">
							<span class="phone-verified-badge">✓ VERIFIED</span>
							<span class="phone-ending">·· {authStore.phoneNumber.slice(-4)}</span>
						</div>
						<button
							class="tw-vanguard-btn-primary st-action-btn--danger"
							onclick={handleUnlinkPhone}
							disabled={phoneUnlinking}
						>
							{phoneUnlinking ? '[ UNLINKING… ]' : '[ UNLINK PHONE ]'}
						</button>
						{#if phoneUnlinkError}
							<div class="tw-text-xs tw-text-red-400 tw-font-mono">⚠ {phoneUnlinkError}</div>
						{/if}
					{:else}
						<p class="tw-text-xs tw-text-[#94A3B8]">
							Link a verified mobile number for enhanced account security.
							Your number is never shared or displayed in full.
						</p>
						<a href="/account/settings/phone" class="tw-vanguard-btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">
							⚡ ADD PHONE NUMBER
						</a>
					{/if}
				</div>
			</div>
		{/if}

		{#if profileError}
			<div class="tw-text-xs tw-text-red-400 tw-font-mono">⚠ {profileError}</div>
		{/if}
		{#if profileSaveMsg}
			<div class="tw-text-xs tw-text-[#2dd4bf] tw-font-mono">✓ {profileSaveMsg}</div>
		{/if}

		<button class="tw-vanguard-btn-primary" onclick={saveProfile} disabled={profileSaving}>
			{profileSaving ? '[ SYNCING... ]' : '[ SAVE PROFILE ]'}
		</button>
	</div>

	<!-- ── PANEL: NOTIFICATIONS ───────────────────────────────────────────── -->
	{:else if activeTab === 'notifications'}
		<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-gap-6 tw-mb-6">

			<!-- FCM permission status -->
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">DEVICE TELEMETRY UPLINK</div>

				{#if fcmService.permission === 'unsupported'}
					<div class="tw-text-xs tw-text-[#f59e0b]">
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
							<div class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-[#94A3B8] tw-mb-2">TELEMETRY SCOPE</div>
							<ul class="st-context-list">
								<li>⛅ Weather & lightning safety alerts (AEGIS)</li>
								<li>🏟 Match day reminders (24h + 1h before kickoff)</li>
								<li>✉ Direct messages from coaches</li>
							</ul>
							<p class="st-context-note">You can disable any category below. This prompt authorises the browser only.</p>
							<div class="st-context-actions">
								<button class="tw-vanguard-btn-primary" onclick={handleRequestPermission} disabled={fcmService.isRegistering}>
									{fcmService.isRegistering ? '[ AUTHORIZING... ]' : '[ AUTHORIZE TELEMETRY ]'}
								</button>
								<button class="tw-vanguard-btn-secondary" onclick={() => (showPermissionContext = false)}>CANCEL</button>
							</div>
						</div>
					{:else}
						<button class="tw-vanguard-btn-primary" style="margin-top: 0.75rem;" onclick={() => (showPermissionContext = true)}>
							[ ENABLE PUSH NOTIFICATIONS ]
						</button>
					{/if}

					{#if fcmService.error}
						<div class="tw-text-xs tw-text-red-400 tw-font-mono">⚠ {fcmService.error}</div>
					{/if}
				{/if}
			</div>

			<!-- Notification matrix -->
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">NOTIFICATION MATRIX</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">Toggle each relay independently. Changes sync automatically.</p>

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
					<div class="tw-text-xs tw-font-bold tw-text-[#7dff9a] tw-tracking-widest">{prefsSyncMsg}</div>
				{/if}
			</div>
		</div>

	<!-- ── PANEL: OPERATIONS (director / coach) ───────────────────────────── -->
	{:else if activeTab === 'operations' && showOps}
		<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-gap-6 tw-mb-6">
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">BILLING & SUBSCRIPTION</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">Manage your club's plan, payment method, and invoice history.</p>
			<a href="/upgrade" class="tw-vanguard-btn-primary tw-no-underline tw-inline-flex">
				[ BILLING PORTAL ]
			</a>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">ORGANISATION MANAGEMENT</div>
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-font-mono">
					<a href="/director/dashboard" class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] hover:tw-border-[#f59e0b] tw-transition-colors tw-no-underline">
						<div class="tw-text-sm tw-font-bold tw-text-[#f59e0b]">MISSION CONTROL</div>
						<div class="tw-text-xs tw-text-[#94A3B8]">Roster, invites, season config</div>
					</a>
					<a href="/coach/tactical" class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] hover:tw-border-[#f59e0b] tw-transition-colors tw-no-underline">
						<div class="tw-text-sm tw-font-bold tw-text-[#f59e0b]">WAR ROOM</div>
						<div class="tw-text-xs tw-text-[#94A3B8]">Tactical board, fixtures, facilities</div>
					</a>
					{#if isDirector}
						<a href="/admin/organizations" class="tw-flex tw-flex-col tw-gap-1 tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] hover:tw-border-[#f59e0b] tw-transition-colors tw-no-underline">
							<div class="tw-text-sm tw-font-bold tw-text-[#f59e0b]">ADMIN CONSOLE</div>
							<div class="tw-text-xs tw-text-[#94A3B8]">Clubs, teams, global users</div>
						</a>
					{/if}
				</div>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">STRIPE CONNECT</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">Connect your club's bank account to receive season registration fees directly.</p>
			<a href="/director?stripe=onboard" class="tw-vanguard-btn-secondary tw-inline-flex tw-no-underline">
				[ CONNECT STRIPE ACCOUNT ]
			</a>
			</div>
		</div>

	<!-- ── PANEL: FAMILY UNIT (parent) ───────────────────────────────────── -->
	{:else if activeTab === 'family' && showFamily}
		<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-gap-6 tw-mb-6">
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">COPPA VERIFICATION STATUS</div>
				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-font-mono">
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">VPC STATUS</span>
						<span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]" style="color: {profile?.vpcVerified ? '#2dd4bf' : '#f59e0b'};">
							{profile?.vpcVerified ? '✓ VERIFIED' : '⚠ PENDING VERIFICATION'}
						</span>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]">
						<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">HOUSEHOLD</span>
						<span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{profile?.householdId ?? '—'}</span>
					</div>
				</div>
				{#if !profile?.vpcVerified}
					<div class="tw-text-xs tw-text-[#f59e0b]">
						Your COPPA parental consent is pending. Check your email for the verification link
						or contact your club director.
					</div>
				{/if}
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]">LINKED PLAYERS</div>
				{#if profile?.playerEmails?.length > 0}
					<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4 tw-font-mono">
						{#each profile.playerEmails as playerEmail (playerEmail)}
							<div class="tw-flex tw-flex-col tw-gap-1 tw-p-3 tw-bg-[#000000] tw-border tw-border-[#334155]">
								<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">PLAYER</span>
								<span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{playerEmail}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="tw-text-xs tw-text-[#94A3B8]">No players linked. Contact your club director to link your child's account.</p>
				{/if}
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]" style="color: rgba(239,68,68,0.8);">MINOR DATA PROTOCOL</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">
					To request deletion of a minor's data under COPPA, contact your club director
					or platform support. All data deletion requests are logged and audited.
				</p>
			<a
				href={`mailto:support@sstracker.app?subject=MINOR%20DATA%20DELETION&body=Tenant%20ID%3A%20${tenantId}%0AParent%20UID%3A%20${uid}%0ARequest%3A%20Delete%20minor%20data`}
				class="tw-vanguard-btn-secondary tw-border-red-500 tw-text-red-400 tw-inline-flex tw-no-underline"
			>[ REQUEST DATA DELETION ]</a>
			</div>
		</div>

	<!-- ── PANEL: DANGER ZONE ─────────────────────────────────────────────── -->
	{:else if activeTab === 'danger'}
		<div class="z2-panel siem-panel st-bento tw-p-[clamp(16px,3vw,24px)] tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col tw-gap-6 tw-mb-6">
			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]" style="color: rgba(239,68,68,0.8);">PASSWORD RESET</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">Send a password reset link to {email}.</p>
				{#if resetSent}
					<div class="tw-text-xs tw-text-[#2dd4bf] tw-font-mono">✓ Reset link sent to {email}</div>
				{:else}
					<button class="tw-vanguard-btn-secondary tw-border-red-500 tw-text-red-400" onclick={sendPasswordReset}>
						[ SEND RESET LINK ]
					</button>
					{#if resetError}<div class="tw-text-xs tw-text-red-400 tw-font-mono">⚠ {resetError}</div>{/if}
				{/if}
			</div>

			<div class="tw-flex tw-flex-col tw-gap-4">
				<div class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#f59e0b]" style="color: rgba(239,68,68,0.8);">ANOMALY REPORT</div>
				<p class="tw-text-xs tw-text-[#94A3B8]">
					Found a data error? Use the Report Anomaly button in the sidebar
					to send a pre-formatted correction request to the platform team.
				</p>
			</div>
		</div>
	{/if}
	</div>
</div>
{/if}

<!-- ── Circuit Breaker Relay Row ──────────────────────────────────────────── -->
{#snippet relayRow(
	key: string,
	label: string,
	description: string,
	value: boolean,
	onChange: (v: boolean) => void,
	enabled: boolean,
)}
	<div class="tw-flex tw-items-center tw-justify-between tw-p-4 tw-bg-[#000000] tw-border tw-border-[#334155] tw-mb-2" class:st-relay-row--disabled={!enabled}>
		<div class="tw-flex tw-flex-col tw-gap-1">
			<div class="tw-text-sm tw-font-bold tw-text-[#FAFAFA]">{label}</div>
			<div class="tw-text-xs tw-text-[#94A3B8]">{description}</div>
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

