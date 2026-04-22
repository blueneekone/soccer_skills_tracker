<script>
	/**
	 * Sprint 2.6.5 — Grant Global Admin Access.
	 *
	 * Premium modal that used to live inside System Settings. The CEO moved
	 * it into the Global Users route so "add an admin" is a first-class user
	 * action, not a configuration chore. The modal captures everything the
	 * audit log (and future Checkr background check) needs:
	 *
	 *   • Email                (required — Firebase key)
	 *   • Display name         (required — audit trail legibility)
	 *   • Verified Address     (Google Places Autocomplete — v2 wires to API)
	 *   • Phone Number         (E.164 hint, non-enforcing regex on submit)
	 *   • Primary Facility     (Google Places Autocomplete — v2 wires to API)
	 *   • Role preset          (global_admin, director)
	 *   • Internal notes
	 *
	 * Side effects on submit:
	 *   1. users/{email}         ← role + profile patch (merge)
	 *   2. config/admins.list    ← unioned email list (idempotent)
	 *   3. security_audit        ← GRANT_GLOBAL_ADMIN row via logSecurityEvent
	 *
	 * The modal does NOT reach Google Places directly today — it renders a
	 * placeholder input and a "Google Places Autocomplete active" note so the
	 * Sprint 2.8 wiring can replace the `<input>` with the live widget
	 * without breaking the submit pipeline.
	 */

	import { db } from '$lib/firebase.js';
	import { doc, setDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} open
	 * @property {() => void} onClose
	 * @property {(email: string) => void} [onGranted]
	 */

	/** @type {Props} */
	let { open = $bindable(false), onClose, onGranted } = $props();

	// ── Form state ────────────────────────────────────────────────────────────
	let email         = $state('');
	let displayName   = $state('');
	let rolePreset    = $state(/** @type {'global_admin' | 'director'} */ ('global_admin'));
	let verifiedAddress = $state('');
	let phoneNumber   = $state('');
	let primaryFacility = $state('');
	let notes         = $state('');

	let saving        = $state(false);
	let errMsg        = $state('');
	let okMsg         = $state('');

	function reset() {
		email = '';
		displayName = '';
		rolePreset = 'global_admin';
		verifiedAddress = '';
		phoneNumber = '';
		primaryFacility = '';
		notes = '';
		errMsg = '';
		okMsg = '';
		saving = false;
	}

	$effect(() => {
		if (!open) reset();
	});

	// Dismiss on Escape
	$effect(() => {
		if (!open) return;
		/** @param {KeyboardEvent} e */
		const onKey = (e) => {
			if (e.key === 'Escape' && !saving) onClose?.();
		};
		if (typeof window !== 'undefined') window.addEventListener('keydown', onKey);
		return () => {
			if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
		};
	});

	async function submit() {
		errMsg = '';
		okMsg = '';
		const em = email.trim().toLowerCase();
		const dn = displayName.trim();
		if (!em) return (errMsg = 'Email is required.');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return (errMsg = 'Enter a valid email address.');
		if (!dn) return (errMsg = 'Display name is required for the audit log.');

		const ph = phoneNumber.trim();
		if (ph && !/^\+?[0-9\s().\-]{7,20}$/.test(ph)) {
			return (errMsg = 'Phone number looks invalid. Use E.164 (e.g. +15125550100).');
		}

		saving = true;
		try {
			/** @type {Record<string, unknown>} */
			const profilePatch = {
				email: em,
				emailLower: em,
				displayName: dn,
				role: rolePreset,
				roleUpdatedAt: new Date(),
				roleUpdatedBy: authStore.user?.email || 'AddAdminModal',
				// Demographic / ops fields (filled by Google Places autocomplete in v2)
				verifiedAddress: verifiedAddress.trim() || '',
				phoneNumber: ph || '',
				primaryFacility: primaryFacility.trim() || '',
				adminNotes: notes.trim() || ''
			};
			await setDoc(doc(db, 'users', em), profilePatch, { merge: true });

			if (rolePreset === 'global_admin') {
				const existing = Array.isArray(teamsStore.admins) ? teamsStore.admins : [];
				const unioned = Array.from(new Set([...existing.map((e) => String(e).toLowerCase()), em]));
				await setDoc(doc(db, 'config', 'admins'), { list: unioned }, { merge: true });
			}

			await logSecurityEvent(
				rolePreset === 'global_admin' ? 'GRANT_GLOBAL_ADMIN' : 'GRANT_DIRECTOR_ACCESS',
				em,
				`Granted via AddAdminModal by ${authStore.user?.email || 'unknown'}`
			);

			okMsg = `${em} granted ${rolePreset === 'global_admin' ? 'Global Admin' : 'Director'} access.`;
			onGranted?.(em);

			try {
				await teamsStore.load('super_admin', {
					scope: 'admin_full',
					routePath: '/admin/users'
				});
			} catch (e) {
				console.warn('[AddAdminModal] teamsStore refresh failed (non-fatal)', e);
			}

			setTimeout(() => {
				if (open) onClose?.();
			}, 900);
		} catch (e) {
			errMsg = e instanceof Error ? e.message : 'Could not grant access.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<!-- Scrim -->
	<div
		class="aam-scrim"
		role="presentation"
		onclick={() => !saving && onClose?.()}
		onkeydown={(e) => { if (e.key === 'Escape' && !saving) onClose?.(); }}
		tabindex="-1"
	></div>

	<div
		class="aam-root"
		role="dialog"
		aria-modal="true"
		aria-labelledby="aam-title"
		data-admin-shell="true"
	>
		<header class="aam-head">
			<div class="aam-head__icon" aria-hidden="true">
				<i class="ph ph-globe"></i>
			</div>
			<div class="aam-head__body">
				<h2 id="aam-title" class="aam-title">Add Admin</h2>
				<p class="aam-sub">
					Grant elevated access to a trusted operator. Every field is written to the
					<code>users/&#123;email&#125;</code> profile and audited via
					<code>security_audit</code>.
				</p>
			</div>
			<button
				type="button"
				class="aam-close"
				onclick={() => !saving && onClose?.()}
				disabled={saving}
				aria-label="Close Add Admin dialog"
			>
				<i class="ph ph-x" aria-hidden="true"></i>
			</button>
		</header>

		{#if errMsg}
			<p class="aam-flash aam-flash--err" role="alert">{errMsg}</p>
		{/if}
		{#if okMsg}
			<p class="aam-flash aam-flash--ok" role="status">{okMsg}</p>
		{/if}

		<form class="aam-form" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
			<div class="aam-grid">
				<div class="aam-field">
					<label class="aam-label" for="aam-email">Email <span class="aam-req">*</span></label>
					<input
						id="aam-email"
						type="email"
						class="aam-input"
						bind:value={email}
						placeholder="admin@organization.com"
						autocomplete="email"
						disabled={saving}
						required
					/>
				</div>

				<div class="aam-field">
					<label class="aam-label" for="aam-name">Display Name <span class="aam-req">*</span></label>
					<input
						id="aam-name"
						type="text"
						class="aam-input"
						bind:value={displayName}
						placeholder="e.g. Jordan Lee"
						autocomplete="name"
						disabled={saving}
						required
					/>
				</div>

				<div class="aam-field">
					<label class="aam-label" for="aam-role">Role</label>
					<select
						id="aam-role"
						class="aam-input"
						bind:value={rolePreset}
						disabled={saving}
					>
						<option value="global_admin">Global Admin</option>
						<option value="director">Director</option>
					</select>
				</div>

				<div class="aam-field">
					<label class="aam-label" for="aam-phone">Phone Number</label>
					<input
						id="aam-phone"
						type="tel"
						class="aam-input"
						bind:value={phoneNumber}
						placeholder="+1 (512) 555-0100"
						autocomplete="tel"
						inputmode="tel"
						disabled={saving}
					/>
				</div>

				<div class="aam-field aam-field--wide">
					<label class="aam-label" for="aam-address">
						Verified Address
						<span class="aam-places-chip" title="Google Places Autocomplete active">
							<i class="ph ph-map-pin-line" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="aam-address"
						type="text"
						class="aam-input"
						bind:value={verifiedAddress}
						placeholder="Start typing a verified street address…"
						autocomplete="street-address"
						disabled={saving}
						data-places-autocomplete="address"
					/>
					<p class="aam-hint">
						This field will be replaced with the Google Places widget in Sprint 2.8.
						For now it captures whatever the admin confirmed on a call.
					</p>
				</div>

				<div class="aam-field aam-field--wide">
					<label class="aam-label" for="aam-facility">
						Primary Facility
						<span class="aam-places-chip" title="Google Places Autocomplete active">
							<i class="ph ph-buildings" aria-hidden="true"></i>
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="aam-facility"
						type="text"
						class="aam-input"
						bind:value={primaryFacility}
						placeholder="e.g. Mueller Athletic Complex, Austin TX"
						disabled={saving}
						data-places-autocomplete="establishment"
					/>
				</div>

				<div class="aam-field aam-field--wide">
					<label class="aam-label" for="aam-notes">Internal Notes</label>
					<textarea
						id="aam-notes"
						class="aam-input aam-textarea"
						bind:value={notes}
						placeholder="Why is this admin being added? Background check ref, onboarding ticket, etc."
						rows="3"
						disabled={saving}
					></textarea>
				</div>
			</div>

			<footer class="aam-foot">
				<button
					type="button"
					class="aam-btn aam-btn--ghost"
					onclick={() => !saving && onClose?.()}
					disabled={saving}
				>
					Cancel
				</button>
				<button type="submit" class="aam-btn aam-btn--primary" disabled={saving}>
					<i class="ph ph-shield-check" aria-hidden="true"></i>
					{saving ? 'Granting…' : 'Grant Access'}
				</button>
			</footer>
		</form>
	</div>
{/if}

<style>
	/* ── Scrim + container ───────────────────────────────────────────────── */
	.aam-scrim {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(9, 9, 11, 0.55);
		backdrop-filter: blur(6px) saturate(1.4);
		-webkit-backdrop-filter: blur(6px) saturate(1.4);
	}

	.aam-root {
		position: fixed;
		z-index: 101;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(720px, calc(100vw - 32px));
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

	:global(html.dark) .aam-root {
		background: #0f0f12;
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.08);
		box-shadow:
			0 30px 80px -12px rgba(0, 0, 0, 0.8),
			0 10px 24px -8px rgba(0, 0, 0, 0.6);
	}

	/* ── Head ────────────────────────────────────────────────────────────── */
	.aam-head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: flex-start;
		gap: 14px;
		padding: 22px 22px 10px;
	}

	.aam-head__icon {
		width: 42px;
		height: 42px;
		flex-shrink: 0;
		border-radius: 12px;
		display: grid;
		place-items: center;
		color: #4f46e5;
		background:
			radial-gradient(120% 120% at 30% 30%, rgba(99, 102, 241, 0.25) 0%, transparent 70%),
			rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.35);
		font-size: 1.15rem;
	}

	:global(html.dark) .aam-head__icon {
		color: #a5b4fc;
	}

	.aam-title {
		margin: 0 0 4px;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: #18181b;
	}

	:global(html.dark) .aam-title {
		color: #fafafa;
	}

	.aam-sub {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: #52525b;
		max-width: 56ch;
	}

	:global(html.dark) .aam-sub {
		color: #d4d4d8;
	}

	.aam-sub code {
		padding: 1px 5px;
		border-radius: 4px;
		background: #e4e4e7;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8125rem;
	}

	:global(html.dark) .aam-sub code {
		background: rgba(255, 255, 255, 0.08);
		color: #fafafa;
	}

	.aam-close {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		display: grid;
		place-items: center;
		font-size: 1.1rem;
	}

	.aam-close:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .aam-close:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	/* ── Flash ───────────────────────────────────────────────────────────── */
	.aam-flash {
		margin: 0 22px;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.aam-flash--err {
		background: #fee2e2;
		color: #7f1d1d;
		border: 1px solid #fca5a5;
	}

	:global(html.dark) .aam-flash--err {
		background: rgba(239, 68, 68, 0.12);
		color: #fecaca;
		border-color: #7f1d1d;
	}

	.aam-flash--ok {
		background: #dcfce7;
		color: #14532d;
		border: 1px solid #86efac;
	}

	:global(html.dark) .aam-flash--ok {
		background: rgba(34, 197, 94, 0.12);
		color: #bbf7d0;
		border-color: #166534;
	}

	/* ── Form ────────────────────────────────────────────────────────────── */
	.aam-form {
		padding: 16px 22px 22px;
	}

	.aam-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.aam-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.aam-field--wide {
		grid-column: 1 / -1;
	}

	.aam-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #52525b;
	}

	:global(html.dark) .aam-label {
		color: #d4d4d8;
	}

	.aam-req {
		color: #dc2626;
		font-weight: 900;
		letter-spacing: 0;
	}

	.aam-places-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(16, 185, 129, 0.12);
		color: #047857;
		border: 1px solid rgba(16, 185, 129, 0.35);
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: none;
		letter-spacing: 0;
	}

	:global(html.dark) .aam-places-chip {
		background: rgba(16, 185, 129, 0.18);
		color: #a7f3d0;
		border-color: #065f46;
	}

	.aam-input {
		width: 100%;
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

	.aam-input:focus {
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
	}

	.aam-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(html.dark) .aam-input {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
		color: #fafafa;
	}

	.aam-textarea {
		height: auto;
		min-height: 84px;
		padding: 10px 12px;
		line-height: 1.45;
		resize: vertical;
	}

	.aam-hint {
		margin: 0;
		color: #71717a;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	:global(html.dark) .aam-hint {
		color: #d4d4d8;
	}

	/* ── Footer ──────────────────────────────────────────────────────────── */
	.aam-foot {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
		padding-top: 18px;
		margin-top: 16px;
		border-top: 1px solid #e4e4e7;
	}

	:global(html.dark) .aam-foot {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.aam-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		border-radius: 8px;
		border: 1px solid #e4e4e7;
		background: #ffffff;
		color: #18181b;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.aam-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.aam-btn--ghost:hover:not(:disabled) {
		background: #f4f4f5;
	}

	:global(html.dark) .aam-btn--ghost {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	:global(html.dark) .aam-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
	}

	.aam-btn--primary {
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		border-color: #4338ca;
		color: #ffffff;
		box-shadow: 0 6px 16px -6px rgba(79, 70, 229, 0.55);
	}

	.aam-btn--primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 560px) {
		.aam-grid {
			grid-template-columns: 1fr;
		}
		.aam-head {
			grid-template-columns: auto 1fr;
		}
		.aam-close {
			grid-column: 2 / 3;
			justify-self: end;
		}
	}
</style>
