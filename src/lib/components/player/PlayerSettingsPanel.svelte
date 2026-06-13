<script lang="ts">
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { themeStore } from '$lib/stores/theme.svelte.js';
	import { fcmService } from '$lib/services/messaging.svelte.js';
	import OperativeAvatarPreview from '$lib/components/player/OperativeAvatarPreview.svelte';
	import PlayerOsButton from '$lib/components/player/os/PlayerOsButton.svelte';
	import PlayerOsInput from '$lib/components/player/os/PlayerOsInput.svelte';
	import PlayerOsSelect from '$lib/components/player/os/PlayerOsSelect.svelte';
	import PlayerOsTabRail from '$lib/components/player/os/PlayerOsTabRail.svelte';
	import PlayerOsToggle from '$lib/components/player/os/PlayerOsToggle.svelte';
	import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
	import type { UnlinkPhoneVerificationInput, UnlinkPhoneVerificationResult } from '$lib/types/phoneVerification.js';
	import {
		computeIsMinorAccount,
		computeIsOperativeProxy,
		getPrefsDefaults,
		loadUserPreferences,
		saveProfile,
		saveUserPreferences,
		sendPasswordReset,
		type UserPreferences,
	} from '$lib/settings/playerSettingsHandlers.js';

	type Tab = 'profile' | 'notifications' | 'danger';

	const TABS: Array<{ key: Tab; label: string }> = [
		{ key: 'profile', label: 'Profile' },
		{ key: 'notifications', label: 'Notifications' },
		{ key: 'danger', label: 'Danger' },
	];

	const THEME_OPTIONS: Array<{ key: 'system' | 'dark' | 'light'; label: string }> = [
		{ key: 'system', label: 'System' },
		{ key: 'dark', label: 'Dark' },
		{ key: 'light', label: 'Light' },
	];

	let activeTab = $state<Tab>('profile');

	const profile = $derived(authStore.userProfile);
	const role = $derived(authStore.role ?? 'player');
	const email = $derived((authStore.user?.email ?? '').toLowerCase());
	const uid = $derived(authStore.user?.uid ?? '');
	const tenantId = $derived(authStore.tenantId ?? profile?.clubId ?? '');

	const isOperativeProxy = $derived(computeIsOperativeProxy(email, role));
	const isMinorAccount = $derived(computeIsMinorAccount(profile));

	const clubLabel = $derived.by(() => {
		const cid = profile?.clubId;
		if (!cid) return '—';
		const c = teamsStore.clubs.find((x) => x.id === cid);
		return c ? c.name || c.id : cid;
	});

	const teamLabel = $derived.by(() => {
		const tid = profile?.teamId;
		if (!tid || tid === 'admin') return '—';
		const t = teamsStore.teams.find((x) => x.id === tid);
		return t ? t.name || t.id : tid;
	});

	let playerName = $state('');
	let privacyProfile = $state('strict_minor_defaults');
	let telemetryOptIn = $state(false);
	let profileError = $state('');
	let profileSaveMsg = $state('');
	let profileSaving = $state(false);

	$effect(() => {
		if (!profile) return;
		playerName = String(profile.playerName ?? '');
		privacyProfile = String(profile.privacyProfile ?? 'strict_minor_defaults');
		telemetryOptIn = Boolean(profile.telemetryOptIn);
		if (isMinorAccount) {
			privacyProfile = 'strict_minor_defaults';
			telemetryOptIn = false;
		}
	});

	async function handleSaveProfile() {
		profileError = '';
		profileSaveMsg = '';
		profileSaving = true;
		const result = await saveProfile({
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
		profileSaveMsg = result.message ?? 'Profile updated';
	}

	let phoneUnlinking = $state(false);
	let phoneUnlinkError = $state('');
	let unlinkConfirmOpen = $state(false);
	const unlinkPhoneFn = httpsCallable<UnlinkPhoneVerificationInput, UnlinkPhoneVerificationResult>(
		functions,
		'unlinkPhoneVerification',
	);

	function requestUnlinkPhone() {
		unlinkConfirmOpen = true;
	}

	function cancelUnlinkPhone() {
		unlinkConfirmOpen = false;
	}

	async function confirmUnlinkPhone() {
		unlinkConfirmOpen = false;
		phoneUnlinking = true;
		phoneUnlinkError = '';
		try {
			await unlinkPhoneFn({});
			await authStore.refresh({ silent: true });
		} catch (err: unknown) {
			phoneUnlinkError = (err instanceof Error ? err.message : null) ?? 'Failed to unlink phone.';
		} finally {
			phoneUnlinking = false;
		}
	}

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
				prefsSyncMsg = 'Settings synced';
				if (prefsSyncTimer) clearTimeout(prefsSyncTimer);
				prefsSyncTimer = setTimeout(() => (prefsSyncMsg = ''), 2500);
			} catch {
				/* silent */
			}
		}, 800);
	});

	let showPermissionContext = $state(false);

	async function handleRequestPermission() {
		showPermissionContext = false;
		await fcmService.requestAndRegister();
	}

	let resetSent = $state(false);
	let resetError = $state('');
	let signingOut = $state(false);

	async function handlePasswordReset() {
		resetError = '';
		const result = await sendPasswordReset(email);
		if (result.error) {
			resetError = result.error;
			return;
		}
		resetSent = true;
	}

	async function handleDisconnect() {
		if (signingOut) return;
		signingOut = true;
		try {
			await handleSignOut();
		} finally {
			signingOut = false;
		}
	}

	const armoryStudioHref = '/player/armory?tab=studio';
</script>

<PlayerOsTabRail
	tabs={TABS.map((t) => ({ ...t, danger: t.key === 'danger' }))}
	active={activeTab}
	onSelect={(key) => (activeTab = key as Tab)}
	ariaLabel="Settings sections"
/>

{#if activeTab === 'profile'}
	<div class="ps-settings-panel pd-os-deck">
		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Account</span>
			<div class="ps-settings-info-grid">
				<div class="ps-settings-info-row">
					<span class="ps-settings-info-row__label">Email</span>
					<span class="ps-settings-info-row__value">{email || '—'}</span>
				</div>
				<div class="ps-settings-info-row">
					<span class="ps-settings-info-row__label">Role</span>
					<span class="ps-settings-info-row__value ps-settings-info-row__value--accent">{role.toUpperCase()}</span>
				</div>
				<div class="ps-settings-info-row">
					<span class="ps-settings-info-row__label">Club</span>
					<span class="ps-settings-info-row__value">{clubLabel}</span>
				</div>
				<div class="ps-settings-info-row">
					<span class="ps-settings-info-row__label">Team</span>
					<span class="ps-settings-info-row__value">{teamLabel}</span>
				</div>
			</div>
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Compliance</span>
			<p class="ps-settings-hint">
				Medical info, emergency contacts, and waiver —
				<a href="/passport" class="ps-settings-link">Player passport</a>.
			</p>
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Display name</span>
			{#if isOperativeProxy}
				<p class="ps-settings-hint">
					Call sign changes require parent approval. Use
					<a href="/operative/profile" class="ps-settings-link">Operative profile</a>.
				</p>
				<PlayerOsInput
					type="text"
					readonly
					value={String(profile?.playerName || playerName || '—')}
				/>
			{:else}
				<PlayerOsInput
					id="display-name"
					type="text"
					autocomplete="name"
					bind:value={playerName}
					placeholder="Display name…"
				/>
			{/if}
		</section>

		{#if !isMinorAccount}
			<section class="pd-panel-section">
				<span class="pd-panel-eyebrow">Privacy</span>
				<PlayerOsSelect bind:value={privacyProfile}>
					<option value="strict_minor_defaults">Strict defaults (recommended)</option>
					<option value="standard">Standard</option>
				</PlayerOsSelect>
			</section>

			<section class="pd-panel-section ps-settings-toggle-row">
				<div class="ps-settings-relay-row__info">
					<div class="ps-settings-relay-row__label">Telemetry sharing</div>
					<div class="ps-settings-relay-row__desc">
						Allow optional telemetry and analytics sharing.
					</div>
				</div>
				<PlayerOsToggle
					label="Telemetry sharing"
					checked={telemetryOptIn}
					onchange={(v) => (telemetryOptIn = v)}
				/>
			</section>
		{:else}
			<section class="pd-panel-section">
				<p class="ps-settings-hint ps-settings-hint--amber">
					Minor account — privacy is locked to strict defaults.
				</p>
			</section>
		{/if}

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Operative avatar</span>
			<p class="ps-settings-hint">Portrait design lives in Armory Studio — only a compact seed is stored.</p>
			<div class="ps-settings-avatar-summary">
				<div class="ps-settings-avatar-preview">
					<OperativeAvatarPreview />
				</div>
				<PlayerOsButton variant="ghost" href={armoryStudioHref}>Edit in Studio</PlayerOsButton>
			</div>
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Appearance</span>
			<div class="ps-settings-theme-row" role="group" aria-label="Theme">
				{#each THEME_OPTIONS as opt (opt.key)}
					<PlayerOsButton
						variant={themeStore.preference === opt.key ? 'data' : 'ghost'}
						class={themeStore.preference === opt.key ? 'pd-os-btn--theme-active' : ''}
						onclick={() => themeStore.setPreference(opt.key)}
					>
						{opt.label}
					</PlayerOsButton>
				{/each}
			</div>
		</section>

		{#if !isMinorAccount}
			<section class="pd-panel-section">
				<span class="pd-panel-eyebrow">Phone verification</span>
				<div class="ps-settings-phone-card">
					{#if authStore.phoneVerified && authStore.phoneNumber}
						<div class="ps-settings-phone-verified">
							<span class="ps-settings-phone-badge">Verified</span>
							<span class="ps-settings-phone-ending">·· {authStore.phoneNumber.slice(-4)}</span>
						</div>
						<PlayerOsButton
							variant="danger"
							onclick={requestUnlinkPhone}
							disabled={phoneUnlinking}
						>
							{phoneUnlinking ? 'Unlinking…' : 'Unlink phone'}
						</PlayerOsButton>
						{#if phoneUnlinkError}
							<div class="ps-settings-error">{phoneUnlinkError}</div>
						{/if}
					{:else}
						<p class="ps-settings-hint">
							Link a verified mobile number for enhanced account security. Your number is never
							shared or displayed in full.
						</p>
						<PlayerOsButton variant="data" href="/account/settings/phone">
							Add phone number
						</PlayerOsButton>
					{/if}
				</div>
			</section>
		{/if}

		{#if profileError}
			<div class="ps-settings-error">{profileError}</div>
		{/if}
		{#if profileSaveMsg}
			<div class="ps-settings-success">{profileSaveMsg}</div>
		{/if}

		<div class="ps-settings-actions">
			<PlayerOsButton variant="primary" onclick={handleSaveProfile} disabled={profileSaving}>
				{profileSaving ? 'Syncing…' : 'Save profile'}
			</PlayerOsButton>
		</div>
	</div>

{:else if activeTab === 'notifications'}
	<div class="ps-settings-panel pd-os-deck">
		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Push notifications</span>

			{#if fcmService.permission === 'unsupported'}
				<p class="ps-settings-hint ps-settings-hint--amber">
					Web push is not supported in this browser or the VAPID key is not configured.
				</p>
			{:else if fcmService.permission === 'denied'}
				<div class="ps-settings-permission ps-settings-permission--denied">
					<div class="ps-settings-permission__title">Notifications blocked</div>
					<p class="ps-settings-permission__sub">
						Permission was denied. Open your browser site settings and allow notifications for
						this site.
					</p>
				</div>
			{:else if fcmService.isGranted && fcmService.token}
				<div class="ps-settings-permission ps-settings-permission--active">
					<div class="ps-settings-permission__title">Push active</div>
					<p class="ps-settings-permission__sub">
						Device registered · Token: {fcmService.token.slice(0, 12)}…
					</p>
				</div>
			{:else}
				<div class="ps-settings-permission ps-settings-permission--pending">
					<div class="ps-settings-permission__title">Push offline</div>
					<p class="ps-settings-permission__sub">
						Safety alerts (AEGIS weather), game reminders, and direct messages from your coaching
						staff require push access. No marketing notifications are sent.
					</p>
				</div>

				{#if showPermissionContext}
					<div class="ps-settings-context">
						<span class="pd-panel-eyebrow">Notification scope</span>
						<ul class="ps-settings-context__list">
							<li>Weather and lightning safety alerts (AEGIS)</li>
							<li>Match day reminders (24h and 1h before kickoff)</li>
							<li>Direct messages from coaches</li>
						</ul>
						<p class="ps-settings-hint">
							You can disable any category below. This prompt authorises the browser only.
						</p>
						<div class="ps-settings-context__actions">
							<PlayerOsButton
								variant="data"
								onclick={handleRequestPermission}
								disabled={fcmService.isRegistering}
							>
								{fcmService.isRegistering ? 'Authorizing…' : 'Authorize push'}
							</PlayerOsButton>
							<PlayerOsButton variant="ghost" onclick={() => (showPermissionContext = false)}>
								Cancel
							</PlayerOsButton>
						</div>
					</div>
				{:else}
					<PlayerOsButton variant="data" onclick={() => (showPermissionContext = true)}>
						Enable push notifications
					</PlayerOsButton>
				{/if}

				{#if fcmService.error}
					<div class="ps-settings-error">{fcmService.error}</div>
				{/if}
			{/if}
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow">Preferences</span>
			<p class="ps-settings-hint">Toggle each category independently. Changes sync automatically.</p>

			<div class="ps-settings-matrix">
				{@render relayRow(
					'Weather alerts',
					'AEGIS lightning and severe weather warnings.',
					prefs.push_weatherAlerts,
					(v) => (prefs.push_weatherAlerts = v),
					!isMinorAccount,
				)}
				{@render relayRow(
					'Game reminders',
					'24h and 1h before scheduled fixtures.',
					prefs.push_gameReminders,
					(v) => (prefs.push_gameReminders = v),
					true,
				)}
				{@render relayRow(
					'Direct messages',
					'Real-time messages from coaching staff.',
					prefs.push_messages,
					(v) => (prefs.push_messages = v),
					!isMinorAccount,
				)}
				{@render relayRow(
					'Weekly report email',
					'Digest of XP gains, training stats, and season progress.',
					prefs.email_weeklyReport,
					(v) => (prefs.email_weeklyReport = v),
					!isMinorAccount,
				)}
			</div>

			{#if prefsSyncMsg}
				<div class="ps-settings-sync">{prefsSyncMsg}</div>
			{/if}
		</section>
	</div>

{:else if activeTab === 'danger'}
	<div class="ps-settings-panel pd-os-deck">
		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow ps-settings-eyebrow--danger">Session</span>
			<p class="ps-settings-hint">
				End this operative session and return to the login screen. Use this before switching
				accounts during QA or on a shared device.
			</p>
			<PlayerOsButton variant="danger" onclick={handleDisconnect} disabled={signingOut}>
				{signingOut ? 'Signing out…' : 'Sign out'}
			</PlayerOsButton>
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow ps-settings-eyebrow--danger">Password reset</span>
			<p class="ps-settings-hint">Send a password reset link to {email}.</p>
			{#if resetSent}
				<div class="ps-settings-success">Reset link sent to {email}</div>
			{:else}
				<PlayerOsButton variant="danger" onclick={handlePasswordReset}>
					Send reset link
				</PlayerOsButton>
				{#if resetError}
					<div class="ps-settings-error">{resetError}</div>
				{/if}
			{/if}
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow ps-settings-eyebrow--danger">Data deletion</span>
			<p class="ps-settings-hint">
				To request deletion of your account data, contact your club director or platform support.
				All deletion requests are logged and audited.
			</p>
			<PlayerOsButton
				variant="danger"
				href={`mailto:support@sstracker.app?subject=Account%20data%20deletion&body=Tenant%20ID%3A%20${tenantId}%0AUID%3A%20${uid}%0ARequest%3A%20Delete%20account%20data`}
			>
				Request data deletion
			</PlayerOsButton>
		</section>

		<section class="pd-panel-section">
			<span class="pd-panel-eyebrow ps-settings-eyebrow--danger">Report an issue</span>
			<p class="ps-settings-hint">
				Found a data error? Contact platform support with your account email and a description of
				the issue.
			</p>
		</section>
	</div>
{/if}

<PlayerDiegeticOverlay
	open={unlinkConfirmOpen}
	variant="confirm"
	title="Unlink verified phone"
	message="Remove your verified phone number from this account? Two-factor recovery for your operative profile will be disabled until you link a new number."
	confirmLabel="UNLINK"
	cancelLabel="KEEP NUMBER"
	onConfirm={confirmUnlinkPhone}
	onCancel={cancelUnlinkPhone}
	onClose={cancelUnlinkPhone}
/>

{#snippet relayRow(
	label: string,
	description: string,
	value: boolean,
	onChange: (v: boolean) => void,
	enabled: boolean,
)}
	<div class="ps-settings-relay-row" class:ps-settings-relay-row--disabled={!enabled}>
		<div class="ps-settings-relay-row__info">
			<div class="ps-settings-relay-row__label">{label}</div>
			<div class="ps-settings-relay-row__desc">{description}</div>
		</div>
		<PlayerOsToggle
			{label}
			checked={value}
			disabled={!enabled}
			onchange={(v) => {
				if (enabled) onChange(v);
			}}
		/>
	</div>
{/snippet}
