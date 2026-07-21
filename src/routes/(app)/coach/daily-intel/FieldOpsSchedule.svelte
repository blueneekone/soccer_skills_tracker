<script lang="ts">
	import { goto } from '$app/navigation';
	import { UPCOMING_EVENTS } from './DailyIntelEngine.svelte.js';
</script>

<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-5 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] tw-relative" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
	<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
		<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">FIELD OPS SCHEDULE</h2>
		<button
			onclick={() => goto('/coach/field-station')}
			class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] hover:tw-text-[#5eead4] tw-transition-colors tw-tracking-widest tw-border-none tw-bg-transparent tw-cursor-pointer"
		>VIEW ALL →</button>
	</div>
	<div class="tw-flex tw-flex-col tw-gap-2">
		{#each UPCOMING_EVENTS as ev}
			<div class="tw-flex tw-items-start tw-gap-3 tw-p-3 tw-bg-[#020617] tw-border {ev.type === 'MATCH' ? 'tw-border-[#fbbf24]/30' : 'tw-border-[#334155]'} hover:tw-border-[#475569] tw-transition-colors tw-cursor-pointer tw-group">
				<div style="flex-shrink:0; width:36px; height:36px; display:flex; align-items:center; justify-content:center; {ev.type === 'MATCH' ? 'background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25);' : 'background:rgba(20,184,166,0.08); border:1px solid rgba(20,184,166,0.2);'}">
					<span style="font-family:monospace; font-size:8px; font-weight:700; {ev.type === 'MATCH' ? 'color:#fbbf24;' : 'color:#14b8a6;'}">{ev.type === 'MATCH' ? '⚽' : '📋'}</span>
				</div>
				<div class="tw-flex-1 tw-min-w-0">
					<div class="tw-flex tw-items-center tw-justify-between tw-mb-0.5">
						<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#fafafa] tw-truncate">{ev.label}</span>
						<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-ml-2 tw-shrink-0 {ev.status === 'CONFIRMED' ? 'tw-text-[#14b8a6]' : ev.status === 'PENDING' ? 'tw-text-[#f59e0b]' : 'tw-text-[#64748b]'}">{ev.status}</span>
					</div>
					<div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa]">{ev.date} · {ev.time}</div>
					<div class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-truncate">{ev.venue}</div>
				</div>
			</div>
		{/each}
	</div>
</section>
