<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		currentStreak = 0,
		longestStreak = 0,
		totalXp = 0,
		xpLabel = '0',
		streakAtRisk = false,
	}: {
		currentStreak?: number;
		longestStreak?: number;
		totalXp?: number;
		xpLabel?: string;
		streakAtRisk?: boolean;
	} = $props();

	const streakAriaLabel = $derived.by(() => {
		if (currentStreak <= 0) return 'Start training streak — log session';
		if (streakAtRisk) return `Protect ${currentStreak}-day streak — log training`;
		return `${currentStreak}-day streak — best ${longestStreak} days`;
	});
</script>

<div class="ibm-holo-bezel" data-region="identity-telemetry-bezel">
	<div class="ibm-holo-bezel__rail">
		<a
			href={resolve('/player/workout')}
			class="ibm-holo-bezel__streak"
			class:ibm-holo-bezel__streak--active={currentStreak > 0}
			class:ibm-holo-bezel__streak--at-risk={streakAtRisk}
			aria-label={streakAriaLabel}
			title={longestStreak > 0 ? `Best ${longestStreak}d streak` : undefined}
		>
			<span class="ibm-holo-bezel__streak-flame" aria-hidden="true">
				<Icon name="game.flame" size={12} />
			</span>
			<span class="ibm-holo-bezel__streak-value">{currentStreak}d</span>
			<span class="ibm-holo-bezel__streak-tag">STRK</span>
		</a>

		<a
			href={resolve('/stats')}
			class="ibm-holo-bezel__xp"
			class:ibm-holo-bezel__xp--filled={totalXp > 0}
			aria-label="Career XP {xpLabel} earned — view stats"
			title="Lifetime XP earned"
		>
			<span class="ibm-holo-bezel__xp-value">{xpLabel}</span>
			<span class="ibm-holo-bezel__xp-tag">CAREER</span>
		</a>
	</div>
</div>
