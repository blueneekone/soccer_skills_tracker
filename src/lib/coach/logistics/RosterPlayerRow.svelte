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

			<label class="rpr-label" for="edit-name-{player.id}">PLAYER NAME</label>
			<input id="edit-name-{player.id}" class="rpr-input" bind:value={editData.displayName} disabled={saving} />

			<label class="rpr-label" for="edit-parent-name-{player.id}">PARENT NAME</label>
			<input id="edit-parent-name-{player.id}" class="rpr-input" bind:value={editData.parentName} disabled={saving} />

			<label class="rpr-label" for="edit-parent-phone-{player.id}">PARENT PHONE</label>
			<input id="edit-parent-phone-{player.id}" class="rpr-input" type="tel" bind:value={editData.parentPhone} disabled={saving} />

			<label class="rpr-label" for="edit-parent-email-{player.id}">PARENT EMAIL</label>
			<input id="edit-parent-email-{player.id}" class="rpr-input" type="email" bind:value={editData.parentEmail} disabled={saving} />

			{#if saveErr}
				<p class="rpr-err" role="alert">{saveErr}</p>
			{/if}

			<button class="rpr-save" onclick={handleSave} disabled={saving}>
				{saving ? 'Saving…' : 'Save Profile'}
			</button>
		</div>
	{:else}
		<div class="rpr-view">
			<div class="rpr-view__info">
				<span class="rpr-name">{player.displayName}</span>
				<span class="rpr-email">{player.email}</span>
			</div>
			<button class="rpr-link rpr-link--sm" onclick={() => onStartEdit(player)}>Edit</button>
		</div>
	{/if}
</li>

<style>
	.rpr-row {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 8px 12px;
		background: #f8fafc;
	}

	/* View mode */
	.rpr-view { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.rpr-view__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.rpr-name { font-size: 13px; font-weight: 700; color: #0f172a; }
	.rpr-email { font-size: 12px; color: #64748b; font-family: ui-monospace, monospace; }

	/* Edit mode */
	.rpr-edit { display: flex; flex-direction: column; gap: 6px; }
	.rpr-edit__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
	.rpr-edit__title { font-size: 13px; font-weight: 700; color: #0f172a; }
	.rpr-label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 6px; }
	.rpr-input {
		border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px;
		font-size: 13px; color: #0f172a; background: #fff; width: 100%;
	}
	.rpr-input:focus { outline: 2px solid #14b8a6; border-color: #14b8a6; }
	.rpr-input:disabled { opacity: 0.6; }
	.rpr-err { font-size: 12px; color: #b91c1c; margin: 2px 0 0; }
	.rpr-save {
		margin-top: 10px; background: #0d9488; color: #fff; border: none;
		border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700;
		font-family: ui-monospace, monospace; letter-spacing: 0.05em; cursor: pointer;
		transition: background 0.15s;
	}
	.rpr-save:hover:not(:disabled) { background: #0f766e; }
	.rpr-save:disabled { opacity: 0.6; cursor: not-allowed; }

	/* Shared link style */
	.rpr-link { color: #0d9488; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; background: none; border: none; cursor: pointer; }
	.rpr-link:hover:not(:disabled) { color: #0f766e; }
	.rpr-link--sm { font-size: 12px; }
</style>
