<script lang="ts">
	import type { RosterPlayer, RosterEditData } from './RosterPanelEngine.svelte.js';

	interface Props {
		player: RosterPlayer;
		isEditing: boolean;
		editData: RosterEditData;
		onStartEdit: (p: RosterPlayer) => void;
		onCancelEdit: () => void;
		onSaveEdit: (playerId: string) => Promise<void>;
	}

	let { player, isEditing, editData, onStartEdit, onCancelEdit, onSaveEdit }: Props = $props();

	let saving = $state(false);
	let saveErr = $state('');

	async function handleSave() {
		saving = true;
		saveErr = '';
		try {
			await onSaveEdit(player.id);
		} catch (e: any) {
			saveErr = e?.message ?? 'Failed to save. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

<li class="rpr-row">
	{#if isEditing}
		<div class="rpr-edit">
			<div class="rpr-edit__header">
				<span class="rpr-edit__title">Edit Player Profile</span>
				<button class="rpr-link" onclick={onCancelEdit} disabled={saving}>Cancel</button>
			</div>

			<div class="tw-grid tw-grid-cols-3 tw-gap-2">
				<div class="tw-col-span-2">
					<label class="rpr-label" for="edit-name-{player.id}">PLAYER NAME</label>
					<input id="edit-name-{player.id}" class="rpr-input" bind:value={editData.displayName} disabled={saving} />
				</div>
				<div>
					<label class="rpr-label" for="edit-jersey-{player.id}">JERSEY #</label>
					<input id="edit-jersey-{player.id}" class="rpr-input tw-font-mono" placeholder="e.g. 10" bind:value={editData.jersey} disabled={saving} />
				</div>
			</div>

			<label class="rpr-label" for="edit-parent-name-{player.id}">PARENT / GUARDIAN NAME</label>
			<input id="edit-parent-name-{player.id}" class="rpr-input" placeholder="e.g. Jane Smith" bind:value={editData.parentName} disabled={saving} />

			<div class="tw-grid tw-grid-cols-2 tw-gap-2">
				<div>
					<label class="rpr-label" for="edit-parent-phone-{player.id}">PARENT PHONE</label>
					<input id="edit-parent-phone-{player.id}" class="rpr-input" type="tel" placeholder="(555) 000-0000" bind:value={editData.parentPhone} disabled={saving} />
				</div>
				<div>
					<label class="rpr-label" for="edit-parent-email-{player.id}">PARENT EMAIL</label>
					<input id="edit-parent-email-{player.id}" class="rpr-input" type="email" placeholder="parent@email.com" bind:value={editData.parentEmail} disabled={saving} />
				</div>
			</div>

			{#if saveErr}
				<p class="rpr-err" role="alert">{saveErr}</p>
			{/if}

			<button class="rpr-save" onclick={handleSave} disabled={saving}>
				{saving ? 'Saving…' : 'Save Profile & Jersey'}
			</button>
		</div>
	{:else}
		<div class="rpr-view">
			<div class="rpr-view__info">
				<div class="tw-flex tw-items-center tw-gap-2">
					{#if player.jersey}
						<span class="rpr-jersey">#{player.jersey}</span>
					{/if}
					<span class="rpr-name">{player.displayName}</span>
				</div>
				<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-1 tw-text-xs">
					{#if player.parentEmail || player.email}
						<span class="rpr-email">✉ {player.parentEmail || player.email}</span>
					{:else}
						<span class="rpr-unlinked">⚠ No Guardian Email Linked</span>
					{/if}
					{#if player.parentPhone}
						<span class="rpr-phone">📞 {player.parentPhone}</span>
					{/if}
				</div>
			</div>
			<button class="rpr-link rpr-link--sm" onclick={() => onStartEdit(player)}>Edit</button>
		</div>
	{/if}
</li>

<style>
	.rpr-row {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 10px 14px;
		background: rgba(15, 23, 42, 0.7);
	}

	/* View mode */
	.rpr-view { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.rpr-view__info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
	.rpr-jersey {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		font-weight: 900;
		color: #0f172a;
		background: #daff0a;
		padding: 1px 6px;
		border-radius: 4px;
		letter-spacing: 0.05em;
	}
	.rpr-name { font-size: 13px; font-weight: 700; color: #e2e8f0; }
	.rpr-email { font-size: 11px; color: #14b8a6; font-family: 'Geist Mono', ui-monospace, monospace; }
	.rpr-phone { font-size: 11px; color: #94a3b8; font-family: 'Geist Mono', ui-monospace, monospace; }
	.rpr-unlinked { font-size: 11px; color: #f59e0b; font-family: 'Geist Mono', ui-monospace, monospace; }

	/* Edit mode */
	.rpr-edit { display: flex; flex-direction: column; gap: 6px; }
	.rpr-edit__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
	.rpr-edit__title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
	.rpr-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 6px; }
	.rpr-input {
		border: 1px solid #334155; border-radius: 6px; padding: 6px 10px;
		font-size: 13px; color: #e2e8f0; background: #0f172a; width: 100%;
	}
	.rpr-input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,0.2); }
	.rpr-input:disabled { opacity: 0.5; }
	.rpr-err { font-size: 12px; color: #f87171; margin: 2px 0 0; }
	.rpr-save {
		margin-top: 10px; background: rgba(20,184,166,0.15); color: #14b8a6; border: 1px solid #14b8a6;
		border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700;
		font-family: 'Geist Mono', ui-monospace, monospace; letter-spacing: 0.05em; cursor: pointer;
		transition: background 0.15s;
	}
	.rpr-save:hover:not(:disabled) { background: rgba(20,184,166,0.28); }
	.rpr-save:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Shared link style */
	.rpr-link { color: #14b8a6; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; background: none; border: none; cursor: pointer; }
	.rpr-link:hover:not(:disabled) { color: #2dd4bf; }
	.rpr-link--sm { font-size: 12px; }
</style>
