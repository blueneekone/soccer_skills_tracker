<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 48, class: extraClass = '' }: Props = $props();
</script>

<svg
	class="vanguard-app-mark {extraClass}"
	width={size}
	height={size}
	viewBox="0 0 512 512"
	role="img"
	aria-hidden="true"
>
	<rect width="512" height="512" fill="#020202" />
	<polygon
		points="256,92 404,178 404,334 256,420 108,334 108,178"
		fill="#05050A"
		stroke="#334155"
		stroke-width="10"
		stroke-linejoin="miter"
	/>
	<path d="M176 218 L256 332 L336 218 L302 218 L256 278 L210 218 Z" fill="#fbbf24" />
	<rect x="248" y="348" width="16" height="16" fill="#fbbf24" transform="rotate(45 256 356)" />
</svg>

<style>
	.vanguard-app-mark {
		display: block;
		flex-shrink: 0;
	}
</style>
