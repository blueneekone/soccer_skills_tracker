<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { portal } from '$lib/actions/portal.js';
	import type { GlobalUserRow } from '$lib/types/adminUsers.js';

	interface Props {
		target: GlobalUserRow;
		busy: boolean;
		err: string;
		isSelf: boolean;
		onClose: () => void;
		onConfirm: () => void;
	}

	let { target, busy, err, isSelf, onClose, onConfirm }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="gu-deactivate-scrim"
	use:portal
	role="presentation"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div
		class="gu-deactivate-card dark-form-surface"
		role="dialog"
		aria-modal="true"
		aria-labelledby="gu-deact-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="gu-deactivate-card__head">
			<div class="gu-deactivate-card__icon" aria-hidden="true">
				<Icon name={'status.warning-octagon' as IconName} />
			</div>
			<div>
				<h2 id="gu-deact-title" class="gu-deactivate-card__title">Revoke access</h2>
				<p class="gu-deactivate-card__sub">Account suspension — no data purge</p>
			</div>
		</header>
		<div class="gu-deactivate-card__body">
			<p class="gu-deactivate-card__lede">
				Are you sure? This will
				<strong>immediately sever this user&rsquo;s access</strong> to the Operative OS. Their session
				is cut off in real time; the account remains in Firestore for audit.
			</p>
			<div class="gu-deactivate-card__target">
				<div class="gu-deactivate-card__name">
					{target.displayName || target.playerName || target.email}
				</div>
				<div class="gu-deactivate-card__email">{target.email}</div>
			</div>
			{#if err}
				<p class="gu-flash gu-flash--err" role="alert">{err}</p>
			{/if}
		</div>
		<footer class="gu-deactivate-card__foot">
			<button type="button" class="btn-secondary tw-px-4 tw-py-2 tw-text-sm tw-font-bold" onclick={onClose} disabled={busy}>
				Cancel
			</button>
			<button type="button" class="btn-primary tw-bg-red-600 hover:tw-bg-red-700 tw-text-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" onclick={onConfirm} disabled={busy || isSelf}>
				{busy ? 'Applying…' : 'Revoke access now'}
			</button>
		</footer>
	</div>
</div>
