<script lang="ts">
	import { portal } from '$lib/actions/portal.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import VanguardAvatar from '$lib/components/shell/VanguardAvatar.svelte';

	interface PlayerData {
		id: string;
		name: string;
		rosterKey: string;
		number: string;
		position: string;
		stamina: number;
		status: string;
		vpc_approved: boolean;
	}

	interface Props {
		isOpen: boolean;
		player: PlayerData | null;
		statsDoc?: Record<string, any> | null;
		onClose: () => void;
		onOpenEditProfile: () => void;
	}

	let {
		isOpen,
		player,
		statsDoc = null,
		onClose,
		onOpenEditProfile,
	}: Props = $props();

	const AXIS_KEYS = ['PAC', 'TEC', 'IQ', 'PHY', 'MEN', 'DEF'];
	const AXIS_LABELS = ['Pace', 'Technical', 'Game IQ', 'Physical', 'Mental', 'Defending'];

	const playerSkills = $derived.by(() => {
		const skills: Record<string, number> = {};
		for (const k of AXIS_KEYS) {
			const direct = Number(statsDoc?.[k]);
			const nested = Number(statsDoc?.skills?.[k]);
			skills[k] = Number.isFinite(direct) ? direct : Number.isFinite(nested) ? nested : 65;
		}
		return skills;
	});

	const overallScore = $derived.by(() => {
		const vals = AXIS_KEYS.map((k) => playerSkills[k]);
		const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
		return Math.round(avg);
	});

	const totalXp = $derived(Number(statsDoc?.total_xp || statsDoc?.totalXp || 0));
	const streakDays = $derived(Number(statsDoc?.streak_days || statsDoc?.streakDays || 0));

	function buildPolygonPath(skillsMap: Record<string, number>, maxVal = 100, radius = 75, cx = 110, cy = 100): string {
		const angleStep = (2 * Math.PI) / AXIS_KEYS.length;
		return (
			AXIS_KEYS.map((key, i) => {
				const val = Math.min(maxVal, Math.max(0, skillsMap[key] ?? 60));
				const r = (val / maxVal) * radius;
				const angle = i * angleStep - Math.PI / 2;
				const x = cx + r * Math.cos(angle);
				const y = cy + r * Math.sin(angle);
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
			}).join(' ') + ' Z'
		);
	}

	function getAxisLabelPos(i: number, radius = 94, cx = 110, cy = 100) {
		const angleStep = (2 * Math.PI) / AXIS_KEYS.length;
		const angle = i * angleStep - Math.PI / 2;
		return {
			x: cx + radius * Math.cos(angle),
			y: cy + radius * Math.sin(angle),
		};
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && player}
	<div
		class="tw-fixed tw-inset-0 tw-z-[10010] tw-flex tw-items-center tw-justify-center tw-bg-black/85 tw-backdrop-blur-md tw-p-4"
		use:portal
		role="dialog"
		aria-modal="true"
		aria-label="Athlete Quick View Stats"
	>
		<!-- Backdrop click -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="tw-absolute tw-inset-0" onclick={onClose}></div>

		<div
			class="tw-relative tw-z-10 tw-w-full tw-max-w-xl tw-bg-[#0b0f19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-5 tw-font-mono tw-text-white tw-shadow-[0_0_40px_rgba(0,0,0,0.9)] tw-border-t-[rgba(255,255,255,0.12)] tw-flex tw-flex-col tw-gap-4"
		>
			<!-- Top Header: Avatar, Name, Position, Status & Close -->
			<div class="tw-flex tw-items-start tw-justify-between tw-gap-3 tw-border-b tw-border-[#334155] tw-pb-4">
				<div class="tw-flex tw-items-center tw-gap-3">
					<VanguardAvatar seed={player.rosterKey || player.name} size={48} />
					<div>
						<div class="tw-flex tw-items-center tw-gap-2">
							<span class="tw-bg-[#daff0a] tw-text-black tw-font-black tw-text-xs tw-px-1.5 tw-py-0.5 tw-rounded">
								#{player.number}
							</span>
							<h2 class="tw-font-black tw-text-base tw-tracking-wide tw-m-0 tw-text-white">
								{player.name}
							</h2>
						</div>
						<div class="tw-flex tw-items-center tw-gap-2 tw-mt-1">
							<span class="tw-text-[#14b8a6] tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded">
								{player.position}
							</span>
							{#if player.status === 'READY'}
								<span class="tw-text-[#14b8a6] tw-text-[10px] tw-font-bold">● COMBAT READY</span>
							{:else if player.status === 'INJURY RISK'}
								<span class="tw-text-[#ef4444] tw-text-[10px] tw-font-bold">⚠ INJURY RISK</span>
							{:else}
								<span class="tw-text-slate-400 tw-text-[10px] tw-font-bold">
									{!player.vpc_approved ? '⏳ VPC PENDING' : '○ OFFLINE'}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="tw-text-slate-400 hover:tw-text-white tw-bg-[#020617] hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-rounded-lg tw-p-1.5 tw-transition-colors tw-cursor-pointer"
					aria-label="Close modal"
				>
					<Icon name="sys.close" size={18} />
				</button>
			</div>

			<!-- KPI Strip: Overall, Stamina, Streak, XP -->
			<div class="tw-grid tw-grid-cols-4 tw-gap-2 tw-text-center">
				<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-p-2">
					<div class="tw-text-[9px] tw-text-slate-400 tw-uppercase">OVERALL</div>
					<div class="tw-text-xl tw-font-black tw-text-[#daff0a] tw-tabular-nums">{overallScore}</div>
				</div>
				<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-p-2">
					<div class="tw-text-[9px] tw-text-slate-400 tw-uppercase">STAMINA</div>
					<div class="tw-text-xl tw-font-black tw-text-[#14b8a6] tw-tabular-nums">{player.stamina}%</div>
				</div>
				<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-p-2">
					<div class="tw-text-[9px] tw-text-slate-400 tw-uppercase">STREAK</div>
					<div class="tw-text-xl tw-font-black tw-text-[#fbbf24] tw-tabular-nums">{streakDays}d</div>
				</div>
				<div class="tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-p-2">
					<div class="tw-text-[9px] tw-text-slate-400 tw-uppercase">TOTAL XP</div>
					<div class="tw-text-xl tw-font-black tw-text-white tw-tabular-nums">{totalXp}</div>
				</div>
			</div>

			<!-- 6-Axis Tactical Radar Visual + Attribute Grid -->
			<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4 tw-items-center tw-bg-[#020617] tw-border tw-border-[#334155] tw-p-3 tw-rounded-lg">
				<!-- SVG Radar Hexagon -->
				<div class="tw-flex tw-justify-center">
					<svg viewBox="0 0 220 200" class="tw-w-[190px] tw-h-[175px]">
						<!-- Background Conic Rings -->
						{#each [0.25, 0.5, 0.75, 1.0] as level}
							<polygon
								points={buildPolygonPath(Object.fromEntries(AXIS_KEYS.map((k) => [k, level * 100])), 100, 75 * level)}
								fill="none"
								stroke="#334155"
								stroke-width="0.75"
								stroke-dasharray={level < 1.0 ? '2 2' : 'none'}
							/>
						{/each}

						<!-- Axis Spokes -->
						{#each AXIS_KEYS as _, i}
							{@const p = getAxisLabelPos(i, 75)}
							<line x1="110" y1="100" x2={p.x} y2={p.y} stroke="#334155" stroke-width="0.75" />
						{/each}

						<!-- Player Skill Polygon -->
						<polygon
							points={buildPolygonPath(playerSkills)}
							fill="rgba(218, 255, 10, 0.22)"
							stroke="#daff0a"
							stroke-width="1.8"
							class="tw-drop-shadow-[0_0_8px_rgba(218,255,10,0.4)]"
						/>

						<!-- Axis Labels -->
						{#each AXIS_KEYS as key, i}
							{@const p = getAxisLabelPos(i, 88)}
							<text
								x={p.x}
								y={p.y + 3}
								font-size="8"
								font-weight="bold"
								font-family="monospace"
								fill="#14b8a6"
								text-anchor="middle"
							>
								{key}
							</text>
						{/each}
					</svg>
				</div>

				<!-- Attribute List -->
				<div class="tw-space-y-1.5">
					{#each AXIS_KEYS as key, i}
						{@const score = playerSkills[key] ?? 65}
						<div class="tw-flex tw-items-center tw-justify-between tw-text-xs">
							<span class="tw-text-slate-400 tw-text-[11px]">{AXIS_LABELS[i]} ({key})</span>
							<div class="tw-flex tw-items-center tw-gap-2">
								<div class="tw-w-20 tw-h-1.5 tw-bg-slate-800 tw-rounded-full tw-overflow-hidden">
									<div
										class="tw-h-full tw-bg-gradient-to-r tw-from-[#14b8a6] tw-to-[#daff0a]"
										style="width: {score}%;"
									></div>
								</div>
								<span class="tw-w-7 tw-text-right tw-font-bold tw-text-white tw-tabular-nums">{score}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Bottom Actions -->
			<div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-pt-1">
				<span class="tw-text-[10px] tw-text-slate-500">
					ATHLETE DOSSIER // QUICK TELEMETRY
				</span>
				<div class="tw-flex tw-gap-2">
					<button
						type="button"
						onclick={onClose}
						class="tw-px-3 tw-py-1.5 tw-text-xs tw-font-mono tw-text-slate-300 hover:tw-text-white tw-bg-transparent hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-rounded-lg tw-transition-colors tw-cursor-pointer"
					>
						Close
					</button>
					<button
						type="button"
						onclick={() => {
							onClose();
							onOpenEditProfile();
						}}
						class="tw-px-3.5 tw-py-1.5 tw-text-xs tw-font-mono tw-font-bold tw-text-black tw-bg-[#daff0a] hover:tw-bg-lime-400 tw-rounded-lg tw-transition-colors tw-cursor-pointer tw-shadow-[0_0_12px_rgba(218,255,10,0.3)]"
					>
						✎ Edit Profile Drawer
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
