<script>
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { doc, setDoc } from 'firebase/firestore';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	/** @type {{ id: string, name?: string, sport?: string, isInfinite?: boolean, directorEmail?: string, logoUrl?: string, createdAt?: import('firebase/firestore').Timestamp | Date | unknown } | null} */
	let {
		club = null,
		open = $bindable(false),
		/** Snapshot from `license_entitlements/{clubId}` for read-only admin detail. */
		entitlement = /** @type {Record<string, unknown> | null} */ (null),
		teamsCount = 0,
		/** When set, shows a destructive delete control (parent runs confirm + Firestore). */
		onDeleteClub = /** @type {(() => void | Promise<void>) | undefined} */ (undefined),
	} = $props();

	/** @type {'soccer'|'basketball'|'baseball'|'football'|'volleyball'|'hockey'|'lacrosse'|'generic'} */
	let editSport = $state('soccer');
	let editInfinite = $state(false);
	let saving = $state(false);
	let err = $state('');

	$effect(() => {
		if (!club) return;
		const s =
			typeof club.sport === 'string' && club.sport.trim() ? club.sport.trim().toLowerCase() : 'soccer';
		const allowed = [
			'soccer',
			'basketball',
			'baseball',
			'football',
			'volleyball',
			'hockey',
			'lacrosse',
			'generic',
		];
		editSport = /** @type {typeof editSport} */ (allowed.includes(s) ? s : 'generic');
		editInfinite = club.isInfinite === true;
		err = '';
	});

	function close() {
		open = false;
		err = '';
	}

	/**
	 * @param {unknown} raw
	 */
	function formatCreatedAt(raw) {
		if (!raw) return '—';
		if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
			const fn = /** @type {Record<string, unknown>} */ (raw)['toDate'];
			if (typeof fn === 'function') {
				try {
					const d = /** @type {() => Date} */ (fn).call(raw);
					return d instanceof Date ? d.toLocaleString() : '—';
				} catch {
					return '—';
				}
			}
		}
		if (raw instanceof Date) return raw.toLocaleString();
		return '—';
	}

	let deleting = $state(false);
	async function runDelete() {
		if (!onDeleteClub) return;
		deleting = true;
		try {
			const r = await Promise.resolve(onDeleteClub());
			if (r !== false) close();
		} finally {
			deleting = false;
		}
	}

	async function save() {
		if (!club?.id) return;
		saving = true;
		err = '';
		try {
			await setDoc(
				doc(db, 'clubs', club.id),
				{
					sport: editSport,
					isInfinite: editInfinite === true,
				},
				{ merge: true }
			);
			await logSecurityEvent('ADMIN_EDIT_CLUB', club.id, `sport=${editSport}; infinite=${editInfinite}`);
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: page.url.pathname,
			});
			open = false;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save club.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open && club}
	<div
		class="admin-edit-club-backdrop"
		role="presentation"
		aria-hidden="true"
		onclick={close}
	></div>
	<aside class="admin-edit-club-panel" aria-label="Edit organization">
		<div class="admin-edit-club-panel__head">
			<h2 class="admin-edit-club-panel__title">Edit organization</h2>
			<button type="button" class="admin-edit-club-panel__close" onclick={close} aria-label="Close">
				<i class="ph ph-x aecd-icon-close" aria-hidden="true"></i>
			</button>
		</div>
		<div class="admin-edit-club-panel__body">
			<p class="admin-edit-club-panel__meta">Club ID: <strong>{club.id}</strong></p>
			<p class="admin-edit-club-panel__meta">Name: {club.name || '—'}</p>

			<div class="admin-edit-club-panel__detail-block">
				<h3 class="admin-edit-club-panel__detail-heading">Details</h3>
				<p class="admin-edit-club-panel__meta">Created: {formatCreatedAt(club.createdAt)}</p>
				<p class="admin-edit-club-panel__meta">Teams in org: <strong>{teamsCount}</strong></p>
				{#if entitlement}
					<p class="admin-edit-club-panel__meta admin-edit-club-panel__mono">
						Stripe customer:
						{typeof entitlement.stripe_customer_id === 'string' && entitlement.stripe_customer_id.trim() ?
							entitlement.stripe_customer_id
						:	'—'}
					</p>
					<p class="admin-edit-club-panel__meta admin-edit-club-panel__mono">
						Stripe subscription:
						{typeof entitlement.stripe_subscription_id === 'string' && entitlement.stripe_subscription_id.trim() ?
							entitlement.stripe_subscription_id
						:	'—'}
					</p>
				{:else}
					<p class="admin-edit-club-panel__meta">No entitlement document loaded.</p>
				{/if}
			</div>

			<label class="admin-edit-club-panel__label" for="admin-edit-club-sport">Sport</label>
			<select id="admin-edit-club-sport" bind:value={editSport} class="admin-edit-club-panel__select">
				<option value="soccer">Soccer</option>
				<option value="basketball">Basketball</option>
				<option value="baseball">Baseball</option>
				<option value="football">Football</option>
				<option value="volleyball">Volleyball</option>
				<option value="hockey">Hockey</option>
				<option value="lacrosse">Lacrosse</option>
				<option value="generic">Generic</option>
			</select>

			<div class="admin-edit-club-panel__toggle-row">
				<label class="admin-edit-club-panel__toggle-label" for="admin-edit-infinite">
					Grant Infinite License (Promo)
				</label>
				<input
					id="admin-edit-infinite"
					type="checkbox"
					bind:checked={editInfinite}
					class="admin-edit-club-panel__checkbox"
				/>
			</div>
			<p class="admin-edit-club-panel__hint">
				Infinite license bypasses Stripe billing read-only mode and seat-cap enforcement on connected clients.
				Backend seat checks may still apply until migrated.
			</p>

			{#if err}
				<p class="admin-edit-club-panel__err" role="alert">{err}</p>
			{/if}

			{#if onDeleteClub}
				<div class="admin-edit-club-panel__danger">
					<p class="admin-edit-club-panel__danger-label">Danger zone</p>
					<button
						type="button"
						class="delete-btn admin-edit-club-panel__delete-org"
						onclick={runDelete}
						disabled={saving || deleting}
					>
						{deleting ? 'Deleting…' : 'Delete organization'}
					</button>
				</div>
			{/if}

			<div class="admin-edit-club-panel__actions">
				<button type="button" class="secondary-btn" onclick={close} disabled={saving}>Cancel</button>
				<button type="button" class="primary-btn btn-blue" onclick={save} disabled={saving}>
					{saving ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.aecd-icon-close { font-size: 1.25rem; }

	.admin-edit-club-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.35);
		z-index: 240;
	}

	.admin-edit-club-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: min(100%, 400px);
		height: 100dvh;
		max-height: 100dvh;
		background: #ffffff;
		border-left: 1px solid #e5e5e5;
		z-index: 250;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		box-shadow: none;
	}

	:global(html.dark) .admin-edit-club-panel {
		background: #0f0f11;
		border-left-color: rgba(255, 255, 255, 0.1);
	}

	.admin-edit-club-panel__head {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 18px;
		border-bottom: 1px solid #e5e5e5;
	}

	:global(html.dark) .admin-edit-club-panel__head {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.admin-edit-club-panel__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.admin-edit-club-panel__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		color: var(--text-secondary);
	}

	.admin-edit-club-panel__close:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.admin-edit-club-panel__body {
		flex: 1;
		overflow-y: auto;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.admin-edit-club-panel__meta {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.admin-edit-club-panel__label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.admin-edit-club-panel__select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		font: inherit;
		color: var(--text-primary);
		box-sizing: border-box;
	}

	:global(html.dark) .admin-edit-club-panel__select {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.admin-edit-club-panel__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 8px;
		padding: 12px;
		border: 1px solid #e5e5e5;
		border-radius: 10px;
		background: #fafafa;
	}

	:global(html.dark) .admin-edit-club-panel__toggle-row {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
	}

	.admin-edit-club-panel__toggle-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
	}

	.admin-edit-club-panel__checkbox {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		cursor: pointer;
	}

	.admin-edit-club-panel__hint {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.admin-edit-club-panel__err {
		margin: 0;
		font-size: 0.85rem;
		color: var(--danger-red, #b91c1c);
	}

	.admin-edit-club-panel__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: flex-end;
		margin-top: auto;
		padding-top: 16px;
	}

	.admin-edit-club-panel__detail-block {
		padding: 12px;
		border: 1px solid #e5e5e5;
		border-radius: 10px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	:global(html.dark) .admin-edit-club-panel__detail-block {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.04);
	}

	.admin-edit-club-panel__detail-heading {
		margin: 0 0 4px;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.admin-edit-club-panel__mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.78rem;
		word-break: break-all;
	}

	.admin-edit-club-panel__danger {
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px dashed rgba(220, 38, 38, 0.35);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.admin-edit-club-panel__danger-label {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--danger-red, #b91c1c);
	}

	.admin-edit-club-panel__delete-org {
		align-self: flex-start;
		padding: 8px 12px;
		font-weight: 600;
	}
</style>
