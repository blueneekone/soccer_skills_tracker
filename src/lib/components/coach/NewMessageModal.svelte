<script lang="ts">
	import { browser } from '$app/environment';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { NewMessageEngine } from './NewMessageEngine.svelte.js';
	import NewMessageArena from './NewMessageArena.svelte';
	import NewMessageHUD from './NewMessageHUD.svelte';

	interface Props {
		open?: boolean;
		onClose?: () => void;
		clubId?: string;
		teamId?: string;
		myEmail?: string;
		myRole?: string;
		onChannelCreated?: (id: string) => void;
	}

	let {
		open = false,
		onClose = () => {},
		clubId = '',
		teamId = '',
		myEmail = '',
		myRole = 'player',
		onChannelCreated = (_id: string) => {},
	}: Props = $props();

	// Initialize the Brain (Engine)
	const engine = new NewMessageEngine(clubId, teamId, myEmail, myRole, onChannelCreated);

	$effect(() => {
		if (!browser || !open || !clubId) return;
		void engine.loadCandidates();
	});

	$effect(() => {
		if (!open) {
			engine.reset();
		}
	});

	function onBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="nm-backdrop"
		role="presentation"
		transition:fade={{ duration: 180 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={onBackdropKeydown}
	>
		<div
			class="nm-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="nm-title"
			tabindex="-1"
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
		>
			<div class="nm-head">
				<h2 id="nm-title" class="nm-title">New chat</h2>
				<button type="button" class="nm-close" onclick={onClose} aria-label="Close">
					<Icon name={"sys.close" as IconName} />
				</button>
			</div>

			<!-- Glass: Selection Area -->
			<NewMessageArena {engine} />

			<!-- HUD: Controls & Actions -->
			<NewMessageHUD {engine} {onClose} />
		</div>
	</div>
{/if}

<style>
	.nm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(12px, 3vw, 24px);
		background: rgba(15, 23, 42, 0.45);
		box-sizing: border-box;
	}

	.nm-modal {
		width: min(100%, 440px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px 20px 18px;
		background: rgba(2, 2, 2, 0.82);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius);
		box-shadow: var(--vanguard-elev-3);
		overflow: visible;
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
	}

	:global(html.dark) .nm-modal {
		background: rgba(2, 2, 2, 0.82);
		border-color: var(--vanguard-border);
		box-shadow: var(--vanguard-elev-3);
	}

	.nm-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.nm-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--text-primary);
	}

	.nm-close {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 8px;
		border-radius: 9999px;
		color: var(--text-secondary);
		font-size: 18px;
		line-height: 1;
	}

	.nm-close:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .nm-close:hover {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
