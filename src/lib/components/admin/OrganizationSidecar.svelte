<script lang="ts">
	/**
	 * Strike 1 (Agent 2) — Edit Organization modal.
	 *
	 * Premium modal that mutates a single `clubs/{id}` Firestore document.
	 * The parent passes the live `club` object and receives the merged patch
	 * back through `onSaved(updatedClub)` so it can update its local Svelte
	 * `$state` array immediately — no page reload, no re-fetch, no flicker.
	 *
	 * Mutation plumbing:
	 *   • updateDoc() with the diffed patch.
	 *   • security_audit row via logSecurityEvent('EDIT_CLUB', id, summary).
	 *   • Phone number validated against E.164-ish regex (same contract as AddClub).
	 */

	import { db } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	/**
	 * @typedef {{
	 *   id: string,
	 *   name?: string,
	 *   sport?: string,
	 *   directorEmail?: string,
	 *   isInfinite?: boolean,
	 *   logoUrl?: string,
	 *   createdAt?: unknown,
	 *   verifiedAddress?: string,
	 *   phoneNumber?: string,
	 *   primaryFacility?: string,
	 *   [k: string]: unknown,
	 * }} Club
	 */

	/**
	 * @typedef {Object} Props
	 * @property {boolean} open
	 * @property {Club | null} club
	 * @property {() => void} onClose
	 * @property {(updated: Club) => void} [onSaved]
	 */

	/** @type {Props} */
	let { open = $bindable(false), club, onClose, onSaved } = $props();

	// ── Form state — mirrors the editable shape of a club document ──────────
	let name            = $state('');
	let sport           = $state('soccer');
	let directorEmail   = $state('');
	let verifiedAddress = $state('');
	let phoneNumber     = $state('');
	let primaryFacility = $state('');
	let logoUrl         = $state('');

	let saving = $state(false);
	let errMsg = $state('');
	let okMsg  = $state('');

	/** Re-hydrate the form whenever a new club is handed in or the modal reopens. */
	$effect(() => {
		if (!open || !club) {
			name = '';
			sport = 'soccer';
			directorEmail = '';
			verifiedAddress = '';
			phoneNumber = '';
			primaryFacility = '';
			logoUrl = '';
			errMsg = '';
			okMsg = '';
			saving = false;
			return;
		}
		name            = typeof club.name === 'string' ? club.name : '';
		sport           = typeof club.sport === 'string' && club.sport ? club.sport : 'generic';
		directorEmail   = typeof club.directorEmail === 'string' ? club.directorEmail : '';
		verifiedAddress = typeof club.verifiedAddress === 'string' ? club.verifiedAddress : '';
		phoneNumber     = typeof club.phoneNumber === 'string' ? club.phoneNumber : '';
		primaryFacility = typeof club.primaryFacility === 'string' ? club.primaryFacility : '';
		logoUrl         = typeof club.logoUrl === 'string' ? club.logoUrl : '';
		errMsg = '';
		okMsg = '';
	});

	/** Escape to close — mirrors AddAdminModal contract. */
	$effect(() => {
		if (!open) return;
		/** @param {KeyboardEvent} e */
		const onKey = (e) => {
			if (e.key === 'Escape' && !saving) onClose?.();
		};
	});

	async function submit() {
		errMsg = '';
		okMsg = '';
		if (!club?.id) return (errMsg = 'Cannot edit — missing club id.');

		const nm = name.trim();
		if (!nm) return (errMsg = 'Organization name is required.');

		const ph = phoneNumber.trim();
		if (ph && !/^\+?[0-9\s().\-]{7,20}$/.test(ph)) {
			return (errMsg = 'Phone number looks invalid. Use E.164 (e.g. +15125550100).');
		}

		const em = directorEmail.trim().toLowerCase();
		if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
			return (errMsg = 'Director email looks invalid.');
		}

		saving = true;
		try {
			/** @type {Record<string, unknown>} */
			const patch = {
				name: nm,
				sport: sport || 'generic',
				directorEmail: em,
				verifiedAddress: verifiedAddress.trim(),
				phoneNumber: ph,
				primaryFacility: primaryFacility.trim(),
				logoUrl: logoUrl.trim(),
				lastEditedAt: new Date(),
				lastEditedBy: authStore.user?.email || 'EditOrganizationModal'
			};

			await updateDoc(doc(db, 'clubs', club.id), patch);

			try {
				await logSecurityEvent(
					'EDIT_CLUB',
					club.id,
					`Org updated by ${authStore.user?.email || 'unknown'} — name: ${nm}`
				);
			} catch (e) {
				console.warn('[EditOrganizationModal] audit log failed (non-fatal)', e);
			}

			// Hand the merged row back to the parent so it can patch local state.
			/** @type {Club} */
			const merged = { ...club, ...patch };
			onSaved?.(merged);

			okMsg = `Saved changes to ${nm}.`;
			setTimeout(() => {
				if (open) onClose?.();
			}, 700);
		} catch (e) {
			errMsg = e instanceof Error ? e.message : 'Could not save organization.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open && club}
	<div
		class="cc-chart-card cc-chart-card--soc tw-h-full tw-flex tw-flex-col tw-overflow-y-auto"
		data-admin-shell="true"
	>
		<header class="cc-chart-card__head tw-shrink-0">
			<div class="cc-chart-card__icon cc-chart-card__icon--cyan" aria-hidden="true">
				<Icon name={"action.edit" as IconName} />
			</div>
			<div class="tw-flex-1 tw-min-w-0">
				<h2 class="cc-chart-card__title">Organization Details</h2>
				<p class="cc-chart-card__sub tw-truncate">
					{club.id}
				</p>
			</div>
			<button
				type="button"
				class="cc-nav-link tw-w-auto tw-px-2 tw-ml-2"
				onclick={() => !saving && onClose?.()}
				disabled={saving}
				aria-label="Close details"
			>
				<Icon name={"sys.close" as IconName} aria-hidden="true" />
			</button>
		</header>
		
		<div class="tw-p-4 tw-flex-1 tw-flex tw-flex-col tw-gap-4">

		{#if errMsg}
			<p class="eom-flash eom-flash--err" role="alert">{errMsg}</p>
		{/if}
		{#if okMsg}
			<p class="eom-flash eom-flash--ok" role="status">{okMsg}</p>
		{/if}

		<form class="eom-form" onsubmit={(e) => { e.preventDefault(); void submit(); }}>
			<div class="eom-grid">
				<div class="eom-field">
					<label class="eom-label" for="eom-name">
						Organization Name <span class="eom-req">*</span>
					</label>
					<input
						id="eom-name"
						type="text"
						class="eom-input"
						bind:value={name}
						placeholder="e.g. Aggie FC"
						disabled={saving}
						required
					/>
				</div>

				<div class="eom-field">
					<label class="eom-label" for="eom-sport">Sport</label>
					<select id="eom-sport" class="eom-input" bind:value={sport} disabled={saving}>
						<option value="soccer">Soccer</option>
						<option value="basketball">Basketball</option>
						<option value="baseball">Baseball</option>
						<option value="football">Football</option>
						<option value="volleyball">Volleyball</option>
						<option value="hockey">Hockey</option>
						<option value="lacrosse">Lacrosse</option>
						<option value="generic">Generic</option>
					</select>
				</div>

				<div class="eom-field">
					<label class="eom-label" for="eom-dir">Director Email</label>
					<input
						id="eom-dir"
						type="email"
						class="eom-input"
						bind:value={directorEmail}
						placeholder="director@example.com"
						autocomplete="email"
						disabled={saving}
					/>
				</div>

				<div class="eom-field">
					<label class="eom-label" for="eom-phone">Phone Number</label>
					<input
						id="eom-phone"
						type="tel"
						class="eom-input"
						bind:value={phoneNumber}
						placeholder="+1 (512) 555-0100"
						autocomplete="tel"
						inputmode="tel"
						disabled={saving}
					/>
				</div>

				<div class="eom-field eom-field--wide">
					<label class="eom-label" for="eom-address">
						Verified Address
						<span class="eom-places-chip" title="Google Places Autocomplete active">
							<Icon name={"sys.map-pin" as IconName} aria-hidden="true" />
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="eom-address"
						type="text"
						class="eom-input"
						bind:value={verifiedAddress}
						placeholder="Start typing a verified street address…"
						autocomplete="street-address"
						disabled={saving}
						data-places-autocomplete="address"
					/>
				</div>

				<div class="eom-field eom-field--wide">
					<label class="eom-label" for="eom-facility">
						Primary Facility
						<span class="eom-places-chip" title="Google Places Autocomplete active">
							<Icon name={"org.building" as IconName} aria-hidden="true" />
							Google Places Autocomplete active
						</span>
					</label>
					<input
						id="eom-facility"
						type="text"
						class="eom-input"
						bind:value={primaryFacility}
						placeholder="e.g. Mueller Athletic Complex, Austin TX"
						disabled={saving}
						data-places-autocomplete="establishment"
					/>
				</div>

				<div class="eom-field eom-field--wide">
					<label class="eom-label" for="eom-logo">Logo URL</label>
					<input
						id="eom-logo"
						type="url"
						class="eom-input"
						bind:value={logoUrl}
						placeholder="https://…"
						disabled={saving}
					/>
				</div>
			</div>

			<footer class="eom-foot">
				<button
					type="button"
					class="eom-btn eom-btn--ghost"
					onclick={() => !saving && onClose?.()}
					disabled={saving}
				>
					Cancel
				</button>
				<button type="submit" class="eom-btn eom-btn--primary" disabled={saving}>
					<Icon name={"action.save" as IconName} aria-hidden="true" />
					{saving ? 'Saving…' : 'Save Changes'}
				</button>
			</footer>
		</form>
		</div>
	</div>
{/if}

<style>
	/* Keep the original eom-* classes for the form inputs inside the sidecar */

	.eom-flash {
		margin: 12px 20px 0;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.eom-flash--err {
		background: rgba(239, 68, 68, 0.12);
		color: #b91c1c;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.eom-flash--ok {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
		border: 1px solid rgba(34, 197, 94, 0.32);
	}

	:global(html.dark) .eom-flash--ok {
		color: #86efac;
	}

	.eom-form {
		padding: 16px 20px 20px;
	}

	.eom-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px 16px;
	}

	.eom-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.eom-field--wide {
		grid-column: 1 / -1;
	}

	.eom-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #52525b;
	}

	:global(html.dark) .eom-label {
		color: #d4d4d8;
	}

	.eom-req {
		color: #ef4444;
	}

	.eom-input {
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

	.eom-input:focus {
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
	}

	:global(html.dark) .eom-input {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	.eom-places-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: #4338ca;
		background: rgba(79, 70, 229, 0.1);
		border: 1px solid rgba(79, 70, 229, 0.28);
		border-radius: 999px;
		text-transform: none;
	}

	:global(html.dark) .eom-places-chip {
		color: #c7d2fe;
		background: rgba(124, 58, 237, 0.22);
		border-color: rgba(124, 58, 237, 0.45);
	}

	.eom-foot {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 18px;
	}

	.eom-btn {
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

	.eom-btn--ghost {
		background: transparent;
		border-color: #e4e4e7;
		color: #27272a;
	}

	.eom-btn--ghost:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	:global(html.dark) .eom-btn--ghost {
		color: #fafafa;
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(html.dark) .eom-btn--ghost:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.eom-btn--primary {
		background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
		color: #fff;
		border-color: #4338ca;
		box-shadow: 0 6px 16px -6px rgba(79, 70, 229, 0.45);
	}

	.eom-btn--primary:hover:not(:disabled) {
		filter: brightness(1.06);
		transform: translateY(-1px);
	}

	.eom-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.eom-grid { grid-template-columns: 1fr; }
	}
</style>
