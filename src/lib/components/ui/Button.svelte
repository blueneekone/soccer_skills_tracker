<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		label = '',
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		onclick,
		class: className = '',
	}: {
		children?: Snippet;
		label?: string;
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		class?: string;
	} = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="v-btn v-btn-{variant} v-btn-{size} {className}"
>
	{#if children}
		{@render children()}
	{:else}
		{label}
	{/if}
</button>

<style>
	.v-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-weight: 700;
		transition: all 150ms ease-in-out;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.v-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.v-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.v-btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}
	.v-btn-md {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}
	.v-btn-lg {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.v-btn-primary {
		background-color: #0f172a;
		color: #ffffff;
	}
	.v-btn-primary:hover:not(:disabled) {
		background-color: #1e293b;
	}

	.v-btn-secondary {
		background-color: #f1f5f9;
		color: #0f172a;
		border-color: #e2e8f0;
	}
	.v-btn-secondary:hover:not(:disabled) {
		background-color: #e2e8f0;
	}

	.v-btn-ghost {
		background-color: transparent;
		color: #0f172a;
	}
	.v-btn-ghost:hover:not(:disabled) {
		background-color: #f1f5f9;
	}

	.v-btn-danger {
		background-color: #ff003c;
		color: #ffffff;
	}
	.v-btn-danger:hover:not(:disabled) {
		background-color: #cc0030;
	}
</style>
