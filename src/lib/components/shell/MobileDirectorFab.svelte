<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface FabEntry {
		prefix: string;
		tab?: string | null;
		label: string;
		icon: string;
		href?: string;
		action?: string;
	}

	interface Props {
		pathname: string;
	}

	const FAB_ACTIONS: FabEntry[] = [
		{ prefix: '/director', tab: 'teams',      label: 'Invite Player',  icon: 'user.plus',           href: '/director?tab=teams' },
		{ prefix: '/director', tab: 'household',  label: 'Add Household',  icon: 'nav.home',            href: '/director?tab=household' },
		{ prefix: '/director', tab: 'compliance', label: 'Run Compliance', icon: 'status.shield-check', href: '/director/compliance' },
		{ prefix: '/director', tab: null,         label: 'Quick Action',   icon: 'game.zap',            href: '/director?tab=teams' },
		{ prefix: '/admin/organizations',         label: 'New Club',       icon: 'org.building',        href: '/admin/organizations' },
		{ prefix: '/admin/users',                 label: 'Add User',       icon: 'user.plus',           href: '/admin/users' },
		{ prefix: '/admin',                       label: 'Overview',       icon: 'data.chart-line',     href: '/admin/overview' },
		{ prefix: '/coach/forge',                 label: 'Create Drill',   icon: 'game.dumbbell',       href: '/coach/forge' },
		{ prefix: '/coach/match-day',             label: 'Log Match',      icon: 'data.activity',       href: '/coach/match-day' },
		{ prefix: '/coach',                       label: 'View Roster',    icon: 'user.group',          href: '/coach' },
	];

	let { pathname }: Props = $props();

	const fabAction = $derived.by(() => {
		const sorted = [...FAB_ACTIONS].sort((a, b) => b.prefix.length - a.prefix.length);
		return sorted.find((a) => pathname.startsWith(a.prefix)) ?? null;
	});

	let expanded = $state(false);
</script>

<div class="fab-root" class:fab-root--hidden={!fabAction}>
	{#if expanded}
		<div class="fab-chips">
			<a href="mailto:support@sstracker.app" class="fab-chip" title="Support">
				<Icon name="sys.lifebuoy" size={20} />
				<span class="fab-chip-label">Support</span>
			</a>
			<a href="/settings" class="fab-chip" title="Settings">
				<Icon name="sys.settings" size={20} />
				<span class="fab-chip-label">Settings</span>
			</a>
		</div>
	{/if}

	{#if fabAction?.href && !expanded}
		<a class="fab-btn" href={fabAction.href} aria-label={fabAction.label}>
			<Icon name={fabAction.icon as IconName} size={24} />
		</a>
	{:else}
		<button
			class="fab-btn"
			onclick={() => (expanded = !expanded)}
			aria-label={expanded ? 'Close menu' : (fabAction?.label ?? 'Quick Action')}
			aria-expanded={expanded}
		>
				{#if expanded}
				<Icon name="sys.close" size={24} />
			{:else}
				<Icon name={(fabAction?.icon ?? 'game.zap') as IconName} size={24} />
			{/if}
		</button>
	{/if}

	{#if !expanded && fabAction}
		<span class="fab-label">{fabAction.label}</span>
	{/if}
</div>

<style>
	.fab-root {
		position: fixed;
		bottom: calc(72px + env(safe-area-inset-bottom, 0px));
		right: 1rem;
		z-index: 951;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
	}

	.fab-root--hidden {
		display: none;
	}

	@media (min-width: 1024px) {
		.fab-root {
			display: none;
		}
	}

	.fab-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 240, 255, 0.12);
		border: 1px solid rgba(0, 240, 255, 0.45);
		backdrop-filter: blur(16px);
		box-shadow: 0 0 24px rgba(0, 240, 255, 0.25), 0 8px 32px rgba(0, 0, 0, 0.6);
		color: #00f0ff;
		font-size: 24px;
		cursor: pointer;
		text-decoration: none;
		transition: transform 0.12s ease, box-shadow 0.12s ease;
		flex-shrink: 0;
	}

	.fab-btn:active {
		transform: scale(0.93);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.18), 0 4px 16px rgba(0, 0, 0, 0.5);
	}

	.fab-label {
		position: absolute;
		right: calc(100% + 10px);
		bottom: 0;
		white-space: nowrap;
		font-family: monospace;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(0, 240, 255, 0.7);
		pointer-events: none;
		line-height: 56px;
	}

	.fab-chips {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
		animation: chips-in 0.18s ease both;
	}

	@keyframes chips-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.fab-chip {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.35);
		backdrop-filter: blur(16px);
		box-shadow: 0 0 16px rgba(0, 240, 255, 0.2), 0 4px 20px rgba(0, 0, 0, 0.5);
		color: #00f0ff;
		font-size: 20px;
		text-decoration: none;
		transition: transform 0.12s ease;
		flex-shrink: 0;
	}

	.fab-chip:active {
		transform: scale(0.92);
	}

	.fab-chip-label {
		position: absolute;
		right: calc(100% + 8px);
		white-space: nowrap;
		font-family: monospace;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: rgba(0, 240, 255, 0.7);
		pointer-events: none;
	}
</style>
