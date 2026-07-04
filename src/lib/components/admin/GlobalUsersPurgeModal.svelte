<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { portal } from '$lib/actions/portal.js';

	interface Props {
		step: number;
		targetEmail: string;
		targetName: string;
		typedConfirmation: string;
		reason: string;
		busy: boolean;
		err: string;
		onClose: () => void;
		onAdvance: () => void;
		onConfirm: () => void;
	}

	let {
		step,
		targetEmail,
		targetName,
		typedConfirmation = $bindable(''),
		reason = $bindable(''),
		busy,
		err,
		onClose,
		onAdvance,
		onConfirm,
	}: Props = $props();
</script>

<div
	class="gu-modal-bg"
	use:portal
	role="presentation"
	onclick={onClose}
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
	}}
>
	<div
		class="gu-modal dark-form-surface"
		role="dialog"
		aria-modal="true"
		aria-labelledby="gu-purge-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="gu-modal__head">
			<div class="gu-modal__icon gu-modal__icon--danger" aria-hidden="true">
				<Icon name={'status.shield-alert' as IconName} />
			</div>
			<div>
				<h2 id="gu-purge-title" class="gu-modal__title">
					{step === 1 ? 'Purge User Data' : 'Final Confirmation'}
				</h2>
				<p class="gu-modal__sub">GDPR Article 17 — Right to Erasure.</p>
			</div>
		</header>

		{#if step === 1}
			<div class="gu-modal__body">
				<p class="gu-modal__p">
					You are about to <strong>permanently delete</strong> all Firestore records
					and the Firebase Auth entry for:
				</p>
				<div class="gu-modal__target">
					<div class="gu-modal__target-name">{targetName}</div>
					<div class="gu-modal__target-email">{targetEmail}</div>
				</div>
				<p class="gu-modal__p gu-modal__p--muted">
					This action cannot be undone. The audit trail will be retained under
					<code class="gu-modal__code">security_audit</code>.
				</p>
				<label class="gu-modal__label" for="gu-purge-reason">
					Reason (optional — audited)
				</label>
				<textarea
					id="gu-purge-reason"
					class="gu-modal__input gu-modal__textarea"
					bind:value={reason}
					placeholder="e.g. GDPR Article 17 request — ticket #12345"
					rows="2"
					maxlength="500"
				></textarea>
				{#if err}
					<p class="gu-flash gu-flash--err">{err}</p>
				{/if}
			</div>
			<footer class="gu-modal__foot">
				<button type="button" class="btn-secondary tw-px-4 tw-py-2 tw-text-sm tw-font-bold" onclick={onClose}>Cancel</button>
				<button type="button" class="btn-primary tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold" onclick={onAdvance}>Continue</button>
			</footer>
		{:else}
			<div class="gu-modal__body">
				<p class="gu-modal__p">
					To confirm, type the target email address <strong>exactly</strong>:
				</p>
				<div class="gu-modal__target gu-modal__target--center">
					<div class="gu-modal__target-email">{targetEmail}</div>
				</div>
				<label class="gu-modal__label" for="gu-purge-typed">Typed confirmation</label>
				<input
					id="gu-purge-typed"
					type="text"
					class="gu-modal__input"
					bind:value={typedConfirmation}
					autocomplete="off"
					spellcheck="false"
					placeholder={targetEmail}
				/>
				{#if err}
					<p class="gu-flash gu-flash--err">{err}</p>
				{/if}
			</div>
			<footer class="gu-modal__foot">
				<button type="button" class="btn-secondary tw-px-4 tw-py-2 tw-text-sm tw-font-bold" onclick={onClose} disabled={busy}>
					Cancel
				</button>
				<button
					type="button"
					class="btn-primary tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
					onclick={onConfirm}
					disabled={busy || typedConfirmation.trim().toLowerCase() !== targetEmail.toLowerCase()}
				>
					{busy ? 'Purging…' : 'Permanently Purge'}
				</button>
			</footer>
		{/if}
	</div>
</div>
