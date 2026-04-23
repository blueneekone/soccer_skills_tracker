<script>
	/**
	 * Strike 1 (Agent 2) — Edit Admin modal.
	 *
	 * Mutates a single `users/{id}` document for a Global Admin / Director.
	 * The parent hands in the live row; on submit we `updateDoc()` and fire
	 * `onSaved(patch)` back so the parent can patch its local Svelte `$state`
	 * array immediately — no page reload, no re-fetch.
	 *
	 * When the admin changes role to `global_admin`, we also union the email
	 * into `config/admins.list`. When they are demoted away from
	 * `global_admin`, the email is removed from that same list (keeping the
	 * admins collection canonical without a separate audit sweep).
	 */

	import { db } from '$lib/firebase.js';
	import { doc, updateDoc, setDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { lockEnterpriseShellScroll, unlockEnterpriseShellScroll } from '$lib/utils/enterpriseShellScrollLock.js';
	/**
	 * @typedef {{
	 *   id: string,
	 *   email: string,
	 *   displayName?: string,
	 *   role?: string,
	 *   phoneNumber?: string,
	 *   verifiedAddress?: string,
	 *   primaryFacility?: string,
	 *   adminNotes?: string,
	 *   [k: string]: unknown,
	 * }} UserRow
	 */

	/**
	 * @typedef {Object} Props
	 * @property {boolean} open
	 * @property {UserRow | null} admin
	 * @property {() => void} onClose
	 * @property {(patch: UserRow) => void} [onSaved]
	 */

	/** @type {Props} */
	let { open = $bindable(false), admin, onClose, onSaved } = $props();

	let displayName     = $state('');
	let role            = $state(/** @type {string} */ ('global_admin'));
	let phoneNumber     = $state('');
	let verifiedAddress = $state('');
	let primaryFacility = $state('');
	let adminNotes      = $state('');

	let saving = $state(false);
	let errMsg = $state('');
	let okMsg  = $state('');

	/** Rehydrate when the modal is opened against a new admin. */
	$effect(() => {
		if (!open || !admin) {
			displayName = '';
			role = 'global_admin';
			phoneNumber = '';
			verifiedAddress = '';
			primaryFacility = '';
			adminNotes = '';
			errMsg = '';
			okMsg = '';
			saving = false;
			return;
		}
		displayName     = typeof admin.displayName === 'string' ? admin.displayName : '';
		role            = typeof admin.role === 'string' && admin.role ? admin.role : 'global_admin';
		phoneNumber     = typeof admin.phoneNumber === 'string' ? admin.phoneNumber : '';
		verifiedAddress = typeof admin.verifiedAddress === 'string' ? admin.verifiedAddress : '';
		primaryFacility = typeof admin.primaryFacility === 'string' ? admin.primaryFacility : '';
		adminNotes      = typeof admin.adminNotes === 'string' ? admin.adminNotes : '';
		errMsg = '';
		okMsg = '';
	});

	$effect(() => {
		if (!open) return;
		/** @param {KeyboardEvent} e */
		const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
		if (typeof window !== 'undefined') window.addEventListener('keydown', onKey);
		return () => {
			if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		if (!open || !admin) return;
		lockEnterpriseShellScroll();
		return () => unlockEnterpriseShellScroll();
	});

	async function submit() {
		errMsg = '';
		okMsg = '';
		if (!admin?.id) return (errMsg = 'Cannot edit — missing user id.');

		const dn = displayName.trim();
		if (!dn) return (errMsg = 'Display name is required.');

		const ph = phoneNumber.trim();
		if (ph && !/^\+?[0-9\s().\-]{7,20}$/.test(ph)) {
			return (errMsg = 'Phone number looks invalid. Use E.164 (e.g. +15125550100).');
		}

		saving = true;
		try {
			const previousRole = typeof admin.role === 'string' ? admin.role : '';

			/** @type {Record<string, unknown>} */
			const patch = {
				displayName: dn,
				role,
				phoneNumber: ph,
				verifiedAddress: verifiedAddress.trim(),
				primaryFacility: primaryFacility.trim(),
				adminNotes: adminNotes.trim(),
				lastEditedAt: new Date(),
				lastEditedBy: authStore.user?.email || 'EditAdminModal'
			};
			if (previousRole !== role) {
				patch.roleUpdatedAt = new Date();
				patch.roleUpdatedBy = authStore.user?.email || 'EditAdminModal';
			}

			await updateDoc(doc(db, 'users', admin.id), patch);

			// Keep config/admins canonical if role changed.
			try {
				const email = (admin.email || '').toLowerCase();
				if (email) {
					const adminsList = Array.isArray(teamsStore.admins) ? teamsStore.admins : [];
					const lowered = adminsList.map((e) => String(e).toLowerCase());
					const currentlyInList = lowered.includes(email);

					if (role === 'global_admin' && !currentlyInList) {
						await setDoc(
							doc(db, 'config', 'admins'),
							{ list: Array.from(new Set([...lowered, email])) },
							{ merge: true }
						);
					} else if (role !== 'global_admin' && currentlyInList) {
						await setDoc(
							doc(db, 'config', 'admins'),
							{ list: lowered.filter((e) => e !== email) },
							{ merge: true }
						);
					}
				}
			} catch (e) {
				console.warn('[EditAdminModal] config/admins sync failed (non-fatal)', e);
			}

			try {
				await logSecurityEvent(
					previousRole !== role ? 'CHANGE_USER_ROLE' : 'EDIT_USER',
					admin.id,
					previousRole !== role
						? `Role changed ${previousRole || 'none'} → ${role} by ${authStore.user?.email || 'unknown'}`
						: `Profile edited by ${authStore.user?.email || 'unknown'}`
				);
			} catch (e) {
				console.warn('[EditAdminModal] audit log failed (non-fatal)', e);
			}

			/** @type {UserRow} */
			const merged = { ...admin, ...patch };
			onSaved?.(merged);

			okMsg = `Saved changes for ${admin.email || admin.id}.`;
			setTimeout(() => {
				if (open) onClose?.();
			}, 700);
		} catch (e) {
			errMsg = e instanceof Error ? e.message : 'Could not save admin profile.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open && admin}
	<!-- Strike 2: true fixed-overlay modal. See EditOrganizationModal for
	     notes — single outer wrapper flex-centers the card and owns the
	     dimmed scrim + blur. z-index 9999 keeps it above everything. -->
	<div
		class="eam-overlay"
		role="presentation"
		onclick={() => !saving && onClose?.()}
		onkeydown={(e) => { if (e.key === 'Escape' && !saving) onClose?.(); }}
		tabindex="-1"
	>
	<div
		class="eam-root"
		role="dialog"
		aria-modal="true"
		aria-labelledby="eam-title"
		data-admin-shell="true"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		tabindex="-1"
	>
		<header class="eam-head">
			<div class="eam-head__icon" aria-hidden="true">
				<i class="ph ph-user-gear"></i>
			</div>
			<div class="eam-head__body">
				<h2 id="eam-title" class="eam-title">Edit Admin</h2>
				<p class="eam-sub">
					Updating <code>users/{admin.id}</code>. Role changes sync to
					<code>config/admins</code> and write an entry to <code>security_audit</code>.
				</p>
			</div>
			<button
				type="button"
				class="eam-close"
				onclick={() => !saving && onClose?.()}
				disabled={saving}
				aria-label="Close Edit Admin dialog"
			>
				<i class="ph ph-x" aria-hidden="true"></i>
			</button>
		</header>

		{#if errMsg}
			<p class="eam-flash eam-flash--err" role="alert">{errMsg}</p>
		{/if}
		{#if okMsg}
			<p class="eam-flash eam-flash--ok" role="status">{okMsg}</p>
		{/if}

		<form class="eam-form" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
			<div class="eam-grid">
				<div class="eam-field">
					<label class="eam-label" for="eam-name">
						Display Name <span class="eam-req">*</span>
					</label>
					<input
						id="eam-name"
						type="text"
						class="eam-input"
						bind:value={displayName}
						disabled={saving}
						required
					/>
				</div>

				<div class="eam-field">
					<label class="eam-label" for="eam-role">Role</label>
					<select id="eam-role" class="eam-input" bind:value={role} disabled={saving}>
						<option value="global_admin">Global Admin</option>
						<option value="director">Director</option>
						<option value="coach">Coach</option>
						<option value="parent">Parent</option>
						<option value="player">Player</option>
					</select>
				</div>

				<div class="eam-field">
					<label class="eam-label" for="eam-phone">Phone Number</label>
					<input
						id="eam-phone"
						type="tel"
						class="eam-input"
						bind:value={phoneNumber}
						placeholder="+1 (512) 555-0100"
						autocomplete="tel"
						inputmode="tel"
						disabled={saving}
					/>
				</div>

				<div class="eam-field">
					<label class="eam-label" for="eam-email">Email</label>
					<input
						id="eam-email"
						type="email"
						class="eam-input eam-input--readonly"
						value={admin.email}
						readonly
						disabled
					/>
				</div>

				<div class="eam-field eam-field--wide">
					<label class="eam-label" for="eam-address">
						Verified Address
						<span class="eam-places-chip" title="Google Places Autocomplete active">
							<i class="ph ph-map-pin-line" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="eam-address"
						type="text"
						class="eam-input"
						bind:value={verifiedAddress}
						disabled={saving}
						autocomplete="street-address"
						data-places-autocomplete="address"
					/>
				</div>

				<div class="eam-field eam-field--wide">
					<label class="eam-label" for="eam-facility">
						Primary Facility
						<span class="eam-places-chip" title="Google Places Autocomplete active">
							<i class="ph ph-buildings" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="eam-facility"
						type="text"
						class="eam-input"
						bind:value={primaryFacility}
						disabled={saving}
						data-places-autocomplete="establishment"
					/>
				</div>

				<div class="eam-field eam-field--wide">
					<label class="eam-label" for="eam-notes">Internal Notes</label>
					<textarea
						id="eam-notes"
						class="eam-input eam-textarea"
						bind:value={adminNotes}
						rows="3"
						disabled={saving}
					></textarea>
				</div>
			</div>

			<footer class="eam-foot">
				<button
					type="button"
					class="eam-btn eam-btn--ghost"
					onclick={() => !saving && onClose?.()}
					disabled={saving}
				>
					Cancel
				</button>
				<button type="submit" class="eam-btn eam-btn--primary" disabled={saving}>
					<i class="ph ph-floppy-disk" aria-hidden="true"></i>
					{saving ? 'Saving…' : 'Save Changes'}
				</button>
			</footer>
		</form>
	</div>
	</div>
{/if}

<style>
	/* Strike 2 — True fixed overlay. See EditOrganizationModal for notes. */
	.eam-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(9, 9, 11, 0.55);
		backdrop-filter: blur(6px) saturate(1.4);
		-webkit-backdrop-filter: blur(6px) saturate(1.4);
		box-sizing: border-box;
	}

	.eam-root {
		position: relative;
		width: min(720px, 100%);
		max-height: min(92vh, 880px);
		overflow: auto;
		border-radius: 16px;
		background: #ffffff;
		color: #18181b;
		border: 1px solid #e4e4e7;
		box-shadow:
			0 30px 80px -12px rgba(9, 9, 11, 0.45),
			0 10px 24px -8px rgba(9, 9, 11, 0.2);
	}

	:global(html.dark) .eam-root {
		background: #0f0f11;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.eam-head {
		display: grid;
		grid-template-columns: 44px 1fr auto;
		gap: 14px;
		align-items: start;
		padding: 18px 20px 14px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(html.dark) .eam-head {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.eam-head__icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(124, 58, 237, 0.15));
		color: #4338ca;
		font-size: 1.3rem;
	}

	:global(html.dark) .eam-head__icon {
		background: linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(79, 70, 229, 0.22));
		color: #c7d2fe;
	}

	.eam-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #18181b;
	}

	:global(html.dark) .eam-title { color: #fafafa; }

	.eam-sub {
		margin: 4px 0 0;
		font-size: 0.8125rem;
		color: #52525b;
	}

	:global(html.dark) .eam-sub { color: #d4d4d8; }

	.eam-sub code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75rem;
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .eam-sub code {
		background: rgba(255, 255, 255, 0.1);
	}

	.eam-close {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: #52525b;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.eam-close:hover { background: rgba(0, 0, 0, 0.05); color: #18181b; }

	:global(html.dark) .eam-close { color: #d4d4d8; }
	:global(html.dark) .eam-close:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fafafa;
	}

	.eam-flash {
		margin: 12px 20px 0;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.eam-flash--err {
		background: rgba(239, 68, 68, 0.12);
		color: #b91c1c;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.eam-flash--ok {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
		border: 1px solid rgba(34, 197, 94, 0.32);
	}

	:global(html.dark) .eam-flash--ok { color: #86efac; }

	.eam-form { padding: 16px 20px 20px; }

	.eam-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px 16px;
	}

	.eam-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.eam-field--wide { grid-column: 1 / -1; }

	.eam-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #52525b;
	}

	:global(html.dark) .eam-label { color: #d4d4d8; }

	.eam-req { color: #ef4444; }

	.eam-input {
		height: 40px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		color: #18181b;
		font: inherit;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.12s ease, box-shadow 0.12s ease;
	}

	.eam-input:focus:not(:disabled) {
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
	}

	.eam-input--readonly,
	.eam-input:disabled {
		background: rgba(0, 0, 0, 0.03);
		color: #52525b;
	}

	:global(html.dark) .eam-input {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	:global(html.dark) .eam-input--readonly,
	:global(html.dark) .eam-input:disabled {
		background: rgba(255, 255, 255, 0.04);
		color: #a1a1aa;
	}

	.eam-textarea {
		height: auto;
		min-height: 88px;
		padding: 10px 12px;
		resize: vertical;
	}

	.eam-places-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #4338ca;
		background: rgba(79, 70, 229, 0.1);
		border: 1px solid rgba(79, 70, 229, 0.28);
		border-radius: 999px;
		text-transform: none;
	}

	:global(html.dark) .eam-places-chip {
		color: #c7d2fe;
		background: rgba(124, 58, 237, 0.22);
		border-color: rgba(124, 58, 237, 0.45);
	}

	.eam-foot {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 18px;
	}

	.eam-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		border-radius: 8px;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.eam-btn--ghost {
		background: transparent;
		border-color: #e4e4e7;
		color: #27272a;
	}

	.eam-btn--ghost:hover { background: rgba(0, 0, 0, 0.04); }

	:global(html.dark) .eam-btn--ghost {
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(html.dark) .eam-btn--ghost:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.eam-btn--primary {
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		color: #fff;
		border-color: #4338ca;
		box-shadow: 0 6px 16px -6px rgba(79, 70, 229, 0.45);
	}

	.eam-btn--primary:hover:not(:disabled) {
		filter: brightness(1.06);
		transform: translateY(-1px);
	}

	.eam-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	@media (max-width: 640px) { .eam-grid { grid-template-columns: 1fr; } }
</style>
